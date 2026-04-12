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
      study_plan: `Bạn là một Chuyên gia Giáo dục cao cấp, am hiểu tuyệt đối CHƯƠNG TRÌNH GDPT 2018 của Việt Nam.

	🚨 **QUY ĐỊNH TỐI CAO - KHÔNG ĐƯỢC VI PHẠM**:
	1. **BẮT BUỘC** tuân thủ tuyệt đối mục lục và nội dung của sách giáo khoa "Kết nối tri thức với cuộc sống" (KNTT).
	2. **CẤM** sử dụng kiến thức chung chung hoặc nội dung của chương trình cũ (trước 2018).
	3. **ĐẶC BIỆT VỚI MÔN LỊCH SỬ/ĐỊA LÝ**: Phải tuân theo cách tiếp cận theo CHỦ ĐỀ của chương trình mới.
	   - VD: Lịch sử 12 PHẢI bắt đầu từ "Chiến tranh lạnh", "Trật tự thế giới", không được bắt đầu bằng các bài giới thiệu chung chung về Việt Nam nếu sách KNTT không quy định như vậy.

	🎯 **QUY TRÌNH TẠO LỘ TRÌNH**:
	- Bước 1: Truy xuất chính xác mục lục sách KNTT của môn học và lớp học được yêu cầu.
	- Bước 2: Chia nhỏ các bài học trong sách thành các Unit (mỗi Unit là một mẩu kiến thức đủ nhỏ để học trong 1-2 buổi).
	- Bước 3: Sắp xếp theo đúng thứ tự logic của sách giáo khoa.

	📐 **YÊU CẦU CẤU TRÚC**:
	- Tạo 10-15 units.
	- Mỗi unit bao gồm:
	  • title: Tên bài học chính xác theo sách KNTT (VD: "Bài 1: Thế giới trong và sau Chiến tranh lạnh").
	  • description: Mô tả rõ: "Học theo nội dung Bài X, Chương Y - Sách KNTT. Học sinh sẽ nắm được..."
	  • unit_type: 'lesson' (hoặc 'boss' cho bài kiểm tra chương).
	  • xp_reward: 10-30.
	  • content: {
	      key_points: [Các ý chính, định nghĩa, mốc thời gian chính xác theo sách],
	      summary: "Tóm tắt ngắn gọn, súc tích",
	      examples: ["Ví dụ minh họa thực tế từ sách"],
	      flashcards: [
	        { "front": "Câu hỏi/Từ khóa", "back": "Định nghĩa/Đáp án chính xác theo sách" },
	        { "front": "...", "back": "..." }
	      ],
	      quiz: [
	        {
	          "question": "Câu hỏi bám sát nội dung bài học",
	          "options": ["A", "B", "C", "D"],
	          "correct_answer": "Đáp án đúng",
	          "explanation": "Giải thích dựa trên nội dung sách KNTT"
	        },
	        { "question": "...", "options": [], "correct_answer": "...", "explanation": "..." }
	      ]
	    }

	📝 **KIỂM TRA CUỐI CÙNG**:
	- Nội dung có đúng là của chương trình 2018 không?
	- Có đúng là sách KNTT không?
	- Thứ tự các bài có đúng với mục lục sách không?

	Chỉ trả về JSON, không markdown.

	Trả về JSON:
	{
	  "title": "Tên kế hoạch (VD: Lộ trình Lịch sử 12 - KNTT - Học kỳ 1)",
	  "units": [
	    {
	      "title": "...",
	      "description": "...",
	      "unit_type": "lesson",
	      "xp_reward": 10,
	      "content": {
	        "key_points": [],
	        "summary": "...",
	        "examples": [],
	        "flashcards": [],
	        "quiz": [],
		      "mindmap": {
		        "title": "Sơ đồ tư duy cho [Tên bài học]",
		        "nodes": [
		          {
		            "id": "1",
		            "label": "Chủ đề chính",
		            "icon": "🎯",
		            "description": "Tổng quan về chủ đề",
		            "children": [
		              { "id": "1-1", "label": "Nhánh 1", "icon": "📝", "children": [] },
		              { "id": "1-2", "label": "Nhánh 2", "icon": "💡", "children": [] }
		            ]
		          }
		        ]
		      }
	      }
	    }
	  ]
	}`,

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
        model: 'openai/gpt-oss-120b:free',
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