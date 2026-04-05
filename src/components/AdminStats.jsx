'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminStats({ schoolId }) {
  const [stats, setStats] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    // Base queries
    let studentQ = supabase.from('students').select('*', { count: 'exact', head: true })
    let teacherQ = supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher')
    let classQ = supabase.from('classes').select('*', { count: 'exact', head: true })
    let assignmentQ = supabase.from('assignments').select('*', { count: 'exact', head: true })
    let recentStudentQ = supabase.from('students').select(`
      student_code,
      profile:profiles!students_profile_id_fkey(full_name),
      class:classes(name)
    `).order('created_at', { ascending: false }).limit(5)

    // Filter theo school nếu có
    if (schoolId) {
      studentQ = studentQ.eq('school_id', schoolId)
      teacherQ = teacherQ.eq('school_id', schoolId)
      classQ = classQ.eq('school_id', schoolId)
      assignmentQ = assignmentQ.eq('school_id', schoolId)
      recentStudentQ = recentStudentQ.eq('school_id', schoolId)
    }

    const [
      { count: studentCount },
      { count: teacherCount },
      { count: classCount },
      { count: subjectCount },
      { count: assignmentCount },
      { data: attendanceData },
      { data: gradeData },
      { data: recentStudents },
    ] = await Promise.all([
      studentQ,
      teacherQ,
      classQ,
      supabase.from('subjects').select('*', { count: 'exact', head: true }),
      assignmentQ,
      supabase.from('attendance').select('status'),
      supabase.from('grades').select('score'),
      recentStudentQ,
    ])
  }

  if (!stats) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border p-6 animate-pulse">
          <div className="w-10 h-10 bg-gray-200 rounded-xl mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
          <div className="h-4 bg-gray-100 rounded w-24"></div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: '👨‍🎓', label: 'Học sinh', value: stats.studentCount, color: 'bg-blue-50 border-blue-100 text-blue-600', href: '/dashboard/students' },
          { icon: '👨‍🏫', label: 'Giáo viên', value: stats.teacherCount, color: 'bg-green-50 border-green-100 text-green-600', href: '/dashboard/teachers' },
          { icon: '🏫', label: 'Lớp học', value: stats.classCount, color: 'bg-purple-50 border-purple-100 text-purple-600', href: '/dashboard/classes' },
          { icon: '📚', label: 'Môn học', value: stats.subjectCount, color: 'bg-orange-50 border-orange-100 text-orange-600', href: '/dashboard/subjects' },
        ].map(stat => (
          <Link key={stat.label} href={stat.href}>
            <div className={`rounded-2xl border-2 p-5 hover:shadow-md transition cursor-pointer ${stat.color}`}>
              <div className="text-3xl mb-3">{stat.icon}</div>
              <p className="text-3xl font-bold">{stat.value ?? 0}</p>
              <p className="text-sm font-medium opacity-70 mt-1">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border p-5 text-center">
          <div className="text-3xl mb-2">📝</div>
          <p className="text-2xl font-bold text-gray-800">{stats.assignmentCount ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">Bài tập</p>
        </div>
        <div className={`rounded-2xl border p-5 text-center ${stats.attendanceRate >= 80 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="text-3xl mb-2">✅</div>
          <p className={`text-2xl font-bold ${stats.attendanceRate >= 80 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.attendanceRate}%
          </p>
          <p className="text-sm text-gray-500 mt-1">Tỷ lệ chuyên cần</p>
        </div>
        <div className={`rounded-2xl border p-5 text-center ${parseFloat(stats.avgScore) >= 7 ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="text-3xl mb-2">📊</div>
          <p className={`text-2xl font-bold ${parseFloat(stats.avgScore) >= 7 ? 'text-blue-600' : 'text-yellow-600'}`}>
            {stats.avgScore}
          </p>
          <p className="text-sm text-gray-500 mt-1">Điểm TB toàn trường</p>
        </div>
      </div>

      {/* Recent students */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">👨‍🎓 Học sinh mới nhập học</h3>
          <div className="bg-white rounded-2xl border overflow-hidden">
            {stats.recentStudents?.length === 0 ? (
              <div className="p-6 text-center text-gray-400">Chưa có học sinh</div>
            ) : (
              <div className="divide-y">
                {stats.recentStudents?.map((s, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                      {s.profile?.full_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{s.profile?.full_name}</p>
                      <p className="text-xs text-gray-400">{s.class?.name ? `Lớp ${s.class.name}` : 'Chưa phân lớp'}</p>
                    </div>
                    <span className="font-mono text-xs text-gray-400">{s.student_code}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="p-3 border-t bg-gray-50 text-center">
              <Link href="/dashboard/students" className="text-blue-500 text-sm hover:underline font-medium">
                Xem tất cả →
              </Link>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">⚡ Truy cập nhanh</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '➕', label: 'Thêm học sinh', href: '/dashboard/students', color: 'bg-blue-500' },
              { icon: '👨‍🏫', label: 'Thêm giáo viên', href: '/dashboard/teachers', color: 'bg-green-500' },
              { icon: '🏫', label: 'Tạo lớp học', href: '/dashboard/classes', color: 'bg-purple-500' },
              { icon: '🔔', label: 'Gửi thông báo', href: '/dashboard/notifications', color: 'bg-red-500' },
              { icon: '📊', label: 'Bảng điểm', href: '/dashboard/grades', color: 'bg-orange-500' },
              { icon: '✅', label: 'Điểm danh', href: '/dashboard/attendance', color: 'bg-teal-500' },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className="bg-white rounded-2xl border p-4 flex items-center gap-3 hover:shadow-md transition group">
                <div className={`${item.color} w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow flex-shrink-0`}>
                  {item.icon}
                </div>
                <span className="font-medium text-gray-700 text-xs group-hover:text-blue-600 leading-tight">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}