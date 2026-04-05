'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

export default function SchoolsPage() {
  const [profile, setProfile] = useState(null)
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [selectedSchool, setSelectedSchool] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', address: '', phone: '', email: '', grade_system: '2_col'
  })
  const [adminForm, setAdminForm] = useState({
    full_name: '', email: '', password: ''
  })
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      setProfile(profileData)
      if (profileData?.role !== 'super_admin') {
        window.location.href = '/dashboard'
        return
      }
      await fetchSchools()
      setLoading(false)
    }
    getData()
  }, [])

  const fetchSchools = async () => {
    const { data } = await supabase
      .from('schools')
      .select('*')
      .order('created_at', { ascending: false })
    setSchools(data || [])
  }

  const handleCreateSchool = async () => {
    if (!form.name) return alert('Vui lòng nhập tên trường!')
    setSaving(true)
    const { error } = await supabase.from('schools').insert({
      name: form.name,
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
      grade_system: form.grade_system,
    })
    if (error) { alert('Lỗi: ' + error.message) }
    else {
      setShowModal(false)
      setForm({ name: '', address: '', phone: '', email: '', grade_system: '2_col' })
      await fetchSchools()
    }
    setSaving(false)
  }

  const handleCreateAdmin = async () => {
    if (!adminForm.full_name || !adminForm.email || !adminForm.password) {
      return alert('Vui lòng điền đầy đủ!')
    }
    setSaving(true)
    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminForm.email,
        password: adminForm.password,
        full_name: adminForm.full_name,
        role: 'school_admin',
        school_id: selectedSchool.id,
      })
    })
    const result = await res.json()
    if (result.error) { alert('Lỗi: ' + result.error) }
    else {
      await supabase.from('profiles')
        .update({ school_id: selectedSchool.id, role: 'school_admin' })
        .eq('id', result.user.id)
      setShowAdminModal(false)
      setAdminForm({ full_name: '', email: '', password: '' })
      alert('✅ Tạo tài khoản nhà trường thành công!')
    }
    setSaving(false)
  }

  const handleToggleActive = async (school) => {
    await supabase.from('schools')
      .update({ is_active: !school.is_active })
      .eq('id', school.id)
    await fetchSchools()
  }

  const handleDelete = async (school) => {
    if (!confirm(`Xóa trường "${school.name}"? Hành động này không thể hoàn tác!`)) return
    await supabase.from('schools').delete().eq('id', school.id)
    await fetchSchools()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Đang tải...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />

      <div className="flex-1 p-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">🏛️ Quản lý trường học</h2>
            <p className="text-gray-500 mt-1">Tổng cộng {schools.length} trường trên hệ thống</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-blue-700 transition"
          >
            ＋ Thêm trường mới
          </button>
        </div>

        {/* Danh sách trường */}
        {schools.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">🏛️</div>
            <p className="text-gray-500 text-lg">Chưa có trường nào trên hệ thống</p>
            <p className="text-gray-400 text-sm mt-1">Nhấn "Thêm trường mới" để bắt đầu</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schools.map(school => (
              <div key={school.id} className="bg-white rounded-2xl shadow-sm border p-6">

                {/* Header card */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                    🏫
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 truncate">{school.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      school.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {school.is_active ? '✅ Đang hoạt động' : '❌ Tạm dừng'}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  {school.address && (
                    <div className="flex items-center gap-2">
                      <span>📍</span>
                      <span className="truncate">{school.address}</span>
                    </div>
                  )}
                  {school.phone && (
                    <div className="flex items-center gap-2">
                      <span>📞</span>
                      <span>{school.phone}</span>
                    </div>
                  )}
                  {school.email && (
                    <div className="flex items-center gap-2">
                      <span>📧</span>
                      <span className="truncate">{school.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span className="text-gray-400 text-xs">
                      Tạo: {new Date(school.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>

                {/* Grade system badge */}
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium mb-4 ${
                  school.grade_system === '2_col'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-purple-50 text-purple-700 border border-purple-200'
                }`}>
                  📊 {school.grade_system === '2_col'
                    ? 'Hệ 2 cột TX: 1 Miệng + 1 TX'
                    : 'Hệ 4 cột TX: 1 Miệng + 3 TX'}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => { setSelectedSchool(school); setShowAdminModal(true) }}
                    className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition"
                  >
                    👤 Cấp tài khoản
                  </button>
                  <button
                    onClick={() => handleToggleActive(school)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                      school.is_active
                        ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {school.is_active ? '⏸️ Tạm dừng' : '▶️ Kích hoạt'}
                  </button>
                  <button
                    onClick={() => handleDelete(school)}
                    className="py-2 px-3 bg-red-50 text-red-500 rounded-xl text-sm hover:bg-red-100 transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal tạo trường */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-6">🏛️ Thêm trường mới</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên trường <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Trường THPT Nguyễn Du"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                <input
                  type="text"
                  placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    placeholder="0901234567"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="truong@edu.vn"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Chọn hệ điểm */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📊 Hệ thống điểm thường xuyên <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, grade_system: '2_col' })}
                    className={`p-4 rounded-xl border-2 text-left transition ${
                      form.grade_system === '2_col'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <p className="font-bold text-gray-800 text-sm">Hệ 2 cột TX</p>
                    <p className="text-xs text-gray-500 mt-1">1 Miệng + 1 TX</p>
                    <p className="text-xs text-gray-400">+ Giữa kỳ + Cuối kỳ</p>
                    {form.grade_system === '2_col' && (
                      <span className="text-blue-600 text-xs font-medium">✓ Đang chọn</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, grade_system: '4_col' })}
                    className={`p-4 rounded-xl border-2 text-left transition ${
                      form.grade_system === '4_col'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <p className="font-bold text-gray-800 text-sm">Hệ 4 cột TX</p>
                    <p className="text-xs text-gray-500 mt-1">1 Miệng + 3 TX</p>
                    <p className="text-xs text-gray-400">+ Giữa kỳ + Cuối kỳ</p>
                    {form.grade_system === '4_col' && (
                      <span className="text-purple-600 text-xs font-medium">✓ Đang chọn</span>
                    )}
                  </button>
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
                onClick={handleCreateSchool}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium disabled:opacity-50"
              >
                {saving ? 'Đang tạo...' : '🏛️ Tạo trường'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal tạo tài khoản school_admin */}
      {showAdminModal && selectedSchool && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-1">👤 Cấp tài khoản nhà trường</h3>
            <div className="flex items-center gap-2 mb-6 bg-blue-50 px-4 py-2 rounded-xl">
              <span>🏫</span>
              <p className="text-blue-700 text-sm font-medium">{selectedSchool.name}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={adminForm.full_name}
                  onChange={(e) => setAdminForm({ ...adminForm, full_name: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="admin@truong.edu.vn"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
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
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-4 bg-gray-50 p-3 rounded-xl">
              ℹ️ Tài khoản này có quyền quản lý toàn bộ trường <strong>{selectedSchool.name}</strong> bao gồm: tạo lớp học, quản lý học sinh, giáo viên, điểm số...
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAdminModal(false)}
                className="flex-1 px-4 py-3 border rounded-xl text-gray-600 hover:bg-gray-50 transition font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateAdmin}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium disabled:opacity-50"
              >
                {saving ? 'Đang tạo...' : '👤 Cấp tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}