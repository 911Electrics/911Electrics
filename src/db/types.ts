/**
 * Payload-free domain types for the direct DB layer. These intentionally mirror
 * the shapes the site components need, decoupled from Payload's generated types.
 * As read paths migrate off Payload, components move onto these.
 */

/** A serialized Lexical node (the stored rich-text JSON), Payload-free. */
export type SerializedLexicalNode = {
  type: string
  version?: number
  children?: SerializedLexicalNode[]
  [key: string]: unknown
}

/** Stored rich-text value: a Lexical editor state. Rendered by @/components/RichText. */
export type RichTextData = {
  root: SerializedLexicalNode
  [key: string]: unknown
}

/** Minimal image shape satisfied by both the DB MediaImage and Payload's Media. */
export type ImageLike = {
  url?: string | null
  alt?: string | null
  width?: number | null
  height?: number | null
}

export type MediaImage = {
  id: number
  alt: string | null
  url: string
  width: number | null
  height: number | null
  /** Best-fit responsive variant URLs (may be null if not generated). */
  sizes: {
    thumbnail?: string | null
    square?: string | null
    small?: string | null
    medium?: string | null
    large?: string | null
    xlarge?: string | null
    og?: string | null
  }
}

export type Category = {
  id: number
  title: string | null
  slug: string | null
}

export type ServiceNav = {
  id: number
  title: string
  navLabel: string
  slug: string
  shortDescription: string
  displayOrder: number | null
  cardImage: MediaImage | null
}

export type CityNav = {
  id: number
  cityName: string
  slug: string
  pathOverride: string | null
}

export type Testimonial = {
  id: number
  authorName: string
  location: string | null
  rating: number
  text: string
  source: string | null
  date: string | null
  featured: boolean
}

export type SocialLink = {
  platform: 'facebook' | 'instagram' | 'x' | 'pinterest' | 'google' | 'yelp'
  url: string
}

export type SiteSettings = {
  id: number
  businessName: string
  licenseNumber: string
  phone: string
  email: string
  address: {
    street: string | null
    city: string | null
    state: string | null
    zip: string | null
  }
  geo: {
    lat: number | null
    lng: number | null
  }
  hoursLabel: string | null
  aggregateRating: {
    value: number | null
    count: number | null
  }
  socials: SocialLink[]
  logo: MediaImage | null
  defaultOGImage: MediaImage | null
}

export type CityPageTemplate = {
  id: number
  heroHeading: string
  heroSubheading: string | null
  heroImage: MediaImage | null
  intro: RichTextData | null
  processHeading: string | null
  processSteps: ProcessStep[]
  servicesHeading: string | null
  servicesIntro: string | null
  aboutHeading: string | null
  aboutBody: RichTextData | null
  differentiators: Differentiator[]
  ctaHeading: string | null
  ctaBody: string | null
  faqs: Faq[]
}

export type ProcessStep = { id: string; title: string; text: string }
export type Differentiator = { id: string; title: string; text: string }
export type Faq = { id: string; question: string; answer: RichTextData }

export type Homepage = {
  id: number
  heroHeading: string
  heroSubheading: string | null
  heroImage: MediaImage | null
  processHeading: string | null
  processSteps: ProcessStep[]
  servicesHeading: string | null
  servicesIntro: string | null
  aboutHeading: string | null
  aboutBody: RichTextData | null
  aboutImage: MediaImage | null
  differentiators: Differentiator[]
  reviewsHeading: string | null
  contactHeading: string | null
  contactBody: string | null
  faqs: Faq[]
  meta: {
    title: string | null
    description: string | null
    image: MediaImage | null
  }
}
