'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

export default function ChatPage() {
  const [profile, setProfile] = useState(null)
  const [rooms, setRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showNewChat, setShowNewChat] = useState(false)
  const [students, setStudents] = useState([])
  const [teachers, setTeachers] = useState([])
  const messagesEndRef = useRef(null)
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      setProfile(profileData)
      await fetchRooms(profileData)
      if (profileData.role === 'teacher' || profileData.role === 'admin') {
        await fetchStudents()
      }
      if (profileData.role === 'parent' || profileData.role === 'student') {
        await fetchTeachers()
      }
      setLoading(false)
    }
    getData()
  }, [])

  useEffect(() => {
    if (!selectedRoom) return

    fetchMessages(selectedRoom.id)

    // Realtime subscription
    const channel = supabase
      .channel(`room-${selectedRoom.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${selectedRoom.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
        scrollToBottom()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [selectedRoom])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchRooms = async (profileData) => {
    let query = supabase
      .from('chat_rooms')
      .select(`
        *,
        student:students(
          student_code,
          profile:profiles!students_profile_id_fkey(full_name)
        ),
        teacher:profiles!chat_rooms_teacher_id_fkey(full_name, role),
        parent:profiles!chat_rooms_parent_id_fkey(full_name)
      `)

    if (profileData.role === 'teacher') {
      query = query.eq('teacher_id', profileData.id)
    } else if (profileData.role === 'parent') {
      query = query.eq('parent_id', profileData.id)
    }

    const { data } = await query.order('created_at', { ascending: false })
    setRooms(data || [])
  }

  const fetchMessages = async (roomId) => {
    const { data } = await supabase
      .from('chat_messages')
      .select(`
        *,
        sender:profiles!chat_messages_sender_id_fkey(full_name, role)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
    setMessages(data || [])

    // Đánh dấu đã đọc
    await supabase.from('chat_messages')
      .update({ is_read: true })
      .eq('room_id', roomId)
      .neq('sender_id', profile?.id)
  }

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select(`
        id, student_code,
        profile:profiles!students_profile_id_fkey(full_name),
        parent:profiles!students_parent_id_fkey(id, full_name),
        class:classes(name)
      `)
    setStudents(data || [])
  }

  const fetchTeachers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'teacher')
      .order('full_name')
    setTeachers(data || [])
  }

  const handleCreateRoom = async (student) => {
    if (!student.parent?.id) {
      return alert('Học sinh này chưa có phụ huynh liên kết!')
    }

    // Kiểm tra room đã tồn tại chưa
    const { data: existing } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('student_id', student.id)
      .eq('teacher_id', profile.id)
      .maybeSingle()

    if (existing) {
      setSelectedRoom(existing)
      setShowNewChat(false)
      return
    }

    const { data: newRoom } = await supabase
      .from('chat_rooms')
      .insert({
        student_id: student.id,
        teacher_id: profile.id,
        parent_id: student.parent.id,
      })
      .select()
      .single()

    await fetchRooms(profile)
    setSelectedRoom(newRoom)
    setShowNewChat(false)
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedRoom) return
    setSending(true)

    await supabase.from('chat_messages').insert({
      room_id: selectedRoom.id,
      sender_id: profile.id,
      content: newMessage.trim(),
    })

    setNewMessage('')
    setSending(false)
  }

  const getRoomName = (room) => {
    if (profile?.role === 'teacher' || profile?.role === 'admin') {
      return `${room.student?.profile?.full_name} (${room.parent?.full_name || 'PH'})`
    }
    return room.teacher?.full_name || 'Giáo viên'
  }

  const getRoomSub = (room) => {
    if (profile?.role === 'teacher' || profile?.role === 'admin') {
      return `HS: ${room.student?.student_code}`
    }
    return `Liên hệ về ${room.student?.profile?.full_name}`
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Đang tải...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar profile={profile} />

      <div className="flex-1 flex overflow-hidden" style={{ height: '100vh' }}>

        {/* Danh sách phòng chat */}
        <div className="w-80 bg-white border-r flex flex-col">
          <div className="p-5 border-b flex justify-between items-center">
            <h2 className="font-bold text-gray-800 text-lg">💬 Tin nhắn</h2>
            {(profile?.role === 'teacher' || profile?.role === 'admin') && (
              <button
                onClick={() => setShowNewChat(!showNewChat)}
                className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition text-lg"
              >
                ＋
              </button>
            )}
          </div>

          {/* Tạo chat mới */}
          {showNewChat && (
            <div className="p-3 border-b bg-blue-50">
              <p className="text-xs font-semibold text-blue-700 mb-2">Chọn học sinh để nhắn tin với phụ huynh:</p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {students.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleCreateRoom(s)}
                    className="w-full text-left px-3 py-2 bg-white rounded-lg hover:bg-blue-100 transition text-sm"
                  >
                    <p className="font-medium text-gray-800">{s.profile?.full_name}</p>
                    <p className="text-xs text-gray-400">
                      {s.class?.name ? `Lớp ${s.class.name}` : ''} • PH: {s.parent?.full_name || '❌ Chưa liên kết'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Danh sách rooms */}
          <div className="flex-1 overflow-y-auto">
            {rooms.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <div className="text-4xl mb-2">💬</div>
                <p className="text-sm">Chưa có cuộc trò chuyện nào</p>
                {(profile?.role === 'teacher' || profile?.role === 'admin') && (
                  <p className="text-xs mt-1">Nhấn ＋ để bắt đầu</p>
                )}
              </div>
            ) : rooms.map(room => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className={`w-full text-left px-4 py-4 border-b hover:bg-gray-50 transition
                  ${selectedRoom?.id === room.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
                    {getRoomName(room).charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{getRoomName(room)}</p>
                    <p className="text-xs text-gray-400 truncate">{getRoomSub(room)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Khu vực chat */}
        {!selectedRoom ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-400">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-lg font-medium">Chọn cuộc trò chuyện</p>
              <p className="text-sm mt-1">hoặc tạo mới để bắt đầu nhắn tin</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">

            {/* Chat header */}
            <div className="bg-white border-b px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                {getRoomName(selectedRoom).charAt(0)}
              </div>
              <div>
                <p className="font-bold text-gray-800">{getRoomName(selectedRoom)}</p>
                <p className="text-xs text-gray-400">{getRoomSub(selectedRoom)}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  <div className="text-4xl mb-2">👋</div>
                  <p>Bắt đầu cuộc trò chuyện!</p>
                </div>
              ) : messages.map(msg => {
                const isMe = msg.sender_id === profile?.id
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md xl:max-w-lg`}>
                      {!isMe && (
                        <p className="text-xs text-gray-400 mb-1 ml-1">{msg.sender?.full_name}</p>
                      )}
                      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed
                        ${isMe
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-white text-gray-800 rounded-bl-md shadow-sm border'
                        }`}>
                        {msg.content}
                      </div>
                      <p className={`text-xs text-gray-400 mt-1 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('vi-VN', {
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t px-4 py-4">
              <div className="flex gap-3 items-end">
                <textarea
                  rows={1}
                  placeholder="Nhập tin nhắn..."
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value)
                    e.target.style.height = 'auto'
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                  style={{ minHeight: '46px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim()}
                  className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition disabled:opacity-50 flex-shrink-0"
                >
                  {sending ? '⏳' : '➤'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 ml-1">Enter để gửi, Shift+Enter để xuống dòng</p>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}