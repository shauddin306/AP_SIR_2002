import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/client'

export async function POST(req: NextRequest) {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if caller is super-admin
  const supabaseService = createServiceClient()
  const { data: callerRole } = await supabaseService
    .from('user_roles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerRole?.role !== 'super-admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, password, role } = await req.json()

  if (!email || !password || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Create the user using Service Role
  const { data: authData, error: authError } = await supabaseService.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message || 'Failed to create user' }, { status: 400 })
  }

  // Assign the role in user_roles table
  const { error: roleError } = await supabaseService
    .from('user_roles')
    .insert({ id: authData.user.id, role })

  if (roleError) {
    // If role assignment fails, we should ideally delete the user or log it
    console.error('Failed to assign role to new user:', roleError)
    return NextResponse.json({ error: 'User created but role assignment failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true, user: authData.user })
}
