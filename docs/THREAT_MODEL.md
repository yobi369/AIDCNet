# AIDCNet Experimental Mesh Transport — Threat Model

**Status:** engineering threat model for research and local experiments; not an independent security assessment.

## System boundary

The current transport is a Node.js process that accepts one length-prefixed JSON envelope per TCP/TLS connection. A sender must register a destination and a shared HMAC secret. The receiver checks the envelope, sender allowlist, timestamp, signature, and per-process nonce cache. The browser Mesh Lab is a separate in-memory graph experiment; it does not use this transport.

## Assets to protect

- Confidentiality and integrity of messages in transit.
- Peer identity and membership configuration.
- TLS private keys, CA trust material, and pairwise HMAC secrets.
- Availability and memory/CPU of each node.
- Correctness of message acceptance and any future side effects triggered by messages.
- Accuracy of product claims and operational metrics.

## Trust boundaries and assumptions

- TLS certificates, private keys, CA bundles, and HMAC secrets are provisioned outside the application and are trusted to be correct.
- A trusted CA can issue a certificate to an unintended party; certificate issuance policy and revocation are not managed here.
- Peer registration is an administrator-controlled allowlist, not a consensus-backed membership protocol. TLS mode currently matches the client certificate subject CN to the envelope sender ID and the destination peer ID to the server certificate DNS SAN; this interim profile needs independent review and migration to a stable URI-SAN identity scheme.
- The current replay cache and peer registry are process-local state.
- Payloads are JSON objects. The transport does not define application-level authorization for commands embedded in a payload.
- The implementation has not had an independent cryptographic or penetration review.

## Threats and present controls

| Threat | Present mitigation | Residual risk |
|---|---|---|
| Passive network observer | TLS/mTLS required by default | Misconfiguration, compromised endpoints, or explicit insecure opt-in can expose traffic |
| Untrusted client connection | TLS client-certificate verification; certificate CN must match envelope sender ID; registered sender required | CN is an interim binding; no managed URI-SAN identity registry, certificate lifecycle, or revocation |
| Message alteration | TLS integrity plus HMAC envelope authentication | Shared-secret custody and rotation are external responsibilities |
| Replay within one process | Timestamp freshness and per-sender nonce cache | Replay cache resets after restart and is not shared across replicas |
| Oversized frame | 64 KiB frame limit | Many concurrent connections and repeated partial frames can still consume resources |
| Slow/incomplete client | Socket timeout plus configurable connection cap (128 by default) | Limits need workload-specific tuning and adversarial load testing; TLS handshake and process-level resource budgets still need review |
| Unknown sender | Explicit registered-peer allowlist | No automated provisioning, revocation, or membership consensus |
| Secret leakage | No secrets should be committed; caller supplies secrets | No built-in secret store, key rotation, audit trail, or secret-redaction layer |
| Malicious application payload | JSON-object validation | No schema, per-message authorization, sandbox, or application policy is provided |
| False dashboard confidence | Documentation labels graph/UI values as simulations | Remaining demo panels must be replaced or clearly marked before operational use |

## Required security invariants

1. Network use fails closed unless TLS is configured; insecure mode is for controlled local tests only.
2. A message is not accepted unless its frame, envelope, destination, registered sender, freshness, and HMAC all validate.
3. Invalid or oversized input must not trigger application message delivery.
4. No UI simulation may be described as a measurement from the peer transport.
5. Private keys and shared secrets must not be logged or committed.
6. Security-sensitive payload handlers must implement their own authorization and validation.

## Not yet solved

- Certificate issuance, revocation, renewal, and rotation; replace interim CN-based client identity binding with a reviewed URI-SAN identity profile.
- Managed secret distribution and rotation.
- Durable replay/idempotency state across restarts and replicas.
- Durable delivery, acknowledgements beyond transport acceptance, retries, deduplication, ordering, backpressure, and congestion control.
- Global CPU/memory budgets, rate limits, structured security audit events, and load-tested denial-of-service controls.
- Peer discovery, authenticated membership changes, consensus, and split-brain handling.
- End-to-end application authorization, payload schemas, and safe execution policy.
- Independent review, deployment hardening, and real-world operational evidence.

## Security review checklist

Before any deployment beyond an isolated lab, require: an approved deployment-specific threat model; reviewed certificate/identity lifecycle; secrets outside source control; strict network ingress policy; bounded connection and memory behavior demonstrated under load; restart/replay and partition tests; log redaction; dependency and artifact review; independent security assessment; incident and revocation procedures. A passing unit/CI suite is necessary but not sufficient.
