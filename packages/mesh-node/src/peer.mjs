import net from "node:net";
import tls from "node:tls";
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

const PROTOCOL_VERSION = 1;
const MAX_FRAME_BYTES = 64 * 1024;
const MAX_CLOCK_SKEW_MS = 30_000;
const DEFAULT_SOCKET_TIMEOUT_MS = 5_000;
const MAX_REPLAY_ENTRIES = 10_000;

function stableEnvelope(envelope) {
  return JSON.stringify({ version: envelope.version, id: envelope.id, from: envelope.from, to: envelope.to, timestamp: envelope.timestamp, nonce: envelope.nonce, payload: envelope.payload });
}
function sign(secret, envelope) { return createHmac("sha256", secret).update(stableEnvelope(envelope)).digest("hex"); }
function safeEqualHex(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || !/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  const a = Buffer.from(left, "hex"); const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
function encodeFrame(value) {
  const body = Buffer.from(JSON.stringify(value), "utf8");
  if (body.length > MAX_FRAME_BYTES) throw new Error("Frame exceeds maximum allowed size");
  const header = Buffer.alloc(4); header.writeUInt32BE(body.length, 0);
  return Buffer.concat([header, body]);
}
function sendFrame(socket, value) { socket.write(encodeFrame(value)); }
function isPlainObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }

/**
 * Experimental authenticated TCP peer. In TLS mode, the certificate DNS name
 * is checked against the destination peer ID and the client certificate CN is
 * bound to the envelope sender ID. This is an interim identity profile, not a
 * substitute for a reviewed SAN-based identity and certificate lifecycle.
 */
export class MeshPeer {
  constructor({ id, host = "127.0.0.1", maxClockSkewMs = MAX_CLOCK_SKEW_MS, socketTimeoutMs = DEFAULT_SOCKET_TIMEOUT_MS, maxConnections = 128, tlsOptions = null, allowInsecure = false } = {}) {
    if (typeof id !== "string" || !/^[a-zA-Z0-9._-]{1,64}$/.test(id)) throw new TypeError("Peer id must be 1-64 safe identifier characters");
    if (!Number.isInteger(maxConnections) || maxConnections < 1 || maxConnections > 4096) throw new RangeError("maxConnections must be an integer between 1 and 4096");
    if (!Number.isInteger(socketTimeoutMs) || socketTimeoutMs < 1 || socketTimeoutMs > 300_000) throw new RangeError("socketTimeoutMs must be an integer between 1 and 300000");
    this.id = id; this.host = host; this.maxClockSkewMs = maxClockSkewMs; this.socketTimeoutMs = socketTimeoutMs; this.maxConnections = maxConnections;
    this.peers = new Map(); this.replays = new Map(); this.activeSockets = new Set(); this.server = null; this.address = null; this.emitMessage = null; this.tlsOptions = tlsOptions; this.allowInsecure = allowInsecure;
  }

  registerPeer(id, { host = "127.0.0.1", port, secret, tlsOptions: peerTlsOptions = null } = {}) {
    if (id === this.id) throw new TypeError("A peer cannot register itself");
    if (typeof id !== "string" || !/^[a-zA-Z0-9._-]{1,64}$/.test(id)) throw new TypeError("Invalid peer id");
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new TypeError("Peer port must be between 1 and 65535");
    if (typeof secret !== "string" || Buffer.byteLength(secret, "utf8") < 32) throw new TypeError("Peer secret must contain at least 32 UTF-8 bytes");
    this.peers.set(id, { id, host, port, secret, tlsOptions: peerTlsOptions });
  }

  async listen({ port = 0, host = this.host } = {}) {
    if (!this.tlsOptions && !this.allowInsecure) throw new Error("TLS is required unless allowInsecure is explicitly enabled");
    if (this.server) throw new Error("Peer is already listening");
    const server = this.tlsOptions
      ? tls.createServer({ ...this.tlsOptions, requestCert: true, rejectUnauthorized: true, minVersion: "TLSv1.2" }, (socket) => {
        if (!socket.authorized) return socket.destroy();
        const peerCertificate = socket.getPeerCertificate();
        const certificatePeerId = peerCertificate?.subject?.CN;
        if (typeof certificatePeerId !== "string" || !/^[a-zA-Z0-9._-]{1,64}$/.test(certificatePeerId)) return socket.destroy();
        this.#handleSocket(socket, certificatePeerId);
      })
      : net.createServer((socket) => this.#handleSocket(socket));
    // Enforce a server-level cap during connection acceptance, including TLS handshakes.
    server.maxConnections = this.maxConnections;
    this.server = server;
    await new Promise((resolve, reject) => {
      const onError = (error) => { server.off("listening", onListening); reject(error); };
      const onListening = () => { server.off("error", onError); resolve(); };
      server.once("error", onError); server.once("listening", onListening); server.listen({ port, host });
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Unable to determine listening address");
    this.address = { host, port: address.port }; return this.address;
  }

  async close() {
    if (!this.server) return;
    const server = this.server; this.server = null; this.address = null;
    // Do not let idle/partial clients hold shutdown open indefinitely.
    for (const socket of this.activeSockets) socket.destroy();
    this.activeSockets.clear();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }

  async send(to, payload) {
    const target = this.peers.get(to); if (!target) throw new Error("Unknown destination peer");
    if (!isPlainObject(payload)) throw new TypeError("Payload must be a JSON object");
    if (!this.tlsOptions && !this.allowInsecure) throw new Error("TLS is required unless allowInsecure is explicitly enabled");
    const unsigned = { version: PROTOCOL_VERSION, id: randomUUID(), from: this.id, to, timestamp: Date.now(), nonce: randomBytes(16).toString("hex"), payload };
    const envelope = { ...unsigned, signature: sign(target.secret, unsigned) }; const frame = encodeFrame(envelope);
    return await new Promise((resolve, reject) => {
      const connectionOptions = { host: target.host, port: target.port };
      const socket = this.tlsOptions
        ? tls.connect({ ...this.tlsOptions, ...(target.tlsOptions ?? {}), ...connectionOptions, servername: target.id, rejectUnauthorized: true, minVersion: "TLSv1.2" })
        : net.createConnection(connectionOptions);
      let buffer = Buffer.alloc(0); let settled = false;
      const finish = (error, result) => { if (settled) return; settled = true; socket.destroy(); if (error) reject(error); else resolve(result); };
      socket.setTimeout(this.socketTimeoutMs, () => finish(new Error("Peer connection timed out")));
      socket.once("error", (error) => finish(error));
      socket.on("data", (chunk) => {
        buffer = Buffer.concat([buffer, chunk]); if (buffer.length < 4) return;
        const length = buffer.readUInt32BE(0); if (length > MAX_FRAME_BYTES) return finish(new Error("Peer response frame too large"));
        if (buffer.length < length + 4) return;
        try { const response = JSON.parse(buffer.subarray(4, length + 4).toString("utf8"));
          if (response?.ok !== true || response.id !== envelope.id) return finish(new Error(response?.error || "Peer rejected message"));
          finish(null, response);
        } catch { finish(new Error("Invalid peer response")); }
      });
      socket.once(this.tlsOptions ? "secureConnect" : "connect", () => socket.write(frame));
    });
  }

  #acceptEnvelope(envelope, certificatePeerId = null) {
    if (!isPlainObject(envelope) || envelope.version !== PROTOCOL_VERSION || typeof envelope.id !== "string" || typeof envelope.from !== "string" || envelope.to !== this.id || typeof envelope.timestamp !== "number" || typeof envelope.nonce !== "string" || !/^[a-f0-9]{32}$/.test(envelope.nonce) || !isPlainObject(envelope.payload)) throw new Error("Malformed or unsupported envelope");
    const peer = this.peers.get(envelope.from); if (!peer) throw new Error("Unauthorised sender");
    if (certificatePeerId !== null && certificatePeerId !== envelope.from) throw new Error("TLS certificate identity does not match envelope sender");
    if (Math.abs(Date.now() - envelope.timestamp) > this.maxClockSkewMs) throw new Error("Message timestamp outside allowed window");
    if (!safeEqualHex(envelope.signature, sign(peer.secret, envelope))) throw new Error("Message authentication failed");
    const now = Date.now();
    for (const [peerId, entries] of this.replays) {
      for (const [nonce, seenAt] of entries) if (now - seenAt > this.maxClockSkewMs) entries.delete(nonce);
      if (entries.size === 0) this.replays.delete(peerId);
    }
    const seen = this.replays.get(envelope.from) ?? new Map();
    if (seen.has(envelope.nonce)) throw new Error("Replay detected");
    if (seen.size >= MAX_REPLAY_ENTRIES) throw new Error("Replay cache capacity reached");
    seen.set(envelope.nonce, now); this.replays.set(envelope.from, seen);
    return { id: envelope.id, from: envelope.from, to: envelope.to, payload: envelope.payload };
  }

  #handleSocket(socket, certificatePeerId = null) {
    if (this.activeSockets.size >= this.maxConnections) return socket.destroy();
    this.activeSockets.add(socket);
    socket.once("close", () => this.activeSockets.delete(socket));
    socket.setTimeout(this.socketTimeoutMs, () => socket.destroy()); let buffer = Buffer.alloc(0); let handled = false;
    socket.on("data", (chunk) => {
      if (handled) return socket.destroy(); buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length > MAX_FRAME_BYTES + 4) return this.#replyError(socket, "Frame too large");
      if (buffer.length < 4) return;
      const length = buffer.readUInt32BE(0); if (length === 0 || length > MAX_FRAME_BYTES) return this.#replyError(socket, "Invalid frame length");
      if (buffer.length < length + 4) return; if (buffer.length !== length + 4) return this.#replyError(socket, "Unexpected trailing data");
      handled = true;
      try { const envelope = JSON.parse(buffer.subarray(4).toString("utf8")); const message = this.#acceptEnvelope(envelope, certificatePeerId);
        if (typeof this.emitMessage === "function") this.emitMessage(message);
        sendFrame(socket, { ok: true, id: message.id, receivedAt: Date.now() });
      } catch (error) { this.#replyError(socket, error instanceof Error ? error.message : "Invalid message"); }
    });
    socket.on("error", () => {});
  }

  #replyError(socket, message) { if (!socket.destroyed) { try { sendFrame(socket, { ok: false, error: message }); } catch {} socket.end(); } }
}
