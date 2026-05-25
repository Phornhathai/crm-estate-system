'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const statusOptions = [
  { value: 'NEW', label: 'ใหม่' },
  { value: 'FOLLOWING', label: 'ติดตาม' },
  { value: 'BOOKING_INTENT', label: 'สนใจจอง' },
  { value: 'BOOKED', label: 'จองแล้ว' },
  { value: 'LOST', label: 'หลุด' },
]

const statusColor: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-600', FOLLOWING: 'bg-blue-100 text-blue-700',
  BOOKING_INTENT: 'bg-yellow-100 text-yellow-700', BOOKED: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-600',
}

type Lead = {
  id: string; name: string; phone: string; detail?: string; status: string;
  saler: { name: string }; createdAt: string;
  followUps: { id: string; note: string; createdAt: string; user: { name: string } }[]
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)

  useEffect(() => {
    fetch(`/api/leads/${id}`).then(r => r.json()).then(setLead)
  }, [id])

  async function updateStatus(status: string) {
    setSavingStatus(true)
    await fetch(`/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setLead(prev => prev ? { ...prev, status } : null)
    setSavingStatus(false)
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    if (!note.trim()) return
    setSavingNote(true)

    const res = await fetch('/api/followups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note, leadId: id }),
    })

    if (res.ok) {
      const newNote = await res.json()
      setLead(prev => prev ? { ...prev, followUps: [newNote, ...prev.followUps] } : null)
      setNote('')
    }
    setSavingNote(false)
  }

  async function deleteLead() {
    if (!confirm('ลบ Lead นี้?')) return
    await fetch(`/api/leads/${id}`, { method: 'DELETE' })
    router.push('/crm/leads')
  }

  if (!lead) {
    return <div className="flex items-center justify-center h-64 text-gray-400">กำลังโหลด...</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/crm/leads" className="text-sm text-gray-400 hover:text-gray-600">← กลับ</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{lead.name}</h1>
          <p className="text-gray-500 text-sm">{lead.phone}</p>
        </div>
        <button onClick={deleteLead} className="text-xs text-red-400 hover:text-red-600 mt-6">
          ลบ
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">สถานะ</p>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => updateStatus(opt.value)}
                disabled={savingStatus}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                  lead.status === opt.value
                    ? statusColor[opt.value] + ' ring-2 ring-offset-1 ring-current'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {lead.detail && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">รายละเอียด</p>
            <p className="text-sm text-gray-700">{lead.detail}</p>
          </div>
        )}

        <div className="text-xs text-gray-400 pt-1 border-t border-gray-50">
          Sale: {lead.saler.name} · เพิ่มเมื่อ {new Date(lead.createdAt).toLocaleDateString('th-TH')}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Follow Up</h2>

        <form onSubmit={addNote} className="flex gap-2">
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="บันทึกหมายเหตุ..."
          />
          <button
            type="submit"
            disabled={savingNote || !note.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            บันทึก
          </button>
        </form>

        <div className="space-y-2.5">
          {lead.followUps.map(fu => (
            <div key={fu.id} className="flex gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-300 mt-1.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-700">{fu.note}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {fu.user.name} · {new Date(fu.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {lead.followUps.length === 0 && (
            <p className="text-sm text-gray-400">ยังไม่มีบันทึก</p>
          )}
        </div>
      </div>
    </div>
  )
}
