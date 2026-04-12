// src/app/api/ai/generate-quiz/route.js
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

      const { prompt, questionCount = 10, difficulty = 'mixed' } = await request.json()

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Truong LMS - Quiz',
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b:free',
          messages: [
            {
                role: 'system',
                content: `Bạn là AI tạo bài kiểm tra trắc nghiệm cho học sinh Việt Nam.
            Tạo ${questionCount} câu hỏi với độ khó ${difficulty === 'easy' ? 'dễ' : difficulty === 'hard' ? 'khó' : 'trung bình'}.
            Trả về CHỈ JSON hợp lệ (không markdown, không backtick) với cấu trúc:
                {
                "title": "Tên bài kiểm tra",
                "questions": [
                    {
                        "question_type": "multiple_choice" | "true_false",
                        "question": "Nội dung câu hỏi?",
                        "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
                        "correct_answer": "A. ...",
                        "explanation": "Giải thích tại sao đáp án đúng"
                    }
                    ]
                }
            Yêu cầu:
            - Câu hỏi rõ ràng, liên quan đến chủ đề yêu cầu
            - Đáp án sai phải hợp lý (distractors)
            - Luôn có giải thích chi tiết
            - Dùng tiếng Việt, ngôn ngữ phù hợp với độ khó`
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 4000,
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
        parsed = { title: 'Bài kiểm tra', questions: [] }
      }

      return NextResponse.json({ result: parsed })
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  }