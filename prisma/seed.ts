import 'dotenv/config'
import { PrismaClient, Role, LeadStatus } from '../src/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import bcrypt from 'bcryptjs'

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? 'file:dev.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
})
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: 'owner@crm.com' },
    update: {},
    create: {
      name: 'คุณสมชาย (Owner)',
      email: 'owner@crm.com',
      password: await bcrypt.hash('password123', 10),
      role: Role.OWNER,
    },
  })

  const sale1 = await prisma.user.upsert({
    where: { email: 'sale1@crm.com' },
    update: {},
    create: {
      name: 'คุณมานี (Sale)',
      email: 'sale1@crm.com',
      password: await bcrypt.hash('password123', 10),
      role: Role.SALE,
    },
  })

  const sale2 = await prisma.user.upsert({
    where: { email: 'sale2@crm.com' },
    update: {},
    create: {
      name: 'คุณวิชัย (Sale)',
      email: 'sale2@crm.com',
      password: await bcrypt.hash('password123', 10),
      role: Role.SALE,
    },
  })

  const lead1 = await prisma.lead.create({
    data: {
      name: 'นายสมหมาย ใจดี',
      phone: '081-234-5678',
      detail: 'สนใจคอนโด 2 ห้องนอน ราคาไม่เกิน 3 ล้าน',
      status: LeadStatus.FOLLOWING,
      salerId: sale1.id,
    },
  })

  const lead2 = await prisma.lead.create({
    data: {
      name: 'นางสาวรัตนา พงษ์ดี',
      phone: '089-876-5432',
      detail: 'ต้องการบ้านเดี่ยว ใกล้โรงเรียน',
      status: LeadStatus.BOOKING_INTENT,
      salerId: sale1.id,
    },
  })

  await prisma.lead.create({
    data: {
      name: 'นายธนา สุขสม',
      phone: '062-111-2222',
      status: LeadStatus.NEW,
      salerId: sale2.id,
    },
  })

  await prisma.followUp.createMany({
    data: [
      { note: 'โทรแล้ว รับสาย นัดดูโครงการวันเสาร์', leadId: lead1.id, userId: sale1.id },
      { note: 'พาดูโครงการ A ชอบ ราคาใกล้เคียง', leadId: lead1.id, userId: sale1.id },
      { note: 'ขอเวลาคิด 1 อาทิตย์', leadId: lead2.id, userId: sale1.id },
    ],
  })

  console.log('✅ Seed สำเร็จ!')
  console.log('Owner:', owner.email)
  console.log('Sale 1:', sale1.email)
  console.log('Sale 2:', sale2.email)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
