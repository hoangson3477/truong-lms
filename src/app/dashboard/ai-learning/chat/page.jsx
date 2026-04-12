'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingPage from '@/components/Skeleton'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

// Message Bubble Component - Optimized với ReactMarkdown + KaTeX
const MessageBubble = ({ msg }) => (
  <div
    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
      msg.role === 'user'
        ? 'bg-blue-600 text-white rounded-br-md'
        : 'bg-white border rounded-bl-md'
    }`}
  >
    {msg.role === 'assistant' ? (
      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            table: ({node, ...props}) => (
              <div className="overflow-x-auto mb-2">
                <table className="min-w-full divide-y divide-gray-200 border text-sm" {...props} />
              </div>
            ),
            th: ({node, ...props}) => (
              <th className="px-2 py-1 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props} />
            ),
            td: ({node, ...props}) => (
              <td className="px-2 py-1 text-xs text-gray-900" {...props} />
            ),
            p: ({node, ...props}) => <p className="mb-1 last:mb-0 text-sm" {...props} />,
            h1: ({node, ...props}) => <h1 className="text-lg font-bold my-2 text-sm" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-base font-bold my-2 text-sm" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-sm font-bold my-1" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1 text-sm" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-sm" {...props} />,
            li: ({node, ...props}) => <li className="text-sm" {...props} />,
            code: ({node, inline, ...props}) =>
              inline ? (
                <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-red-600" {...props} />
              ) : (
                <code className="block bg-gray-900 text-green-400 p-2 rounded text-xs overflow-x-auto my-2 font-mono" {...props} />
              ),
            // Handle horizontal rule (---) properly
            hr: ({node, ...props}) => <hr className="my-3 border-gray-300" {...props} />,
          }}
        >
          {msg.content}
        </ReactMarkdown>
      </div>
    ) : (
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
    )}

    {msg.metadata?.files && (
      <div className="mt-2 space-y-1">
        {msg.metadata.files.map((f, i) => (
          <div key={i} className="text-xs bg-white/20 rounded px-2 py-1 inline-flex items-center gap-1">
            <span>📎</span>
            <span>{f.file_name}</span>
          </div>
        ))}
      </div>
    )}

    <p className={`text-[10px] mt-1 ${
      msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'
    }`}>
      {new Date(msg.created_at).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
      })}
    </p>
  </div>
)

export default function AIChatPage() {
  const [profile, setProfile] = useState(null)
  const [student, setStudent] = useState(null)
  const [plans, setPlans] = useState([])
  const [activePlan, setActivePlan] = useState(null)
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploadFiles, setUploadFiles] = useState([])

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).maybeSingle()
      setProfile(profileData)

      if (profileData?.role !== 'student') {
        router.push('/dashboard')
        return
      }

      const { data: studentData } = await supabase
        .from('students').select('*').eq('profile_id', user.id).maybeSingle()
      setStudent(studentData)

      if (studentData) {
        // Lấy kế hoạch học tập
        const { data: plansData } = await supabase
          .from('study_plans')
          .select('*')
          .eq('student_id', studentData.id)
          .order('updated_at', { ascending: false })
        setPlans(plansData || [])

        if (plansData?.length > 0) {
          setActivePlan(plansData[0])
        }

        // Lấy conversations
        const { data: convs } = await supabase
          .from('ai_conversations')
          .select('*, messages:ai_messages(count)')
          .eq('student_id', studentData.id)
          .order('updated_at', { ascending: false })
        setConversations(convs || [])
      }

      setLoading(false)
    }
    init()
  }, [router, supabase])

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async (convId) => {
    const { data } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
  }

  const createNewConversation = async () => {
    if (!student || !activePlan) {
      alert('Vui lòng chọn kế hoạch học tập trước')
      return
    }

    const { data: newConv } = await supabase
      .from('ai_conversations')
      .insert({
        student_id: student.id,
        plan_id: activePlan.id,
        title: 'Cuộc trò chuyện mới',
        subject: activePlan.subject,
      })
      .select()
      .single()

    if (newConv) {
      setConversations(prev => [newConv, ...prev])
      setActiveConversation(newConv)
      setMessages([])
    }
  }

  const handleSend = async () => {
    if ((!input.trim() && uploadFiles.length === 0) || sending) return
    if (!activeConversation) {
      await createNewConversation()
      return
    }

    setSending(true)

    // Upload files nếu có
    let fileRefs = []
    if (uploadFiles.length > 0) {
      for (const file of uploadFiles) {
        const fileName = `${student.id}/${Date.now()}_${file.name}`
        const { error } = await supabase.storage
          .from('study-materials')
          .upload(fileName, file, { upsert: true })

        if (!error) {
          const { data: urlData } = supabase.storage
            .from('study-materials')
            .getPublicUrl(fileName)
          fileRefs.push({
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_type: file.type,
          })
        }
      }
    }

    // Lưu user message
    const userMsg = {
      conversation_id: activeConversation.id,
      role: 'user',
      content: input.trim() || (uploadFiles.length > 0 ? 'Đã gửi file đính kèm' : ''),
      metadata: fileRefs.length > 0 ? { files: fileRefs } : null,
    }

    await supabase.from('ai_messages').insert(userMsg)

    const updatedMsgs = [...messages, { ...userMsg, id: 'temp', created_at: new Date().toISOString() }]
    setMessages(updatedMsgs)
    setInput('')
    setUploadFiles([])

    // Gọi AI
    try {
      // Lấy chat history (last 10 messages)
      const history = updatedMsgs.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }))

      // Thêm system prompt với context từ kế hoạch
      const planContext = activePlan ? `
Kế hoạch học: ${activePlan.title}
Môn: ${activePlan.subject}
Lớp: ${activePlan.grade_level}
Tiến độ: ${activePlan.progress}%
      `.trim() : ''

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          system_prompt: `Bạn là gia sư AI thân thiện, hỗ trợ học sinh Việt Nam.

${planContext}

Nhiệm vụ:
- Giải đáp câu hỏi về bài học hiện tại
- Giải bài tập từng bước (không đưa đáp án ngay)
- Giải thích khái niệm khó bằng ví dụ đơn giản
- Động viên học sinh, khuyến khích tư duy
- Nếu học sinh gửi file, hãy phân tích nội dung và trả lời dựa trên file đó

📐 **Định dạng câu trả lời**:
- Dùng LaTeX cho công thức toán: \\(ax^2 + bx + c = 0\\) cho inline, hoặc \`\`\`latex\n\\[ \\Delta = b^2 - 4ac \\]\`\`\` cho block
- Dùng bảng Markdown khi cần: | Cột 1 | Cột 2 |, giữ nguyên dấu ---
- Có thể dùng --- làm đường phân cách giữa các phần
- Dùng *** để nhấn mạnh
- Trả lời bằng tiếng Việt, rõ ràng, dễ hiểu`
        })
      })

      const data = await res.json()

      if (data.error) throw new Error(data.error)

      // Lưu assistant message
      const assistantMsg = {
        conversation_id: activeConversation.id,
        role: 'assistant',
        content: data.content,
      }
      await supabase.from('ai_messages').insert(assistantMsg)

      setMessages(prev => [...prev.slice(0, -1), { ...userMsg, id: 'temp', created_at: new Date().toISOString() }, {
        ...assistantMsg, id: 'temp2', created_at: new Date().toISOString() }])

    } catch (err) {
      alert('Lỗi: ' + err.message)
      setMessages(prev => [...prev.slice(0, -1), { ...userMsg, id: 'temp', created_at: new Date().toISOString() }])
    } finally {
      setSending(false)
    }
  }

  const handleFileChange = (e) => {
    setUploadFiles(prev => [...prev, ...Array.from(e.target.files)])
  }

  const removeFile = (idx) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== idx))
  }

  if (loading) return <LoadingPage />

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Conversations */}
        <div className="w-80 bg-white border-r flex flex-col hidden md:flex">
          <div className="p-4 border-b">
            <button
              onClick={createNewConversation}
              className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <span>✨</span> Chat mới
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="text-center text-gray-400 text-sm p-4">
                Chưa có cuộc trò chuyện nào
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversation(conv)}
                  className={`w-full text-left p-3 rounded-xl transition ${
                    activeConversation?.id === conv.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <p className="font-medium text-gray-800 text-sm truncate">
                    {conv.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {conv.messages?.length || 0} tin nhắn
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    {new Date(conv.updated_at).toLocaleDateString('vi-VN')}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Active Plan indicator */}
          {activePlan && (
            <div className="p-3 border-t bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">Kế hoạch hiện tại:</p>
              <Link
                href={`/dashboard/ai-learning/plan/${activePlan.id}`}
                className="text-sm font-medium text-blue-600 hover:underline line-clamp-1"
              >
                {activePlan.title}
              </Link>
            </div>
          )}
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b bg-white">
            <div className="flex items-center gap-3">
              <button
                onClick={createNewConversation}
                className="md:hidden p-2 hover:bg-gray-100 rounded-xl"
              >
                ✨ Mới
              </button>
              <h2 className="text-lg font-bold text-gray-800">
                {activeConversation ? 'Gia sư AI' : 'Bắt đầu chat'}
              </h2>
              {activePlan && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  {activePlan.title}
                </span>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-green-100 rounded-full flex items-center justify-center text-4xl">
                  🤖
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Xin chào! Tôi là gia sư AI của bạn
                </h3>
                <p className="text-gray-500 max-w-md mx-auto mb-6">
                  Tôi có thể giúp bạn:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
                  {[
                    'Giải thích bài học khó hiểu',
                    'Hướng dẫn làm bài tập từng bước',
                    'Trả lời câu hỏi về môn học',
                    'Gợi ý cách học hiệu quả',
                  ].map((item, i) => (
                    <div key={i} className="bg-white border rounded-xl p-3 text-sm text-gray-700 flex items-center gap-2">
                      <span className="text-lg">💡</span>
                      {item}
                    </div>
                  ))}
                </div>
                {activePlan && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-xl max-w-md mx-auto">
                    <p className="text-sm text-blue-800 font-medium mb-1">
                      📚 Kế hoạch hiện tại:
                    </p>
                    <p className="text-sm text-blue-700">{activePlan.title}</p>
                  </div>
                )}
              </div>
            ) : (
              messages.map((msg, idx) => (
                <MessageBubble key={idx} msg={msg} />
              ))
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-white border rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t bg-white">
            {/* File preview */}
            {uploadFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {uploadFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-100 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm"
                  >
                    <span>📎</span>
                    <span className="max-w-[150px] truncate">{file.name}</span>
                    <button
                      onClick={() => removeFile(idx)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2.5 border rounded-xl hover:bg-gray-50 transition text-gray-600"
                title="Đính kèm file"
              >
                📎
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="Nhập câu hỏi của bạn..."
                className="flex-1 px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={sending}
              />
              <button
                onClick={handleSend}
                disabled={sending || (!input.trim() && uploadFiles.length === 0)}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? '⏳' : 'Gửi'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
