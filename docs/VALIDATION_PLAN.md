# AIDCNet Product Validation Plan

This plan defines evidence required to move from an experimental prototype toward a dependable product. These are exit criteria, not claims that the work is already complete.

## Gate 1 — Reproducible engineering

- Commit and use a dependency lockfile; CI installs from the lockfile rather than resolving floating dependency versions.
- Run typecheck, UI unit tests, peer integration tests, production build, dependency audit, and secret scanning in CI.
- Pin or otherwise securely manage CI actions and document the supported Node.js/OpenSSL versions.
- Publish test commands and explain which behaviors each suite covers.

**Evidence:** clean install from a fresh checkout; green CI; no unexplained test skips; reproducible artifact metadata.

## Gate 2 — Protocol correctness and hostile-input behavior

- Test separate OS processes, not only two peer objects in one process.
- Cover invalid certificate, wrong CA, certificate identity mismatch, untrusted sender, tampered signature, expired timestamp, replay, duplicate JSON/invalid JSON, zero/oversized frames, truncated frames, trailing bytes, client disconnect, timeout, and callback failure.
- Add property/fuzz tests for frame decoding and envelope validation.
- Bound concurrent sockets, queued bytes, per-peer memory, message rate, and work per message.
- Verify no rejected input reaches application handlers.

**Evidence:** repeatable adversarial test reports, fuzz corpus/regression tests, and measured resource limits.

## Gate 3 — Identity and operational lifecycle

- Define a peer identity registry and bind authenticated TLS identities to registered peer IDs.
- Add certificate issuance/renewal/revocation and rotation procedures; store private keys and secrets outside source control.
- Persist replay/idempotency state safely across restart or explicitly document a weaker delivery contract.
- Define safe retries, acknowledgement semantics, deduplication, bounded queues, backpressure, shutdown, and recovery.
- Add structured audit events with secret/payload redaction.

**Evidence:** rotation/revocation drill, restart tests, failure-injection report, and operator runbook.

## Gate 4 — Useful distributed product

- Run at least three peers as separate processes and demonstrate actual multi-hop routing or clearly scope routing to direct connections.
- Implement and document peer discovery and membership semantics before claiming a self-organizing network.
- Decide whether consensus is required by a concrete use case; do not add a consensus label without a specified fault model and tested algorithm.
- Define the AI use case, threat boundaries, model/provider interface, data handling, and authorization before connecting inference.
- Feed dashboard state from actual peer/service events; retain explicit demo labels for simulated data.
- Provide a runnable local multi-node demo with reproducible configuration and a clean teardown.

**Evidence:** end-to-end demo, event traces, failure recovery results, and a clear list of supported versus unsupported capabilities.

## Gate 5 — Performance, reliability, and independent review

- Publish workload, topology, hardware/software versions, warm-up, duration, sample count, and raw results for latency, throughput, memory, CPU, and delivery behavior.
- Test packet loss, process crash/restart, network partition, slow peers, clock skew, burst traffic, and load saturation.
- Define SLOs only after repeated measurements; report confidence/variance and limitations.
- Complete independent security and architecture reviews and resolve high/critical findings.
- Prepare deployment hardening, monitoring, backup/recovery, incident response, vulnerability disclosure, and upgrade/rollback procedures.

**Evidence:** reproducible benchmark artifacts, failure matrix, reviewer findings, and signed-off release checklist.

## Current truthful product statement

AIDCNet currently combines a deterministic in-memory mesh-routing lab with an experimental TCP/TLS peer transport and automated tests. It is a research foundation. It is not yet a production decentralized AI network, and no independent security review or real-world performance guarantee is implied.
