// Client-side utilities to export a mind map JSON as SVG or PNG

function escapeXml(unsafe) {
  return String(unsafe).replace(/[&<>'"]/g, function (c) {
    switch (c) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case "'": return '&apos;'
      case '"': return '&quot;'
    }
  })
}

function mindMapToSVGString(data, width = 1200, height = 800) {
  // Very simple renderer: list nodes with indentation. Good enough for exports.
  const lines = []
  function walk(nodes, depth = 0, prefix = '') {
    if (!nodes) return
    nodes.forEach((node, i) => {
      const label = node.label || node.title || 'Untitled'
      lines.push({ text: `${'  '.repeat(depth)}- ${label}` })
      if (node.children && node.children.length > 0) walk(node.children, depth + 1)
    })
  }

  if (data.nodes) walk(data.nodes)
  else if (Array.isArray(data.units)) walk(data.units.map((u, idx) => ({ label: u.title, children: u.content?.mindmap?.nodes || [] })))
  else walk([data])

  const lineHeight = 20
  const padding = 20
  const svgHeight = Math.max(height, padding * 2 + lines.length * lineHeight)

  const texts = lines.map((l, i) => {
    const y = padding + (i + 1) * lineHeight
    return `<text x="${padding}" y="${y}" font-family="Arial, sans-serif" font-size="14">${escapeXml(l.text)}</text>`
  }).join('\n')

  const svg = `<?xml version="1.0" encoding="utf-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${svgHeight}" viewBox="0 0 ${width} ${svgHeight}">\n  <rect width="100%" height="100%" fill="#ffffff"/>\n  <g fill="#111827">\n${texts}\n  </g>\n</svg>`
  return svg
}

export async function exportMindMapAsSVG(data, filename = 'mindmap.svg') {
  if (typeof window === 'undefined') throw new Error('exportMindMapAsSVG can only be called in browser')
  const svgString = mindMapToSVGString(data)
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function exportMindMapAsPNG(data, filename = 'mindmap.png') {
  if (typeof window === 'undefined') throw new Error('exportMindMapAsPNG can only be called in browser')
  const svgString = mindMapToSVGString(data)
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  const img = new Image()
  img.crossOrigin = 'anonymous'
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
    img.src = url
  })
  const canvas = document.createElement('canvas')
  canvas.width = img.width || 1200
  canvas.height = img.height || 800
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0)
  URL.revokeObjectURL(url)
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(link.href), 1000)
      resolve()
    }, 'image/png')
  })
}
