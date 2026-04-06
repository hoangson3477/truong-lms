// src/app/api/ai/generate/route.js
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
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

    const { prompt, type } = await request.json()
    // type: 'study_plan' | 'flashcards' | 'quiz' | 'mind_map' | 'summary'

    const systemPrompts = {
      study_plan: `Bạn là AI tạo kế hoạch học tập cho học sinh Việt Nam. 
Trả về JSON hợp lệ (không markdown, không backtick) với cấu trúc:
{
  "title": "Tên kế hoạch",
  "units": [
    {
      "title": "Tên bài",
      "description": "Mô tả ngắn",
      "unit_type": "lesson|quiz|review",
      "xp_reward": 10,
      "content": { "key_points": ["..."], "summary": "..." }
    }
  ]
}
Tạo 10-15 unit, bắt đầu từ cơ bản đến nâng cao.`,

      flashcards: `Bạn là AI tạo flashcard học tập cho học sinh Việt Nam.
Trả về JSON hợp lệ (không markdown, không backtick) với cấu trúc:
{
  "title": "Tên bộ thẻ",
  "cards": [
    { "front": "Câu hỏi/Khái niệm", "back": "Đáp án/Giải thích", "difficulty": "easy|medium|hard" }
  ]
}
Tạo 10-20 flashcard, đa dạng độ khó.`,

      quiz: `Bạn là AI tạo câu hỏi kiểm tra cho học sinh Việt Nam.
Trả về JSON hợp lệ (không markdown, không backtick) với cấu trúc:
{
  "title": "Tên bài kiểm tra",
  "questions": [
    {
      "question_type": "multiple_choice",
      "question": "Nội dung câu hỏi?",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct_answer": "A. ...",
      "explanation": "Giải thích tại sao đáp án đúng"
    }
  ]
}
Tạo 10 câu hỏi, mix trắc nghiệm và đúng/sai.`,

      mind_map: `Bạn là AI tạo sơ đồ tư duy cho học sinh Việt Nam.
Trả về JSON hợp lệ (không markdown, không backtick) với cấu trúc:
{
  "title": "Chủ đề chính",
  "nodes": [
    {
      "id": "1",
      "label": "Nhánh chính",
      "children": [
        { "id": "1-1", "label": "Nhánh con", "children": [] }
      ]
    }
  ]
}
Tạo sơ đồ 3-4 cấp, mỗi nhánh chính có 2-4 nhánh con.`,

      summary: `Bạn là AI tóm tắt tài liệu học tập cho học sinh Việt Nam.
Trả về JSON hợp lệ (không markdown, không backtick) với cấu trúc:
{
  "summary": "Tóm tắt ngắn gọn",
  "key_points": ["Điểm chính 1", "Điểm chính 2", ...],
  "vocabulary": [{ "term": "Thuật ngữ", "definition": "Định nghĩa" }]
}`
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Truong LMS - AI Generate',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat-v3-0324:free',
        messages: [
          { role: 'system', content: systemPrompts[type] || systemPrompts.summary },
          { role: 'user', content: prompt }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      })
    })

    const data = await response.json()

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 })
    }

    const rawContent = data.choices?.[0]?.message?.content || '{}'

    // Parse JSON từ response
    let parsed
    try {
      const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      parsed = { raw: rawContent }
    }

    return NextResponse.json({ result: parsed, model: data.model })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}