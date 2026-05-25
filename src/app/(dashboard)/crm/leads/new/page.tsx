'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewLeadPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', phone: '', detail: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setLoading(false)
    if (res.ok) {
      router.push('/crm/leads')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'เกิดข้อผิดพลาด')
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <Link href="/crm/leads" className="text-sm text-gray-400 hover:text-gray-600">
          ← กลับ
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">เพิ่ม Lead ใหม่</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อลูกค้า *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="ชื่อ-นามสกุล"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทร *</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="08x-xxx-xxxx"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
          <textarea
            value={form.detail}
            onChange={e => setForm({ ...form, detail: e.target.value })}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="ความต้องการ, งบประมาณ ฯลฯ"
          />
        </div>

        {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Link
            href="/crm/leads"
            className="flex-1 text-center border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </form>
    </div>
  )
}
