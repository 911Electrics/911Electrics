'use client'

import type {
  DOMConversionMap,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical'
import { $applyNodeReplacement, DecoratorNode } from 'lexical'
import type { JSX } from 'react'

export type UploadMediaValue = {
  id: number
  url: string
  alt?: string | null
  width?: number | null
  height?: number | null
}

export type SerializedPayloadUploadNode = Spread<
  {
    type: 'upload'
    version: 3
    relationTo: 'media'
    value: UploadMediaValue | number | null
    fields?: { caption?: string }
  },
  SerializedLexicalNode
>

/**
 * Inline image node that serializes to Payload's upload shape so the public
 * RichText renderer (`case 'upload'`) can show it. `value` is stored as a
 * populated media object (url/alt/size) so the live page does not need a
 * second DB lookup for the common Studio path.
 */
export class PayloadUploadNode extends DecoratorNode<JSX.Element> {
  __media: UploadMediaValue | null
  __caption: string

  static getType(): string {
    return 'upload'
  }

  static clone(node: PayloadUploadNode): PayloadUploadNode {
    return new PayloadUploadNode(node.__media, node.__caption, node.__key)
  }

  constructor(media: UploadMediaValue | null = null, caption = '', key?: NodeKey) {
    super(key)
    this.__media = media
    this.__caption = caption
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const span = document.createElement('div')
    span.className = 'my-3'
    return span
  }

  updateDOM(): false {
    return false
  }

  exportDOM(): DOMExportOutput {
    const media = this.__media
    if (!media?.url) return { element: document.createElement('span') }
    const figure = document.createElement('figure')
    const img = document.createElement('img')
    img.src = media.url
    img.alt = media.alt || this.__caption || ''
    if (media.width) img.width = media.width
    if (media.height) img.height = media.height
    figure.appendChild(img)
    if (this.__caption) {
      const cap = document.createElement('figcaption')
      cap.textContent = this.__caption
      figure.appendChild(cap)
    }
    return { element: figure }
  }

  static importDOM(): DOMConversionMap | null {
    return null
  }

  static importJSON(serializedNode: SerializedPayloadUploadNode): PayloadUploadNode {
    const raw = serializedNode.value
    let media: UploadMediaValue | null = null
    if (raw && typeof raw === 'object' && typeof (raw as UploadMediaValue).url === 'string') {
      media = raw as UploadMediaValue
    }
    const caption = serializedNode.fields?.caption ?? ''
    return $applyNodeReplacement(new PayloadUploadNode(media, caption))
  }

  exportJSON(): SerializedPayloadUploadNode {
    return {
      type: 'upload',
      version: 3,
      relationTo: 'media',
      value: this.__media,
      fields: this.__caption ? { caption: this.__caption } : {},
    }
  }

  isInline(): false {
    return false
  }

  decorate(): JSX.Element {
    const media = this.__media
    if (!media?.url) {
      return (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
          Image missing — re-insert from the toolbar.
        </div>
      )
    }
    return (
      <figure className="my-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={media.alt || this.__caption || ''}
          className="mx-auto max-h-80 w-auto max-w-full object-contain"
          src={media.url}
        />
        {this.__caption ? (
          <figcaption className="border-t border-slate-200 px-3 py-2 text-center text-xs text-slate-600">
            {this.__caption}
          </figcaption>
        ) : null}
      </figure>
    )
  }
}

export function $createPayloadUploadNode(
  media: UploadMediaValue,
  caption = '',
): PayloadUploadNode {
  return $applyNodeReplacement(new PayloadUploadNode(media, caption))
}

export function $isPayloadUploadNode(
  node: LexicalNode | null | undefined,
): node is PayloadUploadNode {
  return node instanceof PayloadUploadNode
}
