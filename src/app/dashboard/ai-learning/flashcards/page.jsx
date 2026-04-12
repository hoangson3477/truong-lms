'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingPage from '@/components/Skeleton'
import Link from 'next/link'

export default function FlashcardsPage() {
  const [profile, setProfile] = useState(null)
  const [student, setStudent] = useState(null)
  const [decks, setDecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [plans, setPlans] = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [generating, setGenerating] = useState(false)

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
        // Lấy decks - card_count đã được update trong DB
        const { data: decksData } = await supabase
          .from('flashcard_decks')
          .select('*')
          .eq('student_id', studentData.id)
          .order('updated_at', { ascending: false })

        setDecks(decksData || [])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreateFromAI = async (planId, topic) => {
    if (!student) return
    if (!selectedPlan && !topic) {
      alert('Vui lòng chọn kế hoạch hoặc nhập chủ đề')
      return
    }
    setGenerating(true)

    try {
      const plan = selectedPlan || plans.find(p => p.id === planId)
      const subject = plan?.subject || 'general'
      const prompt = topic
        ? `Tạo 15 flashcard về chủ đề: ${topic}. Mô tả ngắn gọn, rõ ràng.`
        : `Tạo 15 flashcard về môn ${plan?.subject_label || subject} lớp ${plan?.grade_level} theo kế hoạch học: ${plan?.title}. Mô tả ngắn gọn, rõ ràng.`

      const res = await fetch('/api/ai/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, count: 15 })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const aiResult = data.result

      // Tạo deck
      const { data: newDeck } = await supabase
        .from('flashcard_decks')
        .insert({
          student_id: student.id,
          plan_id: plan?.id || null,
          title: aiResult.title || `Flashcard - ${new Date().toLocaleDateString('vi-VN')}`,
          description: `Tạo bằng AI từ ${topic || plan?.title}`,
          subject: subject,
          card_count: 0, // ban đầu 0
        })
        .select()
        .single()

      // Tạo cards
      if (aiResult.cards && aiResult.cards.length > 0) {
        const cards = aiResult.cards.map((card) => ({
          deck_id: newDeck.id,
          front: card.front,
          back: card.back,
          difficulty: card.difficulty || 'medium',
          ease_factor: 2.5,
          interval_days: 0,
          repetitions: 0,
          next_review: new Date().toISOString(),
        }))
        await supabase.from('flashcards').insert(cards)

        // Update card_count sau khi insert cards
        await supabase
          .from('flashcard_decks')
          .update({
            card_count: cards.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', newDeck.id)
      }

      // Refresh: fetch deck vừa tạo (đã có card_count mới)
      const { data: refreshedDeck } = await supabase
        .from('flashcard_decks')
        .select('*')
        .eq('id', newDeck.id)
        .single()

      // Add to top of list
      setDecks(prev => [refreshedDeck, ...prev])
      setShowCreateModal(false)
      setSelectedPlan(null)

      alert('✅ Tạo flashcard thành công!')
    } catch (err) {
      alert('Lỗi: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  const deleteDeck = async (deckId) => {
    if (!confirm('Xóa bộ thẻ này?')) return
    await supabase.from('flashcard_decks').delete().eq('id', deckId)
    setDecks(decks.filter(d => d.id !== deckId))
  }

  if (loading) return <LoadingPage />

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />

      <div className="flex-1 p-8 overflow-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">🃏 Flashcard</h2>
            <p className="text-gray-500 mt-1">Ôn tập với spaced repetition</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-purple-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-purple-700 transition flex items-center gap-2"
          >
            <span>✨</span> Tạo bộ thẻ mới
          </button>
        </div>

        {/* Decks Grid */}
        {decks.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">🃏</div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">Chưa có bộ flashcard nào</h3>
            <p className="text-gray-400 text-sm mb-6">Tạo bộ thẻ đầu tiên để AI giúp bạn ghi nhớ nhanh hơn!</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 transition"
            >
              ✨ Tạo bộ thẻ với AI
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map(deck => {
              const totalCards = deck.card_count || 0

              return (
                <div key={deck.id} className="bg-white rounded-2xl border hover:shadow-lg transition overflow-hidden group">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">
                          🃏
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 group-hover:text-purple-600 transition">
                            {deck.title}
                          </h3>
                          <p className="text-xs text-gray-400">{totalCards} thẻ</p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteDeck(deck.id)}
                        className="text-gray-300 hover:text-red-500 transition"
                        title="Xóa"
                      >
                        🗑️
                      </button>
                    </div>

                    {deck.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{deck.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                      <span>📅 Tạo: {new Date(deck.created_at).toLocaleDateString('vi-VN')}</span>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/ai-learning/flashcards/deck/${deck.id}`}
                        className="flex-1 py-2.5 bg-purple-600 text-white text-center rounded-xl font-medium hover:bg-purple-700 transition text-sm"
                      >
                        📚 Ôn tập
                      </Link>
                      <Link
                        href={`/dashboard/ai-learning/flashcards/deck/${deck.id}?mode=edit`}
                        className="px-4 py-2.5 border rounded-xl hover:bg-gray-50 transition text-gray-600"
                        title="Chỉnh sửa"
                      >
                        ✏️
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
                <h3 className="text-xl font-bold text-gray-800">✨ Tạo bộ flashcard mới</h3>
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
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Không chọn - nhập chủ đề thủ công</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.title} - {plan.subject} ({plan.grade_level})
                    </option>
                  ))}
                </select>
              </div>

              {/* Nhập chủ đề thủ công */}
              {!selectedPlan && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">💡 Chủ đề</label>
                  <input
                    type="text"
                    id="topicInput"
                    placeholder="VD: Phương trình bậc 2, Lục văn thơ Đường, DNA replication..."
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">VD: &quot;Hệ tuần hoàn&quot;, &quot;Phép biến đổi&quot;, &quot;Past tenses&quot;</p>
                </div>
              )}

              {/* Preview */}
              <div className="bg-purple-50 rounded-xl p-4">
                <p className="text-sm text-purple-800 font-medium mb-1">🤖 AI sẽ tạo:</p>
                <ul className="text-xs text-purple-700 space-y-1">
                  <li>• 15-20 flashcard về chủ đề đã chọn</li>
                  <li>• Phân loại độ khó: easy, medium, hard</li>
                  <li>• Câu hỏi ngắn gọn, đáp án chi tiết</li>
                  <li>• Tối ưu cho spaced repetition</li>
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
                  const topicInput = document.getElementById('topicInput')?.value
                  if (selectedPlan || topicInput) {
                    handleCreateFromAI(selectedPlan?.id, topicInput)
                  } else {
                    alert('Vui lòng chọn kế hoạch hoặc nhập chủ đề')
                  }
                }}
                disabled={generating}
                className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
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
