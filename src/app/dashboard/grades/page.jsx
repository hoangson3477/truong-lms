'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import LoadingPage from '@/components/Skeleton'
import { exportGradePDF, exportStudentGradePDF } from '@/lib/exportPDF'

const GRADE_TYPES = {
  mieng:    { label: 'Miệng',    short: 'M',  weight: 1, color: 'bg-yellow-50 text-yellow-700' },
  tx:       { label: '15 phút',  short: 'TX', weight: 1, color: 'bg-blue-50 text-blue-700' },
  giua_ky:  { label: 'Giữa kỳ', short: 'GK', weight: 2, color: 'bg-purple-50 text-purple-700' },
  cuoi_ky:  { label: 'Cuối kỳ', short: 'CK', weight: 3, color: 'bg-red-50 text-red-700' },
}

export default function GradesPage() {
  const [profile, setProfile] = useState(null)
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [students, setStudents] = useState([])
  const [grades, setGrades] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedSemester, setSelectedSemester] = useState('1')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editingCell, setEditingCell] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).maybeSingle()
      setProfile(profileData)
      await Promise.all([fetchClasses(), fetchSubjects()])
      setLoading(false)
    }
    getData()
  }, [])

  useEffect(() => {
    if (selectedClass) fetchStudents()
  }, [selectedClass])

  useEffect(() => {
    if (selectedClass && selectedSubject) fetchGrades()
  }, [selectedClass, selectedSubject, selectedSemester])

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

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select(`
        id, student_code,
        profile:profiles!students_profile_id_fkey(full_name)
      `)
      .eq('class_id', selectedClass)
      .order('student_code')

    // Filter theo school của user hiện tại
    if (profile?.school_id) {
      query = query.eq('school_id', profile.school_id)
    }
    setStudents(data || [])
  }

  const fetchGrades = async () => {
    const { data } = await supabase
      .from('grades')
      .select('*')
      .eq('class_id', selectedClass)
      .eq('subject_id', selectedSubject)
      .eq('semester', parseInt(selectedSemester))

    // Filter theo school của user hiện tại
    if (profile?.school_id) {
      query = query.eq('school_id', profile.school_id)
    }
    setGrades(data || [])
  }

  const handleExport = () => {
    if (!selectedClass || !selectedSubject) {
      return alert('Vui lòng chọn lớp và môn học!')
    }
    if (students.length === 0) {
      return alert('Không có học sinh để xuất!')
    }
    exportGradePDF({
      students,
      grades,
      className: classes.find(c => c.id === selectedClass)?.name || '',
      subjectName: subjects.find(s => s.id === selectedSubject)?.name || '',
      semester: selectedSemester,
      academicYear: classes.find(c => c.id === selectedClass)?.academic_year || '',
      school_id: profile?.school_id,
    })
  }

  const handleExportStudent = async (student) => {
    const { data: studentGrades } = await supabase
      .from('grades')
      .select(`*, subject:subjects(name)`)
      .eq('student_id', student.id)
      .eq('class_id', selectedClass)

    exportStudentGradePDF({
      student: {
        full_name: student.profile?.full_name,
        student_code: student.student_code,
      },
      allGrades: studentGrades || [],
      className: classes.find(c => c.id === selectedClass)?.name || '',
      academicYear: classes.find(c => c.id === selectedClass)?.academic_year || '',
      school_id: profile?.school_id,
    })
  }

  // Lấy điểm của học sinh theo loại
  const getGrade = (studentId, gradeType) => {
    return grades.find(g =>
      g.student_id === studentId && g.grade_type === gradeType
    )
  }

  // Tính điểm trung bình môn
  const calcAverage = (studentId) => {
    const scores = []
    let totalWeight = 0
    let totalScore = 0

    Object.entries(GRADE_TYPES).forEach(([type, config]) => {
      const grade = getGrade(studentId, type)
      if (grade) {
        totalScore += grade.score * config.weight
        totalWeight += config.weight
        scores.push(grade.score)
      }
    })

    if (scores.length === 0) return null
    return (totalScore / totalWeight).toFixed(1)
  }

  // Xếp loại
  const getRank = (avg) => {
    if (!avg) return null
    const n = parseFloat(avg)
    if (n >= 8.5) return { label: 'Giỏi',   color: 'text-green-600' }
    if (n >= 7.0) return { label: 'Khá',    color: 'text-blue-600' }
    if (n >= 5.0) return { label: 'TB',     color: 'text-yellow-600' }
    return { label: 'Yếu', color: 'text-red-600' }
  }

  const handleCellClick = (studentId, gradeType) => {
    if (profile?.role === 'student') return
    const existing = getGrade(studentId, gradeType)
    setEditingCell({ studentId, gradeType })
    setInputValue(existing?.score?.toString() || '')
  }

  const handleCellSave = async () => {
    if (!editingCell) return
    const { studentId, gradeType } = editingCell
    const score = parseFloat(inputValue)

    if (inputValue !== '' && (isNaN(score) || score < 0 || score > 10)) {
      alert('Điểm phải từ 0 đến 10!')
      return
    }

    setSaving(true)
    const existing = getGrade(studentId, gradeType)
    const academicYear = classes.find(c => c.id === selectedClass)?.academic_year || '2024-2025'

    if (existing) {
      if (inputValue === '') {
        await supabase.from('grades').delete().eq('id', existing.id)
      } else {
        await supabase.from('grades').update({ score }).eq('id', existing.id)
      }
    } else if (inputValue !== '') {
      await supabase.from('grades').insert({
        student_id: studentId,
        subject_id: selectedSubject,
        class_id: selectedClass,
        grade_type: gradeType,
        score,
        semester: parseInt(selectedSemester),
        academic_year: academicYear,
        school_id: profile?.school_id, // ← thêm
      })
    }

    await fetchGrades()
    setEditingCell(null)
    setInputValue('')
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCellSave()
    if (e.key === 'Escape') setEditingCell(null)
  }

  if (loading) return <LoadingPage />

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />

      <div className="flex-1 p-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">📊 Bảng điểm</h2>
            <p className="text-gray-500 mt-1">
              {profile?.role === 'student' ? 'Điểm số của bạn' : 'Nhập và quản lý điểm số'}
            </p>
          </div>
          <div className="flex gap-3">
            {saved && (
              <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-sm font-medium">
                ✅ Đã lưu điểm!
              </div>
            )}
            {selectedClass && selectedSubject && students.length > 0 && (
              <button
                onClick={handleExport}
                className="bg-green-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-green-700 transition flex items-center gap-2"
              >
                📄 Xuất PDF
              </button>
            )}
          </div>
        </div>

        {/* Bộ chọn */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lớp</label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value)
                  setStudents([])
                  setGrades([])
                }}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn lớp --</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>Lớp {cls.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Môn học</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn môn --</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
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
          </div>
        </div>

        {/* Hướng dẫn nhập điểm */}
        {selectedClass && selectedSubject && profile?.role !== 'student' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 text-sm text-blue-700">
            💡 Click vào ô điểm để nhập. Nhấn <strong>Enter</strong> để lưu, <strong>Esc</strong> để hủy.
          </div>
        )}

        {/* Bảng điểm */}
        {!selectedClass || !selectedSubject ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">📊</div>
            <p className="text-gray-500 text-lg">Chọn lớp và môn học để xem bảng điểm</p>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">👨‍🎓</div>
            <p className="text-gray-500">Lớp này chưa có học sinh nào</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">

            {/* Header bảng */}
            <div className="p-4 border-b bg-gray-50 flex items-center gap-3">
              <span className="font-semibold text-gray-700">
                {subjects.find(s => s.id === selectedSubject)?.name} —
                Lớp {classes.find(c => c.id === selectedClass)?.name} —
                HK{selectedSemester}
              </span>
              <div className="flex gap-2 ml-auto">
                {Object.entries(GRADE_TYPES).map(([key, config]) => (
                  <span key={key} className={`text-xs px-2 py-1 rounded-lg font-medium ${config.color}`}>
                    {config.short}: hệ số {config.weight}
                  </span>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 w-8">STT</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Họ và tên</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 w-20">Mã HS</th>
                    {Object.entries(GRADE_TYPES).map(([key, config]) => (
                      <th key={key} className="text-center px-4 py-3 text-sm font-semibold text-gray-600 w-24">
                        <div>{config.label}</div>
                        <div className="text-xs font-normal text-gray-400">hệ số {config.weight}</div>
                      </th>
                    ))}
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600 w-20">TB</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600 w-20">Xếp loại</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600 w-20">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map((student, index) => {
                    const avg = calcAverage(student.id)
                    const rank = getRank(avg)
                    return (
                      <tr key={student.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-gray-400 text-sm">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {student.profile?.full_name}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                            {student.student_code}
                          </span>
                        </td>

                        {/* Ô điểm */}
                        {Object.entries(GRADE_TYPES).map(([type, config]) => {
                          const grade = getGrade(student.id, type)
                          const isEditing = editingCell?.studentId === student.id &&
                            editingCell?.gradeType === type
                          return (
                            <td key={type} className="px-4 py-3 text-center">
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="0" max="10" step="0.5"
                                  value={inputValue}
                                  onChange={(e) => setInputValue(e.target.value)}
                                  onKeyDown={handleKeyDown}
                                  onBlur={handleCellSave}
                                  autoFocus
                                  className="w-16 px-2 py-1 border-2 border-blue-500 rounded-lg text-center text-sm focus:outline-none"
                                />
                              ) : (
                                <div
                                  onClick={() => handleCellClick(student.id, type)}
                                  className={`inline-block min-w-12 px-3 py-1.5 rounded-xl text-sm font-medium transition
                                    ${grade
                                      ? config.color
                                      : profile?.role !== 'student'
                                        ? 'bg-gray-50 text-gray-300 hover:bg-gray-100 cursor-pointer'
                                        : 'text-gray-300'
                                    }`}
                                >
                                  {grade ? grade.score : (profile?.role !== 'student' ? '＋' : '—')}
                                </div>
                              )}
                            </td>
                          )
                        })}

                        {/* Điểm TB */}
                        <td className="px-4 py-3 text-center">
                          {avg ? (
                            <span className={`font-bold text-lg ${rank?.color}`}>{avg}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        {/* Xếp loại */}
                        <td className="px-4 py-3 text-center">
                          {rank ? (
                            <span className={`font-semibold text-sm ${rank.color}`}>
                              {rank.label}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        {/* Xuất PDF */}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleExportStudent(student)}
                            className="px-2 py-1 bg-green-50 text-green-600 rounded-lg text-xs hover:bg-green-100 transition font-medium"
                            title="Xuất bảng điểm cá nhân"
                          >
                            📄
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer thống kê */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex gap-6 text-sm text-gray-600">
                {['Giỏi', 'Khá', 'TB', 'Yếu'].map(rank => {
                  const count = students.filter(s => {
                    const avg = calcAverage(s.id)
                    return getRank(avg)?.label === rank
                  }).length
                  return (
                    <span key={rank}>
                      <strong>{rank}:</strong> {count} học sinh
                    </span>
                  )
                })}
                <span className="ml-auto text-gray-400">
                  {profile?.role !== 'student' && '💡 Click ô điểm để chỉnh sửa'}
                </span>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}