'use client'

import { useState } from 'react'

export default function UserManagementClient() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('search-user')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage('✅ User created successfully!')
        setEmail('')
        setPassword('')
      } else {
        setMessage(`❌ Error: ${data.error}`)
      }
    } catch (err: any) {
      setMessage(`❌ Failed to create user: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px 16px', borderRadius: 8 }}
            placeholder="user@mindt.co.in"
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>Password</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px 16px', borderRadius: 8 }}
            placeholder="SecurePassword123!"
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px 16px', borderRadius: 8 }}
          >
            <option value="search-user">Search User (Search Only)</option>
            <option value="admin">Admin (Upload & Edit)</option>
            <option value="super-admin">Super Admin (All Access)</option>
          </select>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: 8,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            marginTop: 8,
            border: 'none'
          }}
        >
          {loading ? 'Creating...' : 'Create User'}
        </button>

        {message && (
          <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: message.startsWith('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: message.startsWith('✅') ? '#34d399' : '#f87171', fontSize: 14 }}>
            {message}
          </div>
        )}
      </form>
    </div>
  )
}
