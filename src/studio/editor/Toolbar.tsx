'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $createHeadingNode, $createQuoteNode, type HeadingTagType } from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from '@lexical/list'
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_NORMAL,
  FORMAT_TEXT_COMMAND,
  KEY_MODIFIER_COMMAND,
  type TextFormatType,
} from 'lexical'
import { useCallback, useEffect } from 'react'

import { $getSelectedLinkUrl, $insertPayloadLink } from './PayloadLinkNode'

const btn =
  'rounded px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40'

export function Toolbar() {
  const [editor] = useLexicalComposerContext()

  const format = (type: TextFormatType) => editor.dispatchCommand(FORMAT_TEXT_COMMAND, type)

  const setBlock = (kind: 'paragraph' | 'h2' | 'h3' | 'quote') => {
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      if (kind === 'paragraph') $setBlocksType(selection, () => $createParagraphNode())
      else if (kind === 'quote') $setBlocksType(selection, () => $createQuoteNode())
      else $setBlocksType(selection, () => $createHeadingNode(kind as HeadingTagType))
    })
  }

  const insertLink = useCallback(() => {
    let current = ''
    editor.getEditorState().read(() => {
      current = $getSelectedLinkUrl()
    })
    const url = window.prompt('Link URL (leave blank to remove the link):', current)
    if (url === null) return
    editor.update(() => $insertPayloadLink(url.trim()))
  }, [editor])

  // Cmd/Ctrl+K opens the link prompt instead of typing a literal "k".
  useEffect(
    () =>
      editor.registerCommand(
        KEY_MODIFIER_COMMAND,
        (event: KeyboardEvent) => {
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault()
            insertLink()
            return true
          }
          return false
        },
        COMMAND_PRIORITY_NORMAL,
      ),
    [editor, insertLink],
  )

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
      <button className={`${btn} font-bold`} onClick={() => format('bold')} title="Bold" type="button">B</button>
      <button className={`${btn} italic`} onClick={() => format('italic')} title="Italic" type="button">I</button>
      <button className={`${btn} underline`} onClick={() => format('underline')} title="Underline" type="button">U</button>
      <span className="mx-1 h-4 w-px bg-slate-300" />
      <button className={btn} onClick={() => setBlock('paragraph')} title="Paragraph" type="button">¶</button>
      <button className={btn} onClick={() => setBlock('h2')} title="Heading 2" type="button">H2</button>
      <button className={btn} onClick={() => setBlock('h3')} title="Heading 3" type="button">H3</button>
      <button className={btn} onClick={() => setBlock('quote')} title="Quote" type="button">❝</button>
      <span className="mx-1 h-4 w-px bg-slate-300" />
      <button className={btn} onClick={insertLink} title="Add/edit link (Ctrl+K)" type="button">🔗 Link</button>
      <span className="mx-1 h-4 w-px bg-slate-300" />
      <button
        className={btn}
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
        title="Bullet list"
        type="button"
      >
        • List
      </button>
      <button
        className={btn}
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
        title="Numbered list"
        type="button"
      >
        1. List
      </button>
      <button
        className={btn}
        onClick={() => editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)}
        title="Remove list"
        type="button"
      >
        ✕ List
      </button>
    </div>
  )
}
