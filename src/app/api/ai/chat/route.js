// src/app/api/ai/chat/route.js
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    // Xác thực user
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập!' }, { status: 401 })
    }

    const { messages, system_prompt } = await request.json()

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Truong LMS - AI Tutor',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat-v3-0324:free',
        messages: [
          {
            role: 'system',
            content: system_prompt || `Bạn là một gia sư AI thông minh, chuyên hỗ trợ học sinh Việt Nam từ lớp 6 đến lớp 12. 
Bạn trả lời bằng tiếng Việt, giải thích dễ hiểu, có ví dụ cụ thể.
Khi giải bài tập, bạn hướng dẫn từng bước, không đưa đáp án ngay.
Bạn khuyến khích học sinh tư duy và đặt câu hỏi.`
          },
          ...messages
        ],
        max_tokens: 2000,
        temperature: 0.7,
      })
    })

    const data = await response.json()

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 })
    }

    return NextResponse.json({
      content: data.choices?.[0]?.message?.content || 'Không có phản hồi.',
      model: data.model,
      usage: data.usage,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}