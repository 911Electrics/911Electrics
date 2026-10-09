'use client'

import { ListItemNode, ListNode } from '@lexical/list'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import type { EditorState } from 'lexical'
import { memo, useState } from 'react'

import { PayloadLinkNode } from './PayloadLinkNode'
import { Toolbar } from './Toolbar'
import { editorTheme } from './theme'

// Lexical's empty document (one empty paragraph), used as the default hidden value.
const EMPTY_STATE =
  '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}'

/**
 * Visual rich-text editor for Studio. Emits Payload-compatible Lexical JSON
 * (verified to round-trip existing content, including links) into a hidden
 * input named `name`, so it submits with the surrounding form.
 */
function RichTextEditorImpl({ name, initial }: { name: string; initial?: unknown }) {
  const initialJSON =
    initial && typeof initial === 'object' ? JSON.stringify(initial) : EMPTY_STATE
  const [value, setValue] = useState(initialJSON)

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/30">
      <input name={name} type="hidden" value={value} />
      <LexicalComposer
        initialConfig={{
          namespace: 'studio',
          theme: editorTheme,
          // Register PayloadLinkNode for the `link` type instead of the stock node.
          nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, PayloadLinkNode],
          editorState: initialJSON,
          onError: (error) => {
            console.error('[studio editor]', error)
          },
        }}
      >
        <Toolbar />
        <div className="relative px-3.5 py-3 text-sm text-slate-900">
          <RichTextPlugin
            ErrorBoundary={LexicalErrorBoundary}
            contentEditable={
              <ContentEditable className="min-h-[14rem] leading-relaxed outline-none" />
            }
            placeholder={
              <div className="pointer-events-none absolute left-3.5 top-3 text-sm text-slate-400">
                Write here…
              </div>
            }
          />
          <HistoryPlugin />
          <ListPlugin />
          <OnChangePlugin
            onChange={(editorState: EditorState) =>
              setValue(JSON.stringify(editorState.toJSON()))
            }
          />
        </div>
      </LexicalComposer>
    </div>
  )
}

/**
 * The editor self-manages its content after mount (Lexical owns the state), and
 * `initial` is only read at mount. Memoizing on `name` keeps a parent re-render
 * — e.g. the automatic route refresh after a server action — from re-rendering
 * the heavy editor tree. Content changes (like restoring a revision) reload the
 * page, so the editor re-initializes cleanly.
 */
export const RichTextEditor = memo(RichTextEditorImpl, (a, b) => a.name === b.name)
