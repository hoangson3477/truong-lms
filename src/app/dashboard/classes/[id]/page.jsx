'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'

export default function ClassDetailPage() {
  const [profile, setProfile] = useState(null)
  const [cls, setCls] = useState(null)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      setProfile(profileData)

      // Lấy thông tin lớp
      const { data: classData } = await supabase
        .from('classes')
        .select(`*, homeroom_teacher:profiles(full_name)`)
        .eq('id', id)
        .single()
      setCls(classData)

      // Lấy danh sách học sinh
      const { data: studentData } = await supabase
        .from('students')
        .select(`*, profile:profiles(full_name, email)`)
        .eq('class_id', id)
        .order('student_code')
      setStudents(studentData || [])

      setLoading(false)
    }
    getData()
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Đang tải...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />

      <div className="flex-1 p-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/dashboard/classes" className="hover:text-blue-600">Lớp học</Link>
          <span>→</span>
          <span className="text-gray-800 font-medium">Lớp {cls?.name}</span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Lớp {cls?.name}</h2>
              <div className="flex gap-4 mt-3 text-sm text-gray-600">
                <span>📚 Khối {cls?.grade}</span>
                <span>📅 {cls?.academic_year}</span>
                <span>👨‍🏫 GVCN: {cls?.homeroom_teacher?.full_name || 'Chưa phân công'}</span>
                <span>👨‍🎓 {students.length} học sinh</span>
              </div>
            </div>
          </div>
        </div>

        {/* Danh sách học sinh */}
        <div className="bg-white rounded-2xl shadow-sm border">
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-lg">👨‍🎓 Danh sách học sinh</h3>
          </div>

          {students.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-4xl mb-3">👨‍🎓</div>
              <p className="text-gray-500">Chưa có học sinh trong lớp này</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">STT</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Mã HS</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Họ và tên</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Email</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Ngày sinh</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map((student, index) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-gray-500 text-sm">{index + 1}</td>
                      <td className="px-6 py-4 font-mono text-sm text-blue-600">{student.student_code}</td>
                      <td className="px-6 py-4 font-medium text-gray-800">{student.profile?.full_name}</td>
                      <td className="px-6 py-4 text-gray-500 text-sm">{student.profile?.email}</td>
                      <td className="px-6 py-4 text-gray-500 text-sm">
                        {student.date_of_birth
                          ? new Date(student.date_of_birth).toLocaleDateString('vi-VN')
                          : 'Chưa cập nhật'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}