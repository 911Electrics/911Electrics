import Image from 'next/image'
import React from 'react'

/**
 * Preview-only owner story for /about/. Do not reuse on the homepage or city hubs.
 * Copy is Haik's approved wording. Photo is the public @911construction_electric
 * profile image; only the 150×150 thumbnail was reachable without a browser login.
 */
export function OwnerStory() {
  return (
    <section className="py-16 md:py-20" id="owner">
      <div className="container grid items-start gap-10 lg:grid-cols-[minmax(0,18rem)_1fr] lg:items-center lg:gap-12">
        <figure className="mx-auto w-full max-w-[18rem]">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted shadow-lg">
            <Image
              alt="Haik Hairapetian, owner of 911 Construction & Electric, wearing a white hard hat and a yellow safety vest"
              className="object-cover"
              fill
              sizes="288px"
              src="/media/haik-hairapetian-instagram-profile.jpg"
            />
          </div>
          <figcaption className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Preview note: this is the public @911construction_electric Instagram profile photo.
            Only the 150×150 thumbnail was reachable without a signed-in browser; a sharper
            original should replace it before this page goes live.
          </figcaption>
        </figure>
        <div>
          <p className="mb-2 text-sm font-semibold tracking-widest text-brand-600 uppercase">
            From the owner
          </p>
          <h2 className="text-3xl font-bold text-balance text-navy-950 md:text-4xl">
            A note from Haik
          </h2>
          <div className="mt-5 max-w-prose space-y-4 leading-relaxed text-muted-foreground">
            <p>
              I studied business in college, and at the same time I was working in my family&apos;s
              construction business. That&apos;s where I found what I really love doing: electrical
              and construction work. I started 911 Construction &amp; Electric to build on both.
            </p>
            <p>
              My favorite part of the job is helping people make their dream home come real. I
              bring ideas from years of hands-on experience, talk them through the options, and
              then make it happen.
            </p>
            <p>
              I also believe in this trade. The demand for electrical work in homes is growing
              every year, and we&apos;ll need more good electricians. I always tell young people to
              learn a trade and turn it into a real career, because the future needs us.
            </p>
          </div>
          <p className="mt-6 font-semibold text-navy-950">Haik Hairapetian, Owner</p>
        </div>
      </div>
    </section>
  )
}
