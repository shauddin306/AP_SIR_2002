"use client"

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface VolunteerSession {
  id: string;
  volunteer_id: string;
  status: string;
  current_task: string;
  mac_address: string;
  ip_address: string;
  os_info: string;
  voters_processed: number;
  last_ping: string;
}

export default function TelemetryDashboard() {
  const [sessions, setSessions] = useState<VolunteerSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('volunteer_sessions')
      .select('*')
      .order('last_ping', { ascending: false });

    if (error) {
      console.error('Error fetching telemetry:', error);
    } else if (data) {
      setSessions(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();

    // Set up Realtime subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'volunteer_sessions' },
        (payload) => {
          console.log('Change received!', payload);
          fetchSessions(); // Refresh data on any change
        }
      )
      .subscribe();

    // Fallback polling just in case realtime drops
    const interval = setInterval(fetchSessions, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  // Determine if a session is currently active (pinged in the last 2 minutes)
  const isSessionActive = (lastPing: string, status: string) => {
    if (status === 'offline') return false;
    const pingDate = new Date(lastPing);
    const now = new Date();
    const diffSeconds = (now.getTime() - pingDate.getTime()) / 1000;
    return diffSeconds < 120; // Active if pinged within last 2 minutes
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Volunteer Telemetry</h1>
            <p className="text-gray-400 mt-2">Live monitoring of OCR worker nodes</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm text-green-400 font-medium">System Live</span>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-gray-800 rounded-lg"></div>
            <div className="h-16 bg-gray-800 rounded-lg"></div>
            <div className="h-16 bg-gray-800 rounded-lg"></div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl border border-gray-700">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Volunteer ID</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Current Task</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Voters Processed</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Hardware / IP</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last Ping</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700 bg-gray-800">
                {sessions.map((session) => {
                  const active = isSessionActive(session.last_ping, session.status);
                  return (
                    <tr key={session.id} className="hover:bg-gray-750 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-300 border border-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900 text-red-300 border border-red-800">
                            Offline
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-white">{session.volunteer_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-blue-400">{session.current_task || 'Idle'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                        {session.voters_processed.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-300">{session.os_info}</div>
                        <div className="text-xs text-gray-500 font-mono">{session.ip_address}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {new Date(session.last_ping).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No active volunteers found. Waiting for heartbeats...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
