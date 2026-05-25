import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'OWNER') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json(users)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'OWNER') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { name, email, password, role } = await request.json()

  if (!name || !email || !password) {
    return Response.json({ error: 'name, email, and password are required' }, { status: 400 })
  }

  if (role && !['SALE', 'OWNER'].includes(role)) {
    return Response.json({ error: 'Invalid role' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return Response.json({ error: 'Email already exists' }, { status: 409 })
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: role || 'SALE',
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  return Response.json(user, { status: 201 })
}
