import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { note, leadId } = await request.json()
  if (!note || !leadId) return Response.json({ error: 'note and leadId required' }, { status: 400 })

  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 })
  if (session.user.role === 'SALE' && lead.salerId !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const followUp = await prisma.followUp.create({
    data: { note, leadId, userId: session.user.id },
    include: { user: { select: { name: true } } },
  })

  return Response.json(followUp, { status: 201 })
}
