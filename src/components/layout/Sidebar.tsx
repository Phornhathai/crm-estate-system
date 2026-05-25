'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

const navItems = [
  { href: '/crm/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/crm/leads', label: 'Leads', icon: '👥' },
  { href: '/crm/users', label: 'จัดการผู้ใช้', icon: '⚙️', ownerOnly: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <aside className="w-56 bg-white border-r border-gray-100 flex flex-col h-full">
      <div className="p-5 border-b border-gray-100">
        <h1 className="font-bold text-gray-900 text-lg">CRM System</h1>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.filter(item => !item.ownerOnly || session?.user?.role === 'OWNER').map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname.startsWith(item.href)
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs font-medium text-gray-900 truncate">{session?.user?.name}</p>
          <p className="text-xs text-gray-400">{session?.user?.role}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          <span>🚪</span>
          ออกจากระบบ
        </button>
      </div>
    </aside>
  )
}
