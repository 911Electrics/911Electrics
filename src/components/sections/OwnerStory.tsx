import Image from 'next/image'
import React from 'react'

/**
 * Preview-only owner story for /about/. Do not reuse on the homepage or city hubs.
 * Copy is Haik's approved wording. Photo is the sharper original he sent
 * (portrait crop, hard hat and vest).
 */
export function OwnerStory() {
  return (
    <section className="py-16 md:py-20" id="owner">
      <div className="container grid items-start gap-10 lg:grid-cols-[minmax(0,20rem)_1fr] lg:items-center lg:gap-12">
        <figure className="mx-auto w-full max-w-[20rem]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted shadow-lg">
            <Image
              alt="Haik Hairapetian, owner of 911 Construction & Electric, in a white hard hat and yellow safety vest"
              className="object-cover object-top"
              fill
              priority
              sizes="(min-width: 1024px) 320px, 80vw"
              src="/media/haik-hairapetian-hardhat.webp"
            />
          </div>
        </figure>
        <div>
          <h2 className="text-3xl font-bold text-balance text-navy-950 md:text-4xl">Our Story</h2>
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
