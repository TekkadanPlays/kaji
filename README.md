# Kaji 🔥

**TypeScript Nostr protocol library.**

Kaji provides a clean, zero-framework-dependency TypeScript library for the Nostr protocol. Built for use with InfernoJS but works anywhere — no React, no framework lock-in.

## Features

- **NIP-01** — Event creation, serialization, ID hashing, signing
- **NIP-07** — `window.nostr` browser extension integration (nos2x, Alby, etc.)
- **NIP-10** — Thread parsing (root/reply markers, positional fallback)
- **NIP-19** — bech32 encoding/decoding (npub, nsec, note, nprofile, nevent, naddr)
- **NIP-25** — Reactions (like/dislike/emoji, dedup, summaries)
- **NIP-29** — Relay-based groups (metadata, members, join/leave)
- **Relay** — Single WebSocket relay connection with auto-reconnect, NIP-42 AUTH
- **Pool** — Multi-relay pool with cross-relay event dedup
- **Filter** — Fluent filter builder for subscriptions
- **Profiles** — Batched Kind:0 metadata fetcher with in-memory cache (`ProfileStore`)
- **Utils** — bech32 encode/decode, hex conversion, timestamp helpers

## Modules

| Module | Description |
|--------|-------------|
| `event.ts` | `NostrEvent`, `UnsignedEvent`, `Kind` enum, `createEvent()`, `serializeEvent()`, `getEventHash()` |
| `sign.ts` | `signEvent()` — schnorr signing with `@noble/curves` |
| `keys.ts` | `generatePrivateKey()`, `getPublicKey()` |
| `filter.ts` | `NostrFilter`, `FilterBuilder` — fluent API for building subscription filters |
| `relay.ts` | `Relay` class — WebSocket connection, auto-reconnect, NIP-42 AUTH, subscription management |
| `pool.ts` | `RelayPool` — multi-relay manager with cross-relay event dedup |
| `nip07.ts` | `getNip07PublicKey()`, `signWithExtension()` — browser extension integration |
| `nip10.ts` | `parseThread()` — extract root/reply/mention markers from event tags |
| `nip25.ts` | `createReaction()`, `getReactionsSummary()` — reaction events |
| `nip29.ts` | `parseGroupMetadata()`, `createGroupMessage()` — relay-based groups |
| `profiles.ts` | `ProfileStore` class — batched kind:0 fetcher with subscribe/notify pattern, `parseProfileEvent()` |
| `utils.ts` | `npubEncode()`, `nsecEncode()`, `noteEncode()`, `nprofileEncode()`, `hexToBytes()`, `bytesToHex()`, `shortenHex()` |

## Install

```bash
bun add kaji
```

Or reference via tsconfig paths:

```json
{
  "compilerOptions": {
    "paths": {
      "kaji": ["path/to/kaji/src/index.ts"],
      "kaji/*": ["path/to/kaji/src/*"]
    }
  }
}
```

## Quick Start

```typescript
import { createEvent, Kind, RelayPool, signWithExtension } from 'kaji';

// Connect to relays
const pool = new RelayPool();
pool.addRelay('wss://mycelium.social');
await pool.connectAll();

// Create and sign a note via NIP-07 extension
const event = createEvent(Kind.Text, 'Hello from Kaji!');
const signed = await signWithExtension(event);

// Publish
await pool.publish(signed);
```

### Profile fetching

```typescript
import { ProfileStore } from 'kaji';

const profiles = new ProfileStore(pool);
profiles.subscribe(() => { /* re-render */ });

profiles.fetch('abc123');              // single
profiles.fetchMany(['abc', 'def']);    // batch
const p = profiles.get('abc123');      // cached or undefined
```

### Filter builder

```typescript
import { FilterBuilder } from 'kaji';

const filter = new FilterBuilder()
  .kinds([1])
  .authors(['abc123'])
  .since(Math.floor(Date.now() / 1000) - 3600)
  .limit(50)
  .build();
```

## Dependencies

- `@noble/curves` — secp256k1 schnorr signatures
- `@noble/hashes` — SHA-256
- `@scure/base` — bech32 encoding

## Used By

- [Mycelium](https://github.com/TekkadanPlays/mycelium.social) — Nostr social client
- [Hyphae](https://github.com/TekkadanPlays/hyphae) — IRC web client with Nostr identity

## Related Projects

- [Blazecn](https://github.com/TekkadanPlays/blazecn) — shadcn/ui-compatible component library for InfernoJS
- [nos2x-frog](https://github.com/TekkadanPlays/nos2x-frog) — Nostr signer browser extension

## License

MIT
