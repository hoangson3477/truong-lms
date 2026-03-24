'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'

export default function StudentDetailPage() {
  const [profile, setProfile] = useState(null)
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const { id } = useParams()
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      setProfile(profileData)

      const { data: studentData } = await supabase
        .from('students')
        .select(`
          *,
          profile:profiles(full_name, email, phone),
          class:classes(name, grade, academic_year)
        `)
        .eq('id', id)
        .single()
      setStudent(studentData)
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
          <Link href="/dashboard/students" className="hover:text-blue-600">Học sinh</Link>
          <span>→</span>
          <span className="text-gray-800 font-medium">{student?.profile?.full_name}</span>
        </div>

        <div className="grid grid-cols-3 gap-6">

          {/* Thông tin cá nhân */}
          <div className="col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
                {student?.profile?.full_name?.charAt(0)}
              </div>
              <h3 className="text-xl font-bold text-gray-800">{student?.profile?.full_name}</h3>
              <p className="text-gray-500 text-sm mt-1">{student?.profile?.email}</p>
              <span className="inline-block mt-3 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                Học sinh
              </span>

              <div className="mt-6 space-y-3 text-left">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Mã học sinh</span>
                  <span className="font-mono font-medium text-blue-600">{student?.student_code}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Lớp</span>
                  <span className="font-medium">{student?.class?.name || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Khối</span>
                  <span className="font-medium">{student?.class?.grade || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Năm học</span>
                  <span className="font-medium">{student?.class?.academic_year || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Ngày sinh</span>
                  <span className="font-medium">
                    {student?.date_of_birth
                      ? new Date(student.date_of_birth).toLocaleDateString('vi-VN')
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Địa chỉ</span>
                  <span className="font-medium text-right">{student?.address || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bên phải - sắp có */}
          <div className="col-span-2 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h4 className="font-bold text-gray-800 mb-4">📊 Bảng điểm</h4>
              <div className="text-center py-8 text-gray-400">
                <div className="text-3xl mb-2">📊</div>
                <p>Chức năng sắp ra mắt</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h4 className="font-bold text-gray-800 mb-4">✅ Điểm danh gần đây</h4>
              <div className="text-center py-8 text-gray-400">
                <div className="text-3xl mb-2">✅</div>
                <p>Chức năng sắp ra mắt</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}