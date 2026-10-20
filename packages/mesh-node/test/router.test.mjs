import test from "node:test";
import assert from "node:assert/strict";
import { MeshPeer } from "../src/peer.mjs";
import { MeshRouter } from "../src/router.mjs";

const secretAB = "alice-bob-shared-secret-with-32-bytes-minimum";
const secretBC = "bob-charlie-shared-secret-with-32-bytes";

async function makeLine() {
  const alice = new MeshPeer({ id: "alice", allowInsecure: true });
  const bob = new MeshPeer({ id: "bob", allowInsecure: true });
  const charlie = new MeshPeer({ id: "charlie", allowInsecure: true });
  const a = await alice.listen({ host: "127.0.0.1", port: 0 });
  const b = await bob.listen({ host: "127.0.0.1", port: 0 });
  const c = await charlie.listen({ host: "127.0.0.1", port: 0 });
  alice.registerPeer("bob", { ...b, secret: secretAB });
  bob.registerPeer("alice", { ...a, secret: secretAB });
  bob.registerPeer("charlie", { ...c, secret: secretBC });
  charlie.registerPeer("bob", { ...b, secret: secretBC });
  return {
    alice, bob, charlie,
    async close() { await Promise.all([alice.close(), bob.close(), charlie.close()]); },
  };
}

test("routes a message across three separate peer instances over two TCP hops", async (t) => {
  const peers = await makeLine(); t.after(() => peers.close());
  const delivered = new Promise((resolve) => {
    new MeshRouter({ peer: peers.charlie, onDeliver: resolve }).start();
  });
  const errors = [];
  new MeshRouter({ peer: peers.bob, routes: { charlie: "charlie" }, onError: (error) => errors.push(error) }).start();
  const aliceRouter = new MeshRouter({ peer: peers.alice, routes: { charlie: "bob" } }).start();

  const sent = await aliceRouter.send("charlie", { kind: "distributed-ping", sequence: 9 });
  const result = await Promise.race([
    delivered,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Multi-hop delivery timed out")), 2000)),
  ]);
  assert.ok(sent.id);
  assert.equal(result.source, "alice");
  assert.equal(result.destination, "charlie");
  assert.deepEqual(result.body, { kind: "distributed-ping", sequence: 9 });
  assert.deepEqual(result.path, ["alice", "bob", "charlie"]);
  assert.deepEqual(errors, []);
});

test("rejects a route whose next hop would revisit a peer", async (t) => {
  const peers = await makeLine(); t.after(() => peers.close());
  const errors = [];
  new MeshRouter({ peer: peers.bob, routes: { charlie: "alice" }, onError: (error) => errors.push(error) }).start();
  const aliceRouter = new MeshRouter({ peer: peers.alice, routes: { charlie: "bob" } }).start();
  await aliceRouter.send("charlie", { kind: "loop-test" });
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.ok(errors.some((error) => /route loop/i.test(error.message)));
});

test("validates route configuration and message bodies", async (t) => {
  const peers = await makeLine(); t.after(() => peers.close());
  assert.throws(() => new MeshRouter({ peer: peers.alice, maxHops: 0 }), /maxHops/);
  const router = new MeshRouter({ peer: peers.alice });
  await assert.rejects(router.send("charlie", "not an object"), /JSON object/);
  await assert.rejects(router.send("charlie", { kind: "unroutable" }), /No route configured/);
});
