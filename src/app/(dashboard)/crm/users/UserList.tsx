'use client'

import { useState } from 'react'

type User = {
  id: string
  name: string
  email: string
  role: string
  createdAt: Date | string
}

export default function UserList({ initialUsers, currentUserId }: { initialUsers: User[]; currentUserId: string }) {
  const [users, setUsers] = useState(initialUsers)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'SALE' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'เกิดข้อผิดพลาด')
      setLoading(false)
      return
    }

    const newUser = await res.json()
    setUsers([newUser, ...users])
    setForm({ name: '', email: '', password: '', role: 'SALE' })
    setShowForm(false)
    setLoading(false)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`ลบผู้ใช้ "${name}" ?`)) return

    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setUsers(users.filter(u => u.id !== id))
    } else {
      const data = await res.json()
      alert(data.error || 'ลบไม่สำเร็จ')
    }
  }

  return (
    <>
      <button
        onClick={() => setShowForm(!showForm)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        {showForm ? 'ยกเลิก' : '+ เพิ่มผู้ใช้'}
      </button>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="SALE">SALE</option>
                <option value="OWNER">OWNER</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {users.map(user => (
            <div key={user.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
                user.role === 'OWNER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {user.role}
              </span>
              {user.id !== currentUserId && (
                <button
                  onClick={() => handleDelete(user.id, user.name)}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  ลบ
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
