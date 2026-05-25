/**
 * Unit Tests — CRM System
 * ครอบคลุม: สิทธิ์ Sale / Owner + ทุก feature ใน Use Case
 */

import { GET, POST } from '@/app/api/leads/route'
import { GET as GET_ID, PUT, DELETE } from '@/app/api/leads/[id]/route'
import { POST as POST_FOLLOWUP } from '@/app/api/followups/route'

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    lead: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    followUp: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

const mockGetServerSession = getServerSession as jest.Mock
const mockLead = prisma.lead as jest.Mocked<typeof prisma.lead>
const mockFollowUp = prisma.followUp as jest.Mocked<typeof prisma.followUp>

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeRequest = (body?: object, method = 'GET') =>
  new NextRequest('http://localhost/api/leads', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) })

const SESSION_SALE = { user: { id: 'sale-1', name: 'มานี', role: 'SALE' } }
const SESSION_OWNER = { user: { id: 'owner-1', name: 'สมชาย', role: 'OWNER' } }

const LEAD_SALE1 = {
  id: 'lead-1',
  name: 'ลูกค้า A',
  phone: '081-111-1111',
  status: 'NEW',
  salerId: 'sale-1',
  saler: { id: 'sale-1', name: 'มานี' },
  followUps: [],
  _count: { followUps: 0 },
}
const LEAD_SALE2 = {
  id: 'lead-2',
  name: 'ลูกค้า B',
  phone: '082-222-2222',
  status: 'FOLLOWING',
  salerId: 'sale-2',
  saler: { id: 'sale-2', name: 'วิชัย' },
  followUps: [],
  _count: { followUps: 1 },
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. AUTHENTICATION — ไม่ login ต้องได้ 401 ทุก endpoint
// ══════════════════════════════════════════════════════════════════════════════

describe('🔒 Authentication — ไม่ login ต้อง 401', () => {
  beforeEach(() => mockGetServerSession.mockResolvedValue(null))

  test('GET /api/leads → 401', async () => {
    const res = await GET()
    expect(res.status).toBe(401)
  })

  test('POST /api/leads → 401', async () => {
    const res = await POST(makeRequest({ name: 'test', phone: '081' }, 'POST'))
    expect(res.status).toBe(401)
  })

  test('GET /api/leads/[id] → 401', async () => {
    const res = await GET_ID(makeRequest(), makeParams('lead-1'))
    expect(res.status).toBe(401)
  })

  test('PUT /api/leads/[id] → 401', async () => {
    const res = await PUT(makeRequest({}, 'PUT'), makeParams('lead-1'))
    expect(res.status).toBe(401)
  })

  test('DELETE /api/leads/[id] → 403 (ไม่มี session ถือว่า Forbidden)', async () => {
    const res = await DELETE(makeRequest(), makeParams('lead-1'))
    expect(res.status).toBe(403)
  })

  test('POST /api/followups → 401', async () => {
    const res = await POST_FOLLOWUP(makeRequest({ note: 'test', leadId: 'lead-1' }, 'POST'))
    expect(res.status).toBe(401)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 2. SALE — ดู Lead ของตัวเองเท่านั้น (UC-S3)
// ══════════════════════════════════════════════════════════════════════════════

describe('👤 Sale — ดูรายการ Lead (UC-S3)', () => {
  beforeEach(() => mockGetServerSession.mockResolvedValue(SESSION_SALE))

  test('GET /api/leads — query ด้วย salerId ของตัวเอง', async () => {
    mockLead.findMany.mockResolvedValue([LEAD_SALE1] as any)
    const res = await GET()
    expect(res.status).toBe(200)
    // ต้อง filter ด้วย salerId
    expect(mockLead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { salerId: 'sale-1' } })
    )
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].salerId).toBe('sale-1')
  })

  test('GET /api/leads/[id] — เห็น Lead ของตัวเอง → 200', async () => {
    mockLead.findUnique.mockResolvedValue(LEAD_SALE1 as any)
    const res = await GET_ID(makeRequest(), makeParams('lead-1'))
    expect(res.status).toBe(200)
  })

  test('GET /api/leads/[id] — Lead คนอื่น → 403 (UC-S3 ข้อจำกัด)', async () => {
    mockLead.findUnique.mockResolvedValue(LEAD_SALE2 as any)
    const res = await GET_ID(makeRequest(), makeParams('lead-2'))
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe('Forbidden')
  })

  test('GET /api/leads/[id] — Lead ไม่มีในระบบ → 404', async () => {
    mockLead.findUnique.mockResolvedValue(null)
    const res = await GET_ID(makeRequest(), makeParams('lead-xxx'))
    expect(res.status).toBe(404)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 3. SALE — เพิ่ม Lead ใหม่ (UC-S4)
// ══════════════════════════════════════════════════════════════════════════════

describe('👤 Sale — เพิ่ม Lead ใหม่ (UC-S4)', () => {
  beforeEach(() => mockGetServerSession.mockResolvedValue(SESSION_SALE))

  test('POST /api/leads — สร้าง Lead และ assign ให้ตัวเองอัตโนมัติ', async () => {
    const newLead = { ...LEAD_SALE1, id: 'lead-new' }
    mockLead.create.mockResolvedValue(newLead as any)

    const res = await POST(makeRequest({ name: 'ลูกค้า C', phone: '083-333-3333' }, 'POST'))
    expect(res.status).toBe(201)
    expect(mockLead.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ salerId: 'sale-1' }) })
    )
  })

  test('POST /api/leads — ไม่กรอกชื่อ → 400', async () => {
    const res = await POST(makeRequest({ phone: '083-333-3333' }, 'POST'))
    expect(res.status).toBe(400)
  })

  test('POST /api/leads — ไม่กรอกเบอร์ → 400', async () => {
    const res = await POST(makeRequest({ name: 'ลูกค้า C' }, 'POST'))
    expect(res.status).toBe(400)
  })

  test('POST /api/leads — ชื่อ + เบอร์ครบ (รายละเอียดไม่บังคับ) → 201', async () => {
    mockLead.create.mockResolvedValue(LEAD_SALE1 as any)
    const res = await POST(makeRequest({ name: 'ลูกค้า C', phone: '083-333-3333' }, 'POST'))
    expect(res.status).toBe(201)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 4. SALE — เปลี่ยนสถานะ Lead (UC-S5)
// ══════════════════════════════════════════════════════════════════════════════

describe('👤 Sale — เปลี่ยนสถานะ Lead (UC-S5)', () => {
  beforeEach(() => mockGetServerSession.mockResolvedValue(SESSION_SALE))

  test('PUT /api/leads/[id] — เปลี่ยนสถานะ Lead ของตัวเอง → 200', async () => {
    mockLead.findUnique.mockResolvedValue(LEAD_SALE1 as any)
    mockLead.update.mockResolvedValue({ ...LEAD_SALE1, status: 'FOLLOWING' } as any)

    const req = new NextRequest('http://localhost/api/leads/lead-1', {
      method: 'PUT',
      body: JSON.stringify({ status: 'FOLLOWING' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PUT(req, makeParams('lead-1'))
    expect(res.status).toBe(200)
    expect(mockLead.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FOLLOWING' }) })
    )
  })

  test('PUT /api/leads/[id] — เปลี่ยนสถานะ Lead คนอื่น → 403', async () => {
    mockLead.findUnique.mockResolvedValue(LEAD_SALE2 as any)

    const req = new NextRequest('http://localhost/api/leads/lead-2', {
      method: 'PUT',
      body: JSON.stringify({ status: 'FOLLOWING' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PUT(req, makeParams('lead-2'))
    expect(res.status).toBe(403)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 5. SALE — บันทึก Follow Up (UC-S6)
// ══════════════════════════════════════════════════════════════════════════════

describe('👤 Sale — บันทึก Follow Up (UC-S6)', () => {
  beforeEach(() => mockGetServerSession.mockResolvedValue(SESSION_SALE))

  test('POST /api/followups — บันทึก Follow Up Lead ของตัวเอง → 201', async () => {
    mockLead.findUnique.mockResolvedValue(LEAD_SALE1 as any)
    mockFollowUp.create.mockResolvedValue({ id: 'fu-1', note: 'โทรแล้ว', leadId: 'lead-1', userId: 'sale-1', user: { name: 'มานี' } } as any)

    const req = makeRequest({ note: 'โทรแล้ว', leadId: 'lead-1' }, 'POST')
    const res = await POST_FOLLOWUP(req)
    expect(res.status).toBe(201)
    expect(mockFollowUp.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'sale-1', leadId: 'lead-1' }) })
    )
  })

  test('POST /api/followups — บันทึก Follow Up Lead คนอื่น → 403', async () => {
    mockLead.findUnique.mockResolvedValue(LEAD_SALE2 as any)

    const req = makeRequest({ note: 'โทรแล้ว', leadId: 'lead-2' }, 'POST')
    const res = await POST_FOLLOWUP(req)
    expect(res.status).toBe(403)
  })

  test('POST /api/followups — ไม่ส่ง note → 400', async () => {
    const req = makeRequest({ leadId: 'lead-1' }, 'POST')
    const res = await POST_FOLLOWUP(req)
    expect(res.status).toBe(400)
  })

  test('POST /api/followups — ไม่ส่ง leadId → 400', async () => {
    const req = makeRequest({ note: 'โทรแล้ว' }, 'POST')
    const res = await POST_FOLLOWUP(req)
    expect(res.status).toBe(400)
  })

  test('POST /api/followups — Lead ไม่มีในระบบ → 404', async () => {
    mockLead.findUnique.mockResolvedValue(null)
    const req = makeRequest({ note: 'โทรแล้ว', leadId: 'lead-xxx' }, 'POST')
    const res = await POST_FOLLOWUP(req)
    expect(res.status).toBe(404)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 6. SALE — ข้อจำกัด: ลบ Lead ไม่ได้
// ══════════════════════════════════════════════════════════════════════════════

describe('👤 Sale — ข้อจำกัด: ลบ Lead ไม่ได้', () => {
  test('DELETE /api/leads/[id] — Sale พยายามลบ → 403', async () => {
    mockGetServerSession.mockResolvedValue(SESSION_SALE)
    const res = await DELETE(makeRequest(), makeParams('lead-1'))
    expect(res.status).toBe(403)
    expect(mockLead.delete).not.toHaveBeenCalled()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 7. OWNER — ดู Lead ทั้งหมด (UC-O3)
// ══════════════════════════════════════════════════════════════════════════════

describe('👑 Owner — ดู Lead ทั้งหมด (UC-O3)', () => {
  beforeEach(() => mockGetServerSession.mockResolvedValue(SESSION_OWNER))

  test('GET /api/leads — ไม่มี filter salerId → เห็นทุก Lead', async () => {
    mockLead.findMany.mockResolvedValue([LEAD_SALE1, LEAD_SALE2] as any)
    const res = await GET()
    expect(res.status).toBe(200)
    // Owner ต้องไม่มี where filter
    expect(mockLead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined })
    )
    const data = await res.json()
    expect(data).toHaveLength(2)
  })

  test('GET /api/leads/[id] — ดู Lead ของ Sale คนอื่นได้ → 200', async () => {
    mockLead.findUnique.mockResolvedValue(LEAD_SALE2 as any)
    const res = await GET_ID(makeRequest(), makeParams('lead-2'))
    expect(res.status).toBe(200)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 8. OWNER — เพิ่ม / แก้ไข Lead ใดก็ได้ (UC-O4)
// ══════════════════════════════════════════════════════════════════════════════

describe('👑 Owner — เพิ่ม / แก้ไข Lead (UC-O4)', () => {
  beforeEach(() => mockGetServerSession.mockResolvedValue(SESSION_OWNER))

  test('POST /api/leads — Owner สร้าง Lead → assign ให้ Owner เอง', async () => {
    const ownerLead = { ...LEAD_SALE1, salerId: 'owner-1' }
    mockLead.create.mockResolvedValue(ownerLead as any)

    const res = await POST(makeRequest({ name: 'ลูกค้า D', phone: '084-444-4444' }, 'POST'))
    expect(res.status).toBe(201)
    expect(mockLead.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ salerId: 'owner-1' }) })
    )
  })

  test('PUT /api/leads/[id] — Owner แก้ไข Lead ของ Sale → 200', async () => {
    mockLead.findUnique.mockResolvedValue(LEAD_SALE2 as any)
    mockLead.update.mockResolvedValue({ ...LEAD_SALE2, status: 'BOOKED' } as any)

    const req = new NextRequest('http://localhost/api/leads/lead-2', {
      method: 'PUT',
      body: JSON.stringify({ status: 'BOOKED' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PUT(req, makeParams('lead-2'))
    expect(res.status).toBe(200)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 9. OWNER — บันทึก Follow Up ทุก Lead (UC-O5)
// ══════════════════════════════════════════════════════════════════════════════

describe('👑 Owner — บันทึก Follow Up ทุก Lead (UC-O5)', () => {
  beforeEach(() => mockGetServerSession.mockResolvedValue(SESSION_OWNER))

  test('POST /api/followups — Owner บันทึก Follow Up Lead ของ Sale → 201', async () => {
    mockLead.findUnique.mockResolvedValue(LEAD_SALE2 as any)
    mockFollowUp.create.mockResolvedValue({ id: 'fu-2', note: 'Owner check', leadId: 'lead-2', userId: 'owner-1', user: { name: 'สมชาย' } } as any)

    const req = makeRequest({ note: 'Owner check', leadId: 'lead-2' }, 'POST')
    const res = await POST_FOLLOWUP(req)
    expect(res.status).toBe(201)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 10. OWNER — ลบ Lead (UC-O6)
// ══════════════════════════════════════════════════════════════════════════════

describe('👑 Owner — ลบ Lead (UC-O6)', () => {
  beforeEach(() => mockGetServerSession.mockResolvedValue(SESSION_OWNER))

  test('DELETE /api/leads/[id] — ลบ Lead พร้อม Follow Up ทั้งหมด → 200', async () => {
    mockFollowUp.deleteMany.mockResolvedValue({ count: 2 } as any)
    mockLead.delete.mockResolvedValue(LEAD_SALE1 as any)

    const res = await DELETE(makeRequest(), makeParams('lead-1'))
    expect(res.status).toBe(200)
    // ต้องลบ Follow Up ก่อน
    expect(mockFollowUp.deleteMany).toHaveBeenCalledWith({ where: { leadId: 'lead-1' } })
    // แล้วค่อยลบ Lead
    expect(mockLead.delete).toHaveBeenCalledWith({ where: { id: 'lead-1' } })
    const data = await res.json()
    expect(data.success).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 11. ตารางสรุปสิทธิ์ทั้งหมด
// ══════════════════════════════════════════════════════════════════════════════

describe('📊 ตารางสิทธิ์ — สรุปครบทุก feature', () => {
  test('Sale: เห็นเฉพาะ Lead ตัวเอง ✅', async () => {
    mockGetServerSession.mockResolvedValue(SESSION_SALE)
    mockLead.findMany.mockResolvedValue([LEAD_SALE1] as any)
    const res = await GET()
    expect(mockLead.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { salerId: 'sale-1' } }))
    expect(res.status).toBe(200)
  })

  test('Owner: เห็น Lead ทุกคน ✅', async () => {
    mockGetServerSession.mockResolvedValue(SESSION_OWNER)
    mockLead.findMany.mockResolvedValue([LEAD_SALE1, LEAD_SALE2] as any)
    const res = await GET()
    expect(mockLead.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: undefined }))
    expect(res.status).toBe(200)
  })

  test('Sale: เพิ่ม Lead ได้ ✅', async () => {
    mockGetServerSession.mockResolvedValue(SESSION_SALE)
    mockLead.create.mockResolvedValue(LEAD_SALE1 as any)
    const res = await POST(makeRequest({ name: 'test', phone: '081' }, 'POST'))
    expect(res.status).toBe(201)
  })

  test('Owner: เพิ่ม Lead ได้ ✅', async () => {
    mockGetServerSession.mockResolvedValue(SESSION_OWNER)
    mockLead.create.mockResolvedValue(LEAD_SALE1 as any)
    const res = await POST(makeRequest({ name: 'test', phone: '081' }, 'POST'))
    expect(res.status).toBe(201)
  })

  test('Sale: เปลี่ยนสถานะเฉพาะของตน ✅', async () => {
    mockGetServerSession.mockResolvedValue(SESSION_SALE)
    mockLead.findUnique.mockResolvedValue(LEAD_SALE2 as any) // คนอื่น
    const req = new NextRequest('http://localhost', { method: 'PUT', body: JSON.stringify({ status: 'FOLLOWING' }), headers: { 'Content-Type': 'application/json' } })
    const res = await PUT(req, makeParams('lead-2'))
    expect(res.status).toBe(403)
  })

  test('Owner: เปลี่ยนสถานะทั้งหมด ✅', async () => {
    mockGetServerSession.mockResolvedValue(SESSION_OWNER)
    mockLead.findUnique.mockResolvedValue(LEAD_SALE2 as any)
    mockLead.update.mockResolvedValue({ ...LEAD_SALE2, status: 'BOOKED' } as any)
    const req = new NextRequest('http://localhost', { method: 'PUT', body: JSON.stringify({ status: 'BOOKED' }), headers: { 'Content-Type': 'application/json' } })
    const res = await PUT(req, makeParams('lead-2'))
    expect(res.status).toBe(200)
  })

  test('Sale: ลบ Lead ไม่ได้ ❌', async () => {
    mockGetServerSession.mockResolvedValue(SESSION_SALE)
    const res = await DELETE(makeRequest(), makeParams('lead-1'))
    expect(res.status).toBe(403)
  })

  test('Owner: ลบ Lead ได้ ✅', async () => {
    mockGetServerSession.mockResolvedValue(SESSION_OWNER)
    mockFollowUp.deleteMany.mockResolvedValue({ count: 0 } as any)
    mockLead.delete.mockResolvedValue(LEAD_SALE1 as any)
    const res = await DELETE(makeRequest(), makeParams('lead-1'))
    expect(res.status).toBe(200)
  })
})
