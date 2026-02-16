import type { NostrEvent } from './event';
import type { RelayPool } from './pool';

export interface Profile {
  pubkey: string;
  name: string;
  displayName: string;
  about: string;
  picture: string;
  banner: string;
  nip05: string;
  lud16: string;
  lastUpdated: number;
}

type Listener = () => void;

/**
 * ProfileStore — batched Kind:0 metadata fetcher with in-memory cache.
 *
 * Usage:
 *   const store = new ProfileStore(pool);
 *   store.subscribe(() => { re-render });
 *   store.fetch('abc123');            // single
 *   store.fetchMany(['abc', 'def']);   // batch
 *   const p = store.get('abc123');     // cached or undefined
 */
export class ProfileStore {
  private profiles: Map<string, Profile> = new Map();
  private listeners: Set<Listener> = new Set();
  private pending: Set<string> = new Set();
  private batchQueue: Set<string> = new Set();
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private batchDelay: number;
  private pool: RelayPool;

  constructor(pool: RelayPool, opts?: { batchDelay?: number }) {
    this.pool = pool;
    this.batchDelay = opts?.batchDelay ?? 150;
  }

  private notify() {
    for (const fn of this.listeners) fn();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get(pubkey: string): Profile | undefined {
    return this.profiles.get(pubkey);
  }

  getAll(): Map<string, Profile> {
    return this.profiles;
  }

  /** Queue a single pubkey for batched fetching. */
  fetch(pubkey: string) {
    if (this.profiles.has(pubkey) || this.pending.has(pubkey)) return;
    this.batchQueue.add(pubkey);
    this.scheduleBatch();
  }

  /** Queue multiple pubkeys for batched fetching. */
  fetchMany(pubkeys: string[]) {
    for (const pk of pubkeys) {
      if (!this.profiles.has(pk) && !this.pending.has(pk)) {
        this.batchQueue.add(pk);
      }
    }
    this.scheduleBatch();
  }

  /** Manually set/update a profile (e.g. from a live subscription). */
  set(profile: Profile) {
    const existing = this.profiles.get(profile.pubkey);
    if (!existing || profile.lastUpdated > existing.lastUpdated) {
      this.profiles.set(profile.pubkey, profile);
      this.notify();
    }
  }

  private scheduleBatch() {
    if (this.batchTimer) return;
    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      this.flushBatch();
    }, this.batchDelay);
  }

  private flushBatch() {
    const toFetch = Array.from(this.batchQueue).filter(
      (pk) => !this.profiles.has(pk) && !this.pending.has(pk),
    );
    this.batchQueue.clear();
    if (toFetch.length === 0) return;

    for (const pk of toFetch) this.pending.add(pk);

    const sub = this.pool.subscribe(
      [{ kinds: [0], authors: toFetch }],
      (event) => {
        const existing = this.profiles.get(event.pubkey);
        if (!existing || event.created_at > existing.lastUpdated) {
          this.profiles.set(event.pubkey, parseProfileEvent(event));
          this.notify();
        }
      },
      () => {
        sub.unsubscribe();
        for (const pk of toFetch) this.pending.delete(pk);
      },
    );
  }
}

export function parseProfileEvent(event: NostrEvent): Profile {
  let meta: Record<string, string> = {};
  try {
    meta = JSON.parse(event.content);
  } catch { /* ignore */ }

  return {
    pubkey: event.pubkey,
    name: meta.name || '',
    displayName: meta.display_name || meta.displayName || '',
    about: meta.about || '',
    picture: meta.picture || '',
    banner: meta.banner || '',
    nip05: meta.nip05 || '',
    lud16: meta.lud16 || '',
    lastUpdated: event.created_at,
  };
}
