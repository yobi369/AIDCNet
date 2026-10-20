import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { MeshPeer } from "../src/peer.mjs";

const sharedSecret = "local-development-secret-at-least-32-bytes";
const workerPath = new URL("./fixtures/peer-worker.mjs", import.meta.url);

function lineReader(stream) {
  let buffer = "";
  const lines = [];
  const waiters = [];
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    buffer += chunk;
    while (buffer.includes("\n")) {
      const index = buffer.indexOf("\n");
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      if (!line.trim()) continue;
      const value = JSON.parse(line);
      const waiter = waiters.shift();
      if (waiter) waiter(value);
      else lines.push(value);
    }
  });
  return {
    next() {
      if (lines.length) return Promise.resolve(lines.shift());
      return new Promise((resolve) => waiters.push(resolve));
    },
  };
}

test("delivers authenticated messages between separate Node.js processes", async (t) => {
  const child = spawn(process.execPath, [workerPath.pathname], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = lineReader(child.stdout);
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  t.after(() => {
    if (!child.killed) child.kill("SIGTERM");
  });

  const ready = await Promise.race([
    output.next(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Peer worker did not become ready: " + stderr)), 5000)),
  ]);
  assert.equal(ready.type, "ready", stderr || JSON.stringify(ready));
  assert.equal(ready.id, "worker-peer");
  assert.ok(ready.address.port > 0);

  const parent = new MeshPeer({ id: "test-parent", host: "127.0.0.1", allowInsecure: true });
  parent.registerPeer("worker-peer", { ...ready.address, secret: sharedSecret });
  t.after(() => parent.close());

  const ack = await parent.send("worker-peer", { kind: "process-boundary-check", sequence: 42 });
  assert.equal(ack.ok, true);
  const delivered = await Promise.race([
    output.next(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Peer worker did not report delivery: " + stderr)), 5000)),
  ]);
  assert.equal(delivered.type, "message");
  assert.equal(delivered.message.from, "test-parent");
  assert.deepEqual(delivered.message.payload, { kind: "process-boundary-check", sequence: 42 });

  child.kill("SIGTERM");
  await Promise.race([
    once(child, "exit"),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Peer worker failed to stop cleanly")), 3000)),
  ]);
});
