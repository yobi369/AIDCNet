# Deterministic Mesh Engine

## What this adds

AIDCNet has a deterministic, testable domain engine for an in-memory peer graph. It validates topology input, finds shortest routes with breadth-first search, excludes offline peers from routes, detects disconnected destinations, and calculates reachability from graph state.

The UI in `src/components/MeshLab.tsx` uses this engine to let a user take peers offline, change source/destination, and inspect recalculated routes. Results are computed from local in-memory state; the lab does not send packets to the transport package.

## Relationship to the peer transport

The separate `packages/mesh-node/` package opens real TCP/TLS connections between explicitly configured peers and delivers authenticated JSON envelopes. It is an experimental direct-peer transport. The graph engine and transport are **not yet integrated**: the current route calculation does not forward a message over multiple remote hops, and the transport does not consult the graph engine.

See [the peer package documentation](../packages/mesh-node/README.md), [protocol notes](PROTOCOL.md), and [threat model](THREAT_MODEL.md) for the current transport behavior and limitations.

## Run and test

```sh
npm install
npm test
npm run test:mesh
npm run typecheck
npm run build
```

Or run the combined local checks with `npm run check`.

## Important boundary

This engine executes inside one process and is intended for reproducible experiments and UI integration. It does not discover remote peers, route messages over multiple network hops, authenticate identities, persist messages, or encrypt payloads. Its reachability percentage measures graph connectivity for the current input only; it is not a live availability or reliability SLA.

## Integration milestones

1. Define one shared, versioned peer/message model without coupling the UI directly to socket internals.
2. Connect the topology model to a multi-process integration harness and prove direct peer health and message delivery with real events.
3. Design and test multi-hop forwarding, loop prevention, hop limits, and partition behavior before representing graph routes as delivered network messages.
4. Add property-based tests for graph invariants and larger random topologies.
5. Publish measured performance and availability only when supported by instrumentation and repeatable tests.
