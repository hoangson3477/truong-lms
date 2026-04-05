import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { email, password, full_name, role, school_id } = await request.json()

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role, school_id }
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Đảm bảo profile được cập nhật đúng school_id
    if (school_id) {
      await supabaseAdmin
        .from('profiles')
        .update({ school_id, role })
        .eq('id', data.user.id)
    }

    return NextResponse.json({ user: data.user })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}