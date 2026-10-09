import { LinkNode } from '@lexical/link'
import { $findMatchingParent } from '@lexical/utils'
import {
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  type LexicalNode,
  type NodeKey,
} from 'lexical'

/**
 * A Lexical link node that serializes to Payload's rich-text link shape
 * (`{ type:'link', version:3, fields:{ linkType:'custom', url, newTab } }`)
 * instead of @lexical/link's vanilla shape (top-level `url`).
 *
 * This lets the Studio editor load and re-save existing Payload content with
 * links intact, and keeps the existing renderer (which reads `fields.url`)
 * working. Registered for the `link` type in place of the stock LinkNode.
 */
type PayloadLinkFields = {
  linkType?: 'custom' | 'internal'
  url?: string
  newTab?: boolean
}

export class PayloadLinkNode extends LinkNode {
  static getType(): string {
    return 'link'
  }

  static clone(node: PayloadLinkNode): PayloadLinkNode {
    return new PayloadLinkNode(
      node.__url,
      { rel: node.__rel, target: node.__target, title: node.__title },
      node.__key,
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static importJSON(serializedNode: any): PayloadLinkNode {
    return new PayloadLinkNode().updateFromJSON(serializedNode)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateFromJSON(serializedNode: any): this {
    const fields: PayloadLinkFields = serializedNode?.fields ?? {}
    const url: string = fields.url ?? serializedNode?.url ?? ''
    const newTab = Boolean(fields.newTab)
    return super
      .updateFromJSON(serializedNode)
      .setURL(url)
      .setTarget(newTab ? '_blank' : null)
      .setRel(newTab ? 'noopener noreferrer' : null)
      .setTitle(null) as this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exportJSON(): any {
    const { url: _url, rel: _rel, target, title: _title, ...base } = super.exportJSON() as Record<
      string,
      unknown
    > & { target?: string | null }
    return {
      ...base,
      type: 'link',
      version: 3,
      fields: {
        linkType: 'custom',
        url: this.getURL(),
        newTab: target === '_blank',
      },
    }
  }
}

export function $createPayloadLinkNode(url = '', key?: NodeKey): PayloadLinkNode {
  return new PayloadLinkNode(url, {}, key)
}

export function $isPayloadLinkNode(node: LexicalNode | null | undefined): node is PayloadLinkNode {
  return node instanceof PayloadLinkNode
}

/** URL of the link wrapping the current selection, or '' if none. Read inside editor.read(). */
export function $getSelectedLinkUrl(): string {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return ''
  const parent = $findMatchingParent(selection.anchor.getNode(), $isPayloadLinkNode)
  return parent ? parent.getURL() : ''
}

/**
 * Toggle/insert a Payload-shaped link around the current selection. Pass an
 * empty url to remove the link. Run inside editor.update().
 */
export function $insertPayloadLink(url: string, newTab = true): void {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return
  const target = newTab ? '_blank' : null
  const rel = newTab ? 'noopener noreferrer' : null

  if (!url) {
    for (const node of selection.extract()) {
      const parent = $findMatchingParent(node, $isPayloadLinkNode)
      if (parent) {
        parent.getChildren().forEach((child) => parent.insertBefore(child))
        parent.remove()
      }
    }
    return
  }

  // Update in place if the selection is already inside a link.
  const existing = $findMatchingParent(selection.anchor.getNode(), $isPayloadLinkNode)
  if (existing) {
    existing.setURL(url)
    existing.setTarget(target)
    existing.setRel(rel)
    return
  }

  const link = new PayloadLinkNode(url, { target, rel })
  const nodes = selection.extract()
  if (nodes.length === 0) {
    // Collapsed selection: insert the URL as the link's text.
    link.append($createTextNode(url))
    selection.insertNodes([link])
    return
  }
  nodes[0].insertBefore(link)
  nodes.forEach((node) => link.append(node))
}
