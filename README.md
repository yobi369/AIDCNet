# AIDCNet

**AIDCNet is an experimental, AI-oriented decentralized-network research project** with two deliberately separate parts: a browser-based routing lab for repeatable topology experiments, and a Node.js peer-transport package for real local TCP/TLS message exchange.

The goal is to evolve this into a useful, measurable, independently reviewable distributed-systems platform—not to present mock metrics as a finished network.

> **Status:** research prototype, not production-ready. The peer package opens real sockets and has automated integration tests, but peer discovery, durable delivery, multi-node coordination/consensus, AI inference integration, production identity provisioning, and independent security review are not complete. Do not expose experimental nodes to the public internet or use them to protect sensitive workloads.

## What actually works today

- **Deterministic mesh lab:** calculates shortest paths and reachability over an in-memory graph. The graph is local application state, not a remote network.
- **Experimental peer transport:** Node.js TCP framing and JSON message envelopes, per-peer HMAC-SHA-256 authentication, allowlisted senders, timestamp freshness checks, bounded frames, socket timeouts, and an in-memory nonce replay cache.
- **Encrypted peer channel when correctly configured:** TLS 1.2+ mutual TLS (mTLS) is required by default. The client verifies the server DNS SAN against the destination peer ID; the server binds the client certificate CN to the envelope sender ID. This is an interim identity profile, not a managed certificate lifecycle. HMAC envelope authentication remains a separate application-layer check.
- **Explicit local-only escape hatch:** plaintext transport requires `allowInsecure: true`. It is for isolated local tests only—not production or untrusted networks.
- **Automated verification:** typecheck, front-end unit tests, real socket integration tests, mTLS certificate tests, and production frontend build run in GitHub Actions.

## Quick start

Requirements: Node.js 20+, npm, and OpenSSL for the mTLS integration-test fixtures.

```bash
npm install
npm run dev
```

Run the verification suite:

```bash
npm run check
node --test packages/mesh-node/test/*.test.mjs
```

The dashboard opens at the Vite URL printed in the terminal.

## Repository map

- `aidcnet_prototype.tsx` — React dashboard prototype; several network and AI panels remain simulated.
- `src/core/meshEngine.ts` — deterministic in-memory graph routing and reachability calculations.
- `src/components/MeshLab.tsx` — interactive topology experiment backed by the graph engine.
- `packages/mesh-node/src/peer.mjs` — experimental TCP/TLS peer transport.
- `packages/mesh-node/test/` — socket-level tests for message delivery, authentication, replay rejection, malformed frames, and mTLS behavior.
- `packages/mesh-node/README.md` — peer transport API and setup notes.
- `docs/THREAT_MODEL.md` — assets, trust boundaries, threats, mitigations, and residual risks.
- `docs/PROTOCOL.md` — current wire-envelope and transport behavior.
- `docs/VALIDATION_PLAN.md` — measurable exit criteria for moving beyond research use.
- `SECURITY.md` — vulnerability-reporting guidance and security-claim policy.

## Configure a secure local peer pair

Each peer needs a unique certificate/key pair issued by a CA trusted by the other peer. Keep private keys and HMAC secrets out of source control and provision them through a suitable secret-management process. The transport does not issue or rotate certificates or distribute secrets for you.

Illustrative setup:

```js
import { readFileSync } from "node:fs";
import { MeshPeer } from "./packages/mesh-node/src/peer.mjs";

const tlsOptions = {
  cert: readFileSync(process.env.AIDCNET_CERT_PATH),
  key: readFileSync(process.env.AIDCNET_KEY_PATH),
  ca: readFileSync(process.env.AIDCNET_CA_PATH),
};

const peer = new MeshPeer({ id: "node-a", tlsOptions });
const address = await peer.listen({ host: "127.0.0.1", port: 0 });

// Register only a known, provisioned destination.
// Share its address and a unique >=32-byte HMAC secret out of band.
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

This snippet illustrates the API; it is not a complete deployment recipe. Verify certificate SANs, hostname expectations, secret permissions, network policy, and operational logging before use. Bind to loopback for local development. Do not use shared development secrets or the insecure override on public networks.

## What the security controls do—and do not do

| Control | Current behavior | Important limit |
|---|---|---|
| mTLS | Required by default when opening/sending; TLS 1.2+ and trusted client certificates | Correct CA/certificate provisioning, rotation, revocation, and operational key custody remain external |
| HMAC-SHA-256 | Authenticates the defined JSON envelope with a per-peer secret | Shared-secret distribution and rotation are not implemented; this is not a digital-signature identity system |
| Replay detection | Timestamp window plus nonce cache per sender | Cache is in memory and resets on restart; no durable exactly-once guarantee |
| Frame limits/timeouts | Rejects oversized/invalid frames and times out inactive sockets | Not a complete defense against connection floods or all resource-exhaustion attacks |
| Sender allowlist and certificate binding | Registered sender IDs are required; in TLS mode the client certificate CN must match the envelope sender ID and the server DNS SAN must match the destination ID | CN binding is interim; certificate issuance, URI-SAN identity, revocation, rotation, and membership consensus are not implemented |

The complete boundaries and residual risks are in [the threat model](docs/THREAT_MODEL.md). The wire behavior is documented in [the protocol notes](docs/PROTOCOL.md).

## Product direction

AIDCNet should become a system whose claims are backed by observable evidence: independently launched peers, explicit identity lifecycle, durable bounded delivery, failure/recovery behavior, measured performance under published workloads, and a dashboard fed by real service events. See [the validation plan](docs/VALIDATION_PLAN.md) for gates. A green build proves the tested code passed those checks; it does not prove production readiness or security.

## Contributing

Keep changes small, testable, and documented. Never commit private keys, live credentials, customer data, or generated certificates. Do not add invented uptime, threat-detection, encryption-strength, or performance values to the dashboard. Every new security or performance claim must link to an implementation and reproducible test or measurement.
