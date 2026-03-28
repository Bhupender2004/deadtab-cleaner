import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchScore } from '../lib/api';

export default function Dashboard() {
  const { data: scoreData, isLoading, error } = useQuery({
    queryKey: ['habitScore'],
    queryFn: fetchScore,
  });

  const scoreColor = useMemo(() => {
    if (!scoreData) return 'text-slate-400';
    if (scoreData.score >= 70) return 'text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]';
    if (scoreData.score >= 40) return 'text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]';
    return 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]';
  }, [scoreData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-accent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 bg-red-950/20 border-red-900/50">
        <h3 className="text-red-400 font-bold mb-2">Error loading dashboard</h3>
        <p className="text-slate-400 text-sm">Please check your connection or API key.</p>
      </div>
    );
  }

  const { score, factors, weeklyHistory, totalArchives } = scoreData!;

  // Format history for Recharts
  const chartData = [...weeklyHistory].reverse().map(w => ({
    name: `W${w.week}`,
    score: w.score,
    archives: w.archives
  }));

  const renderFactorBar = (label: string, value: number, weight: number, description: string) => (
    <div className="mb-5 last:mb-0">
      <div className="flex justify-between items-end mb-1.5">
        <div>
          <span className="text-sm font-semibold text-slate-800 block">{label}</span>
          <span className="text-xs text-slate-400">{description} • {weight}% weight</span>
        </div>
        <span className="text-sm font-mono text-slate-700">{value}/100</span>
      </div>
      <div className="h-2 w-full bg-white/80 rounded-full overflow-hidden border border-slate-300">
        <div 
          className="h-full bg-gradient-to-r from-purple-700 to-purple-accent rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Your tab hoarding habits analyzed over the last 30 days.</p>
      </header>

      {/* Top Row: Score & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Big Score Card */}
        <div className="glass-card p-8 flex flex-col items-center justify-center md:col-span-1 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-accent/10 rounded-full blur-2xl pointer-events-none" />
          
          <span className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4 z-10">Habit Score</span>
          <div className={`text-7xl font-black tabular-nums tracking-tighter mb-2 z-10 transition-colors duration-500 ${scoreColor}`}>
            {score}
          </div>
          <span className="text-sm text-slate-400 z-10 text-center mt-2">
            Higher is better.<br/>Based on 4 cleanup factors.
          </span>
        </div>

        {/* Breakdown Card */}
        <div className="glass-card p-6 md:col-span-2 flex flex-col justify-center">
          <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase mb-6">Score Breakdown</h3>
          <div className="space-y-2">
            {renderFactorBar('Tab Turnover Rate', factors.tabTurnover.score, factors.tabTurnover.weight, `${factors.tabTurnover.tabsPerDay} tabs/day`)}
            {renderFactorBar('Focus Ratio', factors.focusRatio.score, factors.focusRatio.weight, 'Meaningful engagement')}
            {renderFactorBar('Research Conversion', factors.researchConversion.score, factors.researchConversion.weight, 'AI notes generated')}
            {renderFactorBar('Session Discipline', factors.sessionDiscipline.score, factors.sessionDiscipline.weight, 'Cleanup consistency')}
          </div>
        </div>
      </div>

      {/* Middle Row: Trend Chart */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase mb-6">8-Week Trend</h3>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#162036', borderColor: '#334155', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#7c3aed" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#1e293b', stroke: '#7c3aed', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row: Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 bg-white/50">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Total Archives</span>
          <span className="text-2xl font-bold text-white">{totalArchives}</span>
        </div>
        <div className="glass-card p-5 bg-white/50">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Tabs Saved</span>
          <span className="text-2xl font-bold text-white">{chartData[chartData.length - 1]?.archives || 0}</span>
          <span className="text-xs text-slate-400 ml-2">this week</span>
        </div>
        <div className="glass-card p-5 bg-white/50">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Focus Score</span>
          <span className="text-2xl font-bold text-white">{factors.focusRatio.score}/100</span>
        </div>
      </div>
    </div>
  );
}
