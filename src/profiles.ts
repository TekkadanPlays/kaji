import type { NostrEvent } from './event';
import type { RelayPool } from './pool';
import type { Relay } from './relay';

export interface Profile {
  pubkey: string;
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  banner?: string;
  nip05?: string;
  lud16?: string;
  website?: string;
  [key: string]: unknown;
}

export class ProfileStore {
  private profiles: Map<string, Profile> = new Map();
  private pendingFetches: Set<string> = new Set();
  private listeners: Set<() => void> = new Set();
  private pool: RelayPool;

  constructor(pool: RelayPool) {
    this.pool = pool;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const fn of this.listeners) fn();
  }

  get(pubkey: string): Profile | undefined {
    return this.profiles.get(pubkey);
  }

  has(pubkey: string): boolean {
    return this.profiles.has(pubkey);
  }

  get all(): Map<string, Profile> {
    return this.profiles;
  }

  fetch(pubkey: string) {
    if (this.pendingFetches.has(pubkey)) return;
    this.pendingFetches.add(pubkey);

    this.pool.subscribe(
      [{ kinds: [0], authors: [pubkey], limit: 1 }],
      (event: NostrEvent, _relay: Relay) => {
        this.applyEvent(event);
      },
      () => {
        this.pendingFetches.delete(pubkey);
      },
    );
  }

  fetchMany(pubkeys: string[]) {
    const toFetch = pubkeys.filter((pk) => !this.pendingFetches.has(pk));
    if (toFetch.length === 0) return;

    for (const pk of toFetch) this.pendingFetches.add(pk);

    this.pool.subscribe(
      [{ kinds: [0], authors: toFetch }],
      (event: NostrEvent, _relay: Relay) => {
        this.applyEvent(event);
      },
      () => {
        for (const pk of toFetch) this.pendingFetches.delete(pk);
      },
    );
  }

  private applyEvent(event: NostrEvent) {
    if (event.kind !== 0) return;

    const existing = this.profiles.get(event.pubkey);
    if (existing && (existing as any)._created_at >= event.created_at) return;

    try {
      const content = JSON.parse(event.content);
      const profile: Profile = {
        pubkey: event.pubkey,
        name: content.name,
        display_name: content.display_name,
        about: content.about,
        picture: content.picture,
        banner: content.banner,
        nip05: content.nip05,
        lud16: content.lud16,
        website: content.website,
        ...content,
        _created_at: event.created_at,
      };
      this.profiles.set(event.pubkey, profile);
      this.notify();
    } catch {
      // Invalid JSON in kind-0 content
    }
  }

  clear() {
    this.profiles.clear();
    this.pendingFetches.clear();
  }
}
