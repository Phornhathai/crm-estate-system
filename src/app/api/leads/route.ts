import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const leads = await prisma.lead.findMany({
    where: session.user.role === 'SALE' ? { salerId: session.user.id } : undefined,
    include: {
      saler: { select: { id: true, name: true } },
      _count: { select: { followUps: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return Response.json(leads)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, phone, detail, source, interestType, unitPrice, hasCoAgent, coAgentFee, commissionRate, netCommission } = body

  if (!name || !phone) return Response.json({ error: 'name and phone required' }, { status: 400 })

  const lead = await prisma.lead.create({
    data: {
      name,
      phone,
      detail,
      source: source || null,
      interestType: interestType || null,
      unitPrice: unitPrice ? parseFloat(unitPrice) : null,
      hasCoAgent: hasCoAgent || false,
      coAgentFee: coAgentFee ? parseFloat(coAgentFee) : null,
      commissionRate: commissionRate ? parseFloat(commissionRate) : null,
      netCommission: netCommission ? parseFloat(netCommission) : null,
      salerId: session.user.id,
    },
  })

  return Response.json(lead, { status: 201 })
}
