# Multi-hop routing (experimental)

AIDCNet includes an opt-in, manually configured `MeshRouter` layered over the experimental `MeshPeer` TCP transport.

- Construct it with `new MeshRouter({ peer, routes, maxHops, onDeliver, onError })` and call `.start()` to attach it to the peer.
- Configure static routes as `{ finalPeerId: nextHopPeerId }`, or call `router.setRoute(finalPeerId, nextHopPeerId)`.
- `await router.send(finalPeerId, body)` sends through the configured next hop. Its result confirms acceptance by the first hop, not end-to-end delivery.
- Routed messages carry a random route ID, an explicit hop budget, and a visited-peer list to reject loops. A bounded, expiring in-memory cache rejects duplicate route IDs.
- Each transport hop is authenticated by `MeshPeer`; the final peer delivers to `onDeliver`.

Example:

```js
import { readFileSync } from "node:fs";
import { MeshPeer } from "../packages/mesh-node/src/peer.mjs";
import { MeshRouter } from "../packages/mesh-node/src/router.mjs";

const peer = new MeshPeer({
  id: "node-a",
  tlsOptions: {
    cert: readFileSync(process.env.AIDCNET_CERT_PATH),
    key: readFileSync(process.env.AIDCNET_KEY_PATH),
    ca: readFileSync(process.env.AIDCNET_CA_PATH),
  },
});
const router = new MeshRouter({
  peer,
  routes: { "node-c": "node-b" },
  maxHops: 8,
  onDeliver: (message) => console.log("Delivered", message),
  onError: (error) => console.error("Routing error", error.message),
}).start();
```

Register each next-hop peer on the underlying `MeshPeer` with its address and unique shared secret before sending. See the root README and peer transport notes for identity and provisioning limitations.

## Limitations

This is a research prototype, not a production routing protocol. Routes and peer allowlists are provisioned manually. There is no discovery, consensus, congestion control, durable queue, retry, end-to-end origin signature, application authorization, or certificate/secret rotation. Hop-by-hop acknowledgements confirm acceptance by the immediate next peer, not final delivery. Duplicate tracking is in memory and resets on restart. Do not expose the insecure transport option to untrusted networks.
