'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const menuItems = {
  super_admin: [
    { href: '/dashboard', icon: '🏠', label: 'Tổng quan' },
    { href: '/dashboard/notifications', icon: '🔔', label: 'Thông báo' },
    { href: '/dashboard/chat', icon: '💬', label: 'Tin nhắn' },
  ],
  school_admin: [
    { href: '/dashboard', icon: '🏠', label: 'Tổng quan' },
    { href: '/dashboard/classes', icon: '🏫', label: 'Lớp học' },
    { href: '/dashboard/students', icon: '👨‍🎓', label: 'Học sinh' },
    { href: '/dashboard/teachers', icon: '👨‍🏫', label: 'Giáo viên' },
    { href: '/dashboard/subjects', icon: '📚', label: 'Môn học' },
    { href: '/dashboard/timetable', icon: '📅', label: 'Thời khóa biểu' },
    { href: '/dashboard/lessons', icon: '📖', label: 'Bài giảng' },
    { href: '/dashboard/grades', icon: '📊', label: 'Bảng điểm' },
    { href: '/dashboard/attendance', icon: '✅', label: 'Điểm danh' },
    { href: '/dashboard/parents', icon: '👨‍👩‍👧', label: 'Phụ huynh' },  // ← THÊM DÒNG NÀY
    { href: '/dashboard/notifications', icon: '🔔', label: 'Thông báo' },
  ],
  teacher: [
    { href: '/dashboard', icon: '🏠', label: 'Tổng quan' },
    { href: '/dashboard/timetable', icon: '📅', label: 'Thời khóa biểu' },
    { href: '/dashboard/classes', icon: '🏫', label: 'Lớp học' },
    { href: '/dashboard/lessons', icon: '📖', label: 'Bài giảng' },
    { href: '/dashboard/assignments', icon: '📝', label: 'Bài tập' },
    { href: '/dashboard/grades', icon: '📊', label: 'Bảng điểm' },
    { href: '/dashboard/attendance', icon: '✅', label: 'Điểm danh' },
    { href: '/dashboard/notifications', icon: '🔔', label: 'Thông báo' },
    { href: '/dashboard/chat', icon: '💬', label: 'Tin nhắn' },
  ],
  student: [
    { href: '/dashboard', icon: '🏠', label: 'Tổng quan' },
    { href: '/dashboard/ai-learning', icon: '🚀', label: 'AI Learning' },
    { href: '/dashboard/timetable', icon: '📅', label: 'Thời khóa biểu' },
    { href: '/dashboard/lessons', icon: '📖', label: 'Bài giảng' },
    { href: '/dashboard/assignments', icon: '📝', label: 'Bài tập' },
    { href: '/dashboard/grades', icon: '📊', label: 'Điểm số' },
    { href: '/dashboard/notifications', icon: '🔔', label: 'Thông báo' },
  ],
  parent: [
    { href: '/dashboard', icon: '🏠', label: 'Tổng quan' },
    { href: '/dashboard/timetable', icon: '📅', label: 'Thời khóa biểu' },
    { href: '/dashboard/grades', icon: '📊', label: 'Điểm số con' },
    { href: '/dashboard/notifications', icon: '🔔', label: 'Thông báo' },
    // Thêm vào admin, teacher, parent:
    { href: '/dashboard/chat', icon: '💬', label: 'Tin nhắn' },
  ],
}

export default function Sidebar({ profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const items = menuItems[profile?.role] || menuItems.student

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const roleLabel = {
    super_admin: 'Super Admin',
    school_admin: 'Quản trị trường',
    teacher: 'Giáo viên',
    student: 'Học sinh',
    parent: 'Phụ huynh',
  }
  const roleBg = {
    super_admin: 'bg-red-100 text-red-700',
    school_admin: 'bg-indigo-100 text-indigo-700',
    teacher: 'bg-blue-100 text-blue-700',
    student: 'bg-green-100 text-green-700',
    parent: 'bg-orange-100 text-orange-700',
  }

  const SidebarContent = () => (
    <>
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
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
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
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
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

      {/* Profile + Logout */}
      <div className="p-4 border-t space-y-1">
        <Link
          href="/dashboard/profile"
          onClick={() => setMobileOpen(false)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 transition text-sm font-medium"
        >
          <span className="text-lg">👤</span>
          Tài khoản
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition text-sm font-medium"
        >
          <span className="text-lg">🚪</span>
          Đăng xuất
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white rounded-xl shadow-lg border flex items-center justify-center text-gray-600 hover:bg-gray-50 transition"
      >
        ☰
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={`lg:hidden fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 flex flex-col transform transition-transform duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
        >
          ✕
        </button>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-64 min-h-screen bg-white shadow-lg flex-col">
        <SidebarContent />
      </div>
    </>
  )
}