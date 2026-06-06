import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupSuperAdmin() {
  console.log('🚀 Starting Super Admin Setup...')
  const email = 'mindt2019@gmail.com'
  const password = 'SuperAdminPassword2026!'

  // 1. Create the user in Supabase Auth
  console.log(`Creating user: ${email}`)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true // Auto-confirm the email
  })

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log('⚠️ User already exists in Auth. Fetching user ID...')
      // We will continue to try and assign the role
    } else {
      console.error('❌ Failed to create user:', authError.message)
      return
    }
  }

  // Get the user ID
  const { data: listData } = await supabase.auth.admin.listUsers()
  const user = listData.users.find(u => u.email === email)
  
  if (!user) {
    console.error('❌ Could not find user after creation.')
    return
  }

  console.log(`✅ User found/created with ID: ${user.id}`)

  // 2. Assign the super-admin role in public.user_roles
  console.log(`Assigning super-admin role...`)
  const { error: roleError } = await supabase
    .from('user_roles')
    .upsert({
      id: user.id,
      role: 'super-admin'
    })

  if (roleError) {
    console.error('❌ Failed to assign role in user_roles table:', roleError.message)
    console.error('👉 Have you run the 010_admin_roles_rls.sql migration in the Supabase Dashboard yet?')
    return
  }

  console.log('🎉 Super Admin setup complete!')
  console.log('--------------------------------------------------')
  console.log(`Email: ${email}`)
  console.log(`Password: ${password}`)
  console.log('--------------------------------------------------')
  console.log('⚠️ Please change your password after logging in.')
}

setupSuperAdmin()
