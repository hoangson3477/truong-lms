'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

const subjectIcons = {
  MATH: '📐', LIT: '📖', ENG: '🌍', PHY: '⚡',
  CHEM: '🧪', BIO: '🌿', HIS: '🏛️', GEO: '🗺️',
  CIVIC: '⚖️', IT: '💻', PE: '⚽', MUS: '🎵', ART: '🎨',
}

const subjectColors = {
  MATH: 'bg-blue-50 border-blue-200 text-blue-700',
  LIT: 'bg-orange-50 border-orange-200 text-orange-700',
  ENG: 'bg-green-50 border-green-200 text-green-700',
  PHY: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  CHEM: 'bg-purple-50 border-purple-200 text-purple-700',
  BIO: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  HIS: 'bg-amber-50 border-amber-200 text-amber-700',
  GEO: 'bg-teal-50 border-teal-200 text-teal-700',
  CIVIC: 'bg-red-50 border-red-200 text-red-700',
  IT: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  PE: 'bg-lime-50 border-lime-200 text-lime-700',
  MUS: 'bg-pink-50 border-pink-200 text-pink-700',
  ART: 'bg-rose-50 border-rose-200 text-rose-700',
}

export default function SubjectsPage() {
  const [profile, setProfile] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', code: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      setProfile(profileData)
      await fetchSubjects()
      setLoading(false)
    }
    getData()
  }, [])

  const fetchSubjects = async () => {
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .order('name')
    setSubjects(data || [])
  }

  const openAdd = () => {
    setEditItem(null)
    setForm({ name: '', code: '' })
    setShowModal(true)
  }

  const openEdit = (subject) => {
    setEditItem(subject)
    setForm({ name: subject.name, code: subject.code })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!form.name || !form.code) return alert('Vui lòng điền đầy đủ!')
    setSaving(true)

    if (editItem) {
      await supabase.from('subjects')
        .update({ name: form.name, code: form.code.toUpperCase() })
        .eq('id', editItem.id)
    } else {
      const { error } = await supabase.from('subjects')
        .insert({ name: form.name, code: form.code.toUpperCase() })
      if (error) {
        alert('Mã môn học đã tồn tại!')
        setSaving(false)
        return
      }
    }

    setShowModal(false)
    await fetchSubjects()
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Xóa môn học này?')) return
    setDeleting(id)
    await supabase.from('subjects').delete().eq('id', id)
    await fetchSubjects()
    setDeleting(null)
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">📚 Quản lý môn học</h2>
            <p className="text-gray-500 mt-1">Tổng cộng {subjects.length} môn học</p>
          </div>
          {profile?.role === 'admin' && (
            <button
              onClick={openAdd}
              className="bg-blue-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-blue-700 transition"
            >
              ＋ Thêm môn học
            </button>
          )}
        </div>

        {/* Grid môn học */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className={`rounded-2xl border-2 p-5 ${subjectColors[subject.code] || 'bg-gray-50 border-gray-200 text-gray-700'}`}
            >
              <div className="text-3xl mb-3">
                {subjectIcons[subject.code] || '📗'}
              </div>
              <h3 className="font-bold text-lg leading-tight">{subject.name}</h3>
              <p className="text-xs font-mono opacity-60 mt-1">{subject.code}</p>

              {profile?.role === 'admin' && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => openEdit(subject)}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-white/60 hover:bg-white transition font-medium"
                  >
                    ✏️ Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(subject.id)}
                    disabled={deleting === subject.id}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-white/60 hover:bg-red-100 transition font-medium text-red-600"
                  >
                    {deleting === subject.id ? '...' : '🗑️ Xóa'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>

      {/* Modal thêm/sửa môn học */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4">

            <h3 className="text-xl font-bold text-gray-800 mb-6">
              {editItem ? '✏️ Sửa môn học' : '➕ Thêm môn học'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên môn học <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Toán, Ngữ văn, Tiếng Anh"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mã môn <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: MATH, LIT, ENG"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">Mã viết tắt, chữ in hoa, không dấu</p>
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
                {saving ? 'Đang lưu...' : (editItem ? 'Cập nhật' : 'Thêm môn')}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}