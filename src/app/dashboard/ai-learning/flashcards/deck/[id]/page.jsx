// src/app/dashboard/ai-learning/flashcards/deck/[id]/page.jsx
  'use client'
  import { useEffect, useState } from 'react'
  import { createClient } from '@/lib/supabase'
  import { useParams, useRouter } from 'next/navigation'
  import Sidebar from '@/components/Sidebar'
  import LoadingPage from '@/components/Skeleton'
  import Link from 'next/link'

  // SM-2 Algorithm (Anki's algorithm) - Fixed với quality 0-5
  const calculateNextInterval = (quality, easiness, interval, repetitions) => {
    // quality: 0-5 (0=complete blackout, 5=perfect)

    if (quality >= 3) {
      // Successful recall
      if (repetitions === 0) {
        interval = 1
      } else if (repetitions === 1) {
        interval = 6
      } else {
        interval = Math.round(interval * easiness)
      }
      repetitions += 1
      easiness = Math.max(1.3, easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
    } else {
      // Failed recall - reset
      repetitions = 0
      interval = 1
      easiness = Math.max(1.3, easiness - 0.2)
    }

    return { interval, repetitions, easiness }
  }

  export default function DeckStudyPage() {
    const [profile, setProfile] = useState(null)
    const [student, setStudent] = useState(null)
    const [deck, setDeck] = useState(null)
    const [cards, setCards] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isFlipped, setIsFlipped] = useState(false)
    const [loading, setLoading] = useState(true)
    const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0, incorrect: 0 })
    const [sessionComplete, setSessionComplete] = useState(false)
    const [showEmptyState, setShowEmptyState] = useState(false)

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
          // Check deck ownership
          const { data: deckData } = await supabase
            .from('flashcard_decks')
            .select('*')
            .eq('id', id)
            .eq('student_id', studentData.id)
            .single()

          if (!deckData) {
            alert('Không tìm thấy bộ thẻ')
            return router.push('/dashboard/ai-learning/flashcards')
          }

          setDeck(deckData)

          // Lấy TẤT CẢ cards (không filter due cards)
            const { data: cardsData } = await supabase
                .from('flashcards')
                .select('*')
                .eq('deck_id', id)
                .order('created_at', { ascending: true }) // Hoặc order by something

            if (!cardsData || cardsData.length === 0) {
                setShowEmptyState(true)
                setStudying(false)
            } else {
                setCards(cardsData)
                setStudying(true)
            }
        }

        setLoading(false)
      }
      init()
    }, [id])

    const flipCard = () => {
      if (!isFlipped) {
        setIsFlipped(true)
      }
    }

    const rateCard = async (quality) => {
      // Map user-friendly quality to SM-2 scale (0-5)
      // User buttons: 0=again, 1=hard, 2=good, 3=easy
      // SM-2 expects: 0-5 where 3=good, 4=easy, 5=perfect
      const sm2Quality = quality >= 2 ? quality + 2 : quality // 0->0, 1->1, 2->4, 3->5
      // Actually let's use simpler: 0=0, 1=1, 2=3 (good), 3=4 (easy)
      const mappedQuality = quality === 0 ? 0 : quality === 1 ? 1 : quality === 2 ? 3 : 4

      const currentCard = cards[currentIndex]
      if (!currentCard) return

      // Calculate new interval using SM-2
      const { interval, repetitions, easiness } = calculateNextInterval(
        mappedQuality,
        currentCard.ease_factor || 2.5,
        currentCard.interval_days || 0,
        currentCard.repetitions || 0
      )

      const nextReview = new Date()
      nextReview.setDate(nextReview.getDate() + interval)

      // Update card in DB
      try {
        await supabase.from('flashcards').update({
          ease_factor: easiness,
          interval_days: interval,
          repetitions: repetitions,
          next_review: nextReview.toISOString(),
          last_reviewed: new Date().toISOString(),
        }).eq('id', currentCard.id)
      } catch (err) {
        console.error('Error updating card:', err)
      }

      // Update session stats
      const isCorrect = quality >= 2 // good or easy = correct
      setSessionStats(prev => ({
        reviewed: prev.reviewed + 1,
        correct: prev.correct + (isCorrect ? 1 : 0),
        incorrect: prev.incorrect + (isCorrect ? 0 : 1),
      }))

      // Next card or finish
      if (currentIndex + 1 < cards.length) {
        setCurrentIndex(prev => prev + 1)
        setIsFlipped(false)
      } else {
        setSessionComplete(true)
      }
    }

    const restartSession = () => {
      setCurrentIndex(0)
      setIsFlipped(false)
      setSessionComplete(false)
      setSessionStats({ reviewed: 0, correct: 0, incorrect: 0 })
    }

    const handleBackToDecks = () => {
      router.push('/dashboard/ai-learning/flashcards')
    }

    if (loading) {
      return <LoadingPage />
    }

    // Empty state
    if (showEmptyState) {
      return (
        <div className="min-h-screen bg-gray-50 flex">
          <Sidebar profile={profile} />
          <div className="flex-1 overflow-auto">
            <div className="max-w-3xl mx-auto p-8">
              <div className="bg-white rounded-3xl p-12 text-center">
                <div className="text-6xl mb-4">🃏</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Bộ thẻ trống</h2>
                <p className="text-gray-500 mb-6">
                  Bộ thẻ này chưa có card nào. Hãy tạo thẻ mới hoặc quay lại.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleBackToDecks}
                    className="px-6 py-3 border rounded-xl text-gray-600 hover:bg-gray-50 transition font-medium"
                  >
                    ← Quay lại
                  </button>
                  <Link
                    href={`/dashboard/ai-learning/flashcards/deck/${id}/create`}
                    className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition"
                  >
                    ✨ Tạo thẻ mới
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    const currentCard = cards[currentIndex]

    // Session complete state
    if (sessionComplete) {
      return (
        <div className="min-h-screen bg-gray-50 flex">
          <Sidebar profile={profile} />
          <div className="flex-1 overflow-auto">
            <div className="max-w-3xl mx-auto p-8">
              <div className="bg-white rounded-3xl p-12 text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Hoàn thành buổi ôn tập!</h2>
                <p className="text-gray-500 mb-6">
                  Bạn đã xem {cards.length} thẻ: {sessionStats.correct} đúng, {sessionStats.incorrect} sai
                </p>

                <div className="flex justify-center gap-4 mb-8">
                  <div className="bg-green-50 rounded-2xl px-6 py-4">
                    <p className="text-3xl font-bold text-green-600">{sessionStats.correct}</p>
                    <p className="text-sm text-green-700">Đúng</p>
                  </div>
                  <div className="bg-red-50 rounded-2xl px-6 py-4">
                    <p className="text-3xl font-bold text-red-600">{sessionStats.incorrect}</p>
                    <p className="text-sm text-red-700">Sai</p>
                  </div>
                  <div className="bg-purple-50 rounded-2xl px-6 py-4">
                    <p className="text-3xl font-bold text-purple-600">{cards.length}</p>
                    <p className="text-sm text-purple-700">Tổng thẻ</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleBackToDecks}
                    className="flex-1 py-3 border rounded-xl text-gray-600 hover:bg-gray-50 transition font-medium"
                  >
                    ← Quay lại danh sách
                  </button>
                  <button
                    onClick={restartSession}
                    className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition"
                  >
                    🔄 Ôn lại
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // If no current card
    if (!currentCard) {
      return (
        <div className="min-h-screen bg-gray-50 flex">
          <Sidebar profile={profile} />
          <div className="flex-1 overflow-auto">
            <div className="max-w-3xl mx-auto p-8">
              <div className="bg-white rounded-3xl p-12 text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Không có thẻ nào</h2>
                <p className="text-gray-500 mb-6">
                  Không tìm thấy thẻ để ôn tập. Vui lòng thêm thẻ vào bộ này.
                </p>
                <button
                  onClick={handleBackToDecks}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition"
                >
                  ← Quay lại danh sách
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Main study interface
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar profile={profile} />

        <div className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <button
                  onClick={handleBackToDecks}
                  className="hover:text-purple-600 flex items-center gap-1"
                >
                  ← Flashcard
                </button>
                <span>→</span>
                <span className="text-gray-800">{deck?.title}</span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">{deck?.title}</h1>
                  <p className="text-gray-500 text-sm mt-1">
                    {currentIndex + 1} / {cards.length} thẻ
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{sessionStats.reviewed}</p>
                    <p className="text-xs text-gray-400">Đã xem</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{sessionStats.correct}</p>
                    <p className="text-xs text-gray-400">Đúng</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{sessionStats.incorrect}</p>
                    <p className="text-xs text-gray-400">Sai</p>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentIndex) / cards.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Study Card */}
            <div className="perspective-1000 mb-8">
              <div
                className={`relative w-full bg-white rounded-3xl shadow-xl cursor-pointer transition-all duration-500
  preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}
                style={{
                  transformStyle: 'preserve-3d',
                  minHeight: '400px'
                }}
                onClick={flipCard}
              >
                {/* Front */}
                <div className={`absolute inset-0 p-8 flex items-center justify-center backface-hidden ${isFlipped ?
  'rotate-y-180' : ''}`}>
                  <div className="text-center">
                    <p className="text-sm text-purple-500 font-medium mb-4">MỞ THẺ ĐỂ XEM ĐÁP ÁN</p>
                    <p className="text-2xl font-bold text-gray-800 leading-relaxed">
                      {currentCard.front}
                    </p>
                  </div>
                </div>

                {/* Back */}
                <div
                  className={`absolute inset-0 p-8 flex items-center justify-center backface-hidden rotate-y-180
  bg-gradient-to-br from-purple-50 to-blue-50`}
                >
                  <div className="text-center">
                    <p className="text-sm text-purple-500 font-medium mb-4">ĐÁP ÁN</p>
                    <p className="text-xl text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {currentCard.back}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rating buttons */}
            {isFlipped && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {[
                  { label: '❌ Chưa nhớ', quality: 0, color: 'bg-red-500 hover:bg-red-600', icon: '😰' },
                  { label: '😕 Khó nhớ', quality: 1, color: 'bg-orange-500 hover:bg-orange-600', icon: '🤔' },
                  { label: '👍 Có nhớ', quality: 2, color: 'bg-green-500 hover:bg-green-600', icon: '😊' },
                  { label: '🤗 Dễ nhớ', quality: 3, color: 'bg-blue-500 hover:bg-blue-600', icon: '😄' },
                ].map(btn => (
                  <button
                    key={btn.quality}
                    onClick={() => rateCard(btn.quality)}
                    className={`${btn.color} text-white py-4 rounded-xl font-medium transition transform hover:scale-105
   flex items-center justify-center gap-2`}
                  >
                    <span>{btn.icon}</span>
                    <span>{btn.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Instructions */}
            {!isFlipped && (
              <div className="text-center">
                <p className="text-gray-400 mb-2">👆 Nhấn vào thẻ để lật</p>
                <p className="text-sm text-gray-400">
                  Sau khi xem đáp án, đánh giá mức độ nhớ của bạn
                </p>
              </div>
            )}

            {/* Card counter */}
            <div className="text-center mt-6">
              <p className="text-sm text-gray-400">
                Card {currentIndex + 1} / {cards.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }