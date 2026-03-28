export function SkeletonLine({ width = 'w-full', height = 'h-4' }) {
  return (
    <div className={`${width} ${height} bg-gray-200 rounded-lg animate-pulse`}></div>
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border p-6 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded-lg w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded-lg w-1/2"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded-lg"></div>
        <div className="h-3 bg-gray-200 rounded-lg w-5/6"></div>
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="bg-white rounded-2xl border overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b flex gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-4 bg-gray-200 rounded-lg flex-1 animate-pulse"></div>
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-6 py-4 border-b flex gap-4 items-center">
          <div className="w-8 h-4 bg-gray-100 rounded animate-pulse"></div>
          <div className="flex-1 h-4 bg-gray-100 rounded animate-pulse"></div>
          <div className="w-24 h-4 bg-gray-100 rounded animate-pulse"></div>
          <div className="w-32 h-4 bg-gray-100 rounded animate-pulse"></div>
          <div className="w-16 h-6 bg-gray-100 rounded-lg animate-pulse"></div>
        </div>
      ))}
    </div>
  )
}

export default function LoadingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar skeleton */}
      <div className="w-64 min-h-screen bg-white shadow-lg p-6 space-y-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse"></div>
          <div className="flex-1 space-y-1">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3"></div>
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse flex-1"></div>
          </div>
        ))}
      </div>

      {/* Main skeleton */}
      <div className="flex-1 p-8 space-y-6">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded-xl w-64 animate-pulse"></div>
          <div className="h-4 bg-gray-100 rounded-lg w-48 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border p-6 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-xl mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-4 bg-gray-100 rounded w-24"></div>
            </div>
          ))}
        </div>
        <SkeletonTable rows={5} />
      </div>
    </div>
  )
}