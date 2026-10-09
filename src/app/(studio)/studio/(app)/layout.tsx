import { redirect } from 'next/navigation'
import React from 'react'

import { getStudioUser } from '@/studio/auth'

import { StudioSidebar } from './StudioSidebar'

export default async function StudioAppLayout({ children }: { children: React.ReactNode }) {
  const user = await getStudioUser()
  if (!user) redirect('/studio/login')

  const name = user.name || user.email || 'Signed in'

  return (
    <div className="flex min-h-screen">
      <StudioSidebar
        isAdmin={user.role === 'admin'}
        permissions={user.permissions}
        userName={name}
      />
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
