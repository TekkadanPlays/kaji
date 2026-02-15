import type { NostrEvent, NostrTag } from './event';

// NIP-10: Text Notes and Threads
// Parse e tags to extract thread structure

export interface ThreadReference {
  rootId: string | null;
  rootRelay: string;
  rootPubkey: string;
  replyId: string | null;
  replyRelay: string;
  replyPubkey: string;
  mentionIds: string[];
}

export function parseThreadTags(event: NostrEvent): ThreadReference {
  const eTags = event.tags.filter((t) => t[0] === 'e');
  const ref: ThreadReference = {
    rootId: null,
    rootRelay: '',
    rootPubkey: '',
    replyId: null,
    replyRelay: '',
    replyPubkey: '',
    mentionIds: [],
  };

  // Check for marked e tags (preferred NIP-10 format)
  const markedTags = eTags.filter((t) => t[3] === 'root' || t[3] === 'reply');

  if (markedTags.length > 0) {
    for (const tag of eTags) {
      const marker = tag[3];
      if (marker === 'root') {
        ref.rootId = tag[1];
        ref.rootRelay = tag[2] || '';
        ref.rootPubkey = tag[4] || '';
      } else if (marker === 'reply') {
        ref.replyId = tag[1];
        ref.replyRelay = tag[2] || '';
        ref.replyPubkey = tag[4] || '';
      }
      if (!marker) {
        ref.mentionIds.push(tag[1]);
      }
    }
    if (ref.rootId && !ref.replyId) {
      ref.replyId = ref.rootId;
      ref.replyRelay = ref.rootRelay;
      ref.replyPubkey = ref.rootPubkey;
    }
  } else if (eTags.length > 0) {
    // Deprecated positional format (backward compat)
    if (eTags.length === 1) {
      ref.rootId = eTags[0][1];
      ref.replyId = eTags[0][1];
      ref.rootRelay = eTags[0][2] || '';
      ref.replyRelay = eTags[0][2] || '';
    } else {
      ref.rootId = eTags[0][1];
      ref.rootRelay = eTags[0][2] || '';
      ref.replyId = eTags[eTags.length - 1][1];
      ref.replyRelay = eTags[eTags.length - 1][2] || '';
      for (let i = 1; i < eTags.length - 1; i++) {
        ref.mentionIds.push(eTags[i][1]);
      }
    }
  }

  return ref;
}

// Build e tags for a reply
export function buildReplyTags(
  rootEvent: NostrEvent,
  parentEvent: NostrEvent,
  relayHint: string = '',
): NostrTag[] {
  const tags: NostrTag[] = [];

  const parentThread = parseThreadTags(parentEvent);
  const rootId = parentThread.rootId || parentEvent.id;

  if (rootId === parentEvent.id) {
    tags.push(['e', rootId, relayHint, 'root', parentEvent.pubkey]);
  } else {
    tags.push(['e', rootId, relayHint, 'root']);
    tags.push(['e', parentEvent.id, relayHint, 'reply', parentEvent.pubkey]);
  }

  // Add p tags for notification
  const pubkeys = new Set<string>();
  pubkeys.add(parentEvent.pubkey);
  for (const tag of parentEvent.tags) {
    if (tag[0] === 'p') pubkeys.add(tag[1]);
  }
  for (const pk of pubkeys) {
    tags.push(['p', pk]);
  }

  return tags;
}

// Check if an event is a reply (has e tags)
export function isReply(event: NostrEvent): boolean {
  return event.tags.some((t) => t[0] === 'e');
}

// Check if an event is a root note (no e tags)
export function isRootNote(event: NostrEvent): boolean {
  return !isReply(event);
}
