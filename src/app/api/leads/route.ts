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

  const { name, phone, detail } = await request.json()
  if (!name || !phone) return Response.json({ error: 'name and phone required' }, { status: 400 })

  const lead = await prisma.lead.create({
    data: { name, phone, detail, salerId: session.user.id },
  })

  return Response.json(lead, { status: 201 })
}
