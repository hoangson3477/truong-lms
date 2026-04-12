'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingPage from '@/components/Skeleton'
import Link from 'next/link'

const SUBJECT_CONFIG = {
  math: { icon: '📐', label: 'Toán học', color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-700' },
  literature: { icon: '📖', label: 'Ngữ văn', color: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', text: 'text-orange-700' },
  english: { icon: '🌍', label: 'Tiếng Anh', color: 'from-green-500 to-green-600', bg: 'bg-green-50', text: 'text-green-700' },
  physics: { icon: '⚡', label: 'Vật lý', color: 'from-yellow-500 to-yellow-600', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  chemistry: { icon: '🧪', label: 'Hóa học', color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', text: 'text-purple-700' },
  biology: { icon: '🌿', label: 'Sinh học', color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  history: { icon: '🏛️', label: 'Lịch sử', color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', text: 'text-amber-700' },
  geography: { icon: '🗺️', label: 'Địa lý', color: 'from-teal-500 to-teal-600', bg: 'bg-teal-50', text: 'text-teal-700' },
}

export default function AILearningPage() {
  const [profile, setProfile] = useState(null)
  const [student, setStudent] = useState(null)
  const [stats, setStats] = useState(null)
  const [plans, setPlans] = useState([])
  const [analytics, setAnalytics] = useState(null)
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

      if (profileData?.role !== 'student') {
        router.push('/dashboard')
        return
      }

      const { data: studentData } = await supabase
        .from('students').select('*').eq('profile_id', user.id).maybeSingle()
      setStudent(studentData)

      if (studentData) {
        // Lấy kế hoạch học tập
        const { data: plansData } = await supabase
          .from('study_plans')
          .select('*, study_units(count)')
          .eq('student_id', studentData.id)
          .order('updated_at', { ascending: false })
        setPlans(plansData || [])

        // Lấy hoặc tạo stats
        let { data: statsData } = await supabase
          .from('student_stats')
          .select('*')
          .eq('student_id', studentData.id)
          .maybeSingle()

        if (!statsData) {
          const { data: newStats } = await supabase
            .from('student_stats')
            .insert({ student_id: studentData.id })
            .select()
            .single()
          statsData = newStats
        }
        setStats(statsData)
      }

      setLoading(false)
    }
    getData()
  }, [])

  if (loading) return <LoadingPage />

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />

      <div className="flex-1 p-8 overflow-auto">

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800">🚀 AI Learning Hub</h2>
          <p className="text-gray-500 mt-1">Học thông minh hơn với trí tuệ nhân tạo</p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-yellow-100 rounded-xl flex items-center justify-center text-xl">⚡</div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats?.total_xp || 0}</p>
                <p className="text-xs text-gray-400">Tổng XP</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center text-xl">🔥</div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats?.current_streak || 0}</p>
                <p className="text-xs text-gray-400">Streak ngày</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center text-xl">📚</div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{plans.length}</p>
                <p className="text-xs text-gray-400">Kế hoạch</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center text-xl">🏆</div>
              <div>
                <p className="text-2xl font-bold text-gray-800">Lv.{stats?.level || 1}</p>
                <p className="text-xs text-gray-400">Cấp độ</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { href: '/dashboard/ai-learning/new-plan', icon: '🎯', label: 'Tạo kế hoạch mới', desc: 'Chọn môn & lộ trình', color: 'bg-blue-500' },
            { href: '/dashboard/ai-learning/chat', icon: '🤖', label: 'Gia sư AI', desc: 'Hỏi bài, giải thích', color: 'bg-green-500' }, // ← THÊM
            { href: '/dashboard/ai-learning/flashcards', icon: '🃏', label: 'Flashcard', desc: 'Ôn tập thẻ ghi nhớ', color: 'bg-purple-500' },
            { href: '/dashboard/ai-learning/quiz', icon: '❓', label: 'Kiểm tra', desc: 'Làm quiz & bài tập', color: 'bg-orange-500' },
          ].map(action => (
            <Link
              key={action.href}
              href={action.href}
              className="bg-white rounded-2xl border p-5 hover:shadow-lg transition group"
            >
              <div className={`w-12 h-12 ${action.color} rounded-2xl flex items-center justify-center text-2xl mb-3 shadow-lg group-hover:scale-110 transition`}>
                {action.icon}
              </div>
              <h3 className="font-bold text-gray-800">{action.label}</h3>
              <p className="text-xs text-gray-400 mt-1">{action.desc}</p>
            </Link>
          ))}
        </div>

        {/* Kế hoạch học tập hiện tại */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">📚 Kế hoạch học tập</h3>
            <Link
              href="/dashboard/ai-learning/new-plan"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              ＋ Tạo mới
            </Link>
          </div>

          {plans.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">Chưa có kế hoạch nào</h3>
              <p className="text-gray-400 text-sm mb-6">Tạo kế hoạch học tập đầu tiên để AI giúp bạn học hiệu quả hơn!</p>
              <Link
                href="/dashboard/ai-learning/new-plan"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition"
              >
                🚀 Bắt đầu ngay
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map(plan => {
                const config = SUBJECT_CONFIG[plan.subject] || { icon: '📘', label: plan.subject, bg: 'bg-gray-50', text: 'text-gray-700' }
                const progress = plan.total_units > 0
                  ? Math.round((plan.completed_units / plan.total_units) * 100)
                  : 0

                return (
                  <Link
                    key={plan.id}
                    href={`/dashboard/ai-learning/plan/${plan.id}`}
                    className="bg-white rounded-2xl border hover:shadow-lg transition overflow-hidden group"
                  >
                    {/* Color bar top */}
                    <div className={`h-2 bg-gradient-to-r ${SUBJECT_CONFIG[plan.subject]?.color || 'from-gray-400 to-gray-500'}`} />

                    <div className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 ${config.bg} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>
                          {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-800 truncate group-hover:text-blue-600 transition">
                            {plan.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.bg} ${config.text}`}>
                              {config.label}
                            </span>
                            <span className="text-xs text-gray-400">
                              {plan.grade_level === 'tuyen_sinh_10' ? 'Ôn thi vào 10' : `Lớp ${plan.grade_level}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">{plan.completed_units}/{plan.total_units} bài</span>
                          <span className="font-bold text-gray-600">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full bg-gradient-to-r ${SUBJECT_CONFIG[plan.subject]?.color || 'from-gray-400 to-gray-500'} transition-all`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex items-center justify-between mt-3">
                        <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                          plan.status === 'active' ? 'bg-green-50 text-green-600' :
                          plan.status === 'completed' ? 'bg-blue-50 text-blue-600' :
                          'bg-gray-50 text-gray-500'
                        }`}>
                          {plan.status === 'active' ? '🟢 Đang học' :
                           plan.status === 'completed' ? '✅ Hoàn thành' : '⏸️ Tạm dừng'}
                        </span>
                        <span className="text-xs text-gray-300">
                          {new Date(plan.updated_at).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}