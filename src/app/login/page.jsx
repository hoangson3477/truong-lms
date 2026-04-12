'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email hoặc mật khẩu không đúng!')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">

      {/* Left panel - decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden flex-col justify-between p-12">

        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full"></div>
          <div className="absolute top-1/2 -left-20 w-72 h-72 bg-white/5 rounded-full"></div>
          <div className="absolute -bottom-20 right-20 w-64 h-64 bg-white/5 rounded-full"></div>
          <div className="absolute top-20 left-1/3 w-2 h-32 bg-white/10 rounded-full"></div>
          <div className="absolute top-40 left-1/2 w-2 h-20 bg-white/10 rounded-full"></div>
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-2xl">
              🏫
            </div>
            <span className="text-white font-bold text-xl">Trường LMS</span>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Hệ thống quản lý<br/>
            <span className="text-blue-200">trường học thông minh</span>
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed">
            Quản lý học sinh, giáo viên, điểm số và bài tập trong một nền tảng duy nhất.
          </p>

          {/* Feature list */}
          <div className="mt-8 space-y-3">
            {[
              '✅ Quản lý lớp học & học sinh',
              '📊 Bảng điểm thông minh',
              '📝 Bài tập & nộp bài online',
              '🔔 Thông báo realtime',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-blue-100">
                <div className="w-1.5 h-1.5 bg-blue-300 rounded-full flex-shrink-0"></div>
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 text-blue-300 text-sm">
          © 2025 Trường LMS. Được xây dựng với ❤️
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="text-5xl mb-2">🏫</div>
            <h1 className="text-2xl font-bold text-gray-800">Trường LMS</h1>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800">Đăng nhập</h2>
              <p className="text-gray-400 mt-1 text-sm">Nhập thông tin tài khoản để tiếp tục</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">📧</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@truong.edu.vn"
                    required
                    className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mật khẩu
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-11 pr-12 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-gray-50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
                  <span>⚠️</span> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Đang đăng nhập...
                  </span>
                ) : 'Đăng nhập →'}
              </button>
            </form>

            {/* Role hints */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center mb-3">Tài khoản demo</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { role: 'Quản trị nhà trường', color: 'bg-purple-50 text-purple-700' },
                  { role: 'Giáo viên', color: 'bg-blue-50 text-blue-700' },
                  { role: 'Học sinh', color: 'bg-green-50 text-green-700' },
                  { role: 'Phụ huynh', color: 'bg-orange-50 text-orange-700' },
                ].map(r => (
                  <div key={r.role} className={`${r.color} text-xs px-3 py-1.5 rounded-lg text-center font-medium`}>
                    {r.role}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}