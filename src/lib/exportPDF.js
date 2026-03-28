import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportGradePDF({ students, grades, className, subjectName, semester, academicYear }) {

  const doc = new jsPDF()

  // Header
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('BANG DIEM HOC SINH', 105, 20, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Lop: ${className}`, 14, 35)
  doc.text(`Mon hoc: ${subjectName}`, 14, 42)
  doc.text(`Hoc ky: ${semester}`, 14, 49)
  doc.text(`Nam hoc: ${academicYear}`, 14, 56)
  doc.text(`Ngay xuat: ${new Date().toLocaleDateString('vi-VN')}`, 140, 35)

  // Grade types
  const GRADE_TYPES = {
    mieng:   { label: 'Mieng',    weight: 1 },
    tx:      { label: '15 phut',  weight: 1 },
    giua_ky: { label: 'Giua ky',  weight: 2 },
    cuoi_ky: { label: 'Cuoi ky',  weight: 3 },
  }

  const getGrade = (studentId, type) =>
    grades.find(g => g.student_id === studentId && g.grade_type === type)

  const calcAverage = (studentId) => {
    let totalScore = 0
    let totalWeight = 0
    Object.entries(GRADE_TYPES).forEach(([type, config]) => {
      const grade = getGrade(studentId, type)
      if (grade) {
        totalScore += grade.score * config.weight
        totalWeight += config.weight
      }
    })
    return totalWeight > 0 ? (totalScore / totalWeight).toFixed(1) : '—'
  }

  const getRank = (avg) => {
    if (avg === '—') return '—'
    const n = parseFloat(avg)
    if (n >= 8.5) return 'Gioi'
    if (n >= 7.0) return 'Kha'
    if (n >= 5.0) return 'Trung binh'
    return 'Yeu'
  }

  // Table data
  const tableData = students.map((student, index) => {
    const avg = calcAverage(student.id)
    return [
      index + 1,
      student.profile?.full_name || '—',
      student.student_code,
      getGrade(student.id, 'mieng')?.score ?? '—',
      getGrade(student.id, 'tx')?.score ?? '—',
      getGrade(student.id, 'giua_ky')?.score ?? '—',
      getGrade(student.id, 'cuoi_ky')?.score ?? '—',
      avg,
      getRank(avg),
    ]
  })

  // Stats
  const graded = students.filter(s => calcAverage(s.id) !== '—')
  const gioi = graded.filter(s => parseFloat(calcAverage(s.id)) >= 8.5).length
  const kha = graded.filter(s => parseFloat(calcAverage(s.id)) >= 7 && parseFloat(calcAverage(s.id)) < 8.5).length
  const tb = graded.filter(s => parseFloat(calcAverage(s.id)) >= 5 && parseFloat(calcAverage(s.id)) < 7).length
  const yeu = graded.filter(s => parseFloat(calcAverage(s.id)) < 5).length

  autoTable(doc, {
    startY: 65,
    head: [[
      'STT', 'Ho va ten', 'Ma HS',
      'Mieng', '15 phut', 'Giua ky', 'Cuoi ky',
      'Diem TB', 'Xep loai'
    ]],
    body: tableData,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [239, 246, 255] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 18, halign: 'center' },
      7: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      8: { cellWidth: 22, halign: 'center' },
    },
  })

  // Summary
  const finalY = doc.lastAutoTable.finalY + 10
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Tong ket xep loai:', 14, finalY)
  doc.setFont('helvetica', 'normal')
  doc.text(`Gioi: ${gioi}  |  Kha: ${kha}  |  Trung binh: ${tb}  |  Yeu: ${yeu}  |  Tong: ${students.length}`, 14, finalY + 7)

  // Signature
  doc.setFontSize(10)
  doc.text('Giao vien bo mon', 150, finalY + 20, { align: 'center' })
  doc.text('(Ky va ghi ro ho ten)', 150, finalY + 27, { align: 'center' })

  // Save
  doc.save(`bang-diem-${className}-${subjectName}-HK${semester}.pdf`)
}