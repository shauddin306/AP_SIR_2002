'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/browser'
import UploadPdfClient from '@/components/UploadPdfClient'
import UserManagementClient from '@/components/UserManagementClient'
import { ActiveJobsQueue } from '@/components/ActiveJobsQueue'

export default function AdminDashboard() {
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        setRole(data?.role || 'none')
      }
      setLoading(false)
    }
    fetchRole()
  }, [])

  if (loading) {
    return <div className="text-white text-center mt-20">Loading Dashboard...</div>
  }

  return (
    <div>
      <div style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#f8fafc', marginBottom: 8, marginTop: 0 }}>Admin Dashboard</h1>
          <p style={{ color: '#94a3b8', margin: 0 }}>Manage voter records and process new PDFs.</p>
        </div>
        
        <div style={{ 
          background: 'rgba(30, 41, 59, 0.8)', 
          border: '1px solid rgba(51, 65, 85, 1)', 
          padding: '8px 16px', 
          borderRadius: 8, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12 
        }}>
          <span style={{ color: '#cbd5e1', fontSize: 14 }}>Role:</span>
          {role === 'super-admin' ? (
            <span style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}>SUPER ADMIN</span>
          ) : role === 'admin' ? (
            <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}>ADMIN</span>
          ) : (
            <span style={{ background: 'rgba(249, 115, 22, 0.2)', color: '#fdba74', border: '1px solid rgba(249, 115, 22, 0.3)', padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}>PENDING APPROVAL</span>
          )}
        </div>
      </div>

      {(role === 'super-admin' || role === 'admin') ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
          
          <div className="card-glass" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '0 0 16px 0', overflow: 'hidden' }}>
            <UploadPdfClient />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 32 }}>
            <div className="card-glass" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 32, height: 'max-content' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, marginTop: 0 }}>
                <span>📊</span> System Status
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(51, 65, 85, 0.5)', paddingBottom: 12, marginBottom: 8 }}>
                  <span style={{ color: '#94a3b8' }}>Search Engine</span>
                  <span style={{ color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span> Online
                  </span>
                </div>
                <ActiveJobsQueue />
              </div>
            </div>

            {role === 'super-admin' && (
              <div className="card-glass" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 32, height: 'max-content' }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, marginTop: 0 }}>
                  <span>👥</span> User Management
                </h2>
                <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
                  Create new users and assign their access level.
                </p>
                <UserManagementClient />
              </div>
            )}
          </div>
        </div>
      ) : role === 'search-user' ? (
        <div className="card-glass" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>🔎</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#f8fafc', marginBottom: 16 }}>Search Access Granted</h2>
          <p style={{ color: '#94a3b8', maxWidth: 450, margin: '0 auto', lineHeight: 1.5, marginBottom: 32 }}>
            You are logged in as a Search User. You have unlimited access to the AI Voter Search directory, but no admin privileges.
          </p>
          <a href="/search" style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
            Go to Search Directory
          </a>
        </div>
      ) : (
        <div className="card-glass" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>🔒</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#f8fafc', marginBottom: 16 }}>Access Restricted</h2>
          <p style={{ color: '#94a3b8', maxWidth: 450, margin: '0 auto', lineHeight: 1.5 }}>
            Your account has been created, but you do not currently have Admin privileges. Please contact the Super Admin to approve your account.
          </p>
        </div>
      )}
    </div>
  )
}
