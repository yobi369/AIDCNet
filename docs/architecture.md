# Architecture and Implementation Boundaries

## Current implementation

The repository is presently a client-side React dashboard prototype.

- **UI:** one React component in `aidcnet_prototype.tsx`.
- **Runtime/build:** Vite, TypeScript, React, and Tailwind CSS.
- **Demo state:** generated in the browser with random values and timers.
- **Tests:** unit tests for the bounded demo-metric helper.
- **Specification:** the PDF at the repository root describes the intended concept; its existence does not establish that the described system has been implemented.

## Not implemented

The browser dashboard still has no live backend or peer discovery. A separate experimental Node.js package now implements TCP message transport with HMAC-based sender authentication, timestamp freshness checks, bounded frames, and process-local replay rejection. There is still no traffic encryption/TLS profile, persistent queue, consensus, AI model, telemetry backend, or key-management service. There is no operational uptime measurement. UI labels must not be interpreted as evidence of those capabilities.

## Recommended target architecture

Before production implementation, split the code into independently testable boundaries:

1. **Presentation layer** — views and accessible components; no security decisions.
2. **Domain layer** — typed node, peer, message, route, and status models with deterministic unit tests.
3. **Transport adapter** — `packages/mesh-node` is an initial local TCP experiment with explicit framing, timeouts, and HMAC authentication. It is not encrypted and is not production-ready; add reviewed TLS/mTLS, backpressure, durable delivery, and protocol versioning.
4. **Identity and trust** — current transport uses manually provisioned shared secrets and an allowlist; define certificate-backed identities, secure provisioning/rotation, authorization rules, and durable replay protection.
5. **Security protocol** — maintained, standards-based cryptographic libraries and a documented threat model; no custom cryptographic primitives.
6. **Observability** — measured counters, latency, errors, and health checks with provenance and timestamps.
7. **Deployment** — reproducible dependency lockfile, automated CI, dependency and secret scanning, release process, and operational runbooks.

## Quality gates for a real network

- Unit and property tests for domain logic.
- Integration tests against multiple local peers.
- Negative tests for spoofing, replay, malformed input, disconnections, and resource exhaustion.
- Cryptographic protocol review before claiming confidentiality or post-quantum protection.
- Load tests with published environment and methodology.
- No synthetic metrics presented as production measurements.
