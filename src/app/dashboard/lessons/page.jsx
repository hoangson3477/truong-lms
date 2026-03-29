'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'

export default function LessonsPage() {
  const [profile, setProfile] = useState(null)
  const [lessons, setLessons] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [uploadFile, setUploadFile] = useState(null)
  const [form, setForm] = useState({
    title: '', description: '', content: '',
    youtube_url: '', class_id: '', subject_id: '', is_public: false
  })
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      setProfile(profileData)
      await Promise.all([fetchLessons(profileData), fetchClasses(), fetchSubjects()])
      setLoading(false)
    }
    getData()
  }, [])

  const fetchLessons = async (profileData) => {
    await new Promise(r => setTimeout(r, 300))
    let query = supabase
      .from('lessons')
      .select(`
        *,
        teacher:profiles!lessons_teacher_id_fkey(full_name),
        class:classes(name, grade),
        subject:subjects(name, code)
      `)
      .order('created_at', { ascending: false })

    if (profileData?.role === 'teacher') {
      query = query.eq('teacher_id', profileData.id)
    }

    const { data } = await query
    setLessons([...(data || [])])
  }

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('grade')
    setClasses(data || [])
  }

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').order('name')
    setSubjects(data || [])
  }

  const getYoutubeId = (url) => {
    const match = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    return match ? match[1] : null
  }

  const handleSubmit = async () => {
    if (!form.title) return alert('Vui lòng nhập tiêu đề!')
    setSaving(true)

    let file_url = null
    let file_name = null

    // Upload file nếu có
    if (uploadFile) {
      const fileName = `${profile.id}/${Date.now()}_${uploadFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('lessons')
        .upload(fileName, uploadFile, { upsert: true })

      if (uploadError) {
        alert('Lỗi upload file: ' + uploadError.message)
        setSaving(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('lessons')
        .getPublicUrl(fileName)
      file_url = urlData.publicUrl
      file_name = uploadFile.name
    }

    const { error } = await supabase.from('lessons').insert({
      title: form.title,
      description: form.description || null,
      content: form.content || null,
      youtube_url: form.youtube_url || null,
      file_url,
      file_name,
      teacher_id: profile.id,
      class_id: form.class_id || null,
      subject_id: form.subject_id || null,
      is_public: form.is_public,
    })

    if (error) {
      alert('Lỗi: ' + error.message)
    } else {
      setShowModal(false)
      setForm({ title: '', description: '', content: '', youtube_url: '', class_id: '', subject_id: '', is_public: false })
      setUploadFile(null)
      await fetchLessons(profile)
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Xóa bài giảng này?')) return
    await supabase.from('lessons').delete().eq('id', id)
    await fetchLessons(profile)
  }

  const filtered = lessons.filter(l => {
    const matchSearch = l.title?.toLowerCase().includes(search.toLowerCase())
    const matchClass = filterClass ? l.class_id === filterClass : true
    const matchSubject = filterSubject ? l.subject_id === filterSubject : true
    return matchSearch && matchClass && matchSubject
  })

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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />

      <div className="flex-1 p-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">📖 Bài giảng</h2>
            <p className="text-gray-500 mt-1">Tổng cộng {lessons.length} bài giảng</p>
          </div>
          {(profile?.role === 'teacher' || profile?.role === 'admin') && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-blue-700 transition"
            >
              ＋ Đăng bài giảng
            </button>
          )}
        </div>

        {/* Bộ lọc */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <input
            type="text"
            placeholder="🔍 Tìm bài giảng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Tất cả môn</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
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

        {/* Danh sách bài giảng */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">📖</div>
            <p className="text-gray-500 text-lg">Chưa có bài giảng nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((lesson) => {
              const ytId = getYoutubeId(lesson.youtube_url)
              return (
                <div key={lesson.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition group">

                  {/* YouTube thumbnail */}
                  {ytId && (
                    <div className="relative h-40 overflow-hidden bg-gray-100">
                      <img
                        src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                        alt={lesson.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white text-xl shadow-lg">
                          ▶
                        </div>
                      </div>
                    </div>
                  )}

                  {/* No thumbnail placeholder */}
                  {!ytId && (
                    <div className="h-24 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center text-4xl">
                      {lesson.file_name ? getFileIcon(lesson.file_name) : '📖'}
                    </div>
                  )}

                  <div className="p-5">
                    <Link href={`/dashboard/lessons/${lesson.id}`}>
                      <h3 className="font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition line-clamp-2 cursor-pointer">
                        {lesson.title}
                      </h3>
                    </Link>

                    {lesson.description && (
                      <p className="text-gray-500 text-sm mb-3 line-clamp-2">{lesson.description}</p>
                    )}

                    <div className="flex flex-wrap gap-2 mb-3">
                      {lesson.subject && (
                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-lg font-medium">
                          📚 {lesson.subject.name}
                        </span>
                      )}
                      {lesson.class && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-medium">
                          🏫 Lớp {lesson.class.name}
                        </span>
                      )}
                      {lesson.is_public && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-lg font-medium">
                          🌐 Công khai
                        </span>
                      )}
                    </div>

                    {/* Icons loại nội dung */}
                    <div className="flex gap-2 mb-3">
                      {lesson.content && <span title="Có nội dung text" className="text-lg">📝</span>}
                      {lesson.youtube_url && <span title="Có video" className="text-lg">🎬</span>}
                      {lesson.file_url && <span title={lesson.file_name} className="text-lg">{getFileIcon(lesson.file_name)}</span>}
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="text-xs text-gray-400">
                        👨‍🏫 {lesson.teacher?.full_name}
                      </span>
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/lessons/${lesson.id}`}
                          className="text-blue-500 text-xs hover:underline font-medium"
                        >
                          Xem →
                        </Link>
                        {(profile?.role === 'admin' || lesson.teacher_id === profile?.id) && (
                          <button
                            onClick={() => handleDelete(lesson.id)}
                            className="text-red-400 text-xs hover:text-red-600"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal đăng bài giảng */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-6">📖 Đăng bài giảng mới</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Bài 1 - Phương trình bậc nhất"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả ngắn</label>
                <input
                  type="text"
                  placeholder="Tóm tắt nội dung bài giảng..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Môn học</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lớp</label>
                  <select
                    value={form.class_id}
                    onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Tất cả lớp --</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>Lớp {cls.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📝 Nội dung bài giảng
                </label>
                <textarea
                  rows={4}
                  placeholder="Soạn nội dung bài giảng trực tiếp..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🎬 Link YouTube
                </label>
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={form.youtube_url}
                  onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {form.youtube_url && getYoutubeId(form.youtube_url) && (
                  <div className="mt-2 rounded-xl overflow-hidden">
                    <img
                      src={`https://img.youtube.com/vi/${getYoutubeId(form.youtube_url)}/hqdefault.jpg`}
                      className="w-full h-32 object-cover rounded-xl"
                      alt="YouTube preview"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📎 Upload file (PDF, Word, PowerPoint)
                </label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {uploadFile && (
                  <p className="text-sm text-blue-600 mt-1">✅ {uploadFile.name}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={form.is_public}
                  onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                  className="w-4 h-4 accent-blue-600"
                />
                <label htmlFor="is_public" className="text-sm text-gray-700">
                  🌐 Công khai — Tất cả học sinh đều xem được (không giới hạn lớp)
                </label>
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
                {saving ? 'Đang đăng...' : '📖 Đăng bài giảng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}