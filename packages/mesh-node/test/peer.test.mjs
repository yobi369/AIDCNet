import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import tls from "node:tls";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { MeshPeer } from "../src/peer.mjs";

const sharedSecret = "local-development-secret-at-least-32-bytes";
function makeTlsMaterial() {
  const dir = mkdtempSync(join(tmpdir(), "aidcnet-mtls-"));
  const run = (args) => execFileSync("openssl", args, { cwd: dir, stdio: "ignore" });
  run(["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", "ca-key.pem", "-out", "ca.pem", "-days", "2", "-subj", "/CN=AIDCNet Test CA"]);
  const peers = {};
  for (const id of ["alice", "bob"]) {
    run(["req", "-newkey", "rsa:2048", "-nodes", "-keyout", id + "-key.pem", "-out", id + ".csr", "-subj", "/CN=" + id]);
    writeFileSync(join(dir, id + ".ext"), "subjectAltName=IP:127.0.0.1,DNS:localhost\nextendedKeyUsage=serverAuth,clientAuth\nkeyUsage=digitalSignature,keyEncipherment\n");
    run(["x509", "-req", "-in", id + ".csr", "-CA", "ca.pem", "-CAkey", "ca-key.pem", "-CAcreateserial", "-out", id + "-cert.pem", "-days", "2", "-extfile", id + ".ext"]);
    peers[id] = { cert: readFileSync(join(dir, id + "-cert.pem")), key: readFileSync(join(dir, id + "-key.pem")) };
  }
  const ca = readFileSync(join(dir, "ca.pem"));
  return { dir, ca, peers, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

async function securePair(material) {
  const alice = new MeshPeer({ id: "alice", tlsOptions: { ...material.peers.alice, ca: material.ca } });
  const bob = new MeshPeer({ id: "bob", tlsOptions: { ...material.peers.bob, ca: material.ca } });
  const aliceAddress = await alice.listen(); const bobAddress = await bob.listen();
  alice.registerPeer("bob", { ...bobAddress, secret: sharedSecret });
  bob.registerPeer("alice", { ...aliceAddress, secret: sharedSecret });
  return { alice, bob, async close() { await Promise.all([alice.close(), bob.close()]); } };
}

test("mutual TLS encrypts transport and peers still authenticate envelopes", async (t) => {
  const material = makeTlsMaterial(); t.after(() => material.cleanup());
  const peers = await securePair(material); t.after(() => peers.close());
  const received = new Promise((resolve) => { peers.bob.emitMessage = resolve; });
  const ack = await peers.alice.send("bob", { kind: "confidential-test", sequence: 1 });
  assert.equal(ack.ok, true);
  assert.deepEqual(await received.then((message) => message.payload), { kind: "confidential-test", sequence: 1 });
});

test("mutual TLS listener rejects clients without a trusted certificate", async (t) => {
  const material = makeTlsMaterial(); t.after(() => material.cleanup());
  const peers = await securePair(material); t.after(() => peers.close());
  await assert.rejects(new Promise((resolve, reject) => {
    const socket = tls.connect({ host: peers.bob.address.host, port: peers.bob.address.port, ca: material.ca, rejectUnauthorized: true, minVersion: "TLSv1.2" });
    let received = false;
    socket.setTimeout(1500, () => { socket.destroy(); reject(new Error("No application response from TLS peer")); });
    socket.once("secureConnect", () => { const header = Buffer.alloc(4); header.writeUInt32BE(0, 0); socket.write(header); });
    socket.on("data", () => { received = true; resolve(); });
    socket.once("close", () => { if (!received) reject(new Error("TLS peer closed unauthenticated client connection")); });
    socket.once("error", reject);
  }), /closed unauthenticated|TLS|certificate|socket|alert|application response/i);
});

async function pair() {
  const alice = new MeshPeer({ id: "alice" }); const bob = new MeshPeer({ id: "bob" });
  const aliceAddress = await alice.listen(); const bobAddress = await bob.listen();
  alice.registerPeer("bob", { ...bobAddress, secret: sharedSecret });
  bob.registerPeer("alice", { ...aliceAddress, secret: sharedSecret });
  return { alice, bob, async close() { await Promise.all([alice.close(), bob.close()]); } };
}
function signedEnvelope(from, to, secret, payload) {
  const envelope = { version: 1, id: randomUUID(), from, to, timestamp: Date.now(), nonce: randomBytes(16).toString("hex"), payload };
  const canonical = JSON.stringify({ version: envelope.version, id: envelope.id, from: envelope.from, to: envelope.to, timestamp: envelope.timestamp, nonce: envelope.nonce, payload: envelope.payload });
  envelope.signature = createHmac("sha256", secret).update(canonical).digest("hex");
  return envelope;
}
function sendRaw(address, value) {
  const body = Buffer.from(JSON.stringify(value)); const header = Buffer.alloc(4); header.writeUInt32BE(body.length, 0);
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(address); let buffer = Buffer.alloc(0);
    socket.once("error", reject);
    socket.once("connect", () => socket.write(Buffer.concat([header, body])));
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]); if (buffer.length < 4) return;
      const length = buffer.readUInt32BE(0); if (buffer.length < length + 4) return;
      try { resolve(JSON.parse(buffer.subarray(4, length + 4).toString("utf8"))); } catch (error) { reject(error); }
      socket.destroy();
    });
  });
}

test("two TCP peers deliver an authenticated JSON message", async (t) => {
  const peers = await pair(); t.after(() => peers.close());
  const received = new Promise((resolve) => { peers.bob.emitMessage = resolve; });
  const ack = await peers.alice.send("bob", { kind: "ping", sequence: 7 });
  assert.equal(ack.ok, true);
  assert.deepEqual(await received.then((message) => message.payload), { kind: "ping", sequence: 7 });
});

test("rejects a sender that has not been allowlisted", async (t) => {
  const peers = await pair(); t.after(() => peers.close());
  const intruder = new MeshPeer({ id: "intruder" }); const address = await intruder.listen();
  intruder.registerPeer("bob", { ...peers.bob.address, secret: sharedSecret });
  try { await assert.rejects(intruder.send("bob", { kind: "unexpected" }), /Unauthorised sender/); }
  finally { await intruder.close(); }
});

test("rejects a payload modified after signing", async (t) => {
  const peers = await pair(); t.after(() => peers.close());
  const envelope = signedEnvelope("alice", "bob", sharedSecret, { kind: "safe" });
  envelope.payload.kind = "tampered";
  const response = await sendRaw(peers.bob.address, envelope);
  assert.equal(response.ok, false); assert.match(response.error, /authentication failed/i);
});

test("rejects a repeated nonce as a replay", async (t) => {
  const peers = await pair(); t.after(() => peers.close());
  const envelope = signedEnvelope("alice", "bob", sharedSecret, { kind: "once" });
  const first = await sendRaw(peers.bob.address, envelope);
  const second = await sendRaw(peers.bob.address, envelope);
  assert.equal(first.ok, true); assert.equal(second.ok, false); assert.match(second.error, /replay/i);
});

test("rejects malformed zero-length frames", async (t) => {
  const peers = await pair(); t.after(() => peers.close());
  const response = await new Promise((resolve, reject) => {
    const socket = net.createConnection(peers.bob.address); let buffer = Buffer.alloc(0);
    socket.once("error", reject); socket.once("connect", () => { const header = Buffer.alloc(4); socket.write(header); });
    socket.on("data", (chunk) => { buffer = Buffer.concat([buffer, chunk]); if (buffer.length < 4) return; const length = buffer.readUInt32BE(0); if (buffer.length >= length + 4) { resolve(JSON.parse(buffer.subarray(4, length + 4).toString("utf8"))); socket.destroy(); } });
  });
  assert.equal(response.ok, false); assert.match(response.error, /frame length/i);
});

test("rejects weak secrets and invalid peer IDs", () => {
  const peer = new MeshPeer({ id: "test-peer" });
  assert.throws(() => peer.registerPeer("bob", { host: "127.0.0.1", port: 1234, secret: "short" }), /at least 32/);
  assert.throws(() => new MeshPeer({ id: "not a safe id" }), /safe identifier/);
});

test("rejects non-object payloads before opening a connection", async () => {
  const peer = new MeshPeer({ id: "alice" });
  peer.registerPeer("bob", { host: "127.0.0.1", port: 1234, secret: sharedSecret });
  await assert.rejects(peer.send("bob", "not-an-object"), /JSON object/);
});
