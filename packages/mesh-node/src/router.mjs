import { randomUUID } from "node:crypto";

const ROUTE_FIELD = "__aidcnetRoute";
const MAX_SEEN_MESSAGES = 10_000;
const DEFAULT_SEEN_TTL_MS = 60_000;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPeerId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9._-]{1,64}$/.test(value);
}

/**
 * Experimental static-route overlay over MeshPeer's authenticated direct links.
 * Routing metadata is hop-by-hop and is not an end-to-end signed application
 * protocol. Use only for research/local experiments pending independent review.
 */
export class MeshRouter {
  constructor({ peer, routes = {}, maxHops = 8, seenTtlMs = DEFAULT_SEEN_TTL_MS, onDeliver = () => {}, onError = () => {} } = {}) {
    if (!peer || !isPeerId(peer.id) || typeof peer.send !== "function") {
      throw new TypeError("A MeshPeer instance is required");
    }
    if (!Number.isInteger(maxHops) || maxHops < 1 || maxHops > 64) {
      throw new RangeError("maxHops must be an integer between 1 and 64");
    }
    if (!Number.isInteger(seenTtlMs) || seenTtlMs < 1 || seenTtlMs > 3_600_000) {
      throw new RangeError("seenTtlMs must be an integer between 1 and 3600000");
    }
    this.peer = peer;
    this.maxHops = maxHops;
    this.seenTtlMs = seenTtlMs;
    this.routes = new Map();
    this.seen = new Map();
    this.onDeliver = onDeliver;
    this.onError = onError;
    this.previousHandler = null;
    this.handler = null;
    for (const [destination, nextHop] of Object.entries(routes)) this.setRoute(destination, nextHop);
  }

  setRoute(destination, nextHop) {
    if (!isPeerId(destination) || !isPeerId(nextHop)) throw new TypeError("Route destination and next hop must be valid peer IDs");
    if (destination === this.peer.id || nextHop === this.peer.id) throw new TypeError("Routes cannot target the local peer as a next hop");
    this.routes.set(destination, nextHop);
  }

  removeRoute(destination) {
    return this.routes.delete(destination);
  }

  start() {
    if (this.handler) throw new Error("Router is already started");
    this.previousHandler = this.peer.emitMessage;
    this.handler = (message) => {
      if (typeof this.previousHandler === "function") {
        try { this.previousHandler(message); } catch (error) { this.#report(error); }
      }
      void this.#receive(message).catch((error) => this.#report(error));
    };
    this.peer.emitMessage = this.handler;
    return this;
  }

  stop() {
    if (!this.handler) return;
    if (this.peer.emitMessage === this.handler) this.peer.emitMessage = this.previousHandler;
    this.handler = null;
    this.previousHandler = null;
  }

  async send(destination, body) {
    if (!isPeerId(destination) || destination === this.peer.id) throw new TypeError("Destination must be a different valid peer ID");
    if (!isObject(body)) throw new TypeError("Routed message body must be a JSON object");
    const route = {
      version: 1,
      id: randomUUID(),
      source: this.peer.id,
      destination,
      hopLimit: this.maxHops,
      visited: [],
      body,
    };
    await this.#forward(route);
    return { id: route.id, acceptedByNextHop: true };
  }

  async #forward(route) {
    if (route.hopLimit < 1) throw new Error("Route hop limit exhausted");
    if (route.visited.includes(this.peer.id)) throw new Error("Route loop detected");
    const nextHop = this.routes.get(route.destination);
    if (!nextHop) throw new Error("No route configured for destination");
    if (route.visited.includes(nextHop) || nextHop === this.peer.id) throw new Error("Route loop detected");
    const forwarded = {
      [ROUTE_FIELD]: {
        ...route,
        hopLimit: route.hopLimit - 1,
        visited: [...route.visited, this.peer.id],
      },
    };
    await this.peer.send(nextHop, forwarded);
  }

  async #receive(message) {
    if (!isObject(message) || !isPeerId(message.from) || !isObject(message.payload)) return;
    const route = message.payload[ROUTE_FIELD];
    if (!isObject(route) || route.version !== 1 || typeof route.id !== "string" ||
        !isPeerId(route.source) || !isPeerId(route.destination) ||
        !Number.isInteger(route.hopLimit) || route.hopLimit < 0 || route.hopLimit > this.maxHops ||
        !Array.isArray(route.visited) || route.visited.length < 1 ||
        route.visited.length > this.maxHops || route.visited.some((id) => !isPeerId(id)) ||
        new Set(route.visited).size !== route.visited.length ||
        route.visited[0] !== route.source ||
        route.visited[route.visited.length - 1] !== message.from ||
        route.visited.includes(this.peer.id) || !isObject(route.body)) {
      throw new Error("Malformed routed message or route loop detected");
    }

    this.#pruneSeen();
    if (this.seen.has(route.id)) throw new Error("Duplicate routed message detected");
    if (this.seen.size >= MAX_SEEN_MESSAGES) throw new Error("Routed-message deduplication capacity reached");
    this.seen.set(route.id, Date.now());

    if (route.destination === this.peer.id) {
      this.onDeliver({
        id: route.id,
        source: route.source,
        destination: this.peer.id,
        body: route.body,
        path: [...route.visited, this.peer.id],
      });
      return;
    }
    await this.#forward(route);
  }

  #pruneSeen() {
    const cutoff = Date.now() - this.seenTtlMs;
    for (const [id, seenAt] of this.seen) {
      if (seenAt < cutoff) this.seen.delete(id);
    }
  }

  #report(error) {
    try { this.onError(error instanceof Error ? error : new Error(String(error))); } catch {}
  }
}
