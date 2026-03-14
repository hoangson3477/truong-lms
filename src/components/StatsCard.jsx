export default function StatsCard({ icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
  }

  return (
    <div className={`rounded-2xl border-2 p-6 ${colors[color]}`}>
      <div className="text-3xl mb-3">{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm font-medium opacity-70 mt-1">{label}</p>
    </div>
  )
}