'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const menuItems = {
  admin: [
    { href: '/dashboard', icon: '🏠', label: 'Tổng quan' },
    { href: '/dashboard/classes', icon: '🏫', label: 'Lớp học' },
    { href: '/dashboard/students', icon: '👨‍🎓', label: 'Học sinh' },
    { href: '/dashboard/teachers', icon: '👨‍🏫', label: 'Giáo viên' },
    { href: '/dashboard/subjects', icon: '📚', label: 'Môn học' },
    { href: '/dashboard/notifications', icon: '🔔', label: 'Thông báo' },
  ],
  teacher: [
    { href: '/dashboard', icon: '🏠', label: 'Tổng quan' },
    { href: '/dashboard/classes', icon: '🏫', label: 'Lớp học' },
    { href: '/dashboard/assignments', icon: '📝', label: 'Bài tập' },
    { href: '/dashboard/grades', icon: '📊', label: 'Bảng điểm' },
    { href: '/dashboard/attendance', icon: '✅', label: 'Điểm danh' },
    { href: '/dashboard/notifications', icon: '🔔', label: 'Thông báo' },
  ],
  student: [
    { href: '/dashboard', icon: '🏠', label: 'Tổng quan' },
    { href: '/dashboard/assignments', icon: '📝', label: 'Bài tập' },
    { href: '/dashboard/grades', icon: '📊', label: 'Điểm số' },
    { href: '/dashboard/attendance', icon: '✅', label: 'Điểm danh' },
    { href: '/dashboard/notifications', icon: '🔔', label: 'Thông báo' },
  ],
  parent: [
    { href: '/dashboard', icon: '🏠', label: 'Tổng quan' },
    { href: '/dashboard/grades', icon: '📊', label: 'Điểm số con' },
    { href: '/dashboard/attendance', icon: '✅', label: 'Điểm danh' },
    { href: '/dashboard/notifications', icon: '🔔', label: 'Thông báo' },
  ],
}

export default function Sidebar({ profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const items = menuItems[profile?.role] || menuItems.student

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const roleLabel = {
    admin: 'Quản trị viên',
    teacher: 'Giáo viên',
    student: 'Học sinh',
    parent: 'Phụ huynh',
  }

  const roleBg = {
    admin: 'bg-purple-100 text-purple-700',
    teacher: 'bg-blue-100 text-blue-700',
    student: 'bg-green-100 text-green-700',
    parent: 'bg-orange-100 text-orange-700',
  }

  return (
    <div className="w-64 min-h-screen bg-white shadow-lg flex flex-col">

      {/* Logo */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏫</span>
          <div>
            <h1 className="font-bold text-gray-800 text-lg leading-tight">Trường LMS</h1>
            <p className="text-xs text-gray-400">Hệ thống quản lý</p>
          </div>
        </div>
      </div>

      {/* Profile */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
            {profile?.full_name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-800 text-sm truncate">{profile?.full_name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBg[profile?.role]}`}>
              {roleLabel[profile?.role]}
            </span>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-medium
                ${isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition text-sm font-medium"
        >
          <span className="text-lg">🚪</span>
          Đăng xuất
        </button>
      </div>

    </div>
  )
}