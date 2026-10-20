# AIDCNet Experimental Mesh Node

This package provides a **real TCP/TLS peer transport** and an experimental static-route overlay for local multi-process experiments. It is separate from the browser graph simulation.

## Requirements

- Node.js 20+
- OpenSSL for the mTLS integration-test fixtures
- No third-party runtime dependencies

## Current behavior

Implemented: TCP listener/client, length-prefixed JSON frames, per-peer HMAC-SHA-256 message authentication, timestamp freshness checks, in-memory nonce replay rejection, frame-size limits, configurable active-connection caps (128 by default; maximum 4,096), socket timeouts, and explicit peer allowlisting.

Mutual TLS (mTLS) is required by default. TLS 1.2 or newer is required. The client verifies the server certificate against the configured CA and checks the destination peer ID against the certificate DNS name. The server verifies the client certificate against its configured CA and binds the certificate common name (CN) to the envelope's `from` peer ID. This CN-based identity binding is an interim compatibility measure; a stable production protocol should use a reviewed URI-SAN identity profile and certificate lifecycle.

HMAC envelope authentication is retained as an application-layer check. HMAC secrets must be provisioned out of band, are pairwise shared secrets, and are not rotated or distributed by this package. Keep private keys and secrets out of source control.

Plaintext mode requires explicit `allowInsecure: true`; use it only for isolated local tests. It does not encrypt traffic.

## Important limitations

This is a research milestone and has not undergone an independent security audit. The implementation does not provide automated certificate issuance/rotation/revocation, secure key distribution, durable replay protection, persistent delivery, retry/deduplication semantics, backpressure, connection-flood controls, peer discovery, membership consensus, production-grade multi-hop routing, or application-level authorization. The replay cache is process-local and resets on restart. A transport acknowledgement means envelope acceptance, not durable business completion. Do not expose it to the public internet or use it for sensitive production workloads.

See [the threat model](../../docs/THREAT_MODEL.md), [protocol notes](../../docs/PROTOCOL.md), and [validation plan](../../docs/VALIDATION_PLAN.md).

## Run tests

From the repository root:

```sh
npm install
npm run test:mesh
```

The mTLS tests generate short-lived test certificates with OpenSSL. They do not use production certificates.

## API sketch

```js
import { readFileSync } from "node:fs";
import { MeshPeer } from "./src/peer.mjs";

const peer = new MeshPeer({
  id: "node-a",
  tlsOptions: {
    cert: readFileSync(process.env.AIDCNET_CERT_PATH),
    key: readFileSync(process.env.AIDCNET_KEY_PATH),
    ca: readFileSync(process.env.AIDCNET_CA_PATH),
  },
});
const address = await peer.listen({ host: "127.0.0.1", port: 0 });
peer.registerPeer("node-b", {
  host: process.env.AIDCNET_PEER_B_HOST,
  port: Number(process.env.AIDCNET_PEER_B_PORT),
  secret: process.env.AIDCNET_PEER_B_SECRET,
});
try {
  await peer.send("node-b", { kind: "health-check", at: Date.now() });
} finally {
  await peer.close();
}
```

Use certificate DNS SANs matching configured destination peer IDs and client certificate CNs matching the sending peer IDs for the current experimental identity profile. Verify the deployment-specific certificate policy and key handling before any use beyond a local lab.


## Experimental multi-hop router

The opt-in `MeshRouter` is available from `src/router.mjs`. It forwards over manually provisioned direct `MeshPeer` links and includes a hop limit, visited-peer loop checks, and bounded expiring in-memory duplicate tracking.

```js
import { MeshRouter } from "./src/router.mjs";

const router = new MeshRouter({
  peer,
  routes: { "node-c": "node-b" },
  maxHops: 8,
  onDeliver: (message) => console.log(message),
  onError: (error) => console.error(error),
}).start();
```

Register the next-hop peer (here, `node-b`) on the underlying transport before sending. Configure each forwarding peer's own route to the final destination. Call `router.stop()` when shutting down the routing overlay.

The sender's `send()` result confirms acceptance by the first hop only; it is not proof of final delivery. Route metadata is not end-to-end signed, routes are static, and deduplication resets on process restart. See [multi-hop routing notes](../../docs/multi-hop-routing.md). This feature is experimental and not production-ready.
