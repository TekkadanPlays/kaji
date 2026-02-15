import type { NostrEvent, NostrTag } from './event';

// NIP-25: Reactions
// kind 7 events with content "+" (like), "-" (dislike), or emoji

export type ReactionType = 'like' | 'dislike' | 'emoji';

export interface ReactionSummary {
  likes: number;
  dislikes: number;
  emojis: Map<string, number>;
  total: number;
  score: number; // likes - dislikes
  userReaction: string | null; // current user's reaction content, or null
}

export function getReactionType(content: string): ReactionType {
  if (content === '+' || content === '') return 'like';
  if (content === '-') return 'dislike';
  return 'emoji';
}

export function buildReactionTags(
  targetEvent: NostrEvent,
  relayHint: string = '',
): NostrTag[] {
  return [
    ['e', targetEvent.id, relayHint, targetEvent.pubkey],
    ['p', targetEvent.pubkey, relayHint],
    ['k', String(targetEvent.kind)],
  ];
}

export function summarizeReactions(
  reactions: NostrEvent[],
  currentPubkey?: string,
): ReactionSummary {
  const summary: ReactionSummary = {
    likes: 0,
    dislikes: 0,
    emojis: new Map(),
    total: reactions.length,
    score: 0,
    userReaction: null,
  };

  // Deduplicate: one reaction per pubkey per target event
  const seen = new Map<string, NostrEvent>();
  for (const r of reactions) {
    const existing = seen.get(r.pubkey);
    if (!existing || r.created_at > existing.created_at) {
      seen.set(r.pubkey, r);
    }
  }

  for (const [pubkey, r] of seen) {
    const type = getReactionType(r.content);
    if (type === 'like') {
      summary.likes++;
    } else if (type === 'dislike') {
      summary.dislikes++;
    } else {
      const count = summary.emojis.get(r.content) || 0;
      summary.emojis.set(r.content, count + 1);
    }

    if (currentPubkey && pubkey === currentPubkey) {
      summary.userReaction = r.content;
    }
  }

  summary.score = summary.likes - summary.dislikes;
  summary.total = seen.size;

  return summary;
}

// Extract the target event ID from a reaction
export function getReactionTarget(reaction: NostrEvent): string | null {
  // Last e tag is the target per NIP-25
  const eTags = reaction.tags.filter((t) => t[0] === 'e');
  if (eTags.length === 0) return null;
  return eTags[eTags.length - 1][1];
}
