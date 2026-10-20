# AIDCNet Experimental Mesh Node

This package adds a **real TCP transport** for local multi-peer experiments. Unlike the browser dashboard simulation, it opens TCP sockets and validates authenticated message envelopes.

## Requirements

- Node.js 20+
- No third-party runtime dependencies

## Status and safety boundary

Implemented: TCP listener/client, length-prefixed JSON frames, per-peer HMAC-SHA-256 message authentication, timestamp freshness checks, in-memory nonce replay rejection, frame size limits, and timeout handling.

Not implemented: traffic encryption, certificate-based peer identity, key rotation/distribution, durable delivery, congestion control, peer discovery, consensus, or production deployment hardening. HMAC secrets must be provisioned out of band and each receiver must know the sender secret. **Do not send sensitive data or expose this experimental service to the public internet.** HMAC provides integrity/authentication, not confidentiality. The replay cache is process-local and resets on restart.

This is a research milestone, not a production security protocol. Add a reviewed TLS/mTLS profile, formal protocol specification, threat modeling, and adversarial integration tests before wider deployment.

## Run tests

From the repository root:

```sh
node --test packages/mesh-node/test/*.test.mjs
```

## API sketch

```js
import { MeshPeer } from "./src/peer.mjs";

const peer = new MeshPeer({ id: "node-a" });
const address = await peer.listen({ host: "127.0.0.1", port: 0 });
// Provision the destination host, port, and pairwise secret out of band.
peer.registerPeer("node-b", { host: "127.0.0.1", port: 9002, secret: process.env.AIDCNET_PEER_B_SECRET });
await peer.send("node-b", { kind: "health-check", at: Date.now() });
await peer.close();
```

The listening port can be `0` for an OS-assigned ephemeral port. Keep the listener on loopback during development.
