'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'

export default function AssignmentDetailPage() {
  const [profile, setProfile] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [mySubmission, setMySubmission] = useState(null)
  const [myStudent, setMyStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [content, setContent] = useState('')
  const [file, setFile] = useState(null)
  const [gradingId, setGradingId] = useState(null)
  const [gradeForm, setGradeForm] = useState({ grade: '', feedback: '' })
  const { id } = useParams()
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      setProfile(profileData)

      await fetchAssignment()

      // Nếu là học sinh, lấy student record
      if (profileData?.role === 'student') {
        const { data: studentData } = await supabase
          .from('students')
          .select('id')
          .eq('profile_id', user.id)
          .single()
        setMyStudent(studentData)

        if (studentData) {
          const { data: subData } = await supabase
            .from('submissions')
            .select('*')
            .eq('assignment_id', id)
            .eq('student_id', studentData.id)
            .single()
          setMySubmission(subData)
          if (subData?.content) setContent(subData.content)
        }
      }

      // Nếu là giáo viên/admin, lấy tất cả submissions
      if (profileData?.role === 'teacher' || profileData?.role === 'admin') {
        await fetchSubmissions()
      }

      setLoading(false)
    }
    getData()
  }, [id])

  const fetchAssignment = async () => {
    const { data } = await supabase
      .from('assignments')
      .select(`
        *,
        class:classes(name, grade),
        subject:subjects(name),
        teacher:profiles!assignments_teacher_id_fkey(full_name)
      `)
      .eq('id', id)
      .single()
    setAssignment(data)
  }

  const fetchSubmissions = async () => {
    const { data } = await supabase
      .from('submissions')
      .select(`
        *,
        student:students(
          student_code,
          profile:profiles!students_profile_id_fkey(full_name)
        )
      `)
      .eq('assignment_id', id)
      .order('submitted_at', { ascending: false })
    setSubmissions(data || [])
  }

  const handleSubmit = async () => {
    if (!content && !file) return alert('Vui lòng nhập nội dung hoặc đính kèm file!')
    setSubmitting(true)

    let file_url = mySubmission?.file_url || null

    // Upload file nếu có
    if (file) {
      const fileName = `${myStudent.id}/${Date.now()}_${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('assignments')
        .upload(fileName, file, { upsert: true })

      if (uploadError) {
        alert('Lỗi upload file: ' + uploadError.message)
        setSubmitting(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('assignments')
        .getPublicUrl(fileName)
      file_url = urlData.publicUrl
    }

    if (mySubmission) {
      // Cập nhật bài nộp cũ
      await supabase.from('submissions').update({
        content,
        file_url,
        submitted_at: new Date().toISOString()
      }).eq('id', mySubmission.id)
    } else {
      // Tạo bài nộp mới
      await supabase.from('submissions').insert({
        assignment_id: id,
        student_id: myStudent.id,
        content,
        file_url,
      })
    }

    // Reload
    const { data: subData } = await supabase
      .from('submissions')
      .select('*')
      .eq('assignment_id', id)
      .eq('student_id', myStudent.id)
      .single()
    setMySubmission(subData)
    setSubmitting(false)
    alert('✅ Nộp bài thành công!')
  }

  const handleGrade = async (submissionId) => {
    if (!gradeForm.grade) return alert('Vui lòng nhập điểm!')
    const score = parseFloat(gradeForm.grade)
    if (score < 0 || score > 10) return alert('Điểm phải từ 0 đến 10!')

    await supabase.from('submissions').update({
      grade: score,
      feedback: gradeForm.feedback,
      graded_at: new Date().toISOString()
    }).eq('id', submissionId)

    setGradingId(null)
    setGradeForm({ grade: '', feedback: '' })
    await fetchSubmissions()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Đang tải...</p>
    </div>
  )

  const isOverdue = assignment?.due_date && new Date(assignment.due_date) < new Date()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />

      <div className="flex-1 p-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/dashboard/assignments" className="hover:text-blue-600">Bài tập</Link>
          <span>→</span>
          <span className="text-gray-800 font-medium">{assignment?.title}</span>
        </div>

        {/* Thông tin bài tập */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{assignment?.title}</h2>
              {assignment?.description && (
                <p className="text-gray-600 mb-4 whitespace-pre-line">{assignment.description}</p>
              )}
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg">
                  🏫 Lớp {assignment?.class?.name}
                </span>
                <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-lg">
                  📚 {assignment?.subject?.name}
                </span>
                <span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg">
                  👨‍🏫 {assignment?.teacher?.full_name}
                </span>
                {assignment?.due_date && (
                  <span className={`px-3 py-1 rounded-lg font-medium ${isOverdue
                    ? 'bg-red-50 text-red-600'
                    : 'bg-orange-50 text-orange-600'}`}>
                    ⏰ Hạn nộp: {new Date(assignment.due_date).toLocaleDateString('vi-VN', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                    {isOverdue && ' (Đã hết hạn)'}
                  </span>
                )}
              </div>
            </div>
            {(profile?.role === 'teacher' || profile?.role === 'admin') && (
              <div className="text-center ml-6">
                <div className="text-3xl font-bold text-blue-600">{submissions.length}</div>
                <div className="text-sm text-gray-400">đã nộp</div>
              </div>
            )}
          </div>
        </div>

        {/* Học sinh: Form nộp bài */}
        {profile?.role === 'student' && (
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
            <h3 className="font-bold text-gray-800 text-lg mb-4">
              {mySubmission ? '✏️ Cập nhật bài nộp' : '📤 Nộp bài'}
            </h3>

            {mySubmission && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                <p className="text-green-700 text-sm font-medium">
                  ✅ Đã nộp lúc {new Date(mySubmission.submitted_at).toLocaleString('vi-VN')}
                </p>
                {mySubmission.grade !== null && (
                  <div className="mt-2">
                    <p className="text-green-800 font-bold">Điểm: {mySubmission.grade}/10</p>
                    {mySubmission.feedback && (
                      <p className="text-green-700 text-sm mt-1">Nhận xét: {mySubmission.feedback}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nội dung bài làm
                </label>
                <textarea
                  rows={5}
                  placeholder="Nhập bài làm của bạn..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Đính kèm file (PDF, Word, ảnh...)
                </label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                {mySubmission?.file_url && (
                  <a  
                    href={mySubmission.file_url}
                    target="_blank"
                    className="text-blue-500 text-sm hover:underline mt-1 inline-block"
                  >
                    📎 Xem file đã nộp
                  </a>
                )}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || isOverdue}
              className="mt-4 w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {submitting ? 'Đang nộp...' : isOverdue ? 'Đã hết hạn nộp' : (mySubmission ? 'Cập nhật bài' : 'Nộp bài')}
            </button>
          </div>
        )}

        {/* Giáo viên/Admin: Danh sách bài nộp */}
        {(profile?.role === 'teacher' || profile?.role === 'admin') && (
          <div className="bg-white rounded-2xl shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="font-bold text-gray-800 text-lg">
                📋 Danh sách bài nộp ({submissions.length})
              </h3>
            </div>

            {submissions.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <div className="text-3xl mb-2">📭</div>
                <p>Chưa có học sinh nào nộp bài</p>
              </div>
            ) : (
              <div className="divide-y">
                {submissions.map((sub) => (
                  <div key={sub.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-medium text-gray-800">
                            {sub.student?.profile?.full_name}
                          </span>
                          <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {sub.student?.student_code}
                          </span>
                          <span className="text-xs text-gray-400">
                            Nộp lúc {new Date(sub.submitted_at).toLocaleString('vi-VN')}
                          </span>
                        </div>

                        {sub.content && (
                          <p className="text-gray-600 text-sm bg-gray-50 rounded-xl p-3 mb-2 whitespace-pre-line">
                            {sub.content}
                          </p>
                        )}

                        {sub.file_url && (
                          <a
                            href={sub.file_url}
                            target="_blank"
                            className="text-blue-500 text-sm hover:underline"
                          >
                            📎 Xem file đính kèm
                          </a>
                        )}

                        {sub.grade !== null && (
                          <div className="mt-2 bg-green-50 rounded-xl p-3">
                            <p className="text-green-700 font-medium text-sm">
                              ✅ Điểm: {sub.grade}/10
                            </p>
                            {sub.feedback && (
                              <p className="text-green-600 text-sm mt-1">💬 {sub.feedback}</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Chấm điểm */}
                      <div className="ml-4">
                        {gradingId === sub.id ? (
                          <div className="bg-gray-50 rounded-xl p-4 w-56">
                            <input
                              type="number"
                              min="0" max="10" step="0.5"
                              placeholder="Điểm (0-10)"
                              value={gradeForm.grade}
                              onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })}
                              className="w-full px-3 py-2 border rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="text"
                              placeholder="Nhận xét (tuỳ chọn)"
                              value={gradeForm.feedback}
                              onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                              className="w-full px-3 py-2 border rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleGrade(sub.id)}
                                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                              >
                                Lưu
                              </button>
                              <button
                                onClick={() => setGradingId(null)}
                                className="flex-1 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setGradingId(sub.id)
                              setGradeForm({
                                grade: sub.grade || '',
                                feedback: sub.feedback || ''
                              })
                            }}
                            className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-sm font-medium hover:bg-orange-100 transition"
                          >
                            {sub.grade !== null ? '✏️ Sửa điểm' : '📊 Chấm điểm'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}