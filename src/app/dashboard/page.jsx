'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import StatsCard from '@/components/StatsCard'
import Link from 'next/link'
import LoadingPage from '@/components/Skeleton'

export default function DashboardPage() {
  const [profile, setProfile] = useState(null)
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).maybeSingle()
      setProfile(profileData)

      if (profileData?.role === 'admin') await loadAdminData()
      if (profileData?.role === 'teacher') await loadTeacherData(profileData)
      if (profileData?.role === 'student') await loadStudentData(user.id)
      if (profileData?.role === 'parent') await loadParentData(user.id)

      setLoading(false)
    }
    getData()
  }, [])

  const loadAdminData = async () => {
    const [
      { count: studentCount },
      { count: teacherCount },
      { count: classCount },
      { count: subjectCount },
      { data: recentNotifs }
    ] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
      supabase.from('classes').select('*', { count: 'exact', head: true }),
      supabase.from('subjects').select('*', { count: 'exact', head: true }),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(3)
    ])
    setData({ studentCount, teacherCount, classCount, subjectCount, recentNotifs })
  }

  const loadTeacherData = async (profileData) => {
    const [
      { data: myClasses },
      { count: assignmentCount },
      { data: recentSubmissions }
    ] = await Promise.all([
      supabase.from('teacher_classes').select(`
        id, class:classes(name, grade), subject:subjects(name)
      `).eq('teacher_id', profileData.id),
      supabase.from('assignments').select('*', { count: 'exact', head: true }).eq('teacher_id', profileData.id),
      supabase.from('assignments').select(`
        id, title, due_date,
        submissions(count)
      `).eq('teacher_id', profileData.id).order('created_at', { ascending: false }).limit(3)
    ])
    setData({ myClasses, assignmentCount, recentSubmissions })
  }

  const loadStudentData = async (userId) => {
    const { data: studentData } = await supabase
      .from('students')
      .select(`*, class:classes(name, grade, academic_year)`)
      .eq('profile_id', userId)
      .single()

    if (!studentData) return setData({})

    const [
      { data: assignments },
      { data: mySubmissions },
      { data: recentGrades },
      { data: attendanceStats }
    ] = await Promise.all([
      supabase.from('assignments').select(`
        *, subject:subjects(name), teacher:profiles!assignments_teacher_id_fkey(full_name)
      `).eq('class_id', studentData.class_id).order('due_date', { ascending: true }).limit(5),
      supabase.from('submissions').select('assignment_id, grade').eq('student_id', studentData.id),
      supabase.from('grades').select(`
        *, subject:subjects(name)
      `).eq('student_id', studentData.id).order('created_at', { ascending: false }).limit(6),
      supabase.from('attendance').select('status').eq('student_id', studentData.id)
    ])

    const presentCount = attendanceStats?.filter(a => a.status === 'present').length || 0
    const absentCount = attendanceStats?.filter(a => a.status === 'absent').length || 0
    const totalDays = attendanceStats?.length || 0
    const attendanceRate = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 100

    setData({ studentData, assignments, mySubmissions, recentGrades, attendanceRate, absentCount, totalDays })
  }

  const loadParentData = async (userId) => {
    const { data: studentData } = await supabase
      .from('students')
      .select(`
        *,
        profile:profiles!students_profile_id_fkey(full_name, email),
        class:classes(name, grade, academic_year)
      `)
      .eq('parent_id', userId)
      .single()

    if (!studentData) return setData({ noChild: true })

    const [
      { data: recentGrades },
      { data: attendanceStats },
      { data: recentNotifs }
    ] = await Promise.all([
      supabase.from('grades').select(`*, subject:subjects(name)`)
        .eq('student_id', studentData.id).order('created_at', { ascending: false }).limit(6),
      supabase.from('attendance').select('status, date').eq('student_id', studentData.id).order('date', { ascending: false }).limit(10),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(3)
    ])

    const absentCount = attendanceStats?.filter(a => a.status === 'absent').length || 0
    const totalDays = attendanceStats?.length || 0
    const attendanceRate = totalDays > 0
      ? Math.round((attendanceStats?.filter(a => a.status === 'present').length / totalDays) * 100)
      : 100

    setData({ studentData, recentGrades, attendanceStats, absentCount, attendanceRate, recentNotifs })
  }

  if (loading) return <LoadingPage />

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />
      <div className="flex-1 p-8 overflow-auto">

        {/* Header chào */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800">
            Xin chào, {profile?.full_name}! 👋
          </h2>
          <p className="text-gray-500 mt-1">
            {new Date().toLocaleDateString('vi-VN', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        </div>

        {/* ADMIN */}
        {profile?.role === 'admin' && (
          <>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">📊 Thống kê tổng quan</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatsCard icon="👨‍🎓" label="Học sinh" value={data.studentCount ?? 0} color="blue" />
              <StatsCard icon="👨‍🏫" label="Giáo viên" value={data.teacherCount ?? 0} color="green" />
              <StatsCard icon="🏫" label="Lớp học" value={data.classCount ?? 0} color="purple" />
              <StatsCard icon="📚" label="Môn học" value={data.subjectCount ?? 0} color="orange" />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">⚡ Truy cập nhanh</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: '🏫', label: 'Lớp học', href: '/dashboard/classes', color: 'bg-blue-500' },
                    { icon: '👨‍🎓', label: 'Học sinh', href: '/dashboard/students', color: 'bg-green-500' },
                    { icon: '👨‍🏫', label: 'Giáo viên', href: '/dashboard/teachers', color: 'bg-purple-500' },
                    { icon: '🔔', label: 'Thông báo', href: '/dashboard/notifications', color: 'bg-red-500' },
                  ].map(item => (
                    <Link key={item.href} href={item.href}
                      className="bg-white rounded-2xl border p-4 flex items-center gap-3 hover:shadow-md transition group">
                      <div className={`${item.color} w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow`}>
                        {item.icon}
                      </div>
                      <span className="font-medium text-gray-700 text-sm group-hover:text-blue-600">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">🔔 Thông báo gần đây</h3>
                <div className="space-y-3">
                  {data.recentNotifs?.length === 0 ? (
                    <div className="bg-white rounded-2xl border p-6 text-center text-gray-400">Chưa có thông báo</div>
                  ) : data.recentNotifs?.map(n => (
                    <div key={n.id} className="bg-white rounded-2xl border p-4">
                      <p className="font-medium text-gray-800 text-sm">{n.title}</p>
                      <p className="text-gray-400 text-xs mt-1">
                        {new Date(n.created_at).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* TEACHER */}
        {profile?.role === 'teacher' && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <StatsCard icon="🏫" label="Lớp đang dạy" value={data.myClasses?.length ?? 0} color="blue" />
              <StatsCard icon="📝" label="Bài tập đã tạo" value={data.assignmentCount ?? 0} color="purple" />
              <StatsCard icon="📤" label="Bài nộp gần đây" value={data.recentSubmissions?.reduce((a, b) => a + (b.submissions?.[0]?.count || 0), 0) ?? 0} color="green" />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">🏫 Lớp đang dạy</h3>
                <div className="space-y-2">
                  {data.myClasses?.length === 0 ? (
                    <div className="bg-white rounded-2xl border p-6 text-center text-gray-400">Chưa được phân công lớp</div>
                  ) : data.myClasses?.map(tc => (
                    <div key={tc.id} className="bg-white rounded-2xl border p-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-800">{tc.subject?.name}</p>
                        <p className="text-sm text-gray-500">Lớp {tc.class?.name} — Khối {tc.class?.grade}</p>
                      </div>
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                        Khối {tc.class?.grade}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">📝 Bài tập gần đây</h3>
                <div className="space-y-2">
                  {data.recentSubmissions?.length === 0 ? (
                    <div className="bg-white rounded-2xl border p-6 text-center text-gray-400">Chưa có bài tập</div>
                  ) : data.recentSubmissions?.map(a => (
                    <Link key={a.id} href={`/dashboard/assignments/${a.id}`}>
                      <div className="bg-white rounded-2xl border p-4 hover:shadow-md transition">
                        <p className="font-medium text-gray-800 text-sm">{a.title}</p>
                        <div className="flex justify-between mt-1">
                          <p className="text-xs text-gray-400">
                            {a.due_date ? `Hạn: ${new Date(a.due_date).toLocaleDateString('vi-VN')}` : 'Không có hạn'}
                          </p>
                          <p className="text-xs text-blue-600 font-medium">
                            {a.submissions?.[0]?.count || 0} bài nộp
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* STUDENT */}
        {profile?.role === 'student' && (
          <>
            {/* Thông tin lớp */}
            <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl">🏫</div>
                <div>
                  <p className="text-gray-500 text-sm">Lớp của bạn</p>
                  <h3 className="text-xl font-bold text-gray-800">
                    {data.studentData?.class ? `Lớp ${data.studentData.class.name}` : 'Chưa phân lớp'}
                  </h3>
                  <p className="text-gray-400 text-sm">{data.studentData?.class?.academic_year}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-gray-500 text-sm">Chuyên cần</p>
                  <p className={`text-2xl font-bold ${data.attendanceRate >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.attendanceRate}%
                  </p>
                  <p className="text-xs text-gray-400">Vắng {data.absentCount} buổi</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Bài tập sắp hết hạn */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">📝 Bài tập sắp hết hạn</h3>
                <div className="space-y-3">
                  {data.assignments?.length === 0 ? (
                    <div className="bg-white rounded-2xl border p-6 text-center text-gray-400">Không có bài tập</div>
                  ) : data.assignments?.map(a => {
                    const submitted = data.mySubmissions?.find(s => s.assignment_id === a.id)
                    const isOverdue = a.due_date && new Date(a.due_date) < new Date()
                    return (
                      <Link key={a.id} href={`/dashboard/assignments/${a.id}`}>
                        <div className="bg-white rounded-2xl border p-4 hover:shadow-md transition">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-gray-800 text-sm">{a.title}</p>
                              <p className="text-xs text-gray-400 mt-1">{a.subject?.name} — {a.teacher?.full_name}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-lg font-medium ml-2 flex-shrink-0 ${
                              submitted ? 'bg-green-50 text-green-700' :
                              isOverdue ? 'bg-red-50 text-red-600' :
                              'bg-orange-50 text-orange-600'
                            }`}>
                              {submitted ? '✅ Đã nộp' : isOverdue ? '❌ Hết hạn' : '⏳ Chờ nộp'}
                            </span>
                          </div>
                          {a.due_date && (
                            <p className="text-xs text-gray-400 mt-2">
                              ⏰ {new Date(a.due_date).toLocaleDateString('vi-VN')}
                            </p>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Điểm gần đây */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">📊 Điểm số gần đây</h3>
                <div className="bg-white rounded-2xl border overflow-hidden">
                  {data.recentGrades?.length === 0 ? (
                    <div className="p-6 text-center text-gray-400">Chưa có điểm nào</div>
                  ) : (
                    <div className="divide-y">
                      {data.recentGrades?.map(g => {
                        const typeLabel = { mieng: 'Miệng', tx: '15 phút', giua_ky: 'Giữa kỳ', cuoi_ky: 'Cuối kỳ' }
                        const scoreColor = g.score >= 8.5 ? 'text-green-600' : g.score >= 7 ? 'text-blue-600' : g.score >= 5 ? 'text-yellow-600' : 'text-red-600'
                        return (
                          <div key={g.id} className="px-4 py-3 flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-800 text-sm">{g.subject?.name}</p>
                              <p className="text-xs text-gray-400">{typeLabel[g.grade_type]} — HK{g.semester}</p>
                            </div>
                            <span className={`text-xl font-bold ${scoreColor}`}>{g.score}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="p-3 border-t bg-gray-50 text-center">
                    <Link href="/dashboard/grades" className="text-blue-500 text-sm hover:underline font-medium">
                      Xem bảng điểm đầy đủ →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* PARENT */}
        {profile?.role === 'parent' && (
          <>
            {data.noChild ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
                <div className="text-5xl mb-4">👨‍👩‍👧</div>
                <p className="text-gray-500 text-lg">Chưa có học sinh được liên kết</p>
                <p className="text-gray-400 text-sm mt-1">Liên hệ nhà trường để được liên kết với tài khoản con</p>
              </div>
            ) : (
              <>
                {/* Thông tin con */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 mb-6 text-white">
                  <p className="text-blue-100 text-sm mb-1">Học sinh của bạn</p>
                  <h3 className="text-2xl font-bold">{data.studentData?.profile?.full_name}</h3>
                  <div className="flex gap-4 mt-3 text-blue-100 text-sm">
                    <span>🏫 Lớp {data.studentData?.class?.name || 'Chưa phân lớp'}</span>
                    <span>📅 {data.studentData?.class?.academic_year}</span>
                    <span>🎫 {data.studentData?.student_code}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className={`rounded-2xl border p-5 text-center ${data.attendanceRate >= 80 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="text-3xl mb-1">📅</div>
                    <p className={`text-3xl font-bold ${data.attendanceRate >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                      {data.attendanceRate}%
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Tỷ lệ chuyên cần</p>
                    <p className="text-xs text-gray-400">Vắng {data.absentCount} buổi</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center">
                    <div className="text-3xl mb-1">📊</div>
                    <p className="text-3xl font-bold text-blue-600">{data.recentGrades?.length || 0}</p>
                    <p className="text-sm text-gray-500 mt-1">Điểm đã có</p>
                    <Link href="/dashboard/grades" className="text-xs text-blue-500 hover:underline">Xem chi tiết</Link>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Điểm gần đây */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">📊 Điểm số gần đây</h3>
                    <div className="bg-white rounded-2xl border overflow-hidden">
                      {data.recentGrades?.length === 0 ? (
                        <div className="p-6 text-center text-gray-400">Chưa có điểm</div>
                      ) : (
                        <div className="divide-y">
                          {data.recentGrades?.map(g => {
                            const typeLabel = { mieng: 'Miệng', tx: '15 phút', giua_ky: 'Giữa kỳ', cuoi_ky: 'Cuối kỳ' }
                            const scoreColor = g.score >= 8.5 ? 'text-green-600' : g.score >= 7 ? 'text-blue-600' : g.score >= 5 ? 'text-yellow-600' : 'text-red-600'
                            return (
                              <div key={g.id} className="px-4 py-3 flex justify-between items-center">
                                <div>
                                  <p className="font-medium text-gray-800 text-sm">{g.subject?.name}</p>
                                  <p className="text-xs text-gray-400">{typeLabel[g.grade_type]}</p>
                                </div>
                                <span className={`text-xl font-bold ${scoreColor}`}>{g.score}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Điểm danh gần đây */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">✅ Điểm danh gần đây</h3>
                    <div className="bg-white rounded-2xl border overflow-hidden">
                      {data.attendanceStats?.length === 0 ? (
                        <div className="p-6 text-center text-gray-400">Chưa có dữ liệu</div>
                      ) : (
                        <div className="divide-y">
                          {data.attendanceStats?.map((a, i) => {
                            const statusConfig = {
                              present:  { label: 'Có mặt',   color: 'text-green-600', bg: 'bg-green-50' },
                              absent:   { label: 'Vắng mặt', color: 'text-red-600',   bg: 'bg-red-50' },
                              late:     { label: 'Đi trễ',   color: 'text-yellow-600', bg: 'bg-yellow-50' },
                              excused:  { label: 'Có phép',  color: 'text-blue-600',  bg: 'bg-blue-50' },
                            }
                            const cfg = statusConfig[a.status] || statusConfig.present
                            return (
                              <div key={i} className="px-4 py-3 flex justify-between items-center">
                                <p className="text-sm text-gray-600">
                                  {new Date(a.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                </p>
                                <span className={`text-xs px-2 py-1 rounded-lg font-medium ${cfg.bg} ${cfg.color}`}>
                                  {cfg.label}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}