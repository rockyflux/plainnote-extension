export interface PageContext {
  title: string;
  url: string;
  selection: string;
}

export interface PendingClip {
  selection: string;
  pageTitle: string;
  pageUrl: string;
  /** When set, append as markdown quote; otherwise plain selection body. */
  asMarkdownQuote: boolean;
  createdAt: number;
}

/** Prefill Popup 快速记录 from context-menu / commands. */
export interface PendingQuickCapture {
  content: string;
  createdAt: number;
}

export type ExtRequest =
  | { type: 'PLAINNOTE_GET_PAGE_CONTEXT' }
  | { type: 'PLAINNOTE_SHOW_TOAST'; message: string; kind?: 'ok' | 'error' }
  | { type: 'PLAINNOTE_NOTES_CHANGED' }
  | { type: 'PLAINNOTE_FOCUS_NOTE'; localId: number };

export type ExtResponseMap = {
  PLAINNOTE_GET_PAGE_CONTEXT: PageContext;
  PLAINNOTE_SHOW_TOAST: { ok: true };
  PLAINNOTE_NOTES_CHANGED: { ok: true };
  PLAINNOTE_FOCUS_NOTE: { ok: true };
};
