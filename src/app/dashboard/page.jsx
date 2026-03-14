'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import StatsCard from '@/components/StatsCard'

export default function DashboardPage() {
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profileData)

      // Lấy thống kê cho admin
      if (profileData?.role === 'admin') {
        const [{ count: studentCount }, { count: teacherCount }, { count: classCount }] =
          await Promise.all([
            supabase.from('students').select('*', { count: 'exact', head: true }),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
            supabase.from('classes').select('*', { count: 'exact', head: true }),
          ])
        setStats({ studentCount, teacherCount, classCount })
      }

      setLoading(false)
    }
    getData()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-bounce">🏫</div>
        <p className="text-gray-500">Đang tải...</p>
      </div>
    </div>
  )

  const adminStats = [
    { icon: '👨‍🎓', label: 'Học sinh', value: stats.studentCount ?? 0, color: 'blue' },
    { icon: '👨‍🏫', label: 'Giáo viên', value: stats.teacherCount ?? 0, color: 'green' },
    { icon: '🏫', label: 'Lớp học', value: stats.classCount ?? 0, color: 'purple' },
    { icon: '📚', label: 'Môn học', value: 0, color: 'orange' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Sidebar */}
      <Sidebar profile={profile} />

      {/* Main content */}
      <div className="flex-1 p-8 overflow-auto">

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800">
            Xin chào, {profile?.full_name}! 👋
          </h2>
          <p className="text-gray-500 mt-1">
            {new Date().toLocaleDateString('vi-VN', {
              weekday: 'long', year: 'numeric',
              month: 'long', day: 'numeric'
            })}
          </p>
        </div>

        {/* Stats - chỉ hiện cho admin */}
        {profile?.role === 'admin' && (
          <>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">📊 Thống kê tổng quan</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {adminStats.map((stat) => (
                <StatsCard key={stat.label} {...stat} />
              ))}
            </div>
          </>
        )}

        {/* Quick actions */}
        <h3 className="text-lg font-semibold text-gray-700 mb-4">⚡ Truy cập nhanh</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: '🏫', label: 'Quản lý lớp học', href: '/dashboard/classes', color: 'bg-blue-500' },
            { icon: '👨‍🎓', label: 'Quản lý học sinh', href: '/dashboard/students', color: 'bg-green-500' },
            { icon: '📝', label: 'Bài tập', href: '/dashboard/assignments', color: 'bg-yellow-500' },
            { icon: '📊', label: 'Bảng điểm', href: '/dashboard/grades', color: 'bg-purple-500' },
            { icon: '✅', label: 'Điểm danh', href: '/dashboard/attendance', color: 'bg-orange-500' },
            { icon: '🔔', label: 'Thông báo', href: '/dashboard/notifications', color: 'bg-red-500' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="bg-white rounded-2xl shadow-sm border p-6 flex items-center gap-4 hover:shadow-md transition group"
            >
              <div className={`${item.color} w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-md`}>
                {item.icon}
              </div>
              <span className="font-medium text-gray-700 group-hover:text-blue-600 transition">
                {item.label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}