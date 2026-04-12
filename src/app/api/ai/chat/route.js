import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getRAGService } from '@/lib/rag'

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

    const { messages, system_prompt, planId } = await request.json()

    // Get RAG service and search for relevant materials if we have a planId
    let ragContext = ''
    if (planId) {
      try {
        // Get student ID from profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        if (profileData) {
          // Get student record to get student_id
          const { data: studentData } = await supabase
            .from('students')
            .select('id')
            .eq('profile_id', profileData.id)
            .single()

          if (studentData) {
            // Initialize RAG service
            const ragService = getRAGService()

            // Extract query from last user message
            const lastUserMessage = messages
              .filter(m => m.role === 'user')
              .pop()

            if (lastUserMessage && lastUserMessage.content) {
              // Search materials
              const results = await ragService.searchMaterials(
                lastUserMessage.content,
                studentData.id,
                3 // Top 3 results
              )

              // Format context for prompt
              ragContext = ragService.formatContextForPrompt(results)
            }
          }
        }
      } catch (ragError) {
        console.error('RAG error:', ragError)
        // Continue without RAG context if there's an error
      }
    }

    // Enhance system prompt with RAG context if available
    const enhancedSystemPrompt = `${system_prompt}${ragContext}`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Truong LMS - AI Tutor',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b:free',
        messages: [
          {
            role: 'system',
            content: enhancedSystemPrompt
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