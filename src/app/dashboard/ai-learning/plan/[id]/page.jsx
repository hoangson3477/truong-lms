'use client'
  import { useEffect, useState } from 'react'
  import { createClient } from '@/lib/supabase'
  import { useParams, useRouter } from 'next/navigation'
  import Sidebar from '@/components/Sidebar'
  import LoadingPage from '@/components/Skeleton'
  import Link from 'next/link'
  import { MindMap } from '@/components/MindMap'

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
    const [activeTab, setActiveTab] = useState('theory')
    const [quizIndex, setQuizIndex] = useState(0)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [flashcardIndex, setFlashcardIndex] = useState(0)
    const [isFlipped, setIsFlipped] = useState(false)
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

        const { data: planData } = await supabase
          .from('study_plans').select('*').eq('id', id).single()
        setPlan(planData)

        const { data: unitsData } = await supabase
          .from('study_units')
          .select('*')
          .eq('plan_id', id)
          .order('unit_order')
        setUnits(unitsData || [])

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
      setActiveTab('theory')
      setQuizIndex(0)
      setSelectedAnswer(null)
      setFlashcardIndex(0)
      setIsFlipped(false)
    }

    const handleCompleteUnit = async (unit) => {
      if (!student) return
      setGenerating(true)

      const xp = unit.xp_reward || 10

      await supabase.from('study_progress').upsert({
        student_id: student.id,
        unit_id: unit.id,
        plan_id: id,
        score: 100,
        xp_earned: xp,
        completed_at: new Date().toISOString(),
        attempts: (progress[unit.id]?.attempts || 0) + 1,
      }, { onConflict: 'student_id,unit_id' })

      await supabase.from('study_units').update({ status: 'completed' }).eq('id', unit.id)

      const currentIndex = units.findIndex(u => u.id === unit.id)
      if (currentIndex < units.length - 1) {
        const nextUnit = units[currentIndex + 1]
        if (nextUnit.status === 'locked') {
          await supabase.from('study_units').update({ status: 'available' }).eq('id', nextUnit.id)
        }
      }

      const completedCount = Object.values(progress).filter(p => p.completed_at).length + 1
      await supabase.from('study_plans').update({
        completed_units: completedCount,
        progress: Math.round((completedCount / units.length) * 100),
        updated_at: new Date().toISOString(),
        ...(completedCount >= units.length ? { status: 'completed' } : {}),
      }).eq('id', id)

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

            <div className="mt-4 w-full bg-white/20 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-white transition-all"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
          </div>

          <div className="p-8">
            <div className="max-w-lg mx-auto">
              {units.map((unit, idx) => {
                const isCompleted = progress[unit.id]?.completed_at
                const isAvailable = unit.status === 'available' || unit.status === 'in_progress'
                const isLocked = unit.status === 'locked'
                const isBoss = unit.unit_type === 'boss'

                return (
                  <div key={unit.id} className="relative">
                    {idx > 0 && (
                      <div className="flex justify-center -mt-2 mb-2">
                        <div className={`w-0.5 h-8 ${isCompleted || isAvailable ? 'bg-blue-300' : 'bg-gray-200'}`} />
                      </div>
                    )}

                    <div className={`flex ${idx % 3 === 0 ? 'justify-center' : idx % 3 === 1 ? 'justify-start pl-12' :
  'justify-end pr-12'}`}>
                      <button
                        onClick={() => handleStartUnit(unit)}
                        disabled={isLocked}
                        className={`relative w-20 h-20 rounded-full flex items-center justify-center text-2xl
  transition-all ${
                          isCompleted
                            ? `bg-gradient-to-br ${config.color} text-white shadow-lg ring-4 ring-green-300 scale-100`
                            : isAvailable
                              ? `bg-white border-4 border-blue-400 text-blue-600 shadow-lg hover:scale-110 animate-pulse
   cursor-pointer`
                              : 'bg-gray-100 border-4 border-gray-200 text-gray-300 cursor-not-allowed'
                        } ${isBoss ? 'w-24 h-24' : ''}`}
                      >
                        {isCompleted ? '✅' : isLocked ? '🔒' : UNIT_ICONS[unit.unit_type] || '📘'}

                        {!isLocked && (
                          <span className={`absolute -bottom-1 -right-1 text-xs px-1.5 py-0.5 rounded-full font-bold ${
                            isCompleted ? 'bg-green-500 text-white' : 'bg-yellow-400 text-yellow-800'
                          }`}>
                            {unit.xp_reward}xp
                          </span>
                        )}
                      </button>
                    </div>
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
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
  onClick={() => {
              setActiveUnit(null);
              setActiveTab('theory');
              setQuizIndex(0);
              setSelectedAnswer(null);
              setFlashcardIndex(0);
              setIsFlipped(false);
            }}>
              <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col
  shadow-2xl" onClick={e => e.stopPropagation()}>

                <div className={`bg-gradient-to-r ${config.color} p-6 text-white`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl
  shadow-inner">
                        {UNIT_ICONS[activeUnit.unit_type] || '📘'}
                      </div>
                      <div>
                        <h3 className="font-bold text-xl">{activeUnit.title}</h3>
                        <p className="text-white/70 text-sm">Bài {activeUnit.unit_order} • {activeUnit.xp_reward} XP</p>
                      </div>
                    </div>
                    <button onClick={() => setActiveUnit(null)} className="p-2 hover:bg-white/20 rounded-full transition
   text-xl">✕</button>
                  </div>
                </div>

                <div className="flex border-b bg-gray-50">
                  {[
                    { id: 'theory', label: '📘 Lý thuyết' },
                    { id: 'flashcards', label: '🃏 Flashcards' },
                    { id: 'quiz', label: '❓ Kiểm tra' },
                    { id: 'mindmap', label: '🗺️ Sơ đồ tư duy' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 py-4 text-sm font-bold transition-all ${
                        activeTab === tab.id ? 'text-blue-600 bg-white border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-6 overflow-y-auto flex-1 min-h-[400px]">
                  {activeTab === 'theory' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      {activeUnit.description && (
                        <p className="text-gray-600 italic text-center">{activeUnit.description}</p>
                      )}

                      <div>
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <span className="text-blue-500">📝</span> Kiến thức trọng tâm
                        </h4>
                        <div className="space-y-3">
                          {activeUnit.content?.key_points?.map((point, i) => (
                            <div key={i} className="flex items-start gap-3 bg-blue-50/50 border border-blue-100
  rounded-2xl p-4 hover:bg-blue-50 transition">
                              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center
  justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                {i + 1}
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">{point}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {activeUnit.content?.summary && (
                        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200
  rounded-2xl p-5 shadow-sm">
                          <h4 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                            <span className="text-yellow-600">💡</span> Tóm tắt ghi nhớ
                          </h4>
                          <p className="text-sm text-yellow-700 leading-relaxed">{activeUnit.content.summary}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'flashcards' && (
                    <div className="flex flex-col items-center justify-center py-4 animate-in fade-in duration-300">
                      {activeUnit.content?.flashcards?.length > 0 ? (
                        <>
                          <div
                            className="relative w-full max-w-sm h-64 cursor-pointer transition-all duration-500"
                            style={{ perspective: '1000px' }}
                            onClick={() => setIsFlipped(!isFlipped)}
                          >
                            <div
                              className={`absolute inset-0 w-full h-full transition-all duration-500`}
                              style={{
                                transformStyle: 'preserve-3d',
                                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                              }}
                            >
                              {/* Front */}
                              <div
                                className="absolute inset-0 w-full h-full bg-white border-4 border-blue-400 rounded-3xl
  shadow-xl flex flex-col items-center justify-center p-8 text-center"
                                style={{ backfaceVisibility: 'hidden' }}
                              >
                                <span className="absolute top-4 left-4 text-xs font-bold text-blue-400 uppercase">Câu
  hỏi</span>
                                <p className="text-xl font-bold
  text-gray-800">{activeUnit.content.flashcards[flashcardIndex].front}</p>
                                <p className="mt-6 text-sm text-gray-400 animate-bounce">Nhấn để xem đáp án ↻</p>
                              </div>
                              {/* Back */}
                              <div
                                className="absolute inset-0 w-full h-full bg-blue-600 text-white border-4
  border-blue-500 rounded-3xl shadow-xl flex flex-col items-center justify-center p-8 text-center"
                                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                              >
                                <span className="absolute top-4 left-4 text-xs font-bold text-blue-200 uppercase">Đáp
  án</span>
                                <p className="text-lg
  font-medium">{activeUnit.content.flashcards[flashcardIndex].back}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 mt-8">
                            <button
                              onClick={(e) => { e.stopPropagation(); setIsFlipped(false); setFlashcardIndex(prev =>
  Math.max(0, prev - 1)); }}
                              className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition disabled:opacity-30"
                              disabled={flashcardIndex === 0}
                            >
                              ←
                            </button>
                            <span className="font-bold text-gray-600">
                              {flashcardIndex + 1} / {activeUnit.content.flashcards.length}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setIsFlipped(false); setFlashcardIndex(prev =>
  Math.min(activeUnit.content.flashcards.length - 1, prev + 1)); }}
                              className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition disabled:opacity-30"
                              disabled={flashcardIndex === activeUnit.content.flashcards.length - 1}
                            >
                              →
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center text-gray-400 py-10">Không có flashcard cho bài này</div>
                      )}
                    </div>
                  )}

                  {activeTab === 'quiz' && (
                    <div className="animate-in fade-in duration-300">
                      {activeUnit.content?.quiz?.length > 0 ? (
                        <div className="space-y-6">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-bold text-gray-500">Câu {quizIndex + 1} /
  {activeUnit.content.quiz.length}</span>
                            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 transition-all"
                                style={{ width: `${((quizIndex + 1) / activeUnit.content.quiz.length) * 100}%` }}
                              />
                            </div>
                          </div>

                          <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 shadow-sm">
                            <p className="text-lg font-bold text-gray-800
  mb-6">{activeUnit.content.quiz[quizIndex].question}</p>
                            <div className="grid grid-cols-1 gap-3">
                              {activeUnit.content.quiz[quizIndex].options.map((option, i) => (
                                <button
                                  key={i}
                                  onClick={() => setSelectedAnswer(option)}
                                  className={`p-4 text-left rounded-xl border-2 transition-all font-medium ${
                                    selectedAnswer === null ? 'border-gray-100 hover:border-blue-400 hover:bg-blue-50' :
                                    option === activeUnit.content.quiz[quizIndex].correct_answer
                                      ? 'border-green-500 bg-green-50 text-green-700'
                                      : selectedAnswer === option ? 'border-red-500 bg-red-50 text-red-700' :
  'border-gray-100 opacity-50'
                                  }`}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>

                          {selectedAnswer && (
                            <div className={`p-4 rounded-2xl border ${selectedAnswer ===
  activeUnit.content.quiz[quizIndex].correct_answer ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'} animate-in slide-in-from-top-2 duration-300`}>
                              <p className="font-bold mb-1">{selectedAnswer ===
  activeUnit.content.quiz[quizIndex].correct_answer ? '🎉 Chính xác!' : '❌ Tiếc quá!'}</p>
                              <p className="text-sm opacity-90">{activeUnit.content.quiz[quizIndex].explanation}</p>
                            </div>
                          )}

                          <div className="flex justify-end mt-6">
                            <button
                              onClick={() => {
                                if (quizIndex < activeUnit.content.quiz.length - 1) {
                                  setQuizIndex(prev => prev + 1);
                                  setSelectedAnswer(null);
                                } else {
                                  handleCompleteUnit(activeUnit);
                                }
                              }}
                              disabled={!selectedAnswer}
                              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700
  transition disabled:opacity-50 shadow-lg shadow-blue-200"
                            >
                              {quizIndex < activeUnit.content.quiz.length - 1 ? 'Tiếp theo →' : 'Hoàn thành & Nhận XP ✅'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-gray-400 py-10">Không có bài kiểm tra cho bài này</div>
                      )}
                    </div>
                  )}

                  {activeTab === 'mindmap' && (
                    <div className="animate-in fade-in duration-300 h-[500px]">
                      {activeUnit.content?.mindmap ? (
                        <div className="bg-white border rounded-2xl p-4 h-full">
                          <MindMap data={activeUnit.content.mindmap} />
                        </div>
                      ) : (
                        <div className="text-center text-gray-400 py-10">
                          <div className="text-5xl mb-4">🗺️</div>
                          <p>Không có sơ đồ tư duy cho bài này</p>
                          <p className="text-sm mt-2">AI sẽ tự động tạo khi生成 unit này</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                {activeTab !== 'quiz' && (
                  <div className="p-6 border-t bg-gray-50 flex gap-3">
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
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }