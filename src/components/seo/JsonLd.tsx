import React from 'react'

/** Renders a schema.org JSON-LD graph (already-serialized JSON string). */
export function JsonLd({ json }: { json: string }) {
  return <script dangerouslySetInnerHTML={{ __html: json }} type="application/ld+json" />
}
