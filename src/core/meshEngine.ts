/**
 * Deterministic in-memory mesh engine for the AIDCNet research prototype.
 * This is real routing logic over an in-process graph, not a network transport.
 */
export type PeerStatus = "online" | "offline";

export interface Peer {
  id: string;
  status: PeerStatus;
}

export interface Link {
  from: string;
  to: string;
}

export interface MeshTopology {
  peers: Peer[];
  links: Link[];
}

export interface RouteResult {
  delivered: boolean;
  path: string[];
  hops: number;
  reason?: "unknown-peer" | "peer-offline" | "no-route" | "same-peer";
}

export interface MeshMetrics {
  totalPeers: number;
  onlinePeers: number;
  totalLinks: number;
  reachablePairs: number;
  possiblePairs: number;
  reachabilityPercent: number;
}

function validateTopology(topology: MeshTopology): void {
  const ids = new Set<string>();
  for (const peer of topology.peers) {
    if (!peer.id.trim()) throw new TypeError("Peer IDs must not be empty");
    if (ids.has(peer.id)) throw new TypeError(`Duplicate peer ID: ${peer.id}`);
    ids.add(peer.id);
  }
  for (const link of topology.links) {
    if (!ids.has(link.from) || !ids.has(link.to)) {
      throw new TypeError("Every link must reference known peers");
    }
    if (link.from === link.to) throw new TypeError("Self-links are not allowed");
  }
}

/** Return a shortest online route using breadth-first search; ties follow link order. */
export function findRoute(topology: MeshTopology, source: string, target: string): RouteResult {
  validateTopology(topology);
  const peers = new Map(topology.peers.map((peer) => [peer.id, peer]));
  if (!peers.has(source) || !peers.has(target)) {
    return { delivered: false, path: [], hops: 0, reason: "unknown-peer" };
  }
  if (source === target) {
    return { delivered: false, path: [], hops: 0, reason: "same-peer" };
  }
  if (peers.get(source)?.status !== "online" || peers.get(target)?.status !== "online") {
    return { delivered: false, path: [], hops: 0, reason: "peer-offline" };
  }

  const adjacency = new Map<string, string[]>();
  for (const peer of topology.peers) adjacency.set(peer.id, []);
  for (const link of topology.links) {
    if (peers.get(link.from)?.status === "online" && peers.get(link.to)?.status === "online") {
      adjacency.get(link.from)?.push(link.to);
      adjacency.get(link.to)?.push(link.from);
    }
  }

  const queue = [source];
  const previous = new Map<string, string | null>([[source, null]]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (current === target) break;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!previous.has(neighbor)) {
        previous.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }
  if (!previous.has(target)) return { delivered: false, path: [], hops: 0, reason: "no-route" };

  const path: string[] = [];
  let cursor: string | null = target;
  while (cursor !== null) {
    path.push(cursor);
    cursor = previous.get(cursor) ?? null;
  }
  path.reverse();
  return { delivered: true, path, hops: path.length - 1 };
}

/** Reachability is calculated from the current online topology, not fabricated telemetry. */
export function measureMesh(topology: MeshTopology): MeshMetrics {
  validateTopology(topology);
  const online = topology.peers.filter((peer) => peer.status === "online");
  let reachablePairs = 0;
  let possiblePairs = (online.length * (online.length - 1)) / 2;
  for (let i = 0; i < online.length; i += 1) {
    for (let j = i + 1; j < online.length; j += 1) {
      if (findRoute(topology, online[i].id, online[j].id).delivered) reachablePairs += 1;
    }
  }
  return {
    totalPeers: topology.peers.length,
    onlinePeers: online.length,
    totalLinks: topology.links.filter((link) =>
      online.some((peer) => peer.id === link.from) && online.some((peer) => peer.id === link.to)
    ).length,
    reachablePairs,
    possiblePairs,
    reachabilityPercent: possiblePairs === 0 ? 100 : Number(((reachablePairs / possiblePairs) * 100).toFixed(1)),
  };
}

export const DEFAULT_TOPOLOGY: MeshTopology = {
  peers: [
    { id: "peer-a", status: "online" },
    { id: "peer-b", status: "online" },
    { id: "peer-c", status: "online" },
    { id: "peer-d", status: "online" },
    { id: "peer-e", status: "online" },
    { id: "peer-f", status: "online" },
  ],
  links: [
    { from: "peer-a", to: "peer-b" },
    { from: "peer-a", to: "peer-c" },
    { from: "peer-b", to: "peer-d" },
    { from: "peer-c", to: "peer-d" },
    { from: "peer-c", to: "peer-e" },
    { from: "peer-d", to: "peer-f" },
    { from: "peer-e", to: "peer-f" },
  ],
};
