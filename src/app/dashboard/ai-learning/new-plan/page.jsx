'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingPage from '@/components/Skeleton'
import Link from 'next/link'

const SUBJECTS = [
  { id: 'math', icon: '📐', label: 'Toán học', color: 'border-blue-200 bg-blue-50 hover:border-blue-400' },
  { id: 'literature', icon: '📖', label: 'Ngữ văn', color: 'border-orange-200 bg-orange-50 hover:border-orange-400' },
  { id: 'english', icon: '🌍', label: 'Tiếng Anh', color: 'border-green-200 bg-green-50 hover:border-green-400' },
  { id: 'physics', icon: '⚡', label: 'Vật lý', color: 'border-yellow-200 bg-yellow-50 hover:border-yellow-400' },
  { id: 'chemistry', icon: '🧪', label: 'Hóa học', color: 'border-purple-200 bg-purple-50 hover:border-purple-400' },
  { id: 'biology', icon: '🌿', label: 'Sinh học', color: 'border-emerald-200 bg-emerald-50 hover:border-emerald-400' },
  { id: 'history', icon: '🏛️', label: 'Lịch sử', color: 'border-amber-200 bg-amber-50 hover:border-amber-400' },
  { id: 'geography', icon: '🗺️', label: 'Địa lý', color: 'border-teal-200 bg-teal-50 hover:border-teal-400' },
]

const GRADES = [
  { id: '6', label: 'Lớp 6' },
  { id: '7', label: 'Lớp 7' },
  { id: '8', label: 'Lớp 8' },
  { id: '9', label: 'Lớp 9' },
  { id: '10', label: 'Lớp 10' },
  { id: '11', label: 'Lớp 11' },
  { id: '12', label: 'Lớp 12' },
  { id: 'tuyen_sinh_10', label: '🎯 Ôn thi vào 10' },
]

export default function NewPlanPage() {
  const [profile, setProfile] = useState(null)
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)

  // Form state
  const [step, setStep] = useState(1) // 1: chọn môn, 2: chọn lớp, 3: chọn loại, 4: generating
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedGrade, setSelectedGrade] = useState(null)
  const [planType, setPlanType] = useState('curriculum') // 'curriculum' | 'custom_upload'
  const [files, setFiles] = useState([])
  const [customTopic, setCustomTopic] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatingMsg, setGeneratingMsg] = useState('')

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

      setLoading(false)
    }
    getData()
  }, [])

  const handleFileUpload = (e) => {
    const newFiles = Array.from(e.target.files)
    setFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleGenerate = async () => {
    if (!selectedSubject || !selectedGrade) return
    setGenerating(true)
    setStep(4)

    try {
      // Upload files nếu có
      let uploadedMaterials = []
      if (planType === 'custom_upload' && files.length > 0) {
        setGeneratingMsg('📤 Đang upload tài liệu...')

        for (const file of files) {
          const fileName = `${student.id}/${Date.now()}_${file.name}`
          const { error: uploadError } = await supabase.storage
            .from('study-materials')
            .upload(fileName, file, { upsert: true })

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('study-materials')
              .getPublicUrl(fileName)

            uploadedMaterials.push({
              file_name: file.name,
              file_url: urlData.publicUrl,
              file_type: file.name.split('.').pop(),
              file_size: file.size,
            })
          }
        }
      }

      // Gọi AI tạo kế hoạch
      setGeneratingMsg('🤖 AI đang phân tích và tạo lộ trình...')

      const subjectLabel = SUBJECTS.find(s => s.id === selectedSubject)?.label
      const gradeLabel = GRADES.find(g => g.id === selectedGrade)?.label

      let prompt = ''
      if (planType === 'curriculum') {
        prompt = `Tạo kế hoạch học tập chi tiết cho môn ${subjectLabel}, ${gradeLabel} theo chương trình giáo dục Việt Nam.
Bao gồm các chương/bài chính trong chương trình, từ cơ bản đến nâng cao.
${selectedGrade === 'tuyen_sinh_10' ? 'Đây là chương trình ôn thi tuyển sinh vào lớp 10, tập trung vào kiến thức trọng tâm và dạng bài thi thường gặp.' : ''}
${customTopic ? `Tập trung vào chủ đề: ${customTopic}` : ''}`
      } else {
        prompt = `Tạo kế hoạch học tập dựa trên tài liệu được upload cho môn ${subjectLabel}, ${gradeLabel}.
Tên các file: ${uploadedMaterials.map(m => m.file_name).join(', ')}
${customTopic ? `Chủ đề bổ sung: ${customTopic}` : ''}
Hãy tạo lộ trình học phù hợp với nội dung tài liệu.`
      }

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type: 'study_plan' })
      })

      const data = await res.json()

      if (data.error) {
        alert('Lỗi AI: ' + data.error)
        setGenerating(false)
        setStep(3)
        return
      }

      const aiPlan = data.result

      setGeneratingMsg('💾 Đang lưu kế hoạch...')

      // Tạo study plan
      const { data: newPlan, error: planError } = await supabase
        .from('study_plans')
        .insert({
          student_id: student.id,
          title: aiPlan.title || `${subjectLabel} - ${gradeLabel}`,
          subject: selectedSubject,
          grade_level: selectedGrade,
          plan_type: planType,
          total_units: aiPlan.units?.length || 0,
          ai_generated_plan: aiPlan,
        })
        .select()
        .single()

      if (planError) {
        alert('Lỗi lưu kế hoạch: ' + planError.message)
        setGenerating(false)
        setStep(3)
        return
      }

      // Tạo study units
      if (aiPlan.units && aiPlan.units.length > 0) {
        const units = aiPlan.units.map((unit, idx) => ({
          plan_id: newPlan.id,
          title: unit.title,
          description: unit.description || '',
          unit_order: idx + 1,
          unit_type: unit.unit_type || 'lesson',
          status: idx === 0 ? 'available' : 'locked',
          xp_reward: unit.xp_reward || 10,
          content: unit.content || {},
        }))

        await supabase.from('study_units').insert(units)
      }

      // Lưu uploaded materials
      for (const mat of uploadedMaterials) {
        await supabase.from('study_materials').insert({
          student_id: student.id,
          plan_id: newPlan.id,
          ...mat,
        })
      }

      setGeneratingMsg('✅ Hoàn tất! Đang chuyển hướng...')
      setTimeout(() => {
        router.push(`/dashboard/ai-learning/plan/${newPlan.id}`)
      }, 1000)

    } catch (err) {
      alert('Lỗi: ' + err.message)
      setGenerating(false)
      setStep(3)
    }
  }

  if (loading) return <LoadingPage />

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />

      <div className="flex-1 p-8 overflow-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/dashboard/ai-learning" className="hover:text-blue-600">AI Learning</Link>
          <span>→</span>
          <span className="text-gray-800 font-medium">Tạo kế hoạch mới</span>
        </div>

        <div className="max-w-3xl mx-auto">

          {/* Progress steps */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                  step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {step > s ? '✓' : s}
                </div>
                {s < 3 && <div className={`w-12 h-1 rounded ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Chọn môn */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Chọn môn học</h2>
              <p className="text-gray-400 text-center mb-8">Bạn muốn học môn gì?</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {SUBJECTS.map(subject => (
                  <button
                    key={subject.id}
                    onClick={() => { setSelectedSubject(subject.id); setStep(2) }}
                    className={`p-5 rounded-2xl border-2 transition text-center hover:shadow-md ${subject.color} ${
                      selectedSubject === subject.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="text-3xl mb-2">{subject.icon}</div>
                    <p className="font-bold text-gray-800 text-sm">{subject.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Chọn lớp */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Chọn cấp lớp</h2>
              <p className="text-gray-400 text-center mb-8">
                {SUBJECTS.find(s => s.id === selectedSubject)?.icon}{' '}
                {SUBJECTS.find(s => s.id === selectedSubject)?.label} — Bạn đang học lớp mấy?
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {GRADES.map(grade => (
                  <button
                    key={grade.id}
                    onClick={() => { setSelectedGrade(grade.id); setStep(3) }}
                    className={`p-4 rounded-2xl border-2 transition text-center hover:shadow-md hover:border-blue-400 ${
                      selectedGrade === grade.id
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                        : 'border-gray-200 bg-white'
                    } ${grade.id === 'tuyen_sinh_10' ? 'col-span-2 md:col-span-4 bg-gradient-to-r from-red-50 to-orange-50 border-red-200 hover:border-red-400' : ''}`}
                  >
                    <p className={`font-bold ${grade.id === 'tuyen_sinh_10' ? 'text-red-700 text-lg' : 'text-gray-800'}`}>
                      {grade.label}
                    </p>
                  </button>
                ))}
              </div>

              <button onClick={() => setStep(1)} className="text-sm text-gray-400 hover:text-gray-600">
                ← Quay lại chọn môn
              </button>
            </div>
          )}

          {/* Step 3: Chọn loại kế hoạch */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Tạo lộ trình học</h2>
              <p className="text-gray-400 text-center mb-8">
                {SUBJECTS.find(s => s.id === selectedSubject)?.icon}{' '}
                {SUBJECTS.find(s => s.id === selectedSubject)?.label} —{' '}
                {GRADES.find(g => g.id === selectedGrade)?.label}
              </p>

              {/* Chọn loại */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setPlanType('curriculum')}
                  className={`p-6 rounded-2xl border-2 text-left transition ${
                    planType === 'curriculum'
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <div className="text-3xl mb-3">📚</div>
                  <h3 className="font-bold text-gray-800 mb-1">Theo chương trình</h3>
                  <p className="text-sm text-gray-500">AI tạo lộ trình theo SGK Việt Nam</p>
                </button>

                <button
                  onClick={() => setPlanType('custom_upload')}
                  className={`p-6 rounded-2xl border-2 text-left transition ${
                    planType === 'custom_upload'
                      ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                      : 'border-gray-200 bg-white hover:border-purple-300'
                  }`}
                >
                  <div className="text-3xl mb-3">📎</div>
                  <h3 className="font-bold text-gray-800 mb-1">Upload tài liệu</h3>
                  <p className="text-sm text-gray-500">Upload file để AI tạo lộ trình riêng</p>
                </button>
              </div>

              {/* Upload files */}
              {planType === 'custom_upload' && (
                <div className="bg-white rounded-2xl border p-6 mb-6">
                  <h4 className="font-bold text-gray-700 mb-3">📎 Upload tài liệu</h4>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition">
                    <div className="text-center">
                      <div className="text-2xl mb-1">📄</div>
                      <p className="text-sm text-gray-500">Kéo thả hoặc nhấn để chọn file</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT, hình ảnh</p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {files.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {files.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span>📎</span>
                            <span className="text-sm text-gray-700 truncate max-w-xs">{file.name}</span>
                            <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(0)} KB)</span>
                          </div>
                          <button onClick={() => removeFile(idx)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Chủ đề tùy chọn */}
              <div className="bg-white rounded-2xl border p-6 mb-6">
                <h4 className="font-bold text-gray-700 mb-3">💡 Chủ đề cụ thể (tùy chọn)</h4>
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="VD: Phương trình bậc 2, Thơ Đường, Past tenses..."
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 border rounded-xl text-gray-600 hover:bg-gray-50 transition font-medium"
                >
                  ← Quay lại
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  🚀 Tạo kế hoạch với AI
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Generating */}
          {step === 4 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Đang tạo kế hoạch học tập...</h2>
              <p className="text-gray-500">{generatingMsg}</p>
              <p className="text-sm text-gray-400 mt-4">Quá trình này có thể mất 10-30 giây</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}