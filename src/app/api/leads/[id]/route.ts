import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      saler: { select: { id: true, name: true } },
      followUps: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!lead) return Response.json({ error: 'Not found' }, { status: 404 })
  if (session.user.role === 'SALE' && lead.salerId !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  return Response.json(lead)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const lead = await prisma.lead.findUnique({ where: { id } })
  if (!lead) return Response.json({ error: 'Not found' }, { status: 404 })
  if (session.user.role === 'SALE' && lead.salerId !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.phone && { phone: body.phone }),
      ...(body.detail !== undefined && { detail: body.detail }),
      ...(body.status && { status: body.status }),
    },
  })

  return Response.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'OWNER') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  await prisma.followUp.deleteMany({ where: { leadId: id } })
  await prisma.lead.delete({ where: { id } })

  return Response.json({ success: true })
}
