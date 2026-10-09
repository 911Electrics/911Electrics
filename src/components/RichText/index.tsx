import React from 'react'

import type { RichTextData, SerializedLexicalNode } from '@/db/types'
import { nodePlainText, slugifyHeading } from '@/lib/blog'
import { safeHref } from '@/utilities/safeHref'
import { cn } from '@/utilities/ui'

/**
 * Standalone renderer for stored Lexical rich-text JSON — Payload-free.
 *
 * Handles the node types present in this site's content (paragraph, heading,
 * list/listitem, link, quote, text with formatting, linebreak). Replaces the
 * former @payloadcms/richtext-lexical/react renderer so the public render path
 * survives Payload's removal.
 */

// Lexical text-format bitmask flags.
const IS_BOLD = 1
const IS_ITALIC = 2
const IS_STRIKETHROUGH = 4
const IS_UNDERLINE = 8
const IS_CODE = 16

function renderText(node: SerializedLexicalNode, key: React.Key): React.ReactNode {
  const text = typeof node.text === 'string' ? node.text : ''
  const format = typeof node.format === 'number' ? node.format : 0
  let el: React.ReactNode = text
  if (format & IS_CODE) el = <code>{el}</code>
  if (format & IS_BOLD) el = <strong>{el}</strong>
  if (format & IS_ITALIC) el = <em>{el}</em>
  if (format & IS_UNDERLINE) el = <span className="underline">{el}</span>
  if (format & IS_STRIKETHROUGH) el = <s>{el}</s>
  return <React.Fragment key={key}>{el}</React.Fragment>
}

function renderChildren(children: SerializedLexicalNode[] | undefined): React.ReactNode[] {
  return (children ?? []).map((child, i) => renderNode(child, i))
}

function renderNode(node: SerializedLexicalNode, key: React.Key): React.ReactNode {
  switch (node.type) {
    case 'text':
      return renderText(node, key)

    case 'linebreak':
      return <br key={key} />

    case 'paragraph': {
      const children = renderChildren(node.children)
      if (children.length === 0) return <br key={key} />
      return <p key={key}>{children}</p>
    }

    case 'heading': {
      let tag = (typeof node.tag === 'string' ? node.tag : 'h2') as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
      // The page supplies the single <h1> (post/page title); clamp any authored
      // h1 in body copy down to h2 so each page keeps exactly one h1.
      if (tag === 'h1') tag = 'h2'
      const Tag = tag
      // Anchor ids on h2/h3 so the blog table of contents can deep-link
      // (rule shared with extractHeadings in @/lib/blog).
      if (tag === 'h2' || tag === 'h3') {
        const id = slugifyHeading(nodePlainText(node)) || undefined
        return (
          <Tag className="scroll-mt-28" id={id} key={key}>
            {renderChildren(node.children)}
          </Tag>
        )
      }
      return <Tag key={key}>{renderChildren(node.children)}</Tag>
    }

    case 'list': {
      const ordered = node.listType === 'number'
      const ListTag = ordered ? 'ol' : 'ul'
      return <ListTag key={key}>{renderChildren(node.children)}</ListTag>
    }

    case 'listitem':
      return <li key={key}>{renderChildren(node.children)}</li>

    case 'quote':
      return <blockquote key={key}>{renderChildren(node.children)}</blockquote>

    case 'link': {
      const fields = (node.fields ?? {}) as { url?: string; newTab?: boolean }
      const href = safeHref(fields.url)
      // A link whose target is not an ordinary web/mail/phone/relative URL
      // keeps its text and loses its anchor.
      if (!href) return <React.Fragment key={key}>{renderChildren(node.children)}</React.Fragment>
      const newTab = Boolean(fields.newTab)
      return (
        <a
          href={href}
          key={key}
          rel={newTab ? 'noopener noreferrer' : undefined}
          target={newTab ? '_blank' : undefined}
        >
          {renderChildren(node.children)}
        </a>
      )
    }

    default:
      // Unknown node: render its children so nothing silently disappears.
      return <React.Fragment key={key}>{renderChildren(node.children)}</React.Fragment>
  }
}

type Props = {
  data: RichTextData | null | undefined
  enableGutter?: boolean
  enableProse?: boolean
} & React.HTMLAttributes<HTMLDivElement>

export default function RichText(props: Props) {
  const { className, enableProse = true, enableGutter = true, data, ...rest } = props
  const root = data?.root
  if (!root) return null

  return (
    <div
      className={cn(
        'payload-richtext',
        {
          container: enableGutter,
          'max-w-none': !enableGutter,
          'mx-auto prose md:prose-md dark:prose-invert': enableProse,
        },
        className,
      )}
      {...rest}
    >
      {renderChildren(root.children)}
    </div>
  )
}
