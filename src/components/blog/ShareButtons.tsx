'use client'

import { Check, Facebook, Link2, Linkedin, Mail } from 'lucide-react'
import React, { useState } from 'react'

/** Share row for blog posts: copy link + the networks that matter locally. */
export function ShareButtons({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable (e.g. http) — select-and-copy fallback not worth the complexity
    }
  }

  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)
  const itemClass =
    'flex size-9 items-center justify-center rounded-full border border-border text-navy-900 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700'

  return (
    <div className="flex items-center gap-2">
      <span className="mr-1 text-sm font-semibold text-navy-950">Share:</span>
      <a
        aria-label="Share on Facebook"
        className={itemClass}
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        <Facebook className="size-4" />
      </a>
      <a
        aria-label="Share on X"
        className={itemClass}
        href={`https://x.com/intent/post?url=${encodedUrl}&text=${encodedTitle}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        <svg aria-hidden className="size-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
        </svg>
      </a>
      <a
        aria-label="Share on LinkedIn"
        className={itemClass}
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        <Linkedin className="size-4" />
      </a>
      <a
        aria-label="Share by email"
        className={itemClass}
        href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`}
      >
        <Mail className="size-4" />
      </a>
      <button aria-label="Copy link" className={itemClass} onClick={copy} type="button">
        {copied ? <Check className="size-4 text-green-600" /> : <Link2 className="size-4" />}
      </button>
    </div>
  )
}
