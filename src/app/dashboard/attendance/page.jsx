'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import LoadingPage from '@/components/Skeleton'

const STATUS_CONFIG = {
  present:  { label: 'Có mặt',   bg: 'bg-green-100',  text: 'text-green-700',  icon: '✅' },
  absent:   { label: 'Vắng mặt', bg: 'bg-red-100',    text: 'text-red-700',    icon: '❌' },
  late:     { label: 'Đi trễ',   bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '⏰' },
  excused:  { label: 'Có phép',  bg: 'bg-blue-100',   text: 'text-blue-700',   icon: '📋' },
}

export default function AttendancePage() {
  const [profile, setProfile] = useState(null)
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
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

  useEffect(() => {
    if (selectedClass) {
      fetchStudents()
    }
  }, [selectedClass])

  useEffect(() => {
    if (selectedClass && selectedDate) {
      fetchAttendance()
    }
  }, [selectedClass, selectedDate])

  const fetchClasses = async () => {
    let query = supabase.from('classes').select('*').order('grade')
    if (profile?.school_id) {
      query = query.eq('school_id', profile.school_id)
    }
    const { data } = await query
    setClasses(data || [])
  }

  const fetchStudents = async () => {
    let query = supabase
      .from('students')
      .select(`
        id, student_code,
        profile:profiles!students_profile_id_fkey(full_name)
      `)
      .eq('class_id', selectedClass)
      .order('student_code')

    if (profile?.school_id) {
      query = query.eq('school_id', profile.school_id)
    }

    const { data } = await query
    setStudents(data || [])
  }

  const fetchAttendance = async () => {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('class_id', selectedClass)
      .eq('date', selectedDate)

    // Chuyển thành object { student_id: { status, note, id } }
    const map = {}
    data?.forEach(a => {
      map[a.student_id] = { status: a.status, note: a.note, id: a.id }
    })
    setAttendance(map)
  }

  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }))
    setSaved(false)
  }

  const handleNoteChange = (studentId, note) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], note }
    }))
    setSaved(false)
  }

  const handleSave = async () => {
    if (!selectedClass || !selectedDate) return alert('Vui lòng chọn lớp và ngày!')
    setSaving(true)

    for (const student of students) {
      const record = attendance[student.id]
      if (!record?.status) continue

      const existing = attendance[student.id]?.id

      if (existing) {
        await supabase.from('attendance').update({
          status: record.status,
          note: record.note || null,
        }).eq('id', existing)
      } else {
        await supabase.from('attendance').insert({
          student_id: student.id,
          class_id: selectedClass,
          date: selectedDate,
          status: record.status,
          note: record.note || null,
          // attendance không cần school_id vì đã link qua student + class
        })
      }
    }

    await fetchAttendance()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  // Thống kê nhanh
  const stats = {
    present: Object.values(attendance).filter(a => a.status === 'present').length,
    absent: Object.values(attendance).filter(a => a.status === 'absent').length,
    late: Object.values(attendance).filter(a => a.status === 'late').length,
    excused: Object.values(attendance).filter(a => a.status === 'excused').length,
  }

  // Điểm danh tất cả có mặt
  const markAllPresent = () => {
    const newAttendance = { ...attendance }
    students.forEach(s => {
      newAttendance[s.id] = { ...newAttendance[s.id], status: 'present' }
    })
    setAttendance(newAttendance)
    setSaved(false)
  }

  if (loading) return <LoadingPage />

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />

      <div className="flex-1 p-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">✅ Điểm danh</h2>
            <p className="text-gray-500 mt-1">Quản lý chuyên cần học sinh</p>
          </div>
          {saved && (
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-sm font-medium">
              ✅ Đã lưu điểm danh!
            </div>
          )}
        </div>

        {/* Bộ chọn lớp & ngày */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chọn lớp
              </label>
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

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày điểm danh
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {selectedClass && students.length > 0 && (
              <button
                onClick={markAllPresent}
                className="px-5 py-3 bg-green-50 text-green-700 border border-green-200 rounded-xl font-medium hover:bg-green-100 transition whitespace-nowrap"
              >
                ✅ Tất cả có mặt
              </button>
            )}
          </div>
        </div>

        {/* Thống kê nhanh */}
        {selectedClass && students.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <div key={key} className={`${config.bg} rounded-2xl p-4 text-center`}>
                <div className="text-2xl mb-1">{config.icon}</div>
                <div className={`text-2xl font-bold ${config.text}`}>
                  {stats[key]}
                </div>
                <div className={`text-sm ${config.text} opacity-80`}>{config.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Bảng điểm danh */}
        {!selectedClass ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-gray-500 text-lg">Chọn lớp để bắt đầu điểm danh</p>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">👨‍🎓</div>
            <p className="text-gray-500">Lớp này chưa có học sinh nào</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-800">
                📋 Danh sách điểm danh — {new Date(selectedDate).toLocaleDateString('vi-VN', {
                  weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
                })}
              </h3>
              <span className="text-gray-400 text-sm">{students.length} học sinh</span>
            </div>

            <div className="divide-y">
              {students.map((student, index) => {
                const record = attendance[student.id]
                return (
                  <div key={student.id} className="px-6 py-4 hover:bg-gray-50 transition">
                    <div className="flex items-center gap-4">

                      {/* STT + tên */}
                      <div className="w-8 text-gray-400 text-sm text-center">{index + 1}</div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{student.profile?.full_name}</p>
                        <p className="text-xs text-gray-400 font-mono">{student.student_code}</p>
                      </div>

                      {/* Nút trạng thái */}
                      <div className="flex gap-2">
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                          <button
                            key={key}
                            onClick={() => handleStatusChange(student.id, key)}
                            className={`px-3 py-2 rounded-xl text-xs font-medium transition border
                              ${record?.status === key
                                ? `${config.bg} ${config.text} border-current shadow-sm`
                                : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                              }`}
                          >
                            {config.icon} {config.label}
                          </button>
                        ))}
                      </div>

                      {/* Ghi chú */}
                      <input
                        type="text"
                        placeholder="Ghi chú..."
                        value={record?.note || ''}
                        onChange={(e) => handleNoteChange(student.id, e.target.value)}
                        className="w-36 px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                    </div>
                  </div>
                )
              })}
            </div>

            {/* Nút lưu */}
            <div className="p-6 border-t bg-gray-50 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? '⏳ Đang lưu...' : '💾 Lưu điểm danh'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}