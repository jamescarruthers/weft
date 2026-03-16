import React, { useEffect, useRef } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { theme } from '../theme/catppuccin-frappe';

interface Props {
  code: string;
  onSave: (code: string) => void;
  onCancel: () => void;
}

export const NodeEditor: React.FC<Props> = ({ code, onSave, onCancel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const customKeymap = keymap.of([
      {
        key: 'Escape',
        run: () => {
          const doc = viewRef.current?.state.doc.toString() || '';
          onSave(doc);
          return true;
        },
      },
    ]);

    const state = EditorState.create({
      doc: code,
      extensions: [
        customKeymap,
        javascript(),
        oneDark,
        EditorView.theme({
          '&': {
            background: theme.mantle,
            fontSize: '13px',
            fontFamily: "'JetBrains Mono', monospace",
          },
          '.cm-content': {
            caretColor: theme.text,
            padding: '8px',
          },
          '.cm-gutters': { display: 'none' },
          '.cm-focused': { outline: 'none' },
          '.cm-scroller': { overflow: 'auto' },
        }),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;
    view.focus();

    return () => view.destroy();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as HTMLElement)) {
        const doc = viewRef.current?.state.doc.toString() || '';
        onSave(doc);
      }
    };
    // Delay to avoid the double-click that opened editor
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onSave]);

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: '40px',
        maxHeight: '300px',
        overflow: 'auto',
      }}
    />
  );
};
