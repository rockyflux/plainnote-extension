<script lang="ts" setup>
/**
 * CodeMirror 6 Markdown editor — themed to match workbench mock.
 * Editor chrome prefs come from SettingsStore and reconfigure live.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment, type Extension } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { undo, redo } from '@codemirror/commands';
import { tags } from '@lezer/highlight';
import { useSettingsStore } from '@/stores/settings';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
    /** markdown = syntax highlight; text = plain CodeMirror */
    format?: 'markdown' | 'text';
    compact?: boolean;
  }>(),
  {
    format: 'markdown',
    compact: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);

const host = ref<HTMLDivElement | null>(null);
let view: EditorView | null = null;
const themeCompartment = new Compartment();
const wrapCompartment = new Compartment();
const langCompartment = new Compartment();

const pnHighlight = HighlightStyle.define([
  { tag: tags.heading, color: 'var(--color-pn-accent)', fontWeight: '700' },
  { tag: tags.heading1, color: 'var(--color-pn-accent)', fontWeight: '700', fontSize: '1.15em' },
  { tag: tags.heading2, color: 'var(--color-pn-accent)', fontWeight: '650', fontSize: '1.05em' },
  { tag: tags.heading3, color: 'var(--color-pn-accent)', fontWeight: '600' },
  { tag: tags.strong, fontWeight: '700', color: 'var(--color-pn-text)' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: 'var(--color-pn-text-sub)' },
  { tag: tags.link, color: 'var(--color-pn-accent)' },
  { tag: tags.url, color: 'var(--color-pn-text-sub)' },
  { tag: tags.monospace, color: '#0f766e', fontFamily: 'var(--font-pn-mono)' },
  { tag: tags.meta, color: '#94a3b8' },
  { tag: tags.processingInstruction, color: 'var(--color-pn-accent)' },
  { tag: tags.list, color: 'var(--color-pn-accent)' },
  { tag: tags.quote, color: '#64748b' },
]);

function langExtensions(format: 'markdown' | 'text'): Extension {
  if (format === 'markdown') {
    return [markdown(), syntaxHighlighting(pnHighlight)];
  }
  return [];
}

function buildTheme(): Extension {
  const fontSize = settings.value.editorFontSize;
  const fontFamily = settings.value.editorFontFamily;
  const showLineNumbers = settings.value.editorLineNumbers;
  const padY = props.compact ? '0px' : '16px';
  return EditorView.theme({
    '&': {
      height: '100%',
      fontSize: `${fontSize}px`,
      backgroundColor: 'var(--color-pn-bg)',
      color: 'var(--color-pn-text)',
    },
    '.cm-scroller': {
      fontFamily,
      lineHeight: '1.75',
      overflow: 'auto',
    },
    '.cm-content': {
      padding: `${padY} 12px 32px 0`,
      caretColor: 'var(--color-pn-accent)',
      minHeight: '100%',
    },
    '.cm-gutters': {
      display: showLineNumbers ? 'flex' : 'none',
      backgroundColor: 'var(--color-pn-bg)',
      color: 'var(--color-pn-text-muted)',
      border: 'none',
      borderRight: '1px solid var(--color-pn-border)',
      minWidth: '44px',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 10px 0 8px',
      minWidth: '2.2em',
      textAlign: 'right',
      fontSize: `${Math.max(11, fontSize - 2)}px`,
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: 'var(--color-pn-text-sub)',
    },
    '.cm-activeLine': {
      backgroundColor: 'color-mix(in srgb, var(--color-pn-accent) 6%, transparent)',
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: 'var(--color-pn-accent)',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: 'color-mix(in srgb, var(--color-pn-accent) 18%, transparent) !important',
    },
    '.cm-line': {
      padding: '0 16px 0 12px',
    },
  });
}

function wrapExt(): Extension {
  return settings.value.editorWordWrap ? EditorView.lineWrapping : [];
}

const editorStyle = computed(() => ({
  '--pn-editor-font-size': `${settings.value.editorFontSize}px`,
}));

onMounted(() => {
  if (!host.value) return;
  view = new EditorView({
    parent: host.value,
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        basicSetup,
        langCompartment.of(langExtensions(props.format)),
        themeCompartment.of(buildTheme()),
        wrapCompartment.of(wrapExt()),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            emit('update:modelValue', update.state.doc.toString());
          }
        }),
      ],
    }),
  });
});

watch(
  () => props.modelValue,
  (value) => {
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  },
);

watch(
  () => props.format,
  (format) => {
    if (!view) return;
    view.dispatch({
      effects: langCompartment.reconfigure(langExtensions(format)),
    });
  },
);

watch(
  () => [
    settings.value.editorFontSize,
    settings.value.editorFontFamily,
    settings.value.editorWordWrap,
    settings.value.editorLineNumbers,
    props.compact,
  ],
  () => {
    if (!view) return;
    view.dispatch({
      effects: [
        themeCompartment.reconfigure(buildTheme()),
        wrapCompartment.reconfigure(wrapExt()),
      ],
    });
  },
);

onBeforeUnmount(() => {
  view?.destroy();
  view = null;
});

function runUndo() {
  if (view) undo(view);
}

function runRedo() {
  if (view) redo(view);
}

function focus() {
  view?.focus();
}

/** Insert snippet at cursor; wraps the current selection for common inline markers. */
function insertAtCursor(snippet: string) {
  if (!view) return;
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  let insert = snippet;
  let cursorOffset = snippet.length;

  if (snippet.startsWith('**') && snippet.endsWith('**')) {
    insert = `**${selected || 'bold'}**`;
    cursorOffset = selected ? insert.length : 2;
  } else if (snippet.startsWith('~~') && snippet.endsWith('~~')) {
    insert = `~~${selected || 'strike'}~~`;
    cursorOffset = selected ? insert.length : 2;
  } else if (snippet === '`code`') {
    insert = `\`${selected || 'code'}\``;
    cursorOffset = selected ? insert.length : 1;
  } else if (snippet === '*italic*') {
    insert = `*${selected || 'italic'}*`;
    cursorOffset = selected ? insert.length : 1;
  } else if (snippet === '[text](url)') {
    insert = selected ? `[${selected}](url)` : '[text](url)';
    cursorOffset = selected ? insert.length - 4 : 1;
  } else if (snippet === '![alt](url)') {
    insert = selected ? `![${selected}](url)` : '![alt](url)';
    cursorOffset = selected ? insert.length - 4 : 2;
  }

  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + cursorOffset },
  });
  view.focus();
}

defineExpose({ undo: runUndo, redo: runRedo, focus, insertAtCursor });
</script>

<template>
  <div
    ref="host"
    class="pn-cm-host h-full min-h-0 w-full overflow-hidden bg-pn-bg"
    :style="editorStyle"
    :data-placeholder="placeholder"
  />
</template>

<style scoped>
.pn-cm-host {
  height: 100%;
  min-height: 0;
}
.pn-cm-host :deep(.cm-editor) {
  height: 100%;
  max-height: 100%;
  outline: none;
}
.pn-cm-host :deep(.cm-scroller) {
  overflow: auto !important;
}
.pn-cm-host :deep(.cm-editor.cm-focused) {
  outline: none;
}
</style>
