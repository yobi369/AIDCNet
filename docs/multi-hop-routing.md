# Multi-hop routing (experimental)

AIDCNet includes an opt-in, manually configured `MeshRouter` layered over the experimental `MeshPeer` TCP transport.

- Configure a next hop with `router.setRoute(finalPeerId, nextHopPeerId)`.
- `router.send(finalPeerId, payload)` forwards through the configured next hop(s).
- Routed messages carry a random route ID, an explicit hop budget, and a visited-peer list to reject loops.
- Each transport hop is authenticated by `MeshPeer`; the receiver delivers to `router.onMessage` when it is the final destination.

Example:

```js
import { MeshPeer } from "./peer.mjs";
import { MeshRouter } from "./router.mjs";

const peer = new MeshPeer({ id: "node-a", tlsOptions: /* provisioned TLS identity */ });
const router = new MeshRouter(peer, { maxHops: 8 });
router.setRoute("node-c", "node-b");
router.onMessage = (message) => console.log("Delivered", message);
```

## Limitations

This is a research prototype, not a production routing protocol. Routes and peer allowlists are provisioned manually. There is no discovery, consensus, congestion control, durable queue, retry, end-to-end origin signature, application authorization, or certificate/secret rotation. The hop-by-hop acknowledgements confirm acceptance by the immediate next peer, not final delivery. A process restart clears duplicate tracking. Do not expose the insecure transport option to untrusted networks.
