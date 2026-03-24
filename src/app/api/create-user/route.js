import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Dùng service_role key để tạo user không cần xác nhận email
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { email, password, full_name, role } = await request.json()

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Không cần xác nhận email
      user_metadata: { full_name, role }
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ user: data.user })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}