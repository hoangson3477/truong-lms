'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import LoadingPage from '@/components/Skeleton'

export default function AssignmentsPage() {
  const [profile, setProfile] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterClass, setFilterClass] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', class_id: '',
    subject_id: '', due_date: ''
  })
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).maybeSingle()
      setProfile(profileData)
      await Promise.all([fetchAssignments(profileData), fetchClasses(), fetchSubjects()])
      setLoading(false)
    }
    getData()
  }, [])

  const fetchAssignments = async (profileData) => {
    await new Promise(resolve => setTimeout(resolve, 300))
    let query = supabase
      .from('assignments')
      .select(`
        *,
        class:classes(name, grade),
        subject:subjects(name, code),
        teacher:profiles!assignments_teacher_id_fkey(full_name),
        submissions(count)
      `)
      .order('created_at', { ascending: false })
    
    if (profile?.school_id) {
      query = query.eq('school_id', profile.school_id)
    }

    // Giáo viên chỉ thấy bài của mình
    if (profileData?.role === 'teacher') {
      query = query.eq('teacher_id', profileData.id)
    }

    const { data } = await query
    setAssignments([...(data || [])])
  }

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('grade')
    setClasses(data || [])
  }

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').order('name')
    setSubjects(data || [])
  }

  const handleSubmit = async () => {
    if (!form.title || !form.class_id || !form.subject_id) {
      return alert('Vui lòng điền đầy đủ thông tin!')
    }
    setSaving(true)
    const { error } = await supabase.from('assignments').insert({
      title: form.title,
      description: form.description,
      class_id: form.class_id,
      subject_id: form.subject_id,
      teacher_id: profile.id,
      due_date: form.due_date || null,
      school_id: profile?.school_id,
    })
    if (error) {
      alert('Lỗi: ' + error.message)
    } else {
      setShowModal(false)
      setForm({ title: '', description: '', class_id: '', subject_id: '', due_date: '' })
      await fetchAssignments(profile)
    }
    setSaving(false)
  }

  const isOverdue = (due_date) => due_date && new Date(due_date) < new Date()

  const filtered = assignments.filter(a =>
    filterClass ? a.class_id === filterClass : true
  )

  if (loading) return <LoadingPage />

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />

      <div className="flex-1 p-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">📝 Bài tập</h2>
            <p className="text-gray-500 mt-1">Tổng cộng {assignments.length} bài tập</p>
          </div>
          {(profile?.role === 'teacher' || profile?.role === 'school_admin') && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-blue-700 transition"
            >
              ＋ Tạo bài tập
            </button>
          )}
        </div>

        {/* Lọc */}
        <div className="mb-6">
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Tất cả lớp</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>Lớp {cls.name}</option>
            ))}
          </select>
        </div>

        {/* Danh sách bài tập */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">📝</div>
            <p className="text-gray-500 text-lg">Chưa có bài tập nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((assignment) => (
              <Link href={`/dashboard/assignments/${assignment.id}`} key={assignment.id}>
                <div className="bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition group">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg">📝</span>
                        <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition">
                          {assignment.title}
                        </h3>
                        {isOverdue(assignment.due_date) && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                            Đã hết hạn
                          </span>
                        )}
                      </div>

                      {assignment.description && (
                        <p className="text-gray-500 text-sm mb-3 line-clamp-2">
                          {assignment.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg">
                          🏫 Lớp {assignment.class?.name}
                        </span>
                        <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-lg">
                          📚 {assignment.subject?.name}
                        </span>
                        <span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg">
                          👨‍🏫 {assignment.teacher?.full_name}
                        </span>
                        {assignment.due_date && (
                          <span className={`px-3 py-1 rounded-lg ${isOverdue(assignment.due_date)
                            ? 'bg-red-50 text-red-600'
                            : 'bg-orange-50 text-orange-600'}`}>
                            ⏰ {new Date(assignment.due_date).toLocaleDateString('vi-VN', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-blue-600">
                        {assignment.submissions?.[0]?.count || 0}
                      </div>
                      <div className="text-xs text-gray-400">đã nộp</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>

      {/* Modal tạo bài tập */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-6">➕ Tạo bài tập mới</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Bài tập chương 1 - Đại số"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả / Nội dung
                </label>
                <textarea
                  rows={3}
                  placeholder="Nội dung bài tập, yêu cầu..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lớp <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.class_id}
                    onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn lớp --</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>Lớp {cls.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Môn học <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.subject_id}
                    onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn môn --</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hạn nộp
                </label>
                <input
                  type="datetime-local"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 border rounded-xl text-gray-600 hover:bg-gray-50 transition font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium disabled:opacity-50"
              >
                {saving ? 'Đang tạo...' : 'Tạo bài tập'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}