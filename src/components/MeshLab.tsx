import { useState } from "react";
import { DEFAULT_TOPOLOGY, findRoute, measureMesh, type MeshTopology } from "../core/meshEngine";

/**
 * Interactive, deterministic graph experiment. It models routing in memory;
 * it does not connect to remote machines.
 */
export default function MeshLab() {
  const [topology, setTopology] = useState<MeshTopology>(() => ({
    peers: DEFAULT_TOPOLOGY.peers.map((peer) => ({ ...peer })),
    links: DEFAULT_TOPOLOGY.links.map((link) => ({ ...link })),
  }));
  const [source, setSource] = useState("peer-a");
  const [target, setTarget] = useState("peer-f");
  const route = findRoute(topology, source, target);
  const metrics = measureMesh(topology);

  function togglePeer(peerId: string) {
    setTopology((current) => ({
      ...current,
      peers: current.peers.map((peer) =>
        peer.id === peerId
          ? { ...peer, status: peer.status === "online" ? "offline" : "online" }
          : peer
      ),
    }));
  }

  function reset() {
    setTopology({
      peers: DEFAULT_TOPOLOGY.peers.map((peer) => ({ ...peer })),
      links: DEFAULT_TOPOLOGY.links.map((link) => ({ ...link })),
    });
    setSource("peer-a");
    setTarget("peer-f");
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <p className="font-semibold text-indigo-950">Deterministic mesh lab</p>
        <p className="mt-1 text-sm text-indigo-800">
          Live calculations over an in-memory graph. Disable peers to test rerouting and partition behavior.
          This is a reproducible routing experiment, not a live network connection.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Online peers", metrics.onlinePeers + "/" + metrics.totalPeers],
          ["Active links", metrics.totalLinks],
          ["Reachable pairs", metrics.reachablePairs + "/" + metrics.possiblePairs],
          ["Graph reachability", metrics.reachabilityPercent + "%"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Peer availability</h3>
            <button onClick={reset} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">
              Reset topology
            </button>
          </div>
          <div className="space-y-2">
            {topology.peers.map((peer) => (
              <div key={peer.id} className="flex items-center justify-between rounded border p-3">
                <span className="font-mono text-sm">{peer.id}</span>
                <div className="flex items-center gap-3">
                  <span className={peer.status === "online" ? "text-sm text-emerald-700" : "text-sm text-gray-500"}>
                    {peer.status}
                  </span>
                  <button
                    onClick={() => togglePeer(peer.id)}
                    aria-label={`Toggle ${peer.id} availability`}
                    className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700"
                  >
                    {peer.status === "online" ? "Take offline" : "Bring online"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-3 font-semibold">Shortest-path experiment</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-gray-600">
              Source
              <select value={source} onChange={(event) => setSource(event.target.value)} className="mt-1 w-full rounded border bg-white p-2 text-gray-900">
                {topology.peers.map((peer) => <option key={peer.id} value={peer.id}>{peer.id}</option>)}
              </select>
            </label>
            <label className="text-sm text-gray-600">
              Destination
              <select value={target} onChange={(event) => setTarget(event.target.value)} className="mt-1 w-full rounded border bg-white p-2 text-gray-900">
                {topology.peers.map((peer) => <option key={peer.id} value={peer.id}>{peer.id}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-5 rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Routing result</p>
            <p className={route.delivered ? "mt-1 text-lg font-semibold text-emerald-700" : "mt-1 text-lg font-semibold text-rose-700"}>
              {route.delivered ? "Route found" : "Delivery unavailable"}
            </p>
            {route.delivered ? (
              <>
                <p className="mt-2 break-words font-mono text-sm">{route.path.join(" → ")}</p>
                <p className="mt-2 text-sm text-gray-600">Hop count: {route.hops}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-gray-600">Reason: {route.reason}</p>
            )}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-gray-500">
            Method: breadth-first search over online links. Reachability is recomputed from graph state;
            no performance, security, uptime, or real-world network claim is inferred from this experiment.
          </p>
        </div>
      </div>
    </section>
  );
}
