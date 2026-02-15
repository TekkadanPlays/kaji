import type { NostrEvent, NostrTag } from './event';
import { Kind } from './event';

// NIP-29: Relay-based Groups
// Groups are identified by <host>'<group-id>

export interface GroupMetadata {
  id: string;
  name: string;
  about: string;
  picture: string;
  isOpen: boolean;
  isPublic: boolean;
}

export interface GroupMember {
  pubkey: string;
  roles: string[];
}

// Parse kind:39000 group metadata event
export function parseGroupMetadata(event: NostrEvent): GroupMetadata {
  const dTag = event.tags.find((t) => t[0] === 'd');
  const meta: GroupMetadata = {
    id: dTag ? dTag[1] : '',
    name: '',
    about: '',
    picture: '',
    isOpen: false,
    isPublic: true,
  };

  for (const tag of event.tags) {
    switch (tag[0]) {
      case 'name':
        meta.name = tag[1] || '';
        break;
      case 'about':
        meta.about = tag[1] || '';
        break;
      case 'picture':
        meta.picture = tag[1] || '';
        break;
      case 'open':
        meta.isOpen = true;
        break;
      case 'public':
        meta.isPublic = true;
        break;
    }
  }

  return meta;
}

// Parse kind:39002 group members event
export function parseGroupMembers(event: NostrEvent): GroupMember[] {
  const members: GroupMember[] = [];
  for (const tag of event.tags) {
    if (tag[0] === 'p') {
      members.push({
        pubkey: tag[1],
        roles: tag.slice(2),
      });
    }
  }
  return members;
}

// Build h tag for group events
export function groupTag(groupId: string): NostrTag {
  return ['h', groupId];
}

// Build a join request (kind 9021)
export function buildJoinRequest(groupId: string, reason?: string, inviteCode?: string): {
  kind: number;
  content: string;
  tags: NostrTag[];
} {
  const tags: NostrTag[] = [groupTag(groupId)];
  if (inviteCode) tags.push(['code', inviteCode]);
  return {
    kind: Kind.GroupJoinRequest,
    content: reason || '',
    tags,
  };
}

// Build a leave request (kind 9022)
export function buildLeaveRequest(groupId: string, reason?: string): {
  kind: number;
  content: string;
  tags: NostrTag[];
} {
  return {
    kind: Kind.GroupLeaveRequest,
    content: reason || '',
    tags: [groupTag(groupId)],
  };
}

// Check if an event belongs to a group
export function getEventGroupId(event: NostrEvent): string | null {
  const hTag = event.tags.find((t) => t[0] === 'h');
  return hTag ? hTag[1] : null;
}
