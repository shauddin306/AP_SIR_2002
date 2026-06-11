import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/client'
import { Client } from 'ssh2'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServiceClient()
    const { data: nodes, error } = await supabase
      .from('worker_nodes')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error
    
    // Check heartbeat. If more than 3 minutes ago, mark offline
    const updatedNodes = nodes.map((node) => {
      const lastHeartbeat = new Date(node.last_heartbeat).getTime()
      const now = new Date().getTime()
      if (now - lastHeartbeat > 180000 && node.status !== 'provisioning') {
        node.status = 'offline'
      }
      return node
    })

    return NextResponse.json({ nodes: updatedNodes })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { action, ip, pemKey } = await req.json()
    const supabase = createServiceClient()

    if (action === 'provision') {
      if (!ip || !pemKey) {
        return NextResponse.json({ error: 'IP and PEM Key are required' }, { status: 400 })
      }

      // 1. Create the worker node in Supabase
      const { data: node, error } = await supabase
        .from('worker_nodes')
        .insert({
          ip_address: ip,
          status: 'provisioning',
          current_action: 'Connecting via SSH...'
        })
        .select()
        .single()

      if (error) throw error

      // 2. Start the automated provisioning in the background
      // Note: In Next.js App Router, we can't easily run long background tasks without them dying on Vercel
      // For this demo, we will run the SSH command asynchronously, but Vercel might kill it if it takes 10+ mins.
      // If deploying to Vercel, this should really be an Inngest/Trigger.dev job or an AWS Lambda.
      // But since you are running locally or on a long-lived server, this works:
      
      runProvisioningJob(node.id, ip, pemKey).catch(e => console.error(e))

      return NextResponse.json({ success: true, node })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

async function runProvisioningJob(nodeId: string, ip: string, pemKey: string) {
  const supabase = createServiceClient()
  
  const updateStatus = async (action: string, status: string = 'provisioning') => {
    await supabase.from('worker_nodes').update({ current_action: action, status }).eq('id', nodeId)
  }

  const conn = new Client()
  
  try {
    await new Promise((resolve, reject) => {
      conn.on('ready', resolve)
      conn.on('error', reject)
      conn.connect({
        host: ip,
        port: 22,
        username: 'ubuntu',
        privateKey: pemKey,
        readyTimeout: 10000
      })
    })

    await updateStatus('Connected! Cloning Repository...')
    
    // Commands to run on the AWS Server
    const bootstrapScript = `
      sudo apt-get update -y
      sudo apt-get install -y python3-venv python3-pip git poppler-utils
      
      if [ ! -d "voter-ai-pipeline" ]; then
        git clone https://github.com/shauddin/voter-ai-pipeline.git
      fi
      
      cd voter-ai-pipeline
      python3 -m venv venv
      source venv/bin/activate
      pip install -r requirements.txt
      
      # Start the daemon
      pkill -f 'python.*worker_daemon.py' || true
      export SUPABASE_URL="${process.env.NEXT_PUBLIC_SUPABASE_URL}"
      export SUPABASE_KEY="${process.env.SUPABASE_SERVICE_ROLE_KEY}"
      nohup bash -c 'source venv/bin/activate && python3 worker_daemon.py > daemon.log 2>&1 &' &
    `

    await updateStatus('Installing dependencies (this takes ~5-10 mins)...')

    await new Promise((resolve, reject) => {
      conn.exec(bootstrapScript, (err, stream) => {
        if (err) return reject(err)
        stream.on('close', () => resolve(true)).on('data', () => {}).stderr.on('data', () => {})
      })
    })

    await updateStatus('Installation Complete! Waiting for Heartbeat...', 'active')
    conn.end()
    
  } catch (err: any) {
    console.error("Provisioning failed:", err)
    await updateStatus(\`Failed: \${err.message}\`, 'offline')
    conn.end()
  }
}
