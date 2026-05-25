'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Duplicate = {
  id: string
  name: string
  phone: string
  saler: { name: string }
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}

function formatMoney(value: string) {
  const raw = value.replace(/[^0-9.]/g, '')
  const parts = raw.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0]
}

function unformatMoney(value: string) {
  return value.replace(/,/g, '')
}

export default function NewLeadPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '', phone: '', detail: '',
    source: '', interestType: '',
    unitPrice: '', hasCoAgent: false, coAgentFee: '', commissionRate: '', netCommission: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [duplicates, setDuplicates] = useState<Duplicate[]>([])

  const checkDuplicate = useCallback(async (name: string, phone: string) => {
    if (!name && !phone) { setDuplicates([]); return }
    const params = new URLSearchParams()
    if (name.length >= 2) params.set('name', name)
    if (phone.length >= 4) params.set('phone', phone)
    if (!params.toString()) return
    const res = await fetch(`/api/leads/check-duplicate?${params}`)
    if (res.ok) setDuplicates(await res.json())
  }, [])

  useEffect(() => {
    const t = setTimeout(() => checkDuplicate(form.name, form.phone), 500)
    return () => clearTimeout(t)
  }, [form.name, form.phone, checkDuplicate])

  useEffect(() => {
    const price = parseFloat(unformatMoney(form.unitPrice)) || 0
    const rate = parseFloat(form.commissionRate) || 0
    const coFee = form.hasCoAgent ? (parseFloat(unformatMoney(form.coAgentFee)) || 0) : 0

    if (form.interestType === 'SELLING') {
      const commission = price * (rate / 100)
      const net = commission - (commission * (coFee / 100))
      setForm(prev => ({ ...prev, netCommission: net > 0 ? net.toFixed(2) : '' }))
    } else if (form.interestType === 'RENTAL') {
      const net = price - coFee
      setForm(prev => ({ ...prev, netCommission: net > 0 ? net.toFixed(2) : '' }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.unitPrice, form.commissionRate, form.coAgentFee, form.hasCoAgent, form.interestType])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        unitPrice: unformatMoney(form.unitPrice),
        coAgentFee: unformatMoney(form.coAgentFee),
        netCommission: unformatMoney(form.netCommission),
      }),
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

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <Link href="/crm/leads" className="text-sm text-gray-400 hover:text-gray-600">
          ← กลับ
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">เพิ่ม Lead ใหม่</h1>
      </div>

      {duplicates.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-800">พบข้อมูลที่อาจซ้ำกัน</p>
          <div className="mt-2 space-y-1">
            {duplicates.map(d => (
              <p key={d.id} className="text-xs text-amber-700">
                {d.name} ({d.phone}) — Sale: {d.saler.name}
              </p>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อลูกค้า *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            placeholder="ชื่อ-นามสกุล"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทร *</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })}
            className={inputClass}
            placeholder="08x-xxx-xxxx"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">แหล่งที่มา</label>
          <select
            value={form.source}
            onChange={e => setForm({ ...form, source: e.target.value })}
            className={inputClass}
          >
            <option value="">-- เลือก --</option>
            <option value="OWNER">Owner (Boat)</option>
            <option value="WALKIN">Walk-in</option>
            <option value="ONLINE">Online</option>
            <option value="TOURING">Touring</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">สนใจอะไร</label>
          <div className="flex gap-3">
            {[
              { value: 'SELLING', label: 'ซื้อ (Selling Price)' },
              { value: 'RENTAL', label: 'เช่า (Rental)' },
            ].map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="interestType"
                  value={opt.value}
                  checked={form.interestType === opt.value}
                  onChange={e => setForm({ ...form, interestType: e.target.value })}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {form.interestType && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {form.interestType === 'SELLING' ? 'ข้อมูลการขาย' : 'ข้อมูลค่าเช่า'}
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {form.interestType === 'SELLING' ? 'ราคา Unit (บาท)' : 'ค่าเช่า/เดือน (บาท)'}
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={form.unitPrice}
                onChange={e => setForm({ ...form, unitPrice: formatMoney(e.target.value) })}
                className={inputClass}
                placeholder={form.interestType === 'SELLING' ? '1,000,000' : '50,000'}
              />
            </div>

            {form.interestType === 'SELLING' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commission (%)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.commissionRate}
                  onChange={e => setForm({ ...form, commissionRate: e.target.value.replace(/[^0-9.]/g, '') })}
                  className={inputClass}
                  placeholder="3"
                />
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.hasCoAgent}
                  onChange={e => setForm({ ...form, hasCoAgent: e.target.checked, coAgentFee: '' })}
                  className="accent-blue-600 w-4 h-4"
                />
                <span className="text-sm text-gray-700">มี Co-Agent</span>
              </label>
            </div>

            {form.hasCoAgent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {form.interestType === 'SELLING' ? 'ค่า Co-Agent (%)' : 'ค่า Co-Agent (บาท)'}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.coAgentFee}
                  onChange={e => setForm({ ...form, coAgentFee: form.interestType === 'SELLING' ? e.target.value.replace(/[^0-9.]/g, '') : formatMoney(e.target.value) })}
                  className={inputClass}
                  placeholder={form.interestType === 'SELLING' ? '0.5' : '10,000'}
                />
              </div>
            )}

            {form.netCommission && (
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-500">Net Commission</p>
                <p className="text-lg font-bold text-green-600">
                  {parseFloat(form.netCommission).toLocaleString('th-TH')} บาท
                </p>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
          <textarea
            value={form.detail}
            onChange={e => setForm({ ...form, detail: e.target.value })}
            rows={3}
            className={inputClass + ' resize-none'}
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
