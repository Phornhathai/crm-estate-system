import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const statusLabel: Record<string, string> = {
  NEW: 'ใหม่', FOLLOWING: 'ติดตาม', TOURING: 'Touring',
  BOOKING_INTENT: 'สนใจจอง', BOOKED: 'จองแล้ว',
  SUCCESS: 'สำเร็จ', LOST: 'หลุด', IGNORE: 'Ignore',
}

const statusColor: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-600', FOLLOWING: 'bg-blue-100 text-blue-700',
  TOURING: 'bg-indigo-100 text-indigo-700',
  BOOKING_INTENT: 'bg-yellow-100 text-yellow-700', BOOKED: 'bg-green-100 text-green-700',
  SUCCESS: 'bg-emerald-100 text-emerald-700', LOST: 'bg-red-100 text-red-600',
  IGNORE: 'bg-gray-200 text-gray-500',
}

const visibleStatuses = ['NEW', 'FOLLOWING', 'TOURING', 'BOOKING_INTENT', 'BOOKED', 'SUCCESS', 'LOST'] as const

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login?error=unauthorized')

  const now = new Date()
  const isOwner = session.user.role === 'OWNER'
  let leads, totalLeads, statsByStatus, monthlyLeads
  try {
    const baseWhere = isOwner ? {} : { salerId: session.user.id }
    const activeWhere = { ...baseWhere, status: { not: 'IGNORE' as const } }
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthWhere = { ...baseWhere, createdAt: { gte: monthStart }, status: { not: 'IGNORE' as const } }

    ;[leads, totalLeads, statsByStatus, monthlyLeads] = await Promise.all([
      prisma.lead.findMany({
        where: activeWhere,
        include: { saler: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      prisma.lead.count({ where: activeWhere }),
      prisma.lead.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: true,
      }),
      prisma.lead.findMany({
        where: monthWhere,
        select: {
          interestType: true,
          unitPrice: true,
          netCommission: true,
          status: true,
        },
      }),
    ])
  } catch {
    redirect('/login?error=db_error')
  }

  const stats = Object.fromEntries(statsByStatus.map(s => [s.status, s._count]))

  const sellingLeads = monthlyLeads.filter(l => l.interestType === 'SELLING')
  const rentalLeads = monthlyLeads.filter(l => l.interestType === 'RENTAL')
  const successLeads = monthlyLeads.filter(l => l.status === 'SUCCESS' || l.status === 'BOOKED')

  const monthlySelling = sellingLeads.reduce((sum, l) => sum + (l.unitPrice || 0), 0)
  const monthlyRental = rentalLeads.reduce((sum, l) => sum + (l.unitPrice || 0), 0)
  const monthlyCommission = successLeads.reduce((sum, l) => sum + (l.netCommission || 0), 0)
  const monthlyUnits = successLeads.length

  const thMonth = now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {isOwner ? 'ภาพรวมทั้งระบบ' : `Lead ของคุณ ${session.user.name}`}
        </p>
      </div>

      {/* Monthly Report */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Report ประจำเดือน {thMonth}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-blue-600">{monthlySelling > 0 ? (monthlySelling / 1000000).toFixed(1) + 'M' : '0'}</p>
            <p className="text-xs text-gray-500 mt-1">ยอดขาย (Selling)</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-purple-600">{monthlyRental > 0 ? monthlyRental.toLocaleString('th-TH') : '0'}</p>
            <p className="text-xs text-gray-500 mt-1">ค่าเช่า/เดือน (Rental)</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-gray-900">{monthlyUnits}</p>
            <p className="text-xs text-gray-500 mt-1">หน่วย (จอง+สำเร็จ)</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-green-600">{monthlyCommission > 0 ? monthlyCommission.toLocaleString('th-TH') : '0'}</p>
            <p className="text-xs text-gray-500 mt-1">Net Commission</p>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">สถานะ Lead</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {visibleStatuses.map(status => (
            <div key={status} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-2xl font-bold text-gray-900">{stats[status] ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">{statusLabel[status]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Leads (excluding IGNORE) */}
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
              {lead.interestType && (
                <span className={`text-xs px-2 py-0.5 rounded ${
                  lead.interestType === 'SELLING' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                }`}>
                  {lead.interestType === 'SELLING' ? 'ขาย' : 'เช่า'}
                </span>
              )}
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
