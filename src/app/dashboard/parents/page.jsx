'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import LoadingPage from '@/components/Skeleton'

export default function ParentsPage() {
  const [profile, setProfile] = useState(null)
  const [parents, setParents] = useState([])
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterLinked, setFilterLinked] = useState('all')
  const [selectedParent, setSelectedParent] = useState(null)
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', phone: ''
  })
  const [linkStudentId, setLinkStudentId] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).maybeSingle()
      setProfile(profileData)
      await Promise.all([
        fetchParents(profileData),
        fetchStudents(profileData),
        fetchClasses(profileData),
      ])
      setLoading(false)
    }
    getData()
  }, [])

  const fetchParents = async (profileData = profile) => {
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('role', 'parent')
      .order('full_name')

    if (profileData?.school_id) {
      query = query.eq('school_id', profileData.school_id)
    }

    const { data: parentList } = await query

    const { data: linkedStudents } = await supabase
      .from('students')
      .select(`
        id, student_code, parent_id,
        profile:profiles!students_profile_id_fkey(full_name),
        class:classes(name, grade)
      `)
      .order('student_code')

    const parentsWithStudents = (parentList || []).map(p => ({
      ...p,
      students: (linkedStudents || []).filter(s => s.parent_id === p.id),
    }))

    setParents(parentsWithStudents)
  }

  const fetchStudents = async (profileData = profile) => {
    let query = supabase
      .from('students')
      .select(`
        id, student_code, parent_id,
        profile:profiles!students_profile_id_fkey(full_name),
        class:classes(name, grade)
      `)
      .order('student_code')

    if (profileData?.school_id) {
      query = query.eq('school_id', profileData.school_id)
    }

    const { data } = await query
    setStudents(data || [])
  }

  const fetchClasses = async (profileData = profile) => {
    let query = supabase.from('classes').select('*').order('grade')
    if (profileData?.school_id) {
      query = query.eq('school_id', profileData.school_id)
    }
    const { data } = await query
    setClasses(data || [])
  }

  const handleCreateParent = async () => {
    if (!form.full_name || !form.email || !form.password) {
      return alert('Vui lòng điền đầy đủ thông tin bắt buộc!')
    }
    if (form.password.length < 6) {
      return alert('Mật khẩu phải tối thiểu 6 ký tự!')
    }
    setSaving(true)

    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: 'parent',
        school_id: profile?.school_id,
      })
    })

    const result = await res.json()

    if (result.error) {
      alert('Lỗi tạo tài khoản: ' + result.error)
      setSaving(false)
      return
    }

    if (form.phone) {
      await supabase.from('profiles')
        .update({ phone: form.phone })
        .eq('id', result.user.id)
    }

    setShowModal(false)
    setForm({ full_name: '', email: '', password: '', phone: '' })
    setSaving(false)
    await fetchParents()
    alert('✅ Tạo tài khoản phụ huynh thành công!')
  }

  const handleLinkStudent = async () => {
    if (!linkStudentId || !selectedParent) return alert('Vui lòng chọn học sinh!')
    setSaving(true)

    const { error } = await supabase
      .from('students')
      .update({ parent_id: selectedParent.id })
      .eq('id', linkStudentId)

    if (error) {
      alert('Lỗi: ' + error.message)
    } else {
      setShowLinkModal(false)
      setLinkStudentId('')
      setSelectedParent(null)
      await Promise.all([fetchParents(), fetchStudents()])
    }
    setSaving(false)
  }

  const handleUnlink = async (studentId) => {
    if (!confirm('Hủy liên kết phụ huynh khỏi học sinh này?')) return

    const { error } = await supabase
      .from('students')
      .update({ parent_id: null })
      .eq('id', studentId)

    if (error) {
      alert('Lỗi: ' + error.message)
    } else {
      await Promise.all([fetchParents(), fetchStudents()])
    }
  }

  const handleDelete = async (parent) => {
    if (!confirm(`Xóa tài khoản phụ huynh "${parent.full_name}"?\nCác liên kết với học sinh sẽ bị hủy.`)) return

    await supabase
      .from('students')
      .update({ parent_id: null })
      .eq('parent_id', parent.id)

    await supabase.from('profiles').delete().eq('id', parent.id)

    await Promise.all([fetchParents(), fetchStudents()])
  }

  const openLinkModal = (parent) => {
    setSelectedParent(parent)
    setLinkStudentId('')
    setShowLinkModal(true)
  }

  const unlinkedStudents = students.filter(s => !s.parent_id)

  const filtered = parents.filter(p => {
    const matchSearch = p.full_name?.toLowerCase().includes(search.toLowerCase())
      || p.email?.toLowerCase().includes(search.toLowerCase())
      || p.phone?.includes(search)
    const matchLinked = filterLinked === 'all' ? true
      : filterLinked === 'linked' ? p.students.length > 0
      : p.students.length === 0
    return matchSearch && matchLinked
  })

  const totalParents = parents.length
  const linkedParents = parents.filter(p => p.students.length > 0).length
  const unlinkedParents = totalParents - linkedParents

  if (loading) return <LoadingPage />

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />

      <div className="flex-1 p-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">👨‍👩‍👧 Quản lý phụ huynh</h2>
            <p className="text-gray-500 mt-1">Tổng cộng {totalParents} phụ huynh</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-blue-700 transition"
          >
            ＋ Thêm phụ huynh
          </button>
        </div>

        {/* Thống kê */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border p-5 text-center">
            <div className="text-3xl mb-2">👨‍👩‍👧</div>
            <p className="text-2xl font-bold text-gray-800">{totalParents}</p>
            <p className="text-sm text-gray-500 mt-1">Tổng phụ huynh</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
            <div className="text-3xl mb-2">🔗</div>
            <p className="text-2xl font-bold text-green-600">{linkedParents}</p>
            <p className="text-sm text-gray-500 mt-1">Đã liên kết HS</p>
          </div>
          <div className={`rounded-2xl p-5 text-center ${unlinkedParents > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50 border'}`}>
            <div className="text-3xl mb-2">⚠️</div>
            <p className={`text-2xl font-bold ${unlinkedParents > 0 ? 'text-orange-600' : 'text-gray-400'}`}>{unlinkedParents}</p>
            <p className="text-sm text-gray-500 mt-1">Chưa liên kết</p>
          </div>
        </div>

        {/* Bộ lọc */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            placeholder="🔍 Tìm theo tên, email hoặc SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'linked', label: '🔗 Đã liên kết' },
              { key: 'unlinked', label: '⚠️ Chưa liên kết' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilterLinked(f.key)}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition border whitespace-nowrap
                  ${filterLinked === f.key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Danh sách */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">👨‍👩‍👧</div>
            <p className="text-gray-500 text-lg">Chưa có phụ huynh nào</p>
            <p className="text-gray-400 text-sm mt-1">Nhấn "Thêm phụ huynh" để bắt đầu</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(parent => (
              <div key={parent.id} className="bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition">

                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                    {parent.full_name?.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-800 truncate">{parent.full_name}</h3>
                    <p className="text-gray-400 text-sm truncate">{parent.email}</p>
                    {parent.phone && (
                      <p className="text-gray-400 text-xs">📞 {parent.phone}</p>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Học sinh liên kết</p>
                  {parent.students.length === 0 ? (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                      <p className="text-orange-600 text-sm font-medium">⚠️ Chưa liên kết học sinh</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {parent.students.map(s => (
                        <div key={s.id} className="flex items-center justify-between bg-green-50 rounded-xl px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {s.profile?.full_name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{s.profile?.full_name}</p>
                              <p className="text-xs text-gray-400">
                                {s.student_code} {s.class ? `• Lớp ${s.class.name}` : ''}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnlink(s.id)}
                            className="text-red-400 hover:text-red-600 text-xs"
                            title="Hủy liên kết"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openLinkModal(parent)}
                    className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 transition"
                  >
                    🔗 Liên kết HS
                  </button>
                  <button
                    onClick={() => handleDelete(parent)}
                    className="py-2 px-3 bg-red-50 text-red-500 rounded-xl text-sm hover:bg-red-100 transition"
                    title="Xóa phụ huynh"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HS chưa có PH */}
        {unlinkedStudents.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              ⚠️ Học sinh chưa có phụ huynh ({unlinkedStudents.length})
            </h3>
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Mã HS</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Họ và tên</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Lớp</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {unlinkedStudents.slice(0, 10).map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3">
                          <span className="font-mono text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">{s.student_code}</span>
                        </td>
                        <td className="px-6 py-3 font-medium text-gray-800">{s.profile?.full_name}</td>
                        <td className="px-6 py-3 text-gray-500 text-sm">
                          {s.class ? `Lớp ${s.class.name}` : 'Chưa phân lớp'}
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-lg font-medium">
                            Chưa có PH
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {unlinkedStudents.length > 10 && (
                <div className="p-3 border-t bg-gray-50 text-center text-sm text-gray-400">
                  Và {unlinkedStudents.length - 10} học sinh khác...
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Modal tạo PH */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-6">➕ Thêm phụ huynh mới</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nguyễn Văn B"
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
                  placeholder="phuhuynh@email.com"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
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
                onClick={handleCreateParent}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium disabled:opacity-50"
              >
                {saving ? 'Đang tạo...' : '👨‍👩‍👧 Tạo phụ huynh'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal liên kết HS */}
      {showLinkModal && selectedParent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-1">🔗 Liên kết học sinh</h3>

            <div className="flex items-center gap-3 mb-6 bg-orange-50 px-4 py-3 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                {selectedParent.full_name?.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-gray-800">{selectedParent.full_name}</p>
                <p className="text-xs text-gray-500">{selectedParent.email}</p>
              </div>
            </div>

            {unlinkedStudents.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-3xl mb-2">✅</div>
                <p>Tất cả học sinh đã có phụ huynh</p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn học sinh <span className="text-red-500">*</span>
                </label>
                <select
                  value={linkStudentId}
                  onChange={(e) => setLinkStudentId(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                >
                  <option value="">-- Chọn học sinh --</option>
                  {unlinkedStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.profile?.full_name} ({s.student_code}) {s.class ? `- Lớp ${s.class.name}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400">
                  Chỉ hiển thị học sinh chưa có phụ huynh ({unlinkedStudents.length} HS)
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowLinkModal(false); setSelectedParent(null) }}
                className="flex-1 px-4 py-3 border rounded-xl text-gray-600 hover:bg-gray-50 transition font-medium"
              >
                Hủy
              </button>
              {unlinkedStudents.length > 0 && (
                <button
                  onClick={handleLinkStudent}
                  disabled={saving || !linkStudentId}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : '🔗 Liên kết'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}