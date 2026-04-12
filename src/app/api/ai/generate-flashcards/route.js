// src/app/api/ai/generate-flashcards/route.js
  'use server'
  import { createServerClient } from '@supabase/ssr'
  import { cookies } from 'next/headers'
  import { NextResponse } from 'next/server'

  export async function POST(request) {
    try {
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
      )

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

      const { prompt, count = 15 } = await request.json()

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Truong LMS - Flashcards',
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b:free',
          messages: [
            {
              role: 'system',
              content: `Bạn là AI tạo flashcard học tập cho học sinh Việt Nam.
  Tạo ${count} flashcard về chủ đề được yêu cầu.
  Trả về CHỈ JSON hợp lệ (không markdown, không backtick) với cấu trúc:
  {
    "title": "Tên bộ thẻ (ngắn gọn)",
    "cards": [
      {
        "front": "Câu hỏi hoặc khái niệm (ngắn, rõ ràng)",
        "back": "Đáp án chi tiết, dễ hiểu",
        "difficulty": "easy|medium|hard"
      }
    ]
  }
  Yêu cầu:
  - Card cơ bản (easy): khái niệm, định nghĩa
  - Card trung bình (medium): ví dụ, ứng dụng
  - Card khó (hard): bài tập ngắn, tình huống phức tạp
  - Dùng tiếng Việt, ngắn gọn nhưng đầy đủ ý`
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 3000,
          temperature: 0.7,
        })
      })

      const data = await response.json()
      if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 })

      const rawContent = data.choices?.[0]?.message?.content || '{}'
      let parsed
      try {
        const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        parsed = JSON.parse(cleaned)
      } catch {
        parsed = { title: 'Flashcard', cards: [] }
      }

      return NextResponse.json({ result: parsed })
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  }