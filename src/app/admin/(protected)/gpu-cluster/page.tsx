'use client'

import { useState, useEffect } from 'react'

type WorkerNode = {
  id: string
  ip_address: string
  status: 'active' | 'offline' | 'provisioning'
  current_action: string
  last_heartbeat: string
  created_at: string
}

export default function GPUClusterDashboard() {
  const [nodes, setNodes] = useState<WorkerNode[]>([])
  const [ip, setIp] = useState('')
  const [pemKey, setPemKey] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchNodes = async () => {
    try {
      const res = await fetch('/api/cluster/nodes')
      const data = await res.json()
      if (data.nodes) setNodes(data.nodes)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNodes()
    const int = setInterval(fetchNodes, 5000)
    return () => clearInterval(int)
  }, [])

  const handleProvision = async () => {
    if (!ip || !pemKey) return alert("Please provide IP and PEM key")
    
    // Add temporary node to UI to feel responsive
    setNodes(prev => [...prev, {
      id: 'temp-' + Date.now(),
      ip_address: ip,
      status: 'provisioning',
      current_action: 'Starting provisioning sequence...',
      last_heartbeat: new Date().toISOString(),
      created_at: new Date().toISOString()
    }])

    const res = await fetch('/api/cluster/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'provision', ip, pemKey })
    })
    
    if (res.ok) {
      setIp('')
      fetchNodes()
    } else {
      alert("Failed to provision node")
    }
  }

  const getUptime = (createdAt: string) => {
    const diffHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
    return diffHours.toFixed(1) + ' hrs'
  }

  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: '#f8fafc', marginBottom: 8, marginTop: 0 }}>AWS GPU Cluster</h1>
        <p style={{ color: '#94a3b8', margin: 0 }}>Manage your distributed AI extraction swarm.</p>
      </div>

      {/* Add Node Section */}
      <div className="card-glass" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 32, marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#f8fafc', marginBottom: 24, marginTop: 0 }}>Add New Worker Node</h2>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>AWS Public IP Address</label>
            <input 
              type="text" 
              placeholder="e.g. 65.2.73.212"
              value={ip}
              onChange={e => setIp(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(51, 65, 85, 1)', borderRadius: 8, color: 'white' }}
            />
          </div>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>AWS .PEM Key Contents</label>
            <textarea 
              placeholder="-----BEGIN RSA PRIVATE KEY-----..."
              value={pemKey}
              onChange={e => setPemKey(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(51, 65, 85, 1)', borderRadius: 8, color: 'white', minHeight: 80 }}
            />
          </div>
          <button 
            onClick={handleProvision}
            style={{ marginTop: 26, padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Deploy AI Engine
          </button>
        </div>
      </div>

      {/* Nodes Grid */}
      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#f8fafc', marginBottom: 24 }}>Active Swarm ({nodes.length} Nodes)</h2>
      
      {loading ? (
        <div style={{ color: '#94a3b8' }}>Loading cluster status...</div>
      ) : nodes.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', background: 'rgba(30, 41, 59, 0.4)', borderRadius: 16, border: '1px dashed rgba(51, 65, 85, 1)', color: '#64748b' }}>
          No worker nodes active. Add an IP above to start processing.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 24 }}>
          {nodes.map(node => (
            <div key={node.id} style={{ 
              background: 'rgba(30, 41, 59, 0.6)', 
              border: '1px solid rgba(51, 65, 85, 0.8)', 
              borderRadius: 16, 
              padding: 24,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Status Indicator */}
              <div style={{ 
                position: 'absolute', top: 0, left: 0, width: 4, height: '100%',
                background: node.status === 'active' ? '#10b981' : node.status === 'offline' ? '#ef4444' : '#f59e0b'
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace' }}>
                    {node.ip_address}
                  </div>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                    ID: {node.id.split('-')[0]} • Est. Uptime: {getUptime(node.created_at)}
                  </div>
                </div>
                
                <span style={{ 
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 12,
                  background: node.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : node.status === 'offline' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: node.status === 'active' ? '#34d399' : node.status === 'offline' ? '#f87171' : '#fbbf24'
                }}>
                  {node.status.toUpperCase()}
                </span>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Live Status</div>
                <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {node.status === 'active' && <span className="animate-pulse" style={{ width: 8, height: 8, background: '#3b82f6', borderRadius: '50%' }} />}
                  {node.current_action || 'Idle'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {node.status === 'offline' ? (
                  <button style={{ flex: 1, padding: '8px 0', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Restart Daemon
                  </button>
                ) : node.status === 'active' ? (
                  <button style={{ flex: 1, padding: '8px 0', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Stop Daemon
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
