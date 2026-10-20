# AIDCNet Experimental Peer Protocol

**Version:** 1 (experimental, implementation-specific)  
**Status:** not a stable public protocol and not approved for production use.

## Connection and framing

- One TCP or TLS connection carries one request envelope and one response envelope.
- Each envelope is UTF-8 JSON preceded by a four-byte unsigned big-endian byte length.
- The current maximum body size is 65,536 bytes. Empty and oversized request frames are rejected.
- Socket inactivity timeout defaults to 5 seconds. The default maximum active connections is 128 per peer; configure `maxConnections` between 1 and 4,096 for the deployment. This is a coarse connection cap, not a complete denial-of-service defense.
- TLS 1.2 or newer with mutual certificate verification is required by default. A caller must explicitly set `allowInsecure: true` to enable plaintext for controlled tests.
- A successful response contains `ok: true` and the request `id`; a rejected request contains `ok: false` and an error string. Error text is diagnostic and must not be treated as a stable machine-readable code.

## Request envelope

The authenticated fields are serialized in this exact order before HMAC calculation:

```json
{
  "version": 1,
  "id": "UUID",
  "from": "sender-peer-id",
  "to": "receiver-peer-id",
  "timestamp": 0,
  "nonce": "32 lowercase hexadecimal characters",
  "payload": { "kind": "example" }
}
```

The transmitted envelope adds a `signature` field containing the 64-character hexadecimal HMAC-SHA-256 of the ordered JSON representation of the fields above. The signature field itself is not part of the signed representation. Payloads must be JSON objects, not arrays or scalar values. The timestamp is Unix time in milliseconds.

## Acceptance sequence

The receiver checks, in order:

1. Envelope is an object with supported version and expected field types.
2. Destination matches the receiving peer ID and nonce format is valid.
3. Sender is registered in the receiver's peer allowlist.
4. Timestamp is within the configured freshness window (30 seconds by default).
5. HMAC is valid and compared using a timing-safe byte comparison.
6. Nonce has not been seen recently for that sender and the sender's replay cache is below its bound.
7. Only then is the message passed to the optional in-process message callback and a transport acknowledgement sent.

The acknowledgement means the receiver accepted the envelope and invoked the synchronous callback if present. It does **not** mean a downstream job completed, data was persisted, or a business action committed.

## Current limits and compatibility

- Peer IDs allow 1–64 ASCII letters, digits, dots, underscores, and hyphens.
- Shared HMAC secrets must be at least 32 UTF-8 bytes. Use randomly generated secrets; the minimum length alone does not establish entropy.
- The nonce replay cache is in memory and process-local; it resets at restart. This protocol does not provide durable exactly-once processing.
- Pairwise secrets are provisioned out of band. The protocol does not currently bind the envelope's `from` identifier to a certificate subject/SAN via a managed identity registry.
- No peer discovery, membership protocol, consensus, durable queues, retry contract, ordering guarantee, compression, or application authorization is specified.
- Do not change canonicalization, envelope fields, limits, or error semantics without updating tests and documenting a protocol versioning decision.

## Production evolution requirements

Before stabilization, specify canonical serialization (prefer a well-reviewed standard), certificate-to-peer identity binding, key lifecycle, durable idempotency, request/response schemas, version negotiation, structured error codes, delivery guarantees, resource budgets, and backwards-compatibility rules. Have the protocol independently reviewed before relying on it for sensitive workloads.
