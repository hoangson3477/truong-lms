'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingPage from '@/components/Skeleton'
import Link from 'next/link'
import { MindMap } from '@/components/MindMap'
import { toast } from 'sonner'
import { exportMindMapAsPNG, exportMindMapAsSVG } from '@/lib/mindmapUtils'

export default function MindMapViewerPage() {
  const [profile, setProfile] = useState(null)
  const [student, setStudent] = useState(null)
  const [plan, setPlan] = useState(null)
  const [unit, setUnit] = useState(null)
  const [mindMapData, setMindMapData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      try {
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

        // Get plan first to validate ownership
        const { data: planData, error: planError } = await supabase
          .from('study_plans')
          .select('*')
          .eq('id', id)
          .single()

        if (planError || !planData) {
          setError('Không tìm thấy kế hoạch học tập')
          return
        }

        if (planData.student_id !== studentData?.id) {
          setError('Bạn không có quyền truy cập kế hoạch này')
          return
        }

        setPlan(planData)

        // For now, we'll show a placeholder or generate mindmap for the plan
        // In a real implementation, you might have a unitId parameter too
        setLoading(false)
      } catch (err) {
        setError('Lỗi tải dữ liệu: ' + err.message)
        setLoading(false)
      }
    }

    loadData()
  }, [id])

  const handleRegenerate = async () => {
    if (!plan) return

    setGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Tạo sơ đồ tư duy chi tiết cho kế hoạch học tập "${plan.title}" môn ${plan.subject} lớp ${plan.grade_level}.
          Hãy tạo sơ đồ tư duy chính và các nhánh phụ cho từngunit/chương trong kế hoạch này.
          Mỗi nhánh chính là một unit/chương, mỗi nhánh phụ là các kiến thức con trong unit đó.`,
          type: 'mind_map'
        })
      })

      const data = await res.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setMindMapData(data.result)
    } catch (err) {
      setError('Lỗi tạo sơ đồ tư duy: ' + err.message)
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  const handleExportPNG = async () => {
    if (!mindMapData) return
    setExporting(true)
    try {
      await exportMindMapAsPNG(mindMapData, `${plan?.title || 'mindmap'}.png`)
      toast.success('Đã xuất PNG')
    } catch (err) {
      toast.error('Lỗi xuất PNG: ' + err.message)
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  const handleExportSVG = async () => {
    if (!mindMapData) return
    setExporting(true)
    try {
      await exportMindMapAsSVG(mindMapData, `${plan?.title || 'mindmap'}.svg`)
      toast.success('Đã xuất SVG')
    } catch (err) {
      toast.error('Lỗi xuất SVG: ' + err.message)
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <LoadingPage />
  if (error) return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />
      <div className="flex-1 p-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <h3 className="text-red-800 font-bold mb-2">Lỗi</h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => router.push(`/dashboard/ai-learning/plan/${id}`)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Quay lại kế hoạch
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <Link
              href={`/dashboard/ai-learning/plan/${id}`}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              ← Quay lại kế hoạch
            </Link>
            <h1 className="text-2xl font-bold text-gray-800 mt-2">
              Sơ đồ tư duy: {plan?.title}
            </h1>
            <p className="text-gray-500 mt-1">
              {plan?.subject} — {plan?.grade_level === 'tuyen_sinh_10' ? 'Ôn thi vào 10' : `Lớp ${plan?.grade_level}`}
            </p>
          </div>

          {/* Controls */}
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <button
              onClick={handleRegenerate}
              disabled={generating}
              className={`px-5 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2`}
            >
              {generating ? '⏳ Đang tạo...' : '🔄 Tạo lại sơ đồ'}
            </button>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              {mindMapData ? (
                <>
                  <button
                    onClick={handleExportPNG}
                    disabled={exporting || generating}
                    className={`p-2 rounded ${exporting || generating ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-100 hover:bg-blue-200'}`}
                    title="Xuất PNG"
                  >
                    {exporting ? '⏳' : '📥'} PNG
                  </button>
                  <button
                    onClick={handleExportSVG}
                    disabled={exporting || generating}
                    className={`p-2 rounded ${exporting || generating ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-100 hover:bg-blue-200'}`}
                    title="Xuất SVG"
                  >
                    {exporting ? '⏳' : '📥'} SVG
                  </button>
                </>
              ) : (
                <span>Chưa có dữ liệu sơ đồ tư duy</span>
              )}
            </div>
          </div>

          {/* Mind Map Display */}
          <div className="bg-white rounded-2xl border p-6 min-h-[600px]">
            {mindMapData ? (
              <div className="relative w-full h-full">
                <MindMap data={mindMapData} width={1000} height={800} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-5xl mb-4 text-gray-400">🗺️</div>
                <h3 className="text-lg font-bold text-gray-700 mb-2">
                  Sơ đồ tư duy sẽ hiển thị ở đây
                </h3>
                <p className="text-gray-500 text-center max-w-md">
                  Nhấn "Tạo lại sơ đồ" để AI tạo sơ đồ tư duy cho kế hoạch học tập này.
                </p>
                {plan && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                    <p className="text-sm text-blue-800 font-bold mb-1">
                      Kế hoạch học tập:
                    </p>
                    <p className="text-sm text-blue-700">{plan.title}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}