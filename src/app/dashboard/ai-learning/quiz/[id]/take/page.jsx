'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingPage from '@/components/Skeleton'
import Link from 'next/link'

export default function TakeQuizPage() {
  const [profile, setProfile] = useState(null)
  const [student, setStudent] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [score, setScore] = useState(null)
  const [timeSpent, setTimeSpent] = useState(0)
  const [startTime, setStartTime] = useState(null)

  const { id } = useParams()
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
        const { data: quizData } = await supabase
          .from('quizzes')
          .select('*, quiz_questions(*)')
          .eq('id', id)
          .eq('student_id', studentData.id)
          .single()

        if (!quizData) {
          alert('Không tìm thấy bài kiểm tra')
          return router.push('/dashboard/ai-learning/quiz')
        }

        setQuiz(quizData)
        const sortedQuestions = (quizData.quiz_questions || []).sort((a, b) => a.question_order - b.question_order)
        setQuestions(sortedQuestions)
        setStartTime(Date.now())
      }

      setLoading(false)
    }
    init()
  }, [id, router, supabase])

  useEffect(() => {
    if (startTime) {
      const timer = setInterval(() => {
        setTimeSpent(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [startTime])

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const calculateScore = () => {
    let correct = 0
    questions.forEach(q => {
      if (q?.id && q.correct_answer && answers[q.id] === q.correct_answer) {
        correct++
      }
    })
    return Math.round((correct / questions.length) * 100) || 0
  }

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      if (!confirm('Bạn chưa trả lời hết tất cả câu. Vẫn muốn nộp bài?')) return
    }

    setSubmitting(true)
    const finalScore = calculateScore()

    await supabase.from('quiz_attempts').insert({
      quiz_id: id,
      student_id: student.id,
      answers: answers,
      score: finalScore,
      total_questions: questions.length,
      time_spent: timeSpent,
      completed_at: new Date().toISOString(),
    })

    if (quiz.best_score === null || finalScore > quiz.best_score) {
      await supabase.from('quizzes').update({ best_score: finalScore }).eq('id', id)
    }

    setScore(finalScore)
    setShowResults(true)
    setSubmitting(false)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) return <LoadingPage />

  const currentQuestion = questions[currentQuestionIndex]

  // Results screen
  if (showResults) {
    const correctCount = Object.entries(answers).filter(([qId, answer]) => {
      const q = questions.find(qq => qq?.id === qId)
      return q && answer === (q.correct_answer || '')
    }).length

    const incorrectCount = questions.length - correctCount

    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar profile={profile} />
        <div className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto p-8">
            <div className="bg-white rounded-3xl p-12 text-center">
              <div className="text-6xl mb-4">
                {score >= 80 ? '🎉' : score >= 50 ? '😊' : '📚'}
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {score >= 80 ? 'Xuất sắc!' : score >= 50 ? 'Có tiến bộ!' : 'Cần ôn tập thêm'}
              </h2>
              <p className="text-gray-500 mb-6">
                Bạn đã hoàn thành bài kiểm tra!
              </p>

              <div className="flex justify-center gap-6 mb-8">
                <div className="bg-blue-50 rounded-2xl px-6 py-4">
                  <p className="text-3xl font-bold text-blue-600">{score}%</p>
                  <p className="text-sm text-blue-700">Điểm số</p>
                </div>
                <div className="bg-green-50 rounded-2xl px-6 py-4">
                  <p className="text-3xl font-bold text-green-600">{correctCount}</p>
                  <p className="text-sm text-green-700">Đúng</p>
                </div>
                <div className="bg-red-50 rounded-2xl px-6 py-4">
                  <p className="text-3xl font-bold text-red-600">{incorrectCount}</p>
                  <p className="text-sm text-red-700">Sai</p>
                </div>
                <div className="bg-purple-50 rounded-2xl px-6 py-4">
                  <p className="text-3xl font-bold text-purple-600">{formatTime(timeSpent)}</p>
                  <p className="text-sm text-purple-700">Thời gian</p>
                </div>
              </div>

              <div className="text-left mb-8 max-w-2xl mx-auto">
                <h3 className="font-bold text-gray-800 mb-4">📋 Xem lại đáp án</h3>
                <div className="space-y-4">
                  {questions.map((q, idx) => {
                    if (!q || !q.id) return null
                    const userAnswer = answers[q.id]
                    const correctAnswer = q.correct_answer || ''
                    const isCorrect = userAnswer && correctAnswer ? userAnswer === correctAnswer : false

                    return (
                      <div key={q.id || idx} className={`border rounded-xl p-4 ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        <div className="flex items-start gap-3">
                          <span className={`text-xl ${isCorrect ? '✅' : '❌'}`}></span>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800 mb-2">
                              Câu {idx + 1}: {q.question || 'Câu hỏi không có nội dung'}
                            </p>
                            <div className="space-y-1 text-sm">
                              {q.options?.map((opt, i) => {
                                const isUserChoice = opt === userAnswer
                                const isCorrectChoice = opt === correctAnswer
                                const isWrongChoice = isUserChoice && !isCorrectChoice

                                return (
                                  <div
                                    key={i}
                                    className={`px-3 py-1.5 rounded ${
                                      isCorrectChoice
                                        ? 'bg-green-100 text-green-800 font-medium'
                                        : isWrongChoice
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-gray-50 text-gray-600'
                                    }`}
                                  >
                                    {opt}
                                    {isCorrectChoice && ' ✓'}
                                    {isWrongChoice && ' ✗'}
                                  </div>
                                )
                              })}
                            </div>
                            {q.explanation && (
                              <div className="mt-3 p-3 bg-white rounded-lg">
                                <p className="text-sm text-gray-700">
                                  <span className="font-medium">Giải thích:</span> {q.explanation}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/dashboard/ai-learning/quiz')}
                  className="flex-1 py-3 border rounded-xl text-gray-600 hover:bg-gray-50 transition font-medium"
                >
                  ← Quay lại danh sách
                </button>
                <button
                  onClick={() => router.push(`/dashboard/ai-learning/quiz/${id}/retake`)}
                  className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition"
                >
                  🔄 Làm lại
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Quiz interface
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{quiz?.title}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Câu {currentQuestionIndex + 1} / {questions.length}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-white border rounded-xl px-4 py-2">
                  <p className="text-sm text-gray-500">⏱️ {formatTime(timeSpent)}</p>
                </div>
                <Link
                  href="/dashboard/ai-learning/quiz"
                  className="px-4 py-2 border rounded-xl text-gray-600 hover:bg-gray-50"
                >
                  Thoát
                </Link>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-600 h-2 rounded-full transition-all"
                style={{ width: `${((currentQuestionIndex) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {currentQuestion && (
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 mb-6">
                {currentQuestion.question}
              </h2>

              <div className="space-y-3">
                {currentQuestion.options?.map((option, idx) => {
                  const isSelected = answers[currentQuestion.id] === option
                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(currentQuestion.id, option)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          isSelected
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className="text-gray-800">{option}</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="flex justify-between mt-8 pt-6 border-t">
                <button
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="px-6 py-3 border rounded-xl text-gray-600 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Trước
                </button>

                <div className="flex items-center gap-2">
                  {questions.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`w-8 h-8 rounded-full text-sm font-medium transition ${
                        currentQuestionIndex === idx
                          ? 'bg-orange-600 text-white'
                          : answers[questions[idx].id]
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                {currentQuestionIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    className="px-6 py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition"
                  >
                    Tiếp →
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {submitting ? '⏳' : '✅ Nộp bài'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
