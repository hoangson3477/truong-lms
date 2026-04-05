'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import LoadingPage from '@/components/Skeleton'

export default function StudentsPage() {
  const [profile, setProfile] = useState(null)
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    student_code: '', class_id: '',
    date_of_birth: '', address: '',
  })
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).maybeSingle()
      setProfile(profileData)
      await Promise.all([fetchStudents(profileData), fetchClasses(profileData)])
      setLoading(false)
    }
    getData()
  }, [])

  // ✅ FIX: Nhận profileData làm tham số, dùng let query thay vì const + query undefined
  const fetchStudents = async (profileData = profile) => {
    await new Promise(resolve => setTimeout(resolve, 500))
    let query = supabase
      .from('students')
      .select(`
        *,
        profile:profiles!students_profile_id_fkey(full_name, email),
        class:classes(name, grade)
      `)
      .order('student_code')

    // ✅ FIX: Dùng biến query đã khai báo ở trên
    if (profileData?.school_id) {
      query = query.eq('school_id', profileData.school_id)
    }

    const { data } = await query
    // ✅ FIX: Xóa console.log
    setStudents([...(data || [])])
  }

  // ✅ FIX: Nhận profileData để filter theo school
  const fetchClasses = async (profileData = profile) => {
    let query = supabase
      .from('classes')
      .select('*')
      .order('grade')

    if (profileData?.school_id) {
      query = query.eq('school_id', profileData.school_id)
    }

    const { data } = await query
    setClasses(data || [])
  }

  const handleSubmit = async () => {
    if (!form.full_name || !form.email || !form.password || !form.student_code) {
      return alert('Vui lòng điền đầy đủ thông tin bắt buộc!')
    }
    setSaving(true)

    // Gọi API tạo user
    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: 'student',
        school_id: profile?.school_id,
      })
    })

    const result = await res.json()

    if (result.error) {
      alert('Lỗi tạo tài khoản: ' + result.error)
      setSaving(false)
      return
    }

    // Tạo record student
    const { error: studentError } = await supabase.from('students').insert({
      profile_id: result.user.id,
      class_id: form.class_id || null,
      student_code: form.student_code,
      date_of_birth: form.date_of_birth || null,
      address: form.address || null,
      school_id: profile?.school_id,
    })

    if (studentError) {
      alert('Lỗi tạo học sinh: ' + studentError.message)
      setSaving(false)
      return
    }

    setShowModal(false)
    setForm({
      full_name: '', email: '', password: '',
      student_code: '', class_id: '',
      date_of_birth: '', address: ''
    })
    setSaving(false)

    // Reload lại trang để chắc chắn
    await fetchStudents()
  }

  // Lọc học sinh
  const filtered = students.filter(s => {
    const matchSearch = s.profile?.full_name?.toLowerCase().includes(search.toLowerCase())
      || s.student_code?.toLowerCase().includes(search.toLowerCase())
    const matchClass = filterClass ? s.class_id === filterClass : true
    return matchSearch && matchClass
  })

  if (loading) return <LoadingPage />

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />

      <div className="flex-1 p-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">👨‍🎓 Quản lý học sinh</h2>
            <p className="text-gray-500 mt-1">Tổng cộng {students.length} học sinh</p>
          </div>
          {(profile?.role === 'admin' || profile?.role === 'school_admin') && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-blue-700 transition"
            >
              ＋ Thêm học sinh
            </button>
          )}
        </div>

        {/* Bộ lọc */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            placeholder="🔍 Tìm theo tên hoặc mã học sinh..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
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

        {/* Bảng học sinh */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-5xl mb-4">👨‍🎓</div>
              <p className="text-gray-500">Chưa có học sinh nào</p>
              <p className="text-gray-400 text-sm mt-1">Nhấn "Thêm học sinh" để bắt đầu</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">STT</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Mã HS</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Họ và tên</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Lớp</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Email</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Ngày sinh</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((student, index) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-gray-400 text-sm">{index + 1}</td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                          {student.student_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800">
                        {student.profile?.full_name}
                      </td>
                      <td className="px-6 py-4">
                        {student.class ? (
                          <span className="bg-purple-50 text-purple-700 text-sm px-2 py-1 rounded-lg font-medium">
                            Lớp {student.class.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">Chưa phân lớp</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">{student.profile?.email}</td>
                      <td className="px-6 py-4 text-gray-500 text-sm">
                        {student.date_of_birth
                          ? new Date(student.date_of_birth).toLocaleDateString('vi-VN')
                          : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/students/${student.id}`}
                          className="text-blue-500 hover:underline text-sm font-medium"
                        >
                          Xem →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Modal thêm học sinh */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg mx-4">

            <h3 className="text-xl font-bold text-gray-800 mb-6">➕ Thêm học sinh mới</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã học sinh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: HS001"
                    value={form.student_code}
                    onChange={(e) => setForm({ ...form, student_code: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lớp
                  </label>
                  <select
                    value={form.class_id}
                    onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn lớp --</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>Lớp {cls.name} (Khối {cls.grade})</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="hocsinh@truong.edu.vn"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
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
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Địa chỉ
                  </label>
                  <input
                    type="text"
                    placeholder="Địa chỉ học sinh"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
                {saving ? 'Đang tạo...' : 'Tạo học sinh'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}