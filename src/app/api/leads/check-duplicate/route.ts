import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const name = request.nextUrl.searchParams.get('name')
  const phone = request.nextUrl.searchParams.get('phone')

  if (!name && !phone) return Response.json([])

  const duplicates = await prisma.lead.findMany({
    where: {
      OR: [
        ...(name ? [{ name: { contains: name } }] : []),
        ...(phone ? [{ phone: { contains: phone } }] : []),
      ],
    },
    select: {
      id: true,
      name: true,
      phone: true,
      saler: { select: { name: true } },
    },
    take: 5,
  })

  return Response.json(duplicates)
}
