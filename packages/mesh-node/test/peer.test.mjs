import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { MeshPeer } from "../src/peer.mjs";

const sharedSecret = "local-development-secret-at-least-32-bytes";
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
