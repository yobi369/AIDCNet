import { describe, expect, it } from "vitest";
import { DEFAULT_TOPOLOGY, findRoute, measureMesh, type MeshTopology } from "./meshEngine";

describe("AIDCNet deterministic mesh engine", () => {
  it("finds a shortest route through online peers", () => {
    const result = findRoute(DEFAULT_TOPOLOGY, "peer-a", "peer-f");
    expect(result.delivered).toBe(true);
    expect(result.hops).toBe(3);
    expect(result.path[0]).toBe("peer-a");
    expect(result.path.at(-1)).toBe("peer-f");
  });

  it("reroutes around a failed peer when an alternate path exists", () => {
    const topology: MeshTopology = {
      ...DEFAULT_TOPOLOGY,
      peers: DEFAULT_TOPOLOGY.peers.map((peer) =>
        peer.id === "peer-d" ? { ...peer, status: "offline" as const } : peer
      ),
    };
    expect(findRoute(topology, "peer-a", "peer-f").path).toEqual(["peer-a", "peer-c", "peer-e", "peer-f"]);
  });

  it("reports no route when a cut disconnects the destination", () => {
    const topology: MeshTopology = {
      peers: [
        { id: "a", status: "online" },
        { id: "b", status: "offline" },
        { id: "c", status: "online" },
      ],
      links: [{ from: "a", to: "b" }, { from: "b", to: "c" }],
    };
    expect(findRoute(topology, "a", "c")).toMatchObject({
      delivered: false,
      reason: "no-route",
      path: [],
    });
  });

  it("rejects malformed graphs rather than silently routing them", () => {
    expect(() => findRoute({ peers: [{ id: "a", status: "online" }], links: [{ from: "a", to: "missing" }] }, "a", "missing"))
      .toThrow("Every link must reference known peers");
  });

  it("calculates reachability from graph state", () => {
    expect(measureMesh(DEFAULT_TOPOLOGY)).toMatchObject({
      totalPeers: 6,
      onlinePeers: 6,
      reachablePairs: 15,
      possiblePairs: 15,
      reachabilityPercent: 100,
    });
  });

  it("does not count offline links as active", () => {
    const topology: MeshTopology = {
      peers: [
        { id: "a", status: "online" },
        { id: "b", status: "offline" },
        { id: "c", status: "online" },
      ],
      links: [{ from: "a", to: "b" }, { from: "b", to: "c" }],
    };
    expect(measureMesh(topology)).toMatchObject({
      onlinePeers: 2,
      totalLinks: 0,
      reachablePairs: 0,
      possiblePairs: 1,
      reachabilityPercent: 0,
    });
  });
});
