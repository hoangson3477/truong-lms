'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import LoadingPage from '@/components/Skeleton'

export default function ClassesPage() {
  const [profile, setProfile] = useState(null)
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    name: '', grade: '', academic_year: '2024-2025'
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).maybeSingle()
      setProfile(profileData)
      await fetchClasses()
      setLoading(false)
    }
    getData()
  }, [])

  const fetchClasses = async () => {
    let query = supabase
      .from('classes')
      .select(`
        *,
        homeroom_teacher:profiles!classes_homeroom_teacher_id_fkey(full_name),
        students(count)
      `)
      .order('grade', { ascending: true })

    if (profile?.school_id) {
      query = query.eq('school_id', profile.school_id)
    }

    const { data } = await query
    setClasses(data || [])
  }

  const handleSubmit = async () => {
    if (!form.name || !form.grade) return alert('Vui lòng điền đầy đủ!')
    setSaving(true)
    const { error } = await supabase.from('classes').insert({
      name: form.name,
      grade: parseInt(form.grade),
      academic_year: form.academic_year,
      school_id: profile?.school_id, // ← thêm
    })
    if (error) {
      alert('Lỗi: ' + error.message)
    } else {
      setShowModal(false)
      setForm({ name: '', grade: '', academic_year: '2024-2025' })
      await fetchClasses()
    }
    setSaving(false)
  }

  const gradeColor = (grade) => {
    if (grade <= 5) return 'bg-green-100 text-green-700'
    if (grade <= 9) return 'bg-blue-100 text-blue-700'
    return 'bg-purple-100 text-purple-700'
  }

  if (loading) return <LoadingPage />

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />

      <div className="flex-1 p-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">🏫 Quản lý lớp học</h2>
            <p className="text-gray-500 mt-1">Tổng cộng {classes.length} lớp</p>
          </div>
          {profile?.role === 'school_admin' && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-blue-700 transition flex items-center gap-2"
            >
              ＋ Thêm lớp mới
            </button>
          )}
        </div>

        {/* Danh sách lớp */}
        {classes.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">🏫</div>
            <p className="text-gray-500 text-lg">Chưa có lớp học nào</p>
            <p className="text-gray-400 text-sm mt-1">Nhấn "Thêm lớp mới" để bắt đầu</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <Link href={`/dashboard/classes/${cls.id}`} key={cls.id}>
                <div className="bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition cursor-pointer group">
                  
                  {/* Top */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition">
                        Lớp {cls.name}
                      </h3>
                      <p className="text-gray-400 text-sm mt-1">{cls.academic_year}</p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${gradeColor(cls.grade)}`}>
                      Khối {cls.grade}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>👨‍🏫</span>
                      <span>{cls.homeroom_teacher?.full_name || 'Chưa phân công'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>👨‍🎓</span>
                      <span>{cls.students?.[0]?.count || 0} học sinh</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t flex justify-end">
                    <span className="text-blue-500 text-sm font-medium group-hover:underline">
                      Xem chi tiết →
                    </span>
                  </div>

                </div>
              </Link>
            ))}
          </div>
        )}

      </div>

      {/* Modal thêm lớp */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4">
            
            <h3 className="text-xl font-bold text-gray-800 mb-6">➕ Thêm lớp mới</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên lớp <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: 10A1, 11B2, 12C3"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Khối <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn khối --</option>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                    <option key={g} value={g}>Khối {g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Năm học
                </label>
                <select
                  value={form.academic_year}
                  onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="2023-2024">2023-2024</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2025-2026">2025-2026</option>
                </select>
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
                {saving ? 'Đang lưu...' : 'Tạo lớp'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}