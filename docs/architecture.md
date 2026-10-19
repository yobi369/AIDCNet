# Architecture and Implementation Boundaries

## Current implementation

The repository is presently a client-side React dashboard prototype.

- **UI:** one React component in `aidcnet_prototype.tsx`.
- **Runtime/build:** Vite, TypeScript, React, and Tailwind CSS.
- **Demo state:** generated in the browser with random values and timers.
- **Tests:** unit tests for the bounded demo-metric helper.
- **Specification:** the PDF at the repository root describes the intended concept; its existence does not establish that the described system has been implemented.

## Not implemented

There is currently no server, peer discovery, P2P transport, consensus, persistent message queue, node authentication, AI model, telemetry backend, key-management service, cryptographic handshake, or end-to-end encryption. There is no operational uptime measurement. UI labels must not be interpreted as evidence of those capabilities.

## Recommended target architecture

Before production implementation, split the code into independently testable boundaries:

1. **Presentation layer** — views and accessible components; no security decisions.
2. **Domain layer** — typed node, peer, message, route, and status models with deterministic unit tests.
3. **Transport adapter** — explicitly defined protocol, connection lifecycle, backpressure, timeouts, and error handling.
4. **Identity and trust** — authenticated peer identities, authorization rules, key lifecycle, and replay protection.
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
