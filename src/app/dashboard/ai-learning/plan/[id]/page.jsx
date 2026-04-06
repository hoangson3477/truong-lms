'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingPage from '@/components/Skeleton'
import Link from 'next/link'

const SUBJECT_CONFIG = {
  math: { icon: '📐', label: 'Toán học', color: 'from-blue-500 to-blue-600', ring: 'ring-blue-400' },
  literature: { icon: '📖', label: 'Ngữ văn', color: 'from-orange-500 to-orange-600', ring: 'ring-orange-400' },
  english: { icon: '🌍', label: 'Tiếng Anh', color: 'from-green-500 to-green-600', ring: 'ring-green-400' },
  physics: { icon: '⚡', label: 'Vật lý', color: 'from-yellow-500 to-yellow-600', ring: 'ring-yellow-400' },
  chemistry: { icon: '🧪', label: 'Hóa học', color: 'from-purple-500 to-purple-600', ring: 'ring-purple-400' },
  biology: { icon: '🌿', label: 'Sinh học', color: 'from-emerald-500 to-emerald-600', ring: 'ring-emerald-400' },
  history: { icon: '🏛️', label: 'Lịch sử', color: 'from-amber-500 to-amber-600', ring: 'ring-amber-400' },
  geography: { icon: '🗺️', label: 'Địa lý', color: 'from-teal-500 to-teal-600', ring: 'ring-teal-400' },
}

const UNIT_ICONS = {
  lesson: '📘',
  quiz: '❓',
  review: '🔄',
  boss: '⭐',
}

export default function PlanDetailPage() {
  const [profile, setProfile] = useState(null)
  const [student, setStudent] = useState(null)
  const [plan, setPlan] = useState(null)
  const [units, setUnits] = useState([])
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeUnit, setActiveUnit] = useState(null)
  const [generating, setGenerating] = useState(false)
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).maybeSingle()
      setProfile(profileData)

      const { data: studentData } = await supabase
        .from('students').select('*').eq('profile_id', user.id).maybeSingle()
      setStudent(studentData)

      // Lấy plan
      const { data: planData } = await supabase
        .from('study_plans').select('*').eq('id', id).single()
      setPlan(planData)

      // Lấy units
      const { data: unitsData } = await supabase
        .from('study_units')
        .select('*')
        .eq('plan_id', id)
        .order('unit_order')
      setUnits(unitsData || [])

      // Lấy progress
      if (studentData) {
        const { data: progressData } = await supabase
          .from('study_progress')
          .select('*')
          .eq('student_id', studentData.id)
          .eq('plan_id', id)

        const progressMap = {}
        progressData?.forEach(p => { progressMap[p.unit_id] = p })
        setProgress(progressMap)
      }

      setLoading(false)
    }
    getData()
  }, [id])

  const handleStartUnit = async (unit) => {
    if (unit.status === 'locked') return
    setActiveUnit(unit)
  }

  const handleCompleteUnit = async (unit) => {
    if (!student) return
    setGenerating(true)

    const xp = unit.xp_reward || 10

    // Lưu progress
    await supabase.from('study_progress').upsert({
      student_id: student.id,
      unit_id: unit.id,
      plan_id: id,
      score: 100,
      xp_earned: xp,
      completed_at: new Date().toISOString(),
      attempts: (progress[unit.id]?.attempts || 0) + 1,
    }, { onConflict: 'student_id,unit_id' })

    // Cập nhật unit status
    await supabase.from('study_units').update({ status: 'completed' }).eq('id', unit.id)

    // Unlock unit tiếp theo
    const currentIndex = units.findIndex(u => u.id === unit.id)
    if (currentIndex < units.length - 1) {
      const nextUnit = units[currentIndex + 1]
      if (nextUnit.status === 'locked') {
        await supabase.from('study_units').update({ status: 'available' }).eq('id', nextUnit.id)
      }
    }

    // Cập nhật plan progress
    const completedCount = Object.values(progress).filter(p => p.completed_at).length + 1
    await supabase.from('study_plans').update({
      completed_units: completedCount,
      progress: Math.round((completedCount / units.length) * 100),
      updated_at: new Date().toISOString(),
      ...(completedCount >= units.length ? { status: 'completed' } : {}),
    }).eq('id', id)

    // Cập nhật XP & streak
    const today = new Date().toISOString().split('T')[0]
    const { data: currentStats } = await supabase
      .from('student_stats')
      .select('*')
      .eq('student_id', student.id)
      .single()

    if (currentStats) {
      const lastDate = currentStats.last_study_date
      const isConsecutive = lastDate && (
        new Date(today) - new Date(lastDate) <= 86400000 * 1.5
      )
      const newStreak = lastDate === today
        ? currentStats.current_streak
        : isConsecutive
          ? currentStats.current_streak + 1
          : 1

      const newXP = (currentStats.total_xp || 0) + xp
      const newLevel = Math.floor(newXP / 100) + 1

      await supabase.from('student_stats').update({
        total_xp: newXP,
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, currentStats.longest_streak || 0),
        last_study_date: today,
        level: newLevel,
        updated_at: new Date().toISOString(),
      }).eq('student_id', student.id)
    }

    // Reload data
    const { data: refreshedUnits } = await supabase
      .from('study_units').select('*').eq('plan_id', id).order('unit_order')
    setUnits(refreshedUnits || [])

    const { data: refreshedProgress } = await supabase
      .from('study_progress').select('*').eq('student_id', student.id).eq('plan_id', id)
    const progressMap = {}
    refreshedProgress?.forEach(p => { progressMap[p.unit_id] = p })
    setProgress(progressMap)

    setActiveUnit(null)
    setGenerating(false)
  }

  if (loading) return <LoadingPage />
  if (!plan) return <div className="p-8">Không tìm thấy kế hoạch</div>

  const config = SUBJECT_CONFIG[plan.subject] || { icon: '📘', label: plan.subject, color: 'from-gray-500 to-gray-600', ring: 'ring-gray-400' }
  const totalProgress = plan.total_units > 0 ? Math.round((plan.completed_units / plan.total_units) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />

      <div className="flex-1 overflow-auto">

        {/* Hero header */}
        <div className={`bg-gradient-to-r ${config.color} p-8 text-white`}>
          <div className="flex items-center gap-2 text-white/60 text-sm mb-4">
            <Link href="/dashboard/ai-learning" className="hover:text-white">AI Learning</Link>
            <span>→</span>
            <span className="text-white">{plan.title}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-4xl">{config.icon}</div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{plan.title}</h1>
              <p className="text-white/80 mt-1">
                {config.label} — {plan.grade_level === 'tuyen_sinh_10' ? 'Ôn thi vào 10' : `Lớp ${plan.grade_level}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{totalProgress}%</p>
              <p className="text-white/60 text-sm">{plan.completed_units}/{plan.total_units} bài</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 w-full bg-white/20 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-white transition-all"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>

        <div className="p-8">

          {/* Skill Tree — Duolingo style */}
          <div className="max-w-lg mx-auto">
            {units.map((unit, idx) => {
              const isCompleted = progress[unit.id]?.completed_at
              const isAvailable = unit.status === 'available' || unit.status === 'in_progress'
              const isLocked = unit.status === 'locked'
              const isBoss = unit.unit_type === 'boss'

              // Zigzag position
              const offsetX = idx % 2 === 0 ? 'ml-0' : 'ml-auto'

              return (
                <div key={unit.id} className="relative">
                  {/* Connection line */}
                  {idx > 0 && (
                    <div className="flex justify-center -mt-2 mb-2">
                      <div className={`w-0.5 h-8 ${isCompleted || isAvailable ? 'bg-blue-300' : 'bg-gray-200'}`} />
                    </div>
                  )}

                  <div className={`flex ${idx % 3 === 0 ? 'justify-center' : idx % 3 === 1 ? 'justify-start pl-12' : 'justify-end pr-12'}`}>
                    <button
                      onClick={() => handleStartUnit(unit)}
                      disabled={isLocked}
                      className={`relative w-20 h-20 rounded-full flex items-center justify-center text-2xl transition-all ${
                        isCompleted
                          ? `bg-gradient-to-br ${config.color} text-white shadow-lg ring-4 ring-green-300 scale-100`
                          : isAvailable
                            ? `bg-white border-4 border-blue-400 text-blue-600 shadow-lg hover:scale-110 animate-pulse cursor-pointer`
                            : 'bg-gray-100 border-4 border-gray-200 text-gray-300 cursor-not-allowed'
                      } ${isBoss ? 'w-24 h-24' : ''}`}
                    >
                      {isCompleted ? '✅' : isLocked ? '🔒' : UNIT_ICONS[unit.unit_type] || '📘'}

                      {/* XP badge */}
                      {!isLocked && (
                        <span className={`absolute -bottom-1 -right-1 text-xs px-1.5 py-0.5 rounded-full font-bold ${
                          isCompleted ? 'bg-green-500 text-white' : 'bg-yellow-400 text-yellow-800'
                        }`}>
                          {unit.xp_reward}xp
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Unit title */}
                  <p className={`text-center text-sm mt-2 mb-4 font-medium ${
                    isCompleted ? 'text-gray-700' : isAvailable ? 'text-blue-600' : 'text-gray-300'
                  }`}>
                    {unit.title}
                  </p>
                </div>
              )
            })}
          </div>

        </div>

        {/* Unit Detail Modal */}
        {activeUnit && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setActiveUnit(null)}>
            <div className="bg-white rounded-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

              <div className={`bg-gradient-to-r ${config.color} p-6 rounded-t-3xl text-white`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                    {UNIT_ICONS[activeUnit.unit_type] || '📘'}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{activeUnit.title}</h3>
                    <p className="text-white/70 text-sm">Bài {activeUnit.unit_order} • {activeUnit.xp_reward} XP</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {activeUnit.description && (
                  <p className="text-gray-600 mb-4">{activeUnit.description}</p>
                )}

                {/* Nội dung bài học */}
                {activeUnit.content?.key_points && (
                  <div className="mb-4">
                    <h4 className="font-bold text-gray-800 mb-2">📝 Nội dung chính</h4>
                    <div className="space-y-2">
                      {activeUnit.content.key_points.map((point, i) => (
                        <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <p className="text-sm text-gray-700">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeUnit.content?.summary && (
                  <div className="mb-4 bg-blue-50 rounded-xl p-4">
                    <h4 className="font-bold text-blue-800 mb-1">💡 Tóm tắt</h4>
                    <p className="text-sm text-blue-700">{activeUnit.content.summary}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setActiveUnit(null)}
                    className="flex-1 py-3 border rounded-xl text-gray-600 hover:bg-gray-50 transition font-medium"
                  >
                    Đóng
                  </button>
                  {!progress[activeUnit.id]?.completed_at && (
                    <button
                      onClick={() => handleCompleteUnit(activeUnit)}
                      disabled={generating}
                      className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {generating ? '⏳ Đang xử lý...' : '✅ Hoàn thành bài này'}
                    </button>
                  )}
                  {progress[activeUnit.id]?.completed_at && (
                    <div className="flex-1 py-3 bg-green-50 text-green-600 rounded-xl font-bold text-center">
                      ✅ Đã hoàn thành
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}