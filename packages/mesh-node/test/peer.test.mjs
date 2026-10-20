import test from "node:test";
import assert from "node:assert/strict";
import { MeshPeer } from "../src/peer.mjs";

const sharedSecret = "local-development-secret-at-least-32-bytes";
async function pair() {
  const alice = new MeshPeer({ id: "alice" }); const bob = new MeshPeer({ id: "bob" });
  const aliceAddress = await alice.listen(); const bobAddress = await bob.listen();
  alice.registerPeer("bob", { ...bobAddress, secret: sharedSecret });
  bob.registerPeer("alice", { ...aliceAddress, secret: sharedSecret });
  return { alice, bob, async close() { await Promise.all([alice.close(), bob.close()]); } };
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
