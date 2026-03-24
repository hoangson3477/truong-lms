'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

const TARGET_CONFIG = {
  all:     { label: 'Toàn trường', icon: '🏫', bg: 'bg-blue-50',   text: 'text-blue-700' },
  class:   { label: 'Theo lớp',   icon: '📚', bg: 'bg-purple-50', text: 'text-purple-700' },
  student: { label: 'Học sinh',   icon: '👨‍🎓', bg: 'bg-green-50',  text: 'text-green-700' },
  parent:  { label: 'Phụ huynh', icon: '👨‍👩‍👧', bg: 'bg-orange-50', text: 'text-orange-700' },
}

export default function NotificationsPage() {
  const [profile, setProfile] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [form, setForm] = useState({
    title: '', content: '', target_type: 'all', target_id: ''
  })
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      setProfile(profileData)
      await Promise.all([fetchNotifications(), fetchClasses()])
      setLoading(false)
    }
    getData()
  }, [])

  const fetchNotifications = async () => {
    await new Promise(resolve => setTimeout(resolve, 300))
    const { data } = await supabase
      .from('notifications')
      .select(`
        *,
        sender:profiles!notifications_sender_id_fkey(full_name, role)
      `)
      .order('created_at', { ascending: false })
    setNotifications([...(data || [])])
  }

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('grade')
    setClasses(data || [])
  }

  const handleSubmit = async () => {
    if (!form.title || !form.content) {
      return alert('Vui lòng điền tiêu đề và nội dung!')
    }
    if (form.target_type === 'class' && !form.target_id) {
      return alert('Vui lòng chọn lớp!')
    }
    setSaving(true)

    const { error } = await supabase.from('notifications').insert({
      title: form.title,
      content: form.content,
      sender_id: profile.id,
      target_type: form.target_type,
      target_id: form.target_id || null,
      is_read: false,
    })

    if (error) {
      alert('Lỗi: ' + error.message)
    } else {
      setShowModal(false)
      setForm({ title: '', content: '', target_type: 'all', target_id: '' })
      await fetchNotifications()
    }
    setSaving(false)
  }

  const handleMarkRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    await fetchNotifications()
  }

  const handleDelete = async (id) => {
    if (!confirm('Xóa thông báo này?')) return
    await supabase.from('notifications').delete().eq('id', id)
    await fetchNotifications()
  }

  const filtered = notifications.filter(n =>
    filterType === 'all' ? true : n.target_type === filterType
  )

  const unreadCount = notifications.filter(n => !n.is_read).length

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
            <h2 className="text-2xl font-bold text-gray-800">
              🔔 Thông báo
              {unreadCount > 0 && (
                <span className="ml-2 text-sm bg-red-500 text-white px-2 py-0.5 rounded-full">
                  {unreadCount} mới
                </span>
              )}
            </h2>
            <p className="text-gray-500 mt-1">Tổng cộng {notifications.length} thông báo</p>
          </div>
          {(profile?.role === 'admin' || profile?.role === 'teacher') && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-blue-700 transition"
            >
              ＋ Gửi thông báo
            </button>
          )}
        </div>

        {/* Bộ lọc */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'class', label: '📚 Theo lớp' },
            { key: 'student', label: '👨‍🎓 Học sinh' },
            { key: 'parent', label: '👨‍👩‍👧 Phụ huynh' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition border
                ${filterType === f.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Danh sách thông báo */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">🔔</div>
            <p className="text-gray-500 text-lg">Chưa có thông báo nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((notif) => {
              const targetConfig = TARGET_CONFIG[notif.target_type] || TARGET_CONFIG.all
              return (
                <div
                  key={notif.id}
                  className={`bg-white rounded-2xl shadow-sm border p-6 transition
                    ${!notif.is_read ? 'border-l-4 border-l-blue-500' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">

                      {/* Title + badge */}
                      <div className="flex items-center gap-3 mb-2">
                        {!notif.is_read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                        )}
                        <h3 className={`font-bold text-gray-800 ${!notif.is_read ? 'text-blue-900' : ''}`}>
                          {notif.title}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${targetConfig.bg} ${targetConfig.text}`}>
                          {targetConfig.icon} {targetConfig.label}
                        </span>
                      </div>

                      {/* Nội dung */}
                      <p className="text-gray-600 text-sm mb-3 whitespace-pre-line leading-relaxed">
                        {notif.content}
                      </p>

                      {/* Meta */}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>👤 {notif.sender?.full_name}</span>
                        <span>🕐 {new Date(notif.created_at).toLocaleString('vi-VN', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 ml-4">
                      {!notif.is_read && (
                        <button
                          onClick={() => handleMarkRead(notif.id)}
                          className="px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-medium hover:bg-blue-100 transition"
                        >
                          ✓ Đánh dấu đọc
                        </button>
                      )}
                      {(profile?.role === 'admin' || notif.sender_id === profile?.id) && (
                        <button
                          onClick={() => handleDelete(notif.id)}
                          className="px-3 py-2 bg-red-50 text-red-500 rounded-xl text-xs font-medium hover:bg-red-100 transition"
                        >
                          🗑️ Xóa
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* Modal gửi thông báo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-6">📢 Gửi thông báo mới</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Thông báo nghỉ lễ 30/4"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nội dung <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Nội dung thông báo..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gửi đến
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(TARGET_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setForm({ ...form, target_type: key, target_id: '' })}
                      className={`px-4 py-3 rounded-xl border text-sm font-medium transition text-left
                        ${form.target_type === key
                          ? `${config.bg} ${config.text} border-current`
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                      {config.icon} {config.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.target_type === 'class' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chọn lớp <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.target_id}
                    onChange={(e) => setForm({ ...form, target_id: e.target.value })}
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
              )}
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
                {saving ? 'Đang gửi...' : '📢 Gửi thông báo'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}