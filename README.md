# Kaji 🔥

**InfernoJS-native Nostr protocol library.**

Kaji provides a clean, zero-framework-dependency TypeScript library for the Nostr protocol. Built for use with InfernoJS but works anywhere.

## Features

- **NIP-01** — Event creation, serialization, validation, signing
- **NIP-07** — `window.nostr` browser extension integration
- **NIP-10** — Thread parsing (root/reply markers, positional fallback)
- **NIP-19** — bech32 encoding (npub, nsec, note, nprofile)
- **NIP-25** — Reactions (like/dislike/emoji, dedup, summaries)
- **NIP-29** — Relay-based groups (metadata, members, join/leave)
- **Relay** — Single WebSocket relay connection with auto-reconnect
- **Pool** — Multi-relay pool with cross-relay dedup
- **Filter** — Fluent filter builder for subscriptions

## Install

```bash
bun add kaji
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

## Dependencies

- `@noble/curves` — secp256k1 schnorr signatures
- `@noble/hashes` — SHA-256
- `@scure/base` — bech32 encoding

## License

MIT
