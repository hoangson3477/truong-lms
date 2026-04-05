// src/lib/gradeConfig.js
// Utility tạo cấu hình điểm động theo hệ điểm của trường

/**
 * Hệ 2 cột TX (mặc định):
 *   Miệng (HS1) | TX (HS1) | Giữa kỳ (HS2) | Cuối kỳ (HS3)
 *
 * Hệ 4 cột TX:
 *   Miệng (HS1) | TX1 (HS1) | TX2 (HS1) | TX3 (HS1) | Giữa kỳ (HS2) | Cuối kỳ (HS3)
 */

export function getGradeTypes(gradeSystem = '2_col') {
  if (gradeSystem === '4_col') {
    return {
      mieng:   { label: 'Miệng',    short: 'M',   weight: 1, color: 'bg-yellow-50 text-yellow-700' },
      tx1:     { label: 'TX 1',     short: 'TX1', weight: 1, color: 'bg-blue-50 text-blue-700' },
      tx2:     { label: 'TX 2',     short: 'TX2', weight: 1, color: 'bg-blue-50 text-blue-700' },
      tx3:     { label: 'TX 3',     short: 'TX3', weight: 1, color: 'bg-blue-50 text-blue-700' },
      giua_ky: { label: 'Giữa kỳ', short: 'GK',  weight: 2, color: 'bg-purple-50 text-purple-700' },
      cuoi_ky: { label: 'Cuối kỳ', short: 'CK',  weight: 3, color: 'bg-red-50 text-red-700' },
    }
  }

  // Mặc định: 2_col
  return {
    mieng:   { label: 'Miệng',    short: 'M',  weight: 1, color: 'bg-yellow-50 text-yellow-700' },
    tx:      { label: '15 phút',  short: 'TX', weight: 1, color: 'bg-blue-50 text-blue-700' },
    giua_ky: { label: 'Giữa kỳ', short: 'GK', weight: 2, color: 'bg-purple-50 text-purple-700' },
    cuoi_ky: { label: 'Cuối kỳ', short: 'CK', weight: 3, color: 'bg-red-50 text-red-700' },
  }
}

// Tính điểm trung bình dựa trên grade types động
export function calcAverageWithTypes(gradeTypes, getGradeFn, studentId) {
  let totalWeight = 0
  let totalScore = 0
  let hasScore = false

  Object.entries(gradeTypes).forEach(([type, config]) => {
    const grade = getGradeFn(studentId, type)
    if (grade) {
      totalScore += grade.score * config.weight
      totalWeight += config.weight
      hasScore = true
    }
  })

  if (!hasScore) return null
  return (totalScore / totalWeight).toFixed(1)
}

// Xếp loại
export function getRank(avg) {
  if (!avg) return null
  const n = parseFloat(avg)
  if (n >= 8.5) return { label: 'Giỏi', color: 'text-green-600' }
  if (n >= 7.0) return { label: 'Khá',  color: 'text-blue-600' }
  if (n >= 5.0) return { label: 'TB',   color: 'text-yellow-600' }
  return { label: 'Yếu', color: 'text-red-600' }
}

// Label hệ điểm cho hiển thị
export function getGradeSystemLabel(gradeSystem) {
  if (gradeSystem === '4_col') return 'Hệ 4 cột TX (Miệng + 3TX + GK + CK)'
  return 'Hệ 2 cột TX (Miệng + TX + GK + CK)'
}