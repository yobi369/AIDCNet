# Security Policy

## Current scope

AIDCNet contains a browser-based routing simulation and an experimental Node.js TCP/TLS peer transport. The transport implements TLS/mTLS support, HMAC-SHA-256 envelope authentication, an explicit peer allowlist, freshness checks, a bounded in-memory replay cache, frame-size limits, and socket timeouts. These controls have integration tests but have **not** received an independent security audit.

Do not expose the experimental transport to the public internet or rely on it for sensitive or production workloads. Peer identity lifecycle, certificate issuance/rotation/revocation, managed secret distribution, durable replay protection, connection-flood defenses, application-level authorization, and production operations are not complete. Dashboard AI/network metrics may still be simulated and are not security telemetry.

See [the threat model](docs/THREAT_MODEL.md), [protocol notes](docs/PROTOCOL.md), and [validation plan](docs/VALIDATION_PLAN.md) for current assumptions and release gates.

## Reporting a vulnerability

Please do not publish exploit details in a public issue. Use GitHub's private vulnerability reporting feature if enabled, or contact the repository owner through a private GitHub channel. Include the affected commit/file, impact, environment, and minimal reproduction steps where safe. Do not include real credentials, private keys, or personal/customer data.

## Security-claim policy

A passing test or CI run is evidence only for the tested cases. Do not describe AIDCNet as production-secure, quantum-resistant, globally connected, zero-knowledge, consensus-backed, or AI-enabled in a way that implies implemented capabilities without a specific implementation and independent evidence. New security-sensitive behavior must include a threat analysis, adversarial tests, operational limitations, and an independent review before production claims are made.
