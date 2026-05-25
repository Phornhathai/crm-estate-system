import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const statusLabel: Record<string, string> = {
  NEW: 'ใหม่', FOLLOWING: 'ติดตาม', BOOKING_INTENT: 'สนใจจอง', BOOKED: 'จองแล้ว', LOST: 'หลุด',
}
const statusColor: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-600', FOLLOWING: 'bg-blue-100 text-blue-700',
  BOOKING_INTENT: 'bg-yellow-100 text-yellow-700', BOOKED: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-600',
}

export default async function LeadsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const where = session.user.role === 'SALE' ? { salerId: session.user.id } : {}

  const leads = await prisma.lead.findMany({
    where,
    include: {
      saler: { select: { name: true } },
      _count: { select: { followUps: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 text-sm mt-0.5">{leads.length} รายการ</p>
        </div>
        <Link
          href="/crm/leads/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + เพิ่ม Lead
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {leads.map(lead => (
            <Link
              key={lead.id}
              href={`/crm/leads/${lead.id}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{lead.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{lead.phone}</p>
                {lead.detail && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{lead.detail}</p>
                )}
              </div>
              {session.user.role === 'OWNER' && (
                <p className="text-xs text-gray-400 hidden md:block min-w-24 text-right">{lead.saler.name}</p>
              )}
              <p className="text-xs text-gray-400">{lead._count.followUps} note</p>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${statusColor[lead.status]}`}>
                {statusLabel[lead.status]}
              </span>
            </Link>
          ))}
          {leads.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-gray-400 text-sm">ยังไม่มี Lead</p>
              <Link href="/crm/leads/new" className="text-blue-600 text-sm mt-2 inline-block">
                เพิ่ม Lead แรก →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
