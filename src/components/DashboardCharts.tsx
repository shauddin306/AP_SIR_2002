'use client';
import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#ec4899', '#facc15'];

export default function DashboardCharts() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch('/api/demographics');
      if (res.ok) {
        const d = await res.json();
        setData(d.data || []);
      }
    }
    fetchData();
    const int = setInterval(fetchData, 10000);
    return () => clearInterval(int);
  }, []);

  if (data.length === 0) return null;

  return (
    <div style={{ height: 250 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(51,65,85,0.5)', borderRadius: 8, color: '#f8fafc' }}
            itemStyle={{ color: '#f8fafc' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16 }}>
        {data.map((entry, index) => (
          <div key={`legend-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }} />
            {entry.name}: <strong style={{ color: '#f8fafc' }}>{entry.value.toLocaleString()}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
