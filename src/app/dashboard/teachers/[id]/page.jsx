'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import LoadingPage from '@/components/Skeleton'

export default function TeacherDetailPage() {
  const [profile, setProfile] = useState(null)
  const [teacher, setTeacher] = useState(null)
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [assignments, setAssignments] = useState([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignForm, setAssignForm] = useState({ class_id: '', subject_id: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const { id } = useParams()
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).maybeSingle()
      setProfile(profileData)
      await Promise.all([fetchTeacher(), fetchClasses(), fetchSubjects()])
      setLoading(false)
    }
    getData()
  }, [id])

  const fetchTeacher = async () => {
    const { data } = await supabase
      .from('profiles')
      .select(`
        *,
        teacher_classes(
          id,
          class:classes(id, name, grade),
          subject:subjects(id, name, code)
        )
      `)
      .eq('id', id)
      .single()
    setTeacher(data)
  }

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('grade')
    setClasses(data || [])
  }

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').order('name')
    setSubjects(data || [])
  }

  const handleAssign = async () => {
    if (!assignForm.class_id || !assignForm.subject_id) {
      return alert('Vui lòng chọn lớp và môn học!')
    }
    setSaving(true)
    const { error } = await supabase.from('teacher_classes').insert({
      teacher_id: id,
      class_id: assignForm.class_id,
      subject_id: assignForm.subject_id,
    })
    if (error) {
      alert('Đã phân công môn này cho lớp này rồi!')
    } else {
      setShowAssignModal(false)
      setAssignForm({ class_id: '', subject_id: '' })
      await fetchTeacher()
    }
    setSaving(false)
  }

  const handleRemoveAssign = async (tcId) => {
    if (!confirm('Xóa phân công này?')) return
    await supabase.from('teacher_classes').delete().eq('id', tcId)
    await fetchTeacher()
  }

  if (loading) return <LoadingPage />

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />

      <div className="flex-1 p-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/dashboard/teachers" className="hover:text-blue-600">Giáo viên</Link>
          <span>→</span>
          <span className="text-gray-800 font-medium">{teacher?.full_name}</span>
        </div>

        <div className="grid grid-cols-3 gap-6">

          {/* Thông tin cá nhân */}
          <div className="col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
                {teacher?.full_name?.charAt(0)}
              </div>
              <h3 className="text-xl font-bold text-gray-800">{teacher?.full_name}</h3>
              <p className="text-gray-500 text-sm mt-1">{teacher?.email}</p>
              <span className="inline-block mt-3 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                Giáo viên
              </span>

              <div className="mt-6 space-y-3 text-left">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Số điện thoại</span>
                  <span className="font-medium">{teacher?.phone || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Số lớp dạy</span>
                  <span className="font-medium text-blue-600">
                    {teacher?.teacher_classes?.length || 0} lớp
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Phân công dạy */}
          <div className="col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border">
              <div className="p-6 border-b flex justify-between items-center">
                <h4 className="font-bold text-gray-800 text-lg">📚 Phân công dạy học</h4>
                {profile?.role === 'admin' && (
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
                  >
                    ＋ Thêm phân công
                  </button>
                )}
              </div>

              {teacher?.teacher_classes?.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <div className="text-3xl mb-2">📚</div>
                  <p>Chưa có phân công nào</p>
                </div>
              ) : (
                <div className="divide-y">
                  {teacher?.teacher_classes?.map((tc) => (
                    <div key={tc.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-lg">
                          📖
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{tc.subject?.name}</p>
                          <p className="text-sm text-gray-500">Lớp {tc.class?.name} — Khối {tc.class?.grade}</p>
                        </div>
                      </div>
                      {profile?.role === 'admin' && (
                        <button
                          onClick={() => handleRemoveAssign(tc.id)}
                          className="text-red-400 hover:text-red-600 text-sm px-3 py-1 rounded-lg hover:bg-red-50 transition"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Modal phân công */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-6">➕ Thêm phân công</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Môn học <span className="text-red-500">*</span>
                </label>
                <select
                  value={assignForm.subject_id}
                  onChange={(e) => setAssignForm({ ...assignForm, subject_id: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn môn --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lớp <span className="text-red-500">*</span>
                </label>
                <select
                  value={assignForm.class_id}
                  onChange={(e) => setAssignForm({ ...assignForm, class_id: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn lớp --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>Lớp {c.name} (Khối {c.grade})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 px-4 py-3 border rounded-xl text-gray-600 hover:bg-gray-50 transition font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleAssign}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : 'Phân công'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}