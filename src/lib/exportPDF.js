import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { NotoSansRegular, NotoSansBold } from './fonts'

function loadVietnameseFont(doc) {
  doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular)
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal')
  doc.addFileToVFS('NotoSans-Bold.ttf', NotoSansBold)
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold')
}

export function exportGradePDF({ students, grades, className, subjectName, semester, academicYear }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  loadVietnameseFont(doc)
  doc.setFont('NotoSans', 'normal')

  const GRADE_TYPES = {
    mieng:   { label: 'Miệng',    weight: 1 },
    tx:      { label: '15 phút',  weight: 1 },
    giua_ky: { label: 'Giữa kỳ', weight: 2 },
    cuoi_ky: { label: 'Cuối kỳ', weight: 3 },
  }

  const getGrade = (studentId, type) =>
    grades.find(g => g.student_id === studentId && g.grade_type === type)

  const calcAverage = (studentId) => {
    let totalScore = 0, totalWeight = 0
    Object.entries(GRADE_TYPES).forEach(([type, config]) => {
      const grade = getGrade(studentId, type)
      if (grade) { totalScore += grade.score * config.weight; totalWeight += config.weight }
    })
    return totalWeight > 0 ? (totalScore / totalWeight).toFixed(1) : null
  }

  const getRank = (avg) => {
    if (!avg) return '-'
    const n = parseFloat(avg)
    if (n >= 8.5) return 'Giỏi'
    if (n >= 7.0) return 'Khá'
    if (n >= 5.0) return 'Trung bình'
    return 'Yếu'
  }

  const getRankColor = (avg) => {
    if (!avg) return [150, 150, 150]
    const n = parseFloat(avg)
    if (n >= 8.5) return [22, 163, 74]
    if (n >= 7.0) return [37, 99, 235]
    if (n >= 5.0) return [234, 179, 8]
    return [220, 38, 38]
  }

  // ─── HEADER ───────────────────────────────────────────
  doc.setFillColor(37, 99, 235)
  doc.rect(0, 0, 297, 32, 'F')

  doc.setFillColor(255, 255, 255)
  doc.circle(20, 16, 9, 'F')
  doc.setTextColor(37, 99, 235)
  doc.setFontSize(9)
  doc.setFont('NotoSans', 'bold')
  doc.text('LMS', 20, 17, { align: 'center' })

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.text('BẢNG ĐIỂM HỌC SINH', 148, 13, { align: 'center' })
  doc.setFontSize(9)
  doc.setFont('NotoSans', 'normal')
  doc.text('Hệ thống quản lý trường học - Trường LMS', 148, 21, { align: 'center' })

  // ─── INFO BOX ─────────────────────────────────────────
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(10, 36, 277, 24, 3, 3, 'F')
  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.3)
  doc.roundedRect(10, 36, 277, 24, 3, 3, 'S')

  doc.setTextColor(51, 65, 85)
  doc.setFontSize(10)
  doc.setFont('NotoSans', 'bold')
  doc.text(`Lớp: ${className}`, 18, 44)
  doc.text(`Môn học: ${subjectName}`, 80, 44)
  doc.text(`Học kỳ: ${semester}`, 185, 44)
  doc.text(`Năm học: ${academicYear}`, 230, 44)

  doc.setFont('NotoSans', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 18, 52)
  doc.text(`Tổng số học sinh: ${students.length}`, 80, 52)

  // ─── TABLE ────────────────────────────────────────────
  const tableData = students.map((student, index) => {
    const avg = calcAverage(student.id)
    return {
      row: [
        index + 1,
        student.profile?.full_name || '-',
        student.student_code || '-',
        getGrade(student.id, 'mieng')?.score ?? '-',
        getGrade(student.id, 'tx')?.score ?? '-',
        getGrade(student.id, 'giua_ky')?.score ?? '-',
        getGrade(student.id, 'cuoi_ky')?.score ?? '-',
        avg || '-',
        getRank(avg),
      ],
      avg,
    }
  })

  autoTable(doc, {
    startY: 64,
    head: [[
      'STT', 'Họ và tên', 'Mã HS',
      'Miệng\n(HS1)', '15 phút\n(HS1)',
      'Giữa kỳ\n(HS2)', 'Cuối kỳ\n(HS3)',
      'Điểm TB', 'Xếp loại'
    ]],
    body: tableData.map(d => d.row),
    styles: {
      fontSize: 9,
      cellPadding: { top: 4, right: 3, bottom: 4, left: 3 },
      font: 'NotoSans',
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 9,
      font: 'NotoSans',
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', textColor: [100, 116, 139] },
      1: { cellWidth: 58 },
      2: { cellWidth: 25, halign: 'center', fontStyle: 'bold', textColor: [37, 99, 235] },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 24, halign: 'center' },
      6: { cellWidth: 24, halign: 'center' },
      7: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      8: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
    },
    didDrawCell: (data) => {
      if (data.section === 'body') {
        const { avg } = tableData[data.row.index]
        if ((data.column.index === 7 || data.column.index === 8) && avg) {
          const color = getRankColor(avg)
          if (data.column.index === 8) {
            doc.setFillColor(...color)
            doc.setGState(doc.GState({ opacity: 0.12 }))
            doc.roundedRect(data.cell.x + 1, data.cell.y + 1.5, data.cell.width - 2, data.cell.height - 3, 2, 2, 'F')
            doc.setGState(doc.GState({ opacity: 1 }))
          }
          doc.setTextColor(...color)
          doc.setFont('NotoSans', 'bold')
          doc.setFontSize(9)
          doc.text(
            String(data.column.index === 7 ? avg : getRank(avg)),
            data.cell.x + data.cell.width / 2,
            data.cell.y + data.cell.height / 2 + 1,
            { align: 'center' }
          )
          doc.setTextColor(30, 41, 59)
          doc.setFont('NotoSans', 'normal')
        }
      }
    },
    margin: { left: 10, right: 10 },
  })

  // ─── SUMMARY ──────────────────────────────────────────
  const finalY = doc.lastAutoTable.finalY + 8
  const graded = tableData.filter(d => d.avg !== null)
  const summaryData = [
    { label: 'Giỏi',       value: graded.filter(d => parseFloat(d.avg) >= 8.5).length, color: [22, 163, 74] },
    { label: 'Khá',        value: graded.filter(d => parseFloat(d.avg) >= 7 && parseFloat(d.avg) < 8.5).length, color: [37, 99, 235] },
    { label: 'Trung bình', value: graded.filter(d => parseFloat(d.avg) >= 5 && parseFloat(d.avg) < 7).length, color: [234, 179, 8] },
    { label: 'Yếu',        value: graded.filter(d => parseFloat(d.avg) < 5).length, color: [220, 38, 38] },
    { label: 'Tổng',       value: students.length, color: [71, 85, 105] },
  ]

  const boxW = 42, boxH = 18, startX = 10
  summaryData.forEach((item, i) => {
    const x = startX + i * (boxW + 4)
    doc.setFillColor(...item.color)
    doc.setGState(doc.GState({ opacity: 0.1 }))
    doc.roundedRect(x, finalY, boxW, boxH, 3, 3, 'F')
    doc.setGState(doc.GState({ opacity: 1 }))
    doc.setDrawColor(...item.color)
    doc.setLineWidth(0.5)
    doc.roundedRect(x, finalY, boxW, boxH, 3, 3, 'S')
    doc.setTextColor(...item.color)
    doc.setFont('NotoSans', 'bold')
    doc.setFontSize(16)
    doc.text(String(item.value), x + boxW / 2, finalY + 10, { align: 'center' })
    doc.setFontSize(7.5)
    doc.setFont('NotoSans', 'normal')
    doc.text(item.label, x + boxW / 2, finalY + 16, { align: 'center' })
  })

  // ─── SIGNATURE ────────────────────────────────────────
  const sigY = finalY + 28
  doc.setTextColor(51, 65, 85)
  doc.setFont('NotoSans', 'bold')
  doc.setFontSize(10)
  doc.text('Giáo viên bộ môn', 230, sigY, { align: 'center' })
  doc.setFont('NotoSans', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text('(Ký và ghi rõ họ tên)', 230, sigY + 6, { align: 'center' })
  doc.setDrawColor(148, 163, 184)
  doc.setLineWidth(0.5)
  doc.line(200, sigY + 22, 260, sigY + 22)

  // ─── FOOTER ───────────────────────────────────────────
  const pageH = doc.internal.pageSize.height
  doc.setFillColor(37, 99, 235)
  doc.rect(0, pageH - 9, 297, 9, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7.5)
  doc.setFont('NotoSans', 'normal')
  doc.text('Trường LMS - Hệ thống quản lý trường học', 148, pageH - 3, { align: 'center' })

  doc.save(`bang-diem-${className}-${subjectName}-HK${semester}.pdf`)
}


// ═══════════════════════════════════════════════════════
// XUẤT BẢNG ĐIỂM CÁ NHÂN HỌC SINH
// ═══════════════════════════════════════════════════════
export function exportStudentGradePDF({ student, allGrades, className, academicYear }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  loadVietnameseFont(doc)
  doc.setFont('NotoSans', 'normal')

  const GRADE_TYPES = {
    mieng:   { label: 'Miệng',    weight: 1 },
    tx:      { label: '15 phút',  weight: 1 },
    giua_ky: { label: 'Giữa kỳ', weight: 2 },
    cuoi_ky: { label: 'Cuối kỳ', weight: 3 },
  }

  const calcAverage = (grades) => {
    let totalScore = 0, totalWeight = 0
    Object.entries(GRADE_TYPES).forEach(([type, config]) => {
      const g = grades.find(g => g.grade_type === type)
      if (g) { totalScore += g.score * config.weight; totalWeight += config.weight }
    })
    return totalWeight > 0 ? (totalScore / totalWeight).toFixed(1) : null
  }

  const getRank = (avg) => {
    if (!avg) return '-'
    const n = parseFloat(avg)
    if (n >= 8.5) return 'Giỏi'
    if (n >= 7.0) return 'Khá'
    if (n >= 5.0) return 'Trung bình'
    return 'Yếu'
  }

  const getRankColor = (avg) => {
    if (!avg) return [150, 150, 150]
    const n = parseFloat(avg)
    if (n >= 8.5) return [22, 163, 74]
    if (n >= 7.0) return [37, 99, 235]
    if (n >= 5.0) return [234, 179, 8]
    return [220, 38, 38]
  }

  // ─── HEADER ───────────────────────────────────────────
  doc.setFillColor(37, 99, 235)
  doc.rect(0, 0, 210, 35, 'F')

  doc.setFillColor(255, 255, 255)
  doc.circle(20, 17, 9, 'F')
  doc.setTextColor(37, 99, 235)
  doc.setFontSize(9)
  doc.setFont('NotoSans', 'bold')
  doc.text('LMS', 20, 18, { align: 'center' })

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.text('BẢNG ĐIỂM CÁ NHÂN', 105, 14, { align: 'center' })
  doc.setFontSize(9)
  doc.setFont('NotoSans', 'normal')
  doc.text('Hệ thống quản lý trường học - Trường LMS', 105, 22, { align: 'center' })

  // ─── STUDENT INFO ──────────────────────────────────────
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(10, 39, 190, 28, 3, 3, 'F')
  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.3)
  doc.roundedRect(10, 39, 190, 28, 3, 3, 'S')

  // Avatar circle
  doc.setFillColor(37, 99, 235)
  doc.circle(28, 53, 10, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('NotoSans', 'bold')
  doc.setFontSize(14)
  doc.text(student.full_name?.charAt(0) || '?', 28, 56, { align: 'center' })

  doc.setTextColor(15, 23, 42)
  doc.setFont('NotoSans', 'bold')
  doc.setFontSize(13)
  doc.text(student.full_name || '-', 45, 48)

  doc.setFont('NotoSans', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  doc.text(`Mã HS: ${student.student_code || '-'}`, 45, 55)
  doc.text(`Lớp: ${className}`, 45, 61)
  doc.text(`Năm học: ${academicYear}`, 110, 55)
  doc.text(`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 110, 61)

  // ─── SEMESTER TABLES ──────────────────────────────────
  let currentY = 72

  for (const semester of [1, 2]) {
    const semGrades = allGrades.filter(g => g.semester === semester)
    if (semGrades.length === 0) continue

    // Group by subject
    const subjectMap = {}
    semGrades.forEach(g => {
      const subjectName = g.subject?.name || 'Không xác định'
      if (!subjectMap[subjectName]) subjectMap[subjectName] = []
      subjectMap[subjectName].push(g)
    })

    const subjectList = Object.entries(subjectMap)
    if (subjectList.length === 0) continue

    // Semester header
    doc.setFillColor(37, 99, 235)
    doc.setGState(doc.GState({ opacity: 0.9 }))
    doc.roundedRect(10, currentY, 190, 9, 2, 2, 'F')
    doc.setGState(doc.GState({ opacity: 1 }))
    doc.setTextColor(255, 255, 255)
    doc.setFont('NotoSans', 'bold')
    doc.setFontSize(10)
    doc.text(`HỌC KỲ ${semester}`, 105, currentY + 6, { align: 'center' })
    currentY += 13

    const tableData = subjectList.map(([subjectName, grades], idx) => {
      const avg = calcAverage(grades)
      return {
        row: [
          idx + 1,
          subjectName,
          grades.find(g => g.grade_type === 'mieng')?.score ?? '-',
          grades.find(g => g.grade_type === 'tx')?.score ?? '-',
          grades.find(g => g.grade_type === 'giua_ky')?.score ?? '-',
          grades.find(g => g.grade_type === 'cuoi_ky')?.score ?? '-',
          avg || '-',
          getRank(avg),
        ],
        avg,
      }
    })

    autoTable(doc, {
      startY: currentY,
      head: [['STT', 'Môn học', 'Miệng', '15 phút', 'Giữa kỳ', 'Cuối kỳ', 'Điểm TB', 'Xếp loại']],
      body: tableData.map(d => d.row),
      styles: {
        fontSize: 9,
        cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
        font: 'NotoSans',
        lineColor: [226, 232, 240],
        lineWidth: 0.3,
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        font: 'NotoSans',
        fontSize: 9,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', textColor: [100, 116, 139] },
        1: { cellWidth: 55 },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 22, halign: 'center' },
        6: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        7: { cellWidth: 21, halign: 'center', fontStyle: 'bold' },
      },
      didDrawCell: (data) => {
        if (data.section === 'body') {
          const { avg } = tableData[data.row.index]
          if ((data.column.index === 6 || data.column.index === 7) && avg) {
            const color = getRankColor(avg)
            if (data.column.index === 7) {
              doc.setFillColor(...color)
              doc.setGState(doc.GState({ opacity: 0.12 }))
              doc.roundedRect(data.cell.x + 1, data.cell.y + 1, data.cell.width - 2, data.cell.height - 2, 1.5, 1.5, 'F')
              doc.setGState(doc.GState({ opacity: 1 }))
            }
            doc.setTextColor(...color)
            doc.setFont('NotoSans', 'bold')
            doc.setFontSize(9)
            doc.text(
              String(data.column.index === 6 ? avg : getRank(avg)),
              data.cell.x + data.cell.width / 2,
              data.cell.y + data.cell.height / 2 + 1,
              { align: 'center' }
            )
            doc.setTextColor(30, 41, 59)
            doc.setFont('NotoSans', 'normal')
          }
        }
      },
      margin: { left: 10, right: 10 },
    })

    currentY = doc.lastAutoTable.finalY + 6

    // Summary học kỳ
    const semGraded = tableData.filter(d => d.avg !== null)
    const semAvgTotal = semGraded.length > 0
      ? (semGraded.reduce((sum, d) => sum + parseFloat(d.avg), 0) / semGraded.length).toFixed(1)
      : null

    if (semAvgTotal) {
      const color = getRankColor(semAvgTotal)
      doc.setFillColor(...color)
      doc.setGState(doc.GState({ opacity: 0.1 }))
      doc.roundedRect(10, currentY, 190, 10, 2, 2, 'F')
      doc.setGState(doc.GState({ opacity: 1 }))
      doc.setDrawColor(...color)
      doc.setLineWidth(0.3)
      doc.roundedRect(10, currentY, 190, 10, 2, 2, 'S')
      doc.setTextColor(...color)
      doc.setFont('NotoSans', 'bold')
      doc.setFontSize(9)
      doc.text(
        `Điểm trung bình học kỳ ${semester}: ${semAvgTotal}  —  Xếp loại: ${getRank(semAvgTotal)}`,
        105, currentY + 6.5, { align: 'center' }
      )
      currentY += 14
    }
  }

  // ─── FOOTER ───────────────────────────────────────────
  const pageH = doc.internal.pageSize.height
  doc.setFillColor(37, 99, 235)
  doc.rect(0, pageH - 9, 210, 9, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7.5)
  doc.setFont('NotoSans', 'normal')
  doc.text('Trường LMS - Hệ thống quản lý trường học', 105, pageH - 3, { align: 'center' })

  doc.save(`bang-diem-ca-nhan-${student.full_name}-${academicYear}.pdf`)
}