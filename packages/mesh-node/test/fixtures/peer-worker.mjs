import { MeshPeer } from "../src/peer.mjs";

const secret = "local-development-secret-at-least-32-bytes";
const peer = new MeshPeer({ id: "worker-peer", host: "127.0.0.1", allowInsecure: true });

function write(value) {
  process.stdout.write(JSON.stringify(value) + "\n");
}

try {
  peer.registerPeer("test-parent", { host: "127.0.0.1", port: 1, secret });
  peer.emitMessage = (message) => write({ type: "message", message });
  const address = await peer.listen({ host: "127.0.0.1", port: 0 });
  write({ type: "ready", id: "worker-peer", address });
} catch (error) {
  write({ type: "error", error: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
}

process.on("SIGTERM", async () => {
  await peer.close();
  process.exit(0);
});
