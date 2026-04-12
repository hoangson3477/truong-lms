// src/app/dashboard/ai-learning/quiz/page.jsx
  'use client'
  import { useEffect, useState } from 'react'
  import { createClient } from '@/lib/supabase'
  import { useRouter } from 'next/navigation'
  import Sidebar from '@/components/Sidebar'
  import LoadingPage from '@/components/Skeleton'
  import Link from 'next/link'

  export default function QuizPage() {
    const [profile, setProfile] = useState(null)
    const [student, setStudent] = useState(null)
    const [quizzes, setQuizzes] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [plans, setPlans] = useState([])
    const [selectedPlan, setSelectedPlan] = useState(null)
    const [generating, setGenerating] = useState(false)
    const [difficulty, setDifficulty] = useState('mixed')

    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
      const init = async () => {
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
          const { data: quizzesData } = await supabase
            .from('quizzes')
            .select('*, quiz_questions:quiz_questions(count)')
            .eq('student_id', studentData.id)
            .order('created_at', { ascending: false })
          setQuizzes(quizzesData || [])

          const { data: plansData } = await supabase
            .from('study_plans')
            .select('*')
            .eq('student_id', studentData.id)
            .order('updated_at', { ascending: false })
          setPlans(plansData || [])
        }

        setLoading(false)
      }
      init()
    }, [])

    const handleCreateFromAI = async (planId, customTopic) => {
      if (!student) return
      if (!selectedPlan && !customTopic) {
        alert('Vui lòng chọn kế hoạch hoặc nhập chủ đề')
        return
      }
      setGenerating(true)

      try {
        const plan = selectedPlan || plans.find(p => p.id === planId)
        const prompt = customTopic
          ? `Tạo bài kiểm tra trắc nghiệm về chủ đề: ${customTopic}`
          : `Tạo bài kiểm tra trắc nghiệm về môn ${plan?.subject} với ${10} câu hỏi dựa trên kế hoạch học:
  ${plan?.title}`

        const res = await fetch('/api/ai/generate-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            questionCount: 10,
            difficulty: difficulty
          })
        })

        const data = await res.json()
        if (data.error) throw new Error(data.error)

        const aiResult = data.result

        // Tạo quiz
        const { data: newQuiz } = await supabase
          .from('quizzes')
          .insert({
            student_id: student.id,
            plan_id: plan?.id || null,
            title: aiResult.title || `Quiz - ${new Date().toLocaleDateString('vi-VN')}`,
            subject: plan?.subject || 'general',
            question_count: aiResult.questions?.length || 0,
            best_score: null,
          })
          .select()
          .single()

        // Tạo questions
        if (aiResult.questions && aiResult.questions.length > 0) {
          const questions = aiResult.questions.map((q, idx) => ({
            quiz_id: newQuiz.id,
            question_type: q.question_type || 'multiple_choice',
            question: q.question,
            options: q.options || [],
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            question_order: idx + 1,
          }))
          await supabase.from('quiz_questions').insert(questions)
        }

        // Refresh
        const { data: updatedQuizzes } = await supabase
          .from('quizzes')
          .select('*, quiz_questions:quiz_questions(count)')
          .eq('student_id', student.id)
          .order('created_at', { ascending: false })
        setQuizzes(updatedQuizzes || [])
        setShowCreateModal(false)
        setSelectedPlan(null)

        alert('✅ Tạo bài kiểm tra thành công!')
      } catch (err) {
        alert('Lỗi: ' + err.message)
      } finally {
        setGenerating(false)
      }
    }

    const deleteQuiz = async (quizId) => {
      if (!confirm('Xóa bài kiểm tra này?')) return
      await supabase.from('quizzes').delete().eq('id', quizId)
      setQuizzes(quizzes.filter(q => q.id !== quizId))
    }

    const getBestScore = (quiz) => {
      if (!quiz.best_score) return 'Chưa làm'
      const attempts = quiz.quiz_attempts || []
      const best = Math.max(...attempts.map(a => a.score || 0))
      return `${best}%`
    }

    if (loading) return <LoadingPage />

    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar profile={profile} />

        <div className="flex-1 p-8 overflow-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">❓ Bài kiểm tra</h2>
              <p className="text-gray-500 mt-1">Kiểm tra kiến thức với câu hỏi trắc nghiệm</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-orange-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-orange-700 transition flex
  items-center gap-2"
            >
              <span>✨</span> Tạo bài kiểm tra
            </button>
          </div>

          {/* Quizzes Grid */}
          {quizzes.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
              <div className="text-5xl mb-4">❓</div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">Chưa có bài kiểm tra nào</h3>
              <p className="text-gray-400 text-sm mb-6">Tạo bài kiểm tra đầu tiên để kiểm tra kiến thức của bạn!</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-xl font-medium
  hover:bg-orange-700 transition"
              >
                ✨ Tạo bài kiểm tra với AI
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map(quiz => {
                const totalQuestions = quiz.question_count || quiz.quiz_questions?.[0]?.count || 0
                const bestScore = getBestScore(quiz)

                return (
                  <div key={quiz.id} className="bg-white rounded-2xl border hover:shadow-lg transition overflow-hidden
  group">
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-2xl">
                            ❓
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800 group-hover:text-orange-600 transition">
                              {quiz.title}
                            </h3>
                            <p className="text-xs text-gray-400">{totalQuestions} câu hỏi</p>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteQuiz(quiz.id)}
                          className="text-gray-300 hover:text-red-500 transition"
                          title="Xóa"
                        >
                          🗑️
                        </button>
                      </div>

                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                        Môn: {quiz.subject === 'math' ? 'Toán' :
                              quiz.subject === 'literature' ? 'Ngữ văn' :
                              quiz.subject === 'english' ? 'Tiếng Anh' : quiz.subject}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                        <span>📅 {new Date(quiz.created_at).toLocaleDateString('vi-VN')}</span>
                        <span>🏆 Điểm cao: {bestScore}</span>
                      </div>

                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/ai-learning/quiz/${quiz.id}/take`}
                          className="flex-1 py-2.5 bg-orange-600 text-white text-center rounded-xl font-medium hover:bg-orange-700 transition text-sm"
                        >
                          🚀 Làm bài
                        </Link>
                        <Link
                          href={`/dashboard/ai-learning/quiz/${quiz.id}/review`}
                          className="px-4 py-2.5 border rounded-xl hover:bg-gray-50 transition text-gray-600"
                          title="Xem lại"
                        >
                          👁️
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
            <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-800">✨ Tạo bài kiểm tra mới</h3>
                  <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Chọn kế hoạch */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">📚 Từ kế hoạch học (tùy chọn)</label>
                  <select
                    value={selectedPlan?.id || ''}
                    onChange={(e) => setSelectedPlan(plans.find(p => p.id === e.target.value) || null)}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Không chọn - nhập chủ đề thủ công</option>
                    {plans.map(plan => (
                      <option key={plan.id} value={plan.id}>
                        {plan.title} - {plan.subject}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chủ đề thủ công */}
                {!selectedPlan && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">💡 Chủ đề</label>
                    <input
                      type="text"
                      placeholder="VD: Phương trình bậc 2, DNA, Subjunctive mood..."
                      className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2
  focus:ring-orange-500"
                    />
                  </div>
                )}

                {/* Số câu hỏi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">📝 Số câu hỏi</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="easy">Dễ (10 câu)</option>
                    <option value="medium">Trung bình (15 câu)</option>
                    <option value="hard">Khó (20 câu)</option>
                    <option value="mixed">Hỗn hợp (10 câu)</option>
                  </select>
                </div>

                {/* Preview */}
                <div className="bg-orange-50 rounded-xl p-4">
                  <p className="text-sm text-orange-800 font-medium mb-1">🤖 AI sẽ tạo:</p>
                  <ul className="text-xs text-orange-700 space-y-1">
                    <li>• 10-20 câu trắc nghiệm</li>
                    <li>• Câu hỏi logic, kiến thức Important</li>
                    <li>• Có giải thích chi tiết sau mỗi câu</li>
                    <li>• Kết quả tự động chấm điểm</li>
                  </ul>
                </div>
              </div>

              <div className="p-6 border-t flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 border rounded-xl text-gray-600 hover:bg-gray-50 transition font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    const topicInput = document.querySelector('input[type="text"]')?.value
                    if (selectedPlan || topicInput) {
                      handleCreateFromAI(selectedPlan?.id, topicInput)
                    } else {
                      alert('Vui lòng chọn kế hoạch hoặc nhập chủ đề')
                    }
                  }}
                  disabled={generating}
                  className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition
  disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generating ? '⏳ Đang tạo...' : '🚀 Tạo với AI'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }