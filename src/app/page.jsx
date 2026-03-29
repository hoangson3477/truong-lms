import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white text-lg">
              🏫
            </div>
            <span className="font-bold text-gray-900 text-lg">Trường LMS</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition"
            >
              Đăng nhập
            </Link>
            <Link
              href="/login"
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-100"
            >
              Bắt đầu →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">

        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-blue-50 rounded-full -translate-y-1/4 translate-x-1/3 opacity-60"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-50 rounded-full translate-y-1/3 -translate-x-1/4 opacity-60"></div>
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-blue-300 rounded-full -translate-x-1/2"></div>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-blue-200 rounded-full"
              style={{
                top: `${20 + i * 12}%`,
                left: `${10 + i * 8}%`,
              }}
            ></div>
          ))}
        </div>

        <div className="max-w-6xl mx-auto relative">
          <div className="max-w-3xl">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium px-4 py-2 rounded-full mb-8">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Hệ thống quản lý trường học hiện đại
            </div>

            <h1 className="text-5xl lg:text-6xl font-black text-gray-900 leading-tight mb-6">
              Quản lý trường học
              <span className="block text-blue-600 mt-1">thông minh hơn</span>
            </h1>

            <p className="text-xl text-gray-500 leading-relaxed mb-10 max-w-2xl">
              Nền tảng quản lý học sinh, giáo viên, điểm số và bài tập
              trong một hệ thống duy nhất. Đơn giản, nhanh chóng và hiệu quả.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/login"
                className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-200 flex items-center gap-2"
              >
                Đăng nhập hệ thống
                <span>→</span>
              </Link>
              <a
                href="#features"
                className="bg-gray-50 text-gray-700 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-100 transition border border-gray-200 flex items-center gap-2"
              >
                Tìm hiểu thêm
                <span>↓</span>
              </a>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-8 mt-14 pt-10 border-t border-gray-100">
              {[
                { value: '4', label: 'Loại tài khoản', sub: 'Admin, GV, HS, PH' },
                { value: '8+', label: 'Tính năng', sub: 'Hoàn chỉnh' },
                { value: '100%', label: 'Miễn phí', sub: 'Không giới hạn' },
              ].map(stat => (
                <div key={stat.label}>
                  <p className="text-3xl font-black text-gray-900">{stat.value}</p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">{stat.label}</p>
                  <p className="text-xs text-gray-400">{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-gray-900 mb-4">
              Đầy đủ tính năng bạn cần
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Từ quản lý lớp học đến bảng điểm, tất cả trong một nơi
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '🏫',
                title: 'Quản lý lớp học',
                desc: 'Tạo và quản lý lớp học theo năm học, phân công giáo viên chủ nhiệm, theo dõi sĩ số.',
                color: 'bg-blue-50 border-blue-100',
                iconBg: 'bg-blue-100',
              },
              {
                icon: '👨‍🎓',
                title: 'Quản lý học sinh',
                desc: 'Hồ sơ học sinh đầy đủ, phân lớp, theo dõi quá trình học tập và liên kết phụ huynh.',
                color: 'bg-green-50 border-green-100',
                iconBg: 'bg-green-100',
              },
              {
                icon: '📊',
                title: 'Bảng điểm thông minh',
                desc: 'Nhập điểm miệng, 15 phút, giữa kỳ, cuối kỳ. Tính điểm trung bình và xếp loại tự động.',
                color: 'bg-purple-50 border-purple-100',
                iconBg: 'bg-purple-100',
              },
              {
                icon: '📝',
                title: 'Bài tập & Nộp bài',
                desc: 'Giáo viên tạo bài tập, học sinh nộp bài online, chấm điểm và phản hồi trực tiếp.',
                color: 'bg-orange-50 border-orange-100',
                iconBg: 'bg-orange-100',
              },
              {
                icon: '✅',
                title: 'Điểm danh online',
                desc: 'Điểm danh theo ngày, theo lớp. Thống kê chuyên cần tự động, phụ huynh theo dõi được.',
                color: 'bg-teal-50 border-teal-100',
                iconBg: 'bg-teal-100',
              },
              {
                icon: '🔔',
                title: 'Thông báo realtime',
                desc: 'Gửi thông báo toàn trường hoặc theo lớp. Phụ huynh nhận thông tin về con em kịp thời.',
                color: 'bg-red-50 border-red-100',
                iconBg: 'bg-red-100',
              },
            ].map(feature => (
              <div
                key={feature.title}
                className={`rounded-2xl border-2 p-6 hover:shadow-lg transition ${feature.color}`}
              >
                <div className={`w-12 h-12 ${feature.iconBg} rounded-2xl flex items-center justify-center text-2xl mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-gray-900 mb-4">
              Dành cho mọi đối tượng
            </h2>
            <p className="text-gray-500 text-lg">Mỗi vai trò có giao diện và quyền hạn riêng</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: '👑',
                role: 'Quản trị viên',
                desc: 'Toàn quyền quản lý trường học, giáo viên, học sinh và hệ thống.',
                color: 'bg-purple-600',
                features: ['Quản lý toàn bộ', 'Thống kê tổng quan', 'Gửi thông báo', 'Phân quyền'],
              },
              {
                icon: '👨‍🏫',
                role: 'Giáo viên',
                desc: 'Quản lý lớp dạy, tạo bài tập, nhập điểm và điểm danh học sinh.',
                color: 'bg-blue-600',
                features: ['Tạo bài tập', 'Nhập điểm', 'Điểm danh', 'Chấm bài'],
              },
              {
                icon: '👨‍🎓',
                role: 'Học sinh',
                desc: 'Xem bài tập, nộp bài, theo dõi điểm số và nhận thông báo.',
                color: 'bg-green-600',
                features: ['Nộp bài', 'Xem điểm', 'Lịch học', 'Thông báo'],
              },
              {
                icon: '👨‍👩‍👧',
                role: 'Phụ huynh',
                desc: 'Theo dõi kết quả học tập, điểm danh và nhận thông báo về con.',
                color: 'bg-orange-600',
                features: ['Theo dõi điểm', 'Chuyên cần', 'Thông báo', 'Liên hệ GV'],
              },
            ].map(role => (
              <div key={role.role} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg transition">
                <div className={`${role.color} p-6 text-white`}>
                  <div className="text-4xl mb-3">{role.icon}</div>
                  <h3 className="font-bold text-lg">{role.role}</h3>
                  <p className="text-white/80 text-sm mt-1 leading-relaxed">{role.desc}</p>
                </div>
                <div className="p-4 space-y-2">
                  {role.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></span>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gradient-to-br from-blue-600 to-indigo-700 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full"></div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/5 rounded-full"></div>
        </div>
        <div className="max-w-2xl mx-auto text-center relative">
          <h2 className="text-4xl font-black text-white mb-4">
            Sẵn sàng bắt đầu?
          </h2>
          <p className="text-blue-100 text-lg mb-10">
            Đăng nhập ngay để trải nghiệm hệ thống quản lý trường học hiện đại.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-3 bg-white text-blue-600 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-blue-50 transition shadow-2xl"
          >
            <span>🏫</span>
            Đăng nhập ngay
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-gray-900 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            🏫
          </div>
          <span className="font-bold text-white">Trường LMS</span>
        </div>
        <p className="text-gray-400 text-sm">
          © 2025 Trường LMS. Xây dựng với Next.js + Supabase + Vercel
        </p>
      </footer>

    </div>
  )
}