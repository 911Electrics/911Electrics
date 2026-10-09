import { requirePermission } from '@/studio/auth'

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePermission('content')
  return <>{children}</>
}
