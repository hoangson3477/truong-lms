'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import LoadingPage from '@/components/Skeleton'

export default function TeachersPage() {
  const [profile, setProfile] = useState(null)
  const [teachers, setTeachers] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', phone: ''
  })
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).maybeSingle()
      setProfile(profileData)
      await Promise.all([fetchTeachers(), fetchClasses(), fetchSubjects()])
      setLoading(false)
    }
    getData()
  }, [])

  const fetchTeachers = async () => {
    await new Promise(resolve => setTimeout(resolve, 300))
    let query = supabase
      .from('profiles')
      .select(`
        *,
        teacher_classes(
          id,
          class:classes(name, grade),
          subject:subjects(name, code)
        )
      `)
      .eq('role', 'teacher')
      .order('full_name')

    if (profile?.school_id) {
      query = query.eq('school_id', profile.school_id)
    }

    const { data } = await query
    setTeachers([...(data || [])])
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
    if (!form.full_name || !form.email || !form.password) {
      return alert('Vui lòng điền đầy đủ thông tin bắt buộc!')
    }
    setSaving(true)

    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: 'teacher',
        school_id: profile?.school_id, // ← thêm
      })
    })

    const result = await res.json()
    if (result.error) {
      alert('Lỗi tạo tài khoản: ' + result.error)
      setSaving(false)
      return
    }

    // Cập nhật phone nếu có
    if (form.phone) {
      await supabase.from('profiles')
        .update({ phone: form.phone })
        .eq('id', result.user.id)
    }

    setShowModal(false)
    setForm({ full_name: '', email: '', password: '', phone: '' })
    setSaving(false)
    await fetchTeachers()
  }

  const filtered = teachers.filter(t =>
    t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <LoadingPage />

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />

      <div className="flex-1 p-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">👨‍🏫 Quản lý giáo viên</h2>
            <p className="text-gray-500 mt-1">Tổng cộng {teachers.length} giáo viên</p>
          </div>
          {profile?.role === 'school_admin' && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-blue-700 transition"
            >
              ＋ Thêm giáo viên
            </button>
          )}
        </div>

        {/* Tìm kiếm */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="🔍 Tìm theo tên hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        {/* Danh sách giáo viên */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">👨‍🏫</div>
            <p className="text-gray-500 text-lg">Chưa có giáo viên nào</p>
            <p className="text-gray-400 text-sm mt-1">Nhấn "Thêm giáo viên" để bắt đầu</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((teacher) => (
              <Link href={`/dashboard/teachers/${teacher.id}`} key={teacher.id}>
                <div className="bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition cursor-pointer group">

                  {/* Avatar + tên */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                      {teacher.full_name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition truncate">
                        {teacher.full_name}
                      </h3>
                      <p className="text-gray-400 text-sm truncate">{teacher.email}</p>
                    </div>
                  </div>

                  {/* Phân công */}
                  <div className="space-y-2">
                    {teacher.teacher_classes?.length > 0 ? (
                      <>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Phân công dạy
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {teacher.teacher_classes.slice(0, 3).map((tc) => (
                            <span key={tc.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                              {tc.subject?.name} - {tc.class?.name}
                            </span>
                          ))}
                          {teacher.teacher_classes.length > 3 && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">
                              +{teacher.teacher_classes.length - 3} khác
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">Chưa phân công lớp dạy</p>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      {teacher.phone || 'Chưa có SĐT'}
                    </span>
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

      {/* Modal thêm giáo viên */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4">

            <h3 className="text-xl font-bold text-gray-800 mb-6">➕ Thêm giáo viên mới</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nguyễn Thị B"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="giaovien@truong.edu.vn"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder="Tối thiểu 6 ký tự"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  placeholder="0901234567"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
                {saving ? 'Đang tạo...' : 'Tạo giáo viên'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}