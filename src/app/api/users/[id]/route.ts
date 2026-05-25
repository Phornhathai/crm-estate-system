import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'OWNER') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  if (id === session.user.id) {
    return Response.json({ error: 'Cannot delete yourself' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: { _count: { select: { leads: true, followUps: true } } },
  })
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  if (user._count.leads > 0) {
    return Response.json(
      { error: `ลบไม่ได้ — ผู้ใช้นี้มี ${user._count.leads} Lead อยู่ ต้องย้าย Lead ก่อน` },
      { status: 400 }
    )
  }

  await prisma.followUp.deleteMany({ where: { userId: id } })
  await prisma.user.delete({ where: { id } })

  return Response.json({ success: true })
}
