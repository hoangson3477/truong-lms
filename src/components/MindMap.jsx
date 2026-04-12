'use client'

import { useState } from 'react'

/**
 * MindMap Component
 * Render sơ đồ tư duy dạng cây từ JSON nodes
 * Support: multiple levels, expand/collapse, hover effects
 */

export function MindMap({ data, width = 800, height = 600 }) {
  const [expandedNodes, setExpandedNodes] = useState(new Set([data.nodes?.[0]?.id]))

  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Không có dữ liệu sơ đồ tư duy
      </div>
    )
  }

  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  // Tính toán tọa độ cho từng node
  const layout = calculateLayout(data.nodes, width, height)

  return (
    <div className="relative w-full h-full overflow-auto p-8" style={{ minWidth: '600px' }}>
      {/* Node连线 - dùng SVG để vẽ đường nối */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {layout.edges.map((edge, i) => (
          <path
            key={i}
            d={edge.path}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="2"
          />
        ))}
      </svg>

      {/* Các node */}
      <div className="relative z-10">
        {layout.nodes.map((node) => (
          <div
            key={node.id}
            style={{
              position: 'absolute',
              left: node.x,
              top: node.y,
              transform: 'translate(-50%, -50%)',
            }}
            className="group"
          >
            <NodeCard
              node={node.data}
              isExpanded={expandedNodes.has(node.id)}
              onToggle={() => toggleNode(node.id)}
              depth={node.depth}
            />
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur p-3 rounded-xl border border-gray-200 shadow-sm text-xs space-y-1">
        <p className="font-bold text-gray-700 mb-1">Hướng dẫn:</p>
        <p>👆 Click vào node để mở rộng/thu gọn</p>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
          <span>Chủ đề chính</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-400"></span>
          <span>Nhánh con</span>
        </div>
      </div>
    </div>
  )
}

// Component cho một node
function NodeCard({ node, isExpanded, onToggle, depth }) {
  const colors = [
    'bg-blue-500 text-white',           // depth 0
    'bg-green-500 text-white',          // depth 1
    'bg-purple-500 text-white',         // depth 2
    'bg-orange-500 text-white',         // depth 3
    'bg-emerald-500 text-white',        // depth 4
  ]

  const bgColor = colors[depth % colors.length] || 'bg-gray-500 text-white'

  return (
    <div
      onClick={onToggle}
      className={`
        relative cursor-pointer transition-all duration-300
        ${node.children && node.children.length > 0 ? 'hover:scale-105' : ''}
      `}
      style={{
        padding: '16px 24px',
        borderRadius: '12px',
        minWidth: '150px',
        maxWidth: '250px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '2px solid rgba(255,255,255,0.3)',
      }}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bgColor}`}>
          {node.icon || '📄'}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-bold text-sm leading-tight ${bgColor}`}>
            {node.label}
          </h4>
          {node.description && (
            <p className={`text-xs mt-1 truncate opacity-90 ${bgColor.replace('text-white', 'text-gray-300')}`}>
              {node.description}
            </p>
          )}
        </div>
      </div>

      {/* Nút expand/collapse */}
      {node.children && node.children.length > 0 && (
        <div className="absolute -bottom-3 right-4 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-600 text-xs font-bold cursor-pointer hover:bg-blue-500 hover:text-white transition-colors z-20">
          {isExpanded ? '-' : '+'}
        </div>
      )}

      {/* Label level */}
      <div className="absolute -top-2 -left-2 w-5 h-5 bg-gray-800 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
        {depth + 1}
      </div>
    </div>
  )
}

// Tính toán layout cho các node
function calculateLayout(nodes, width, height) {
  if (!nodes || nodes.length === 0) return { nodes: [], edges: [] }

  const root = nodes[0]
  const nodeWidth = 180
  const nodeHeight = 80
  const levelHeight = 140
  const horizontalGap = 100

  // Tính chiều rộng tối đa của mỗi level
  const levelWidths = calculateLevelWidths(nodes, 0)

  // Vị trí bắt đầu (căn giữa)
  const startY = 60

  const positionedNodes = []
  const edges = []

  // Đệ quy để tính vị trí
  function positionNode(node, depth, xOffset) {
    const levelWidth = levelWidths[depth] || width
    const x = xOffset
    const y = startY + depth * levelHeight

    positionedNodes.push({ id: node.id, x, y, depth, data: node })

    if (node.children && node.children.length > 0) {
      let currentX = x - (node.children.length - 1) * (horizontalGap / 2)

      node.children.forEach((child, i) => {
        const childX = currentX + i * horizontalGap
        const childY = y + levelHeight

        // Vẽ đường nối
        edges.push({
          from: node.id,
          to: child.id,
          path: `M ${x} ${y + nodeHeight/2} C ${x} ${y + levelHeight/2} ${childX} ${childY - levelHeight/2} ${childX} ${childY}`,
        })

        positionNode(child, depth + 1, childX)
      })
    }
  }

  positionNode(root, 0, width / 2)

  return { nodes: positionedNodes, edges }
}

// Tính chiều rộng từng level
function calculateLevelWidths(nodes, depth) {
  const map = {}

  function traverse(node, d) {
    if (!map[d]) map[d] = 0
    map[d] = Math.max(map[d], node.children?.length || 0)
    node.children?.forEach(child => traverse(child, d + 1))
  }

  nodes.forEach(node => traverse(node, 0))
  return map
}

// Render đơn giản cho desktop (không cần SVG)
export function SimpleMindMap({ data }) {
  if (!data || !data.nodes || data.nodes.length === 0) {
    return <div className="text-center text-gray-400 py-10">Không có dữ liệu sơ đồ tư duy</div>
  }

  const [expanded, setExpanded] = useState(new Set([data.nodes[0]?.id]))

  const toggle = (id) => {
    const newExpanded = new Set(expanded)
    if (newExpanded.has(id)) newExpanded.delete(id)
    else newExpanded.add(id)
    setExpanded(newExpanded)
  }

  const renderNode = (node, depth = 0) => {
    const isExpanded = expanded.has(node.id)
    const colors = ['border-blue-500', 'border-green-500', 'border-purple-500', 'border-orange-500', 'border-emerald-500']
    const color = colors[depth % colors.length]
    const bgColors = ['bg-blue-50', 'bg-green-50', 'bg-purple-50', 'bg-orange-50', 'bg-emerald-50']
    const bgColor = bgColors[depth % bgColors.length]

    return (
      <div key={node.id} className="flex flex-col items-center">
        <div
          className={`
            relative p-4 px-6 rounded-xl border-2 transition-all duration-300
            ${isExpanded ? `${color} bg-white shadow-lg scale-105` : `${color} bg-white/50 hover:border-gray-300`}
            ${depth === 0 ? 'w-full max-w-2xl' : 'max-w-xs'}
          `}
          onClick={() => toggle(node.id)}
        >
          <div className="flex items-center gap-3">
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center text-lg
              ${depth === 0 ? 'bg-blue-600 text-white' : depth === 1 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}
            `}>
              {node.icon || '📄'}
            </div>
            <div>
              <h4 className={`font-bold ${depth === 0 ? 'text-xl' : depth === 1 ? 'text-base' : 'text-sm'}`}>
                {node.label}
              </h4>
              {node.description && (
                <p className={`text-xs opacity-70 mt-0.5`}>{node.description}</p>
              )}
            </div>
          </div>
          {node.children?.length > 0 && (
            <button
              className="absolute -bottom-4 right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md text-gray-600 hover:bg-blue-500 hover:text-white transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                toggle(node.id)
              }}
            >
              {isExpanded ? '−' : '+'}
            </button>
          )}
        </div>

        {isExpanded && node.children && node.children.length > 0 && (
          <div className="flex gap-6 mt-6 flex-wrap justify-center">
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                {renderNode(child, depth + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] overflow-auto p-6">
      {data.nodes.map((node) => renderNode(node, 0))}
    </div>
  )
}

export default MindMap
