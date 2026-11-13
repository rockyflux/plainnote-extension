import type { LocalNote } from '@/types';

export type NoteSortKey = 'updatedDesc' | 'updatedAsc' | 'openedDesc' | 'titleAsc';

export interface NoteFilterInput {
  query?: string;
  folderId?: number | null;
  /** When set, only notes that include this tag id. */
  tagId?: number | null;
  favoriteOnly?: boolean;
  /** Restrict to notes with lastOpenedAt set, sorted later by caller. */
  openedOnly?: boolean;
  serviceId?: string | null;
  /** Tag id → name for title/content/tag search. */
  tagNamesById?: Map<number, string>;
}

export function filterNotes(notes: LocalNote[], input: NoteFilterInput): LocalNote[] {
  const q = input.query?.trim().toLowerCase() ?? '';
  return notes.filter((n) => {
    if (input.favoriteOnly && !n.favorite) return false;
    if (input.openedOnly && n.lastOpenedAt == null) return false;
    if (input.serviceId && n.serviceId !== input.serviceId) return false;
    if (input.folderId !== undefined && input.folderId !== null) {
      if (n.folderId !== input.folderId) return false;
    }
    if (input.folderId === null) {
      // explicit "unfiled" filter
      if (n.folderId != null) return false;
    }
    if (input.tagId != null) {
      if (!(n.tags ?? []).includes(input.tagId)) return false;
    }
    if (!q) return true;
    const titleHit = (n.title ?? '').toLowerCase().includes(q);
    const contentHit = n.content.toLowerCase().includes(q);
    const idHit = n.serverId.toLowerCase().includes(q);
    const tagHit = (n.tags ?? []).some((id) => {
      const name = input.tagNamesById?.get(id);
      return !!name && name.toLowerCase().includes(q);
    });
    return titleHit || contentHit || idHit || tagHit;
  });
}

export function sortNotes(notes: LocalNote[], sort: NoteSortKey): LocalNote[] {
  const list = notes.slice();
  switch (sort) {
    case 'updatedAsc':
      return list.sort((a, b) => a.updatedAt - b.updatedAt);
    case 'openedDesc':
      return list.sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0));
    case 'titleAsc':
      return list.sort((a, b) =>
        (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }),
      );
    case 'updatedDesc':
    default:
      return list.sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

export function noteExcerpt(content: string, max = 100): string {
  return content.replace(/\s+/g, ' ').trim().slice(0, max);
}
