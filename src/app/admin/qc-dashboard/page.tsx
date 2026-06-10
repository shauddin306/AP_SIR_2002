'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function QCDashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [assembly, setAssembly] = useState('152');
  const [part, setPart] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from('qc_jobs')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setJobs(data);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  const queueJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assembly || !part) return;
    setLoading(true);
    
    // Check if it already exists
    const { data: existing } = await supabase
      .from('qc_jobs')
      .select('id')
      .eq('assembly_no', parseInt(assembly))
      .eq('part_no', parseInt(part))
      .single();
      
    if (existing) {
      alert("Job already exists in the queue!");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('qc_jobs')
      .insert([{
        assembly_no: parseInt(assembly),
        part_no: parseInt(part),
        status: 'pending'
      }]);

    if (error) {
      alert("Error adding job: " + error.message);
    } else {
      setPart('');
      fetchJobs();
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto text-white">
      <h1 className="text-3xl font-bold mb-6 text-[#14b8a6]">Offline QC Dashboard</h1>
      
      <div className="bg-gray-800 p-6 rounded-lg mb-8 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Queue New Job to Mac Worker</h2>
        <form onSubmit={queueJob} className="flex gap-4 items-end">
          <div>
            <label className="block text-sm mb-1">Assembly No</label>
            <input 
              type="number" 
              value={assembly}
              onChange={(e) => setAssembly(e.target.value)}
              className="px-4 py-2 bg-gray-700 rounded text-white"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Part No</label>
            <input 
              type="number" 
              value={part}
              onChange={(e) => setPart(e.target.value)}
              className="px-4 py-2 bg-gray-700 rounded text-white"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="px-6 py-2 bg-[#14b8a6] hover:bg-teal-500 rounded font-semibold transition"
          >
            {loading ? "Adding..." : "Add to Queue"}
          </button>
        </form>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-700">
            <tr>
              <th className="p-4">Assembly</th>
              <th className="p-4">Part</th>
              <th className="p-4">Status</th>
              <th className="p-4">Progress</th>
              <th className="p-4">Queued At</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-gray-400">No jobs in queue.</td></tr>
            ) : jobs.map((job) => (
              <tr key={job.id} className="border-t border-gray-700">
                <td className="p-4">{job.assembly_no}</td>
                <td className="p-4">{job.part_no}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold
                    ${job.status === 'completed' ? 'bg-green-900 text-green-300' : 
                      job.status === 'in_progress' ? 'bg-blue-900 text-blue-300' : 
                      job.status === 'failed' ? 'bg-red-900 text-red-300' : 'bg-gray-600'}`}>
                    {job.status.toUpperCase()}
                  </span>
                  {job.error_message && <p className="text-red-400 text-xs mt-1">{job.error_message}</p>}
                </td>
                <td className="p-4">
                  {job.status === 'in_progress' || job.status === 'completed' ? (
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-700 rounded-full h-2.5">
                        <div className="bg-[#14b8a6] h-2.5 rounded-full" style={{ width: `${job.total_pages ? (job.processed_pages / job.total_pages) * 100 : 0}%` }}></div>
                      </div>
                      <span className="text-sm text-gray-300">{job.processed_pages} / {job.total_pages} pages</span>
                    </div>
                  ) : "-"}
                </td>
                <td className="p-4 text-sm text-gray-400">
                  {new Date(job.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
