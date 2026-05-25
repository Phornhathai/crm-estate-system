import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import UserList from './UserList'

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login?error=unauthorized')
  if (session.user.role !== 'OWNER') redirect('/crm/dashboard')

  let users
  try {
    users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
  } catch {
    redirect('/login?error=db_error')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้</h1>
        <p className="text-gray-500 text-sm mt-0.5">{users.length} คน</p>
      </div>
      <UserList initialUsers={users} currentUserId={session.user.id} />
    </div>
  )
}
