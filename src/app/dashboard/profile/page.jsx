'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import LoadingPage from '@/components/Skeleton'

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('info')

  // Form cập nhật thông tin
  const [infoForm, setInfoForm] = useState({ full_name: '', phone: '' })
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoMsg, setInfoMsg] = useState('')

  // Form đổi mật khẩu
  const [pwForm, setPwForm] = useState({
    current_password: '', new_password: '', confirm_password: ''
  })
  const [savingPw, setSavingPw] = useState(false)
  const [pwMsg, setPwMsg] = useState('')
  const [pwError, setPwError] = useState('')

  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).maybeSingle()
      setProfile(profileData)
      setInfoForm({
        full_name: profileData?.full_name || '',
        phone: profileData?.phone || ''
      })
      setLoading(false)
    }
    getData()
  }, [])

  const handleSaveInfo = async () => {
    if (!infoForm.full_name) return setInfoMsg('❌ Vui lòng nhập họ tên!')
    setSavingInfo(true)
    setInfoMsg('')

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: infoForm.full_name,
        phone: infoForm.phone || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    if (error) {
      setInfoMsg('❌ Lỗi: ' + error.message)
    } else {
      setProfile({ ...profile, ...infoForm })
      setInfoMsg('✅ Cập nhật thông tin thành công!')
      setTimeout(() => setInfoMsg(''), 3000)
    }
    setSavingInfo(false)
  }

  const handleChangePassword = async () => {
    setPwMsg('')
    setPwError('')

    if (!pwForm.new_password || !pwForm.confirm_password) {
      return setPwError('❌ Vui lòng điền đầy đủ!')
    }
    if (pwForm.new_password.length < 6) {
      return setPwError('❌ Mật khẩu mới phải tối thiểu 6 ký tự!')
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      return setPwError('❌ Mật khẩu xác nhận không khớp!')
    }

    setSavingPw(true)

    const { error } = await supabase.auth.updateUser({
      password: pwForm.new_password
    })

    if (error) {
      setPwError('❌ Lỗi: ' + error.message)
    } else {
      setPwMsg('✅ Đổi mật khẩu thành công!')
      setPwForm({ current_password: '', new_password: '', confirm_password: '' })
      setTimeout(() => setPwMsg(''), 3000)
    }
    setSavingPw(false)
  }

  const roleLabel = {
    admin: 'Quản trị viên', teacher: 'Giáo viên',
    student: 'Học sinh', parent: 'Phụ huynh'
  }
  const roleBg = {
    admin: 'bg-purple-100 text-purple-700',
    teacher: 'bg-blue-100 text-blue-700',
    student: 'bg-green-100 text-green-700',
    parent: 'bg-orange-100 text-orange-700',
  }

  if (loading) return <LoadingPage />

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />

      <div className="flex-1 p-8">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <h2 className="text-2xl font-bold text-gray-800 mb-6">👤 Tài khoản của tôi</h2>

          {/* Profile card */}
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
                {profile?.full_name?.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">{profile?.full_name}</h3>
                <p className="text-gray-500 text-sm mt-1">{profile?.email}</p>
                <span className={`inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full ${roleBg[profile?.role]}`}>
                  {roleLabel[profile?.role]}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {[
              { key: 'info', label: '📝 Thông tin cá nhân' },
              { key: 'password', label: '🔒 Đổi mật khẩu' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition border
                  ${activeTab === tab.key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Thông tin cá nhân */}
          {activeTab === 'info' && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="font-bold text-gray-800 text-lg mb-5">📝 Cập nhật thông tin</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={infoForm.full_name}
                    onChange={(e) => setInfoForm({ ...infoForm, full_name: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile?.email}
                    disabled
                    className="w-full px-4 py-3 border rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">Email không thể thay đổi</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    placeholder="0901234567"
                    value={infoForm.phone}
                    onChange={(e) => setInfoForm({ ...infoForm, phone: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {infoMsg && (
                <div className={`mt-4 px-4 py-3 rounded-xl text-sm font-medium
                  ${infoMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {infoMsg}
                </div>
              )}

              <button
                onClick={handleSaveInfo}
                disabled={savingInfo}
                className="mt-5 w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {savingInfo ? 'Đang lưu...' : '💾 Lưu thay đổi'}
              </button>
            </div>
          )}

          {/* Tab: Đổi mật khẩu */}
          {activeTab === 'password' && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="font-bold text-gray-800 text-lg mb-5">🔒 Đổi mật khẩu</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mật khẩu mới <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Tối thiểu 6 ký tự"
                    value={pwForm.new_password}
                    onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Nhập lại mật khẩu mới"
                    value={pwForm.confirm_password}
                    onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {pwError && (
                <div className="mt-4 px-4 py-3 rounded-xl text-sm font-medium bg-red-50 text-red-700">
                  {pwError}
                </div>
              )}
              {pwMsg && (
                <div className="mt-4 px-4 py-3 rounded-xl text-sm font-medium bg-green-50 text-green-700">
                  {pwMsg}
                </div>
              )}

              <button
                onClick={handleChangePassword}
                disabled={savingPw}
                className="mt-5 w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {savingPw ? 'Đang đổi...' : '🔒 Đổi mật khẩu'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}