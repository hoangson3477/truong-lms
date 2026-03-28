import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-8">
      <div className="text-center max-w-md">

        {/* Animated 404 */}
        <div className="relative mb-8">
          <div className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-5xl animate-bounce">🏫</div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-3">
          Trang không tìm thấy!
        </h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Có vẻ như trang bạn đang tìm không tồn tại hoặc đã bị di chuyển.
          Hãy quay lại trang chủ nhé!
        </p>

        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-200"
          >
            🏠 Về Dashboard
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 bg-white text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition border border-gray-200"
          >
            🔑 Đăng nhập
          </Link>
        </div>

        {/* Decorative dots */}
        <div className="flex justify-center gap-2 mt-12">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-blue-200"
              style={{ animationDelay: `${i * 0.1}s` }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  )
}