# Deterministic Mesh Engine

## What this adds

AIDCNet now has a deterministic, testable domain engine for an in-memory peer graph. It validates topology input, finds shortest routes with breadth-first search, excludes offline peers from routes, detects disconnected destinations, and calculates reachability from graph state.

## Run and test

```sh
npm install
npm test
npm run typecheck
npm run build
```

## Important boundary

This engine executes inside one process and is intended for reproducible experiments and UI integration. It does **not** open sockets, discover remote peers, authenticate identities, persist messages, or encrypt payloads. Its reachability percentage measures graph connectivity for the current input only; it is not a live availability or reliability SLA.

## Next research milestones

1. Add property-based tests for graph invariants and larger random topologies.
2. Add an isolated multi-process transport adapter with explicit message framing and timeouts.
3. Define authenticated peer identity and replay-resistant protocol semantics before sending sensitive data.
4. Add adversarial integration tests, load methodology, and repeatable benchmark artifacts.
5. Evaluate maintained cryptographic protocol libraries with expert review; do not implement custom cryptography.
