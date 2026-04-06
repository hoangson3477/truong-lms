'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'

export default function LessonDetailPage() {
  const [profile, setProfile] = useState(null)
  const [lesson, setLesson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewStats, setViewStats] = useState(null)
  const { id } = useParams()
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      setProfile(profileData)

      const { data: lessonData } = await supabase
        .from('lessons')
        .select(`
          *,
          teacher:profiles!lessons_teacher_id_fkey(full_name, email),
          class:classes(name, grade),
          subject:subjects(name, code)
        `)
        .eq('id', id)
        .single()
      setLesson(lessonData)
      await fetchViewStats(lessonData)

      // Tăng view count
    await supabase.from('lessons')
    .update({ view_count: (lessonData?.view_count || 0) + 1 })
    .eq('id', id)

    // Nếu là học sinh, ghi nhận đã xem
    if (profileData?.role === 'student') {
    const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle()

    if (studentData) {
        await supabase.from('lesson_views').upsert({
        lesson_id: id,
        student_id: studentData.id,
        }, { onConflict: 'lesson_id,student_id' })
    }
    }

      setLoading(false)
    }
    getData()
  }, [id])

  const getYoutubeId = (url) => {
    const match = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    return match ? match[1] : null
  }

  const fetchViewStats = async (lessonData) => {
      if (!lessonData?.class_id) return
  
      const { data: allStudents } = await supabase
          .from('students')
          .select(`
          id, student_code,
          profile:profiles!students_profile_id_fkey(full_name)
          `)
          .eq('class_id', lessonData.class_id)
  
      const { data: views } = await supabase
          .from('lesson_views')
          .select('student_id, viewed_at')
          .eq('lesson_id', id)
  
      const viewedIds = new Set(views?.map(v => v.student_id))
      const viewed = allStudents?.filter(s => viewedIds.has(s.id)) || []
      const notViewed = allStudents?.filter(s => !viewedIds.has(s.id)) || []
  
      setViewStats({ viewed, notViewed, total: allStudents?.length || 0 })
      }

  const getFileIcon = (fileName) => {
    if (!fileName) return '📎'
    if (fileName.endsWith('.pdf')) return '📕'
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return '📘'
    if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) return '📙'
    return '📎'
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Đang tải...</p>
    </div>
  )

  if (!lesson) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Không tìm thấy bài giảng!</p>
    </div>
  )

  const ytId = getYoutubeId(lesson.youtube_url)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />

      <div className="flex-1 p-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/dashboard/lessons" className="hover:text-blue-600">Bài giảng</Link>
          <span>→</span>
          <span className="text-gray-800 font-medium line-clamp-1">{lesson.title}</span>
        </div>

        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-3">{lesson.title}</h1>
            {lesson.description && (
              <p className="text-gray-500 mb-4">{lesson.description}</p>
            )}
            <div className="flex flex-wrap gap-3 text-sm">
              {lesson.subject && (
                <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-lg font-medium">
                  📚 {lesson.subject.name}
                </span>
              )}
              {lesson.class && (
                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-medium">
                  🏫 Lớp {lesson.class.name}
                </span>
              )}
              {lesson.is_public && (
                <span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg font-medium">
                  🌐 Công khai
                </span>
              )}
              <span className="bg-gray-50 text-gray-600 px-3 py-1 rounded-lg">
                👁️ {lesson.view_count} lượt xem
              </span>
              <span className="bg-gray-50 text-gray-600 px-3 py-1 rounded-lg">
                👨‍🏫 {lesson.teacher?.full_name}
              </span>
              <span className="bg-gray-50 text-gray-600 px-3 py-1 rounded-lg">
                🕐 {new Date(lesson.created_at).toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>

          {/* Video YouTube */}
          {(lesson.youtube_url) && (
            <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
                <h3 className="font-bold text-gray-800 mb-4">🎬 Video bài giảng</h3>
                {ytId ? (
                // YouTube embed
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                    className="absolute inset-0 w-full h-full rounded-xl"
                    src={`https://www.youtube.com/embed/${ytId}`}
                    title={lesson.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    />
                </div>
                ) : (
                // Video URL trực tiếp (mp4, m3u8, ...)
                <video
                    controls
                    className="w-full rounded-xl bg-black"
                    style={{ maxHeight: '480px' }}
                    src={lesson.youtube_url}
                >
                    <source src={lesson.youtube_url} />
                    Trình duyệt của bạn không hỗ trợ phát video này.
                </video>
                )}
            </div>
            )}

          {/* Nội dung text */}
          {lesson.content && (
            <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
              <h3 className="font-bold text-gray-800 mb-4">📝 Nội dung bài giảng</h3>
              <div className="prose max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
                {lesson.content}
              </div>
            </div>
          )}

          {/* File đính kèm */}
          {lesson.file_url && (
            <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
              <h3 className="font-bold text-gray-800 mb-4">📎 Tài liệu đính kèm</h3>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getFileIcon(lesson.file_name)}</span>
                  <div>
                    <p className="font-medium text-gray-800">{lesson.file_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Nhấn để tải về</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={lesson.file_url}
                    target="_blank"
                    className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition"
                  >
                    👁️ Xem
                  </a>
                  <a
                    href={lesson.file_url}
                    download={lesson.file_name}
                    className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition"
                  >
                    ⬇️ Tải về
                  </a>
                </div>
              </div>
            </div>
          )}
          
          {/* Thống kê xem bài - chỉ giáo viên/admin */}
            {(profile?.role === 'teacher' || profile?.role === 'school_admin') && viewStats && lesson.class_id && (
            <div className="bg-white rounded-2xl shadow-sm border mb-6">
                <div className="p-6 border-b">
                <h3 className="font-bold text-gray-800 text-lg">👁️ Thống kê xem bài giảng</h3>
                <p className="text-gray-500 text-sm mt-1">
                    {viewStats.viewed.length}/{viewStats.total} học sinh đã xem
                </p>
                </div>

                {/* Progress bar */}
                <div className="px-6 py-4 border-b">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Tỷ lệ xem</span>
                    <span className="font-bold">
                    {viewStats.total > 0
                        ? Math.round((viewStats.viewed.length / viewStats.total) * 100)
                        : 0}%
                    </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{
                        width: `${viewStats.total > 0
                        ? (viewStats.viewed.length / viewStats.total) * 100
                        : 0}%`
                    }}
                    />
                </div>
                </div>

                <div className="grid grid-cols-2 divide-x">
                {/* Đã xem */}
                <div className="p-5">
                    <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Đã xem ({viewStats.viewed.length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                    {viewStats.viewed.length === 0 ? (
                        <p className="text-gray-400 text-sm">Chưa có ai xem</p>
                    ) : viewStats.viewed.map(s => (
                        <div key={s.id} className="flex items-center gap-2 text-sm">
                        <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-xs flex-shrink-0">
                            {s.profile?.full_name?.charAt(0)}
                        </div>
                        <span className="text-gray-700">{s.profile?.full_name}</span>
                        <span className="text-gray-400 font-mono text-xs">{s.student_code}</span>
                        </div>
                    ))}
                    </div>
                </div>

                {/* Chưa xem */}
                <div className="p-5">
                    <h4 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    Chưa xem ({viewStats.notViewed.length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                    {viewStats.notViewed.length === 0 ? (
                        <p className="text-gray-400 text-sm">Tất cả đã xem! 🎉</p>
                    ) : viewStats.notViewed.map(s => (
                        <div key={s.id} className="flex items-center gap-2 text-sm">
                        <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-xs flex-shrink-0">
                            {s.profile?.full_name?.charAt(0)}
                        </div>
                        <span className="text-gray-700">{s.profile?.full_name}</span>
                        <span className="text-gray-400 font-mono text-xs">{s.student_code}</span>
                        </div>
                    ))}
                    </div>
                </div>
                </div>
            </div>
            )}

          {/* Nút quay lại */}
          <Link
            href="/dashboard/lessons"
            className="inline-flex items-center gap-2 text-blue-500 hover:underline font-medium"
          >
            ← Quay lại danh sách bài giảng
          </Link>

        </div>
      </div>
    </div>
  )
}