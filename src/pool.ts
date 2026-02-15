import { Relay, type RelayStatus } from './relay';
import type { NostrEvent } from './event';
import type { NostrFilter } from './filter';

export interface PoolSubscription {
  id: string;
  unsubscribe: () => void;
}

export class RelayPool {
  private relays: Map<string, Relay> = new Map();
  private seenEvents: Set<string> = new Set();
  private maxSeen = 10000;

  addRelay(url: string): Relay {
    const normalized = url.replace(/\/$/, '');
    if (this.relays.has(normalized)) {
      return this.relays.get(normalized)!;
    }
    const relay = new Relay(normalized);
    this.relays.set(normalized, relay);
    return relay;
  }

  removeRelay(url: string) {
    const normalized = url.replace(/\/$/, '');
    const relay = this.relays.get(normalized);
    if (relay) {
      relay.disconnect();
      this.relays.delete(normalized);
    }
  }

  getRelay(url: string): Relay | undefined {
    return this.relays.get(url.replace(/\/$/, ''));
  }

  get allRelays(): Relay[] {
    return Array.from(this.relays.values());
  }

  async connectAll(): Promise<void> {
    const promises = this.allRelays.map((r) =>
      r.connect().catch((err) => {
        console.warn(`Failed to connect to ${r.url}:`, err);
      })
    );
    await Promise.allSettled(promises);
  }

  disconnectAll() {
    for (const relay of this.relays.values()) {
      relay.disconnect();
    }
  }

  subscribe(
    filters: NostrFilter[],
    onEvent: (event: NostrEvent, relay: Relay) => void,
    onEose?: (relay: Relay) => void,
  ): PoolSubscription {
    const subIds: Map<Relay, string> = new Map();
    const id = `pool_${Date.now().toString(36)}`;

    for (const relay of this.relays.values()) {
      const subId = relay.subscribe(
        filters,
        (event) => {
          // Dedup across relays
          if (this.seenEvents.has(event.id)) return;
          this.trackSeen(event.id);
          onEvent(event, relay);
        },
        () => {
          if (onEose) onEose(relay);
        },
      );
      subIds.set(relay, subId);
    }

    return {
      id,
      unsubscribe: () => {
        for (const [relay, subId] of subIds) {
          relay.unsubscribe(subId);
        }
        subIds.clear();
      },
    };
  }

  async publish(event: NostrEvent): Promise<Map<string, { accepted: boolean; message: string }>> {
    const results = new Map<string, { accepted: boolean; message: string }>();
    const promises = this.allRelays.map(async (relay) => {
      try {
        const result = await relay.publish(event);
        results.set(relay.url, result);
      } catch (err) {
        results.set(relay.url, { accepted: false, message: String(err) });
      }
    });
    await Promise.allSettled(promises);
    return results;
  }

  private trackSeen(id: string) {
    this.seenEvents.add(id);
    // Prune if too large
    if (this.seenEvents.size > this.maxSeen) {
      const iter = this.seenEvents.values();
      for (let i = 0; i < this.maxSeen / 2; i++) {
        const val = iter.next().value;
        if (val) this.seenEvents.delete(val);
      }
    }
  }

  getStatus(): Map<string, RelayStatus> {
    const statuses = new Map<string, RelayStatus>();
    for (const [url, relay] of this.relays) {
      statuses.set(url, relay.status);
    }
    return statuses;
  }
}
