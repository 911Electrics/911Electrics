import { BadgeCheck, Phone, Star } from 'lucide-react'
import React from 'react'

/** Credentials strip shown directly under the hero. */
export function TrustStrip({
  licenseNumber,
  phone,
  promise,
}: {
  licenseNumber?: string | null
  phone?: string | null
  promise?: string | null
}) {
  const items = [
    licenseNumber ? `CSLB Lic. #${licenseNumber}, C-10 Electrical` : 'C-10 Electrical Contractor',
    'Tesla Energy Certified Installer',
    'SCE Charge Ready Home',
    'EVITP Certified',
  ]
  const tel = phone ? `tel:+1${phone.replace(/\D/g, '')}` : undefined
  return (
    <section aria-label="Licenses and certifications" className="border-b border-border bg-white">
      <div className="container py-6">
        {promise && (
          <p className="mb-4 text-center text-lg font-bold text-brand-700 md:text-xl">{promise}</p>
        )}
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-semibold text-navy-950">
          {items.map((t) => (
            <li className="inline-flex items-center gap-1.5" key={t}>
              <BadgeCheck aria-hidden className="size-4 text-brand-600" />
              {t}
            </li>
          ))}
          <li>
            <a
              className="inline-flex items-center gap-1.5 hover:text-brand-700"
              href="https://www.yelp.com/biz/911-construction-and-electric-pasadena"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Star aria-hidden className="size-4 fill-yellow-400 text-yellow-400" />
              5.0 on Yelp (23 reviews)
            </a>
          </li>
          {phone && tel && (
            <li>
              <a
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-white shadow hover:bg-brand-700"
                href={tel}
              >
                <Phone aria-hidden className="size-4" />
                Call {phone}
              </a>
            </li>
          )}
        </ul>
      </div>
    </section>
  )
}
