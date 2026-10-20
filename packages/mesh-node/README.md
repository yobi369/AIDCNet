# AIDCNet Experimental Mesh Node

This package adds a **real TCP transport** for local multi-peer experiments. Unlike the browser dashboard simulation, it opens TCP sockets and validates authenticated message envelopes.

## Requirements

- Node.js 20+
- No third-party runtime dependencies

## Status and safety boundary

Implemented: TCP listener/client, length-prefixed JSON frames, per-peer HMAC-SHA-256 message authentication, timestamp freshness checks, in-memory nonce replay rejection, frame size limits, and timeout handling.

Optional mutual TLS (mTLS) is now supported when each peer is configured with a certificate, private key, and trusted CA; TLS 1.2 or newer is required. The server requests and verifies a client certificate. HMAC envelope authentication and allowlisting remain enabled as a separate application-layer check. Not implemented: automated certificate issuance/rotation, secure key distribution, durable delivery, congestion control, peer discovery, consensus, or production deployment hardening. HMAC secrets must be provisioned out of band and each receiver must know the sender secret. Without `tlsOptions`, the TCP transport is unencrypted and must only be used on localhost or a trusted isolated network. With mTLS correctly configured, TLS encrypts the channel and validates certificates against the configured CA; this is still an experimental implementation and has not undergone an independent security audit. The replay cache is process-local and resets on restart. Do not expose it to the public internet without a full threat model and deployment review.

This is a research milestone, not a production security protocol. Add a reviewed TLS/mTLS profile, formal protocol specification, threat modeling, and adversarial integration tests before wider deployment.

## Run tests

From the repository root:

```sh
node --test packages/mesh-node/test/*.test.mjs
```

## API sketch

```js
import { MeshPeer } from "./src/peer.mjs";

const peer = new MeshPeer({ id: "node-a", tlsOptions: { cert: nodeCert, key: nodeKey, ca: trustedCa } });
const address = await peer.listen({ host: "127.0.0.1", port: 0 });
// Provision the destination host, port, and pairwise secret out of band.
peer.registerPeer("node-b", { host: "127.0.0.1", port: 9002, secret: process.env.AIDCNET_PEER_B_SECRET });
await peer.send("node-b", { kind: "health-check", at: Date.now() });
await peer.close();
```

The listening port can be `0` for an OS-assigned ephemeral port. Keep the listener on loopback during development.
