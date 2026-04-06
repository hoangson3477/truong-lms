// src/app/api/create-user/route.js
// ✅ FIX #1: Thêm xác thực người gọi API

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Các role được phép tạo user, và role nào họ được tạo
const ALLOWED_CREATORS = {
  super_admin: ['school_admin', 'admin', 'teacher', 'student', 'parent'],
  school_admin: ['admin', 'teacher', 'student', 'parent'],
  admin: ['teacher', 'student', 'parent'],
}

export async function POST(request) {
  try {
    // ✅ Xác thực người gọi
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {}, // không cần set cookie trong API route
        },
      }
    )

    const { data: { user: caller } } = await supabase.auth.getUser()
    if (!caller) {
      return NextResponse.json({ error: 'Chưa đăng nhập!' }, { status: 401 })
    }

    // Lấy profile người gọi
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, school_id')
      .eq('id', caller.id)
      .single()

    if (!callerProfile) {
      return NextResponse.json({ error: 'Không tìm thấy profile!' }, { status: 403 })
    }

    const { email, password, full_name, role, school_id } = await request.json()

    // ✅ Kiểm tra quyền tạo user
    const allowedRoles = ALLOWED_CREATORS[callerProfile.role]
    if (!allowedRoles) {
      return NextResponse.json({ error: 'Bạn không có quyền tạo tài khoản!' }, { status: 403 })
    }
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: `Bạn không được phép tạo tài khoản với role "${role}"!` }, { status: 403 })
    }

    // ✅ school_admin/admin chỉ được tạo user trong trường của mình
    if (['school_admin', 'admin'].includes(callerProfile.role) && school_id && school_id !== callerProfile.school_id) {
      return NextResponse.json({ error: 'Bạn chỉ được tạo tài khoản trong trường của mình!' }, { status: 403 })
    }

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