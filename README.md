# AIDCNet

AIDCNet is an early **front-end prototype** exploring the concept of an AI-assisted decentralized network. The current repository contains a React/TypeScript dashboard prototype and a technical specification PDF.

> **Important scope note:** this repository does not currently implement a live peer-to-peer network, AI inference or training, message transport, consensus, or production cryptography. Node activity, routing, delivery, and performance metrics in the dashboard are simulated. Security labels in the prototype are conceptual UI, not evidence of implemented controls. Do not use it to protect real data or make security decisions.

## Current status

- **Stage:** UI concept / simulation prototype
- **Runtime:** React + TypeScript + Vite
- **Automated checks:** CI build and unit tests
- **Production status:** not production-ready; no live network service or security protocol is implemented

## Run locally

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Quality checks

```bash
npm test
npm run build
npm run typecheck
```

The build and tests validate the front-end scaffold and its small utility layer; they do **not** validate a distributed network, cryptographic implementation, AI model, or production deployment.

## Architecture today

- `packages/mesh-node/` — experimental Node.js TCP peer transport with HMAC-SHA-256 message authentication, bounded frames, timestamp freshness checks, in-memory replay rejection, and mutual TLS (mTLS) by default; plaintext mode requires an explicit insecure opt-in and is intended only for controlled local tests. See the package README for setup and limitations.

- `aidcnet_prototype.tsx` — single-file dashboard prototype with network, AI metrics, message-routing, and cryptography panels.
- `src/lib/demoMetrics.ts` — bounded metric helper used by the simulated dashboard.
- `AIDCNet_ Technical Specification & Implementation Guide.pdf` — project concept and implementation guide.

## Known limitations and next engineering milestones

1. Replace random UI state with explicit, typed demo fixtures and a documented data model.
2. Separate UI components, domain logic, transport adapters, and configuration.
3. Complete the threat model and protocol specification for the experimental TCP transport; add a reviewed TLS/mTLS deployment profile before use beyond trusted local experiments.
4. Keep using maintained cryptographic primitives (the current transport uses Node.js crypto HMAC); do not implement primitives from scratch. Add reviewed TLS/mTLS and key provisioning before treating transport as secure.
5. Implement authenticated peer identity, message integrity, replay protection, key lifecycle, and secure failure handling before claiming secure transport.
6. Expand the new local TCP integration tests with replay/tamper, malformed-frame, disconnect, resource-exhaustion, and multi-process adversarial cases; add dependency scanning and reproducible locked builds.
7. Publish measured performance and availability only when supported by instrumentation and repeatable tests.

## Security and reporting

Please do not report simulated dashboard numbers as measured network performance or describe the current prototype as quantum-resistant, zero-knowledge, globally connected, or production-secure. Those capabilities require real implementations and independent verification.

For security concerns, contact the repository owner privately rather than publishing exploit details in an issue.
