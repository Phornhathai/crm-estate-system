import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const statusLabel: Record<string, string> = {
  NEW: 'ใหม่',
  FOLLOWING: 'ติดตาม',
  BOOKING_INTENT: 'สนใจจอง',
  BOOKED: 'จองแล้ว',
  LOST: 'หลุด',
}

const statusColor: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-600',
  FOLLOWING: 'bg-blue-100 text-blue-700',
  BOOKING_INTENT: 'bg-yellow-100 text-yellow-700',
  BOOKED: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-600',
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const isOwner = session.user.role === 'OWNER'
  const where = isOwner ? {} : { salerId: session.user.id }

  const [leads, totalLeads] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: { saler: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    prisma.lead.count({ where }),
  ])

  const statsByStatus = await prisma.lead.groupBy({
    by: ['status'],
    where,
    _count: true,
  })

  const stats = Object.fromEntries(statsByStatus.map(s => [s.status, s._count]))

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {isOwner ? 'ภาพรวมทั้งระบบ' : `Lead ของคุณ ${session.user.name}`}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {['NEW', 'FOLLOWING', 'BOOKING_INTENT', 'BOOKED', 'LOST'].map(status => (
          <div key={status} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-gray-900">{stats[status] ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">{statusLabel[status]}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900">Lead ล่าสุด ({totalLeads} รายการ)</h2>
          <Link href="/crm/leads/new" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            + เพิ่ม Lead
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {leads.map(lead => (
            <Link
              key={lead.id}
              href={`/crm/leads/${lead.id}`}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{lead.name}</p>
                <p className="text-xs text-gray-400 truncate">{lead.phone}</p>
              </div>
              {isOwner && (
                <p className="text-xs text-gray-400 hidden md:block">{lead.saler.name}</p>
              )}
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[lead.status]}`}>
                {statusLabel[lead.status]}
              </span>
            </Link>
          ))}
          {leads.length === 0 && (
            <p className="px-5 py-8 text-center text-gray-400 text-sm">ยังไม่มี Lead</p>
          )}
        </div>
      </div>
    </div>
  )
}
