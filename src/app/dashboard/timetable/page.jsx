'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

const DAYS = [
  { value: 2, label: 'Thứ 2' },
  { value: 3, label: 'Thứ 3' },
  { value: 4, label: 'Thứ 4' },
  { value: 5, label: 'Thứ 5' },
  { value: 6, label: 'Thứ 6' },
  { value: 7, label: 'Thứ 7' },
]

const PERIODS = [1,2,3,4,5,6,7,8,9,10]

const PERIOD_TIME = {
  1: '7:00 - 7:45',
  2: '7:50 - 8:35',
  3: '8:40 - 9:25',
  4: '9:35 - 10:20',
  5: '10:25 - 11:10',
  6: '13:00 - 13:45',
  7: '13:50 - 14:35',
  8: '14:40 - 15:25',
  9: '15:35 - 16:20',
  10: '16:25 - 17:10',
}

const SUBJECT_COLORS = [
  'bg-blue-50 border-blue-200 text-blue-800',
  'bg-green-50 border-green-200 text-green-800',
  'bg-purple-50 border-purple-200 text-purple-800',
  'bg-orange-50 border-orange-200 text-orange-800',
  'bg-pink-50 border-pink-200 text-pink-800',
  'bg-teal-50 border-teal-200 text-teal-800',
  'bg-yellow-50 border-yellow-200 text-yellow-800',
  'bg-red-50 border-red-200 text-red-800',
  'bg-indigo-50 border-indigo-200 text-indigo-800',
  'bg-cyan-50 border-cyan-200 text-cyan-800',
]

export default function TimetablePage() {
  const [profile, setProfile] = useState(null)
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [teachers, setTeachers] = useState([])
  const [timetable, setTimetable] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSemester, setSelectedSemester] = useState('1')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editCell, setEditCell] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    subject_id: '', teacher_id: '', room: ''
  })
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      setProfile(profileData)
      await Promise.all([fetchClasses(), fetchSubjects(), fetchTeachers()])
      setLoading(false)
    }
    getData()
  }, [])

  useEffect(() => {
    if (selectedClass) fetchTimetable()
  }, [selectedClass, selectedSemester])

  const fetchClasses = async () => {
    let query = supabase.from('classes').select('*').order('grade')
    if (profile?.school_id) {
        query = query.eq('school_id', profile.school_id)
    }
    const { data } = await query
    setClasses(data || [])
    }

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').order('name')
    setSubjects(data || [])
  }

  const fetchTeachers = async () => {
    const { data } = await supabase
      .from('profiles').select('id, full_name').eq('role', 'teacher').order('full_name')
    setTeachers(data || [])
  }

  const fetchTimetable = async () => {
    let query = supabase
      .from('timetable')
      .select(`
        *,
        subject:subjects(id, name, code),
        teacher:profiles!timetable_teacher_id_fkey(full_name)
      `)
      .eq('class_id', selectedClass)
      .eq('semester', parseInt(selectedSemester))

    if (profile?.school_id) {
      query = query.eq('school_id', profile.school_id)
    }

    const { data } = await query
    setTimetable(data || [])
  }

  // Lấy ô timetable theo ngày & tiết
  const getCell = (day, period) =>
    timetable.find(t => t.day_of_week === day && t.period === period)

  // Màu theo subject
  const getSubjectColor = (subjectId) => {
    const idx = subjects.findIndex(s => s.id === subjectId)
    return SUBJECT_COLORS[idx % SUBJECT_COLORS.length] || SUBJECT_COLORS[0]
  }

  const handleCellClick = (day, period) => {
    if (profile?.role !== 'school_admin') return
    if (!selectedClass) return alert('Vui lòng chọn lớp trước!')
    const existing = getCell(day, period)
    setEditCell({ day, period, existing })
    setForm({
      subject_id: existing?.subject?.id || '',
      teacher_id: existing?.teacher_id || '',
      room: existing?.room || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.subject_id) return alert('Vui lòng chọn môn học!')
    setSaving(true)

    const academicYear = classes.find(c => c.id === selectedClass)?.academic_year || '2024-2025'

    if (editCell?.existing) {
      await supabase.from('timetable').update({
        subject_id: form.subject_id,
        teacher_id: form.teacher_id || null,
        room: form.room || null,
      }).eq('id', editCell.existing.id)
    } else {
      await supabase.from('timetable').insert({
        class_id: selectedClass,
        subject_id: form.subject_id,
        teacher_id: form.teacher_id || null,
        room: form.room || null,
        day_of_week: editCell.day,
        period: editCell.period,
        academic_year: academicYear,
        semester: parseInt(selectedSemester),
        school_id: profile?.school_id, // ← thêm
        })
    }

    await fetchTimetable()
    setShowModal(false)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!editCell?.existing) return
    await supabase.from('timetable').delete().eq('id', editCell.existing.id)
    await fetchTimetable()
    setShowModal(false)
  }

  // Thống kê số tiết mỗi môn
  const subjectStats = subjects.map(s => ({
    ...s,
    count: timetable.filter(t => t.subject_id === s.id).length
  })).filter(s => s.count > 0)

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
            <h2 className="text-2xl font-bold text-gray-800">📅 Thời khóa biểu</h2>
            <p className="text-gray-500 mt-1">
              {profile?.role === 'school_admin' ? 'Click vào ô để thêm/sửa lịch' : 'Lịch học theo tuần'}
            </p>
          </div>
        </div>

        {/* Bộ chọn */}
        <div className="bg-white rounded-2xl shadow-sm border p-5 mb-6">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">Lớp</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn lớp --</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    Lớp {cls.name} (Khối {cls.grade})
                  </option>
                ))}
              </select>
            </div>
            <div className="w-40">
              <label className="block text-sm font-medium text-gray-700 mb-2">Học kỳ</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">Học kỳ 1</option>
                <option value="2">Học kỳ 2</option>
              </select>
            </div>
            {selectedClass && timetable.length > 0 && (
              <div className="text-sm text-gray-500 pb-2">
                Tổng: <strong className="text-gray-800">{timetable.length}</strong> tiết/tuần
              </div>
            )}
          </div>
        </div>

        {/* Thống kê môn */}
        {selectedClass && subjectStats.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {subjectStats.map(s => (
              <span key={s.id} className={`text-xs px-3 py-1.5 rounded-xl border font-medium ${getSubjectColor(s.id)}`}>
                {s.name}: {s.count} tiết
              </span>
            ))}
          </div>
        )}

        {/* Bảng TKB */}
        {!selectedClass ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">📅</div>
            <p className="text-gray-500 text-lg">Chọn lớp để xem thời khóa biểu</p>
            {profile?.role === 'school_admin' && (
              <p className="text-gray-400 text-sm mt-2">Click vào ô trống để thêm lịch học</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-3 py-3 text-sm font-semibold text-gray-600 w-24 text-center">
                      Tiết
                    </th>
                    <th className="border border-gray-200 px-3 py-3 text-xs font-semibold text-gray-500 w-24 text-center">
                      Giờ học
                    </th>
                    {DAYS.map(day => (
                      <th key={day.value} className="border border-gray-200 px-3 py-3 text-sm font-semibold text-gray-700 text-center min-w-32">
                        {day.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERIODS.map(period => (
                    <tr key={period} className={period === 6 ? 'border-t-4 border-blue-200' : ''}>
                      <td className="border border-gray-200 px-3 py-3 text-center">
                        <span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold mx-auto">
                          {period}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-2 py-3 text-center text-xs text-gray-400">
                        {PERIOD_TIME[period]}
                      </td>
                      {DAYS.map(day => {
                        const cell = getCell(day.value, period)
                        return (
                          <td
                            key={day.value}
                            className={`border border-gray-200 px-2 py-2 text-center transition
                              ${profile?.role === 'school_admin' ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                            onClick={() => handleCellClick(day.value, period)}
                          >
                            {cell ? (
                              <div className={`rounded-xl border px-2 py-2 text-left ${getSubjectColor(cell.subject_id)}`}>
                                <p className="font-semibold text-xs leading-tight">{cell.subject?.name}</p>
                                {cell.teacher && (
                                  <p className="text-xs opacity-70 mt-0.5 truncate">{cell.teacher?.full_name}</p>
                                )}
                                {cell.room && (
                                  <p className="text-xs opacity-60 mt-0.5">📍 {cell.room}</p>
                                )}
                              </div>
                            ) : (
                              profile?.role === 'school_admin' && (
                                <div className="text-gray-300 text-lg hover:text-blue-400 transition">＋</div>
                              )
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Ghi chú */}
            <div className="p-4 border-t bg-gray-50 text-xs text-gray-400 flex gap-4">
              <span>• Tiết 1-5: Buổi sáng</span>
              <span>• Tiết 6-10: Buổi chiều</span>
              {profile?.role === 'school_admin' && <span>• Click ô để thêm/sửa/xóa lịch</span>}
            </div>
          </div>
        )}

      </div>

      {/* Modal thêm/sửa tiết học */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {editCell?.existing ? '✏️ Sửa tiết học' : '➕ Thêm tiết học'}
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              {DAYS.find(d => d.value === editCell?.day)?.label} — Tiết {editCell?.period} ({PERIOD_TIME[editCell?.period]})
            </p>

            <div className="space-y-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giáo viên</label>
                <select
                  value={form.teacher_id}
                  onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phòng học</label>
                <input
                  type="text"
                  placeholder="VD: A101, B205..."
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              {editCell?.existing && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition font-medium"
                >
                  🗑️ Xóa
                </button>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 border rounded-xl text-gray-600 hover:bg-gray-50 transition font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : '💾 Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}