import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import {
  Trash2, AlertTriangle, CheckCircle2, ClipboardList, Activity,
  Wifi, Cpu, MapPin, TrendingUp, TrendingDown, Clock, Zap, Signal,
  BarChart3, Cloud, Navigation, HardHat, ThumbsUp, Calendar, Target,
  Shield, Eye, ArrowUp, ArrowDown, Gauge, Radio, Star, Award, Flame, AlertCircle
} from 'lucide-react';
import { User, Complaint, Sensor } from '../types';

// ─── Dummy Data ────────────────────────────────────────────────────────────────

const SMART_BINS = [
  { id: 'C2', name: 'Market Central', lat: 11.6643, lng: 78.1460, status: 'overflow', fill: 92, distance: 8 },
  { id: 'B1', name: 'Bus Stand Entry', lat: 11.6680, lng: 78.1420, status: 'normal', fill: 20, distance: 80 },
  { id: 'B2', name: 'Railway Station Gate 1', lat: 11.6610, lng: 78.1490, status: 'nearly-full', fill: 78, distance: 22 },
  { id: 'B3', name: 'City Hospital Corner', lat: 11.6710, lng: 78.1400, status: 'normal', fill: 15, distance: 85 },
  { id: 'B4', name: 'Main Bazaar Road', lat: 11.6620, lng: 78.1380, status: 'nearly-full', fill: 84, distance: 16 },
  { id: 'B5', name: 'Anna Park Entrance', lat: 11.6590, lng: 78.1520, status: 'overflow', fill: 95, distance: 5 },
  { id: 'B6', name: 'Town Hall Circle', lat: 11.6700, lng: 78.1500, status: 'normal', fill: 45, distance: 55 },
  { id: 'B7', name: 'New Housing Unit', lat: 11.6660, lng: 78.1440, status: 'nearly-full', fill: 81, distance: 19 },
];

const OVERFLOW_FREQUENCY = [
  { bin: 'C2', overflows: 12, fill: 92 },
  { bin: 'B5', overflows: 9, fill: 95 },
  { bin: 'B4', overflows: 6, fill: 84 },
  { bin: 'B7', overflows: 5, fill: 81 },
  { bin: 'B2', overflows: 4, fill: 78 },
  { bin: 'B1', overflows: 1, fill: 20 },
  { bin: 'B3', overflows: 0, fill: 15 },
  { bin: 'B6', overflows: 2, fill: 45 },
];

const FILL_OVER_TIME = [
  { time: '06:00', fill: 22, distance: 78 },
  { time: '08:00', fill: 35, distance: 65 },
  { time: '10:00', fill: 48, distance: 52 },
  { time: '12:00', fill: 61, distance: 39 },
  { time: '14:00', fill: 70, distance: 30 },
  { time: '16:00', fill: 78, distance: 22 },
  { time: '18:00', fill: 85, distance: 15 },
  { time: '20:00', fill: 90, distance: 10 },
  { time: '22:00', fill: 92, distance: 8 },
  { time: '00:00', fill: 89, distance: 11 },
  { time: '02:00', fill: 91, distance: 9 },
  { time: '04:00', fill: 94, distance: 6 },
];

const MONTHLY_STATS = [
  { month: 'Jan', collections: 320, overflows: 45, complaints: 88 },
  { month: 'Feb', collections: 298, overflows: 38, complaints: 74 },
  { month: 'Mar', collections: 352, overflows: 52, complaints: 96 },
  { month: 'Apr', collections: 410, overflows: 41, complaints: 82 },
  { month: 'May', collections: 380, overflows: 49, complaints: 91 },
  { month: 'Jun', collections: 445, overflows: 36, complaints: 67 },
  { month: 'Jul', collections: 398, overflows: 58, complaints: 103 },
];

const THINGSPEAK_FEEDS = [
  { created_at: new Date().toISOString(), field1: '8', field2: '92' },
  { created_at: new Date(Date.now() - 5000).toISOString(), field1: '10', field2: '90' },
  { created_at: new Date(Date.now() - 10000).toISOString(), field1: '12', field2: '88' },
  { created_at: new Date(Date.now() - 15000).toISOString(), field1: '15', field2: '85' },
  { created_at: new Date(Date.now() - 20000).toISOString(), field1: '18', field2: '82' },
];

const HIGH_RISK_BINS = [
  { id: 'B5', name: 'Anna Park Entrance', riskScore: 98, nextOverflow: '1.2 hrs', trend: 'up' },
  { id: 'C2', name: 'Market Central', riskScore: 94, nextOverflow: '0.5 hrs', trend: 'up' },
  { id: 'B4', name: 'Main Bazaar Road', riskScore: 76, nextOverflow: '3.1 hrs', trend: 'up' },
  { id: 'B2', name: 'Railway Station Gate 1', riskScore: 62, nextOverflow: '5.4 hrs', trend: 'stable' },
];

const COLLECTION_SCHEDULE = [
  { time: '09:30', bin: 'C2 – Market Central', worker: 'Karthik', status: 'urgent' },
  { time: '10:00', bin: 'B5 – Anna Park', worker: 'Priya', status: 'urgent' },
  { time: '11:30', bin: 'B4 – Main Bazaar', worker: 'Vijay', status: 'scheduled' },
  { time: '14:00', bin: 'B7 – New Housing', worker: 'Karthik', status: 'scheduled' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createBinIcon = (status: string, pulse = false) => {
  const colors: Record<string, string> = {
    normal: '#10b981',
    'nearly-full': '#f59e0b',
    overflow: '#ef4444',
    browser: '#8b5cf6',
  };
  const color = colors[status] || '#6366f1';
  const html = `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;width:28px;height:28px;">
      ${pulse ? `<span style="position:absolute;width:100%;height:100%;border-radius:50%;background:${color};opacity:0.4;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>` : ''}
      <span style="position:relative;width:18px;height:18px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:block;"></span>
    </div>
  `;
  return L.divIcon({ html, className: '', iconSize: [28, 28], iconAnchor: [14, 14] });
};

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.07 } } };

// ─── Sub-components ──────────────────────────────────────────────────────────

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string; badge?: string }> = ({ icon, title, subtitle, badge }) => (
  <div className="flex items-start justify-between mb-6">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-black text-slate-900 leading-none">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>}
      </div>
    </div>
    {badge && (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
        {badge}
      </span>
    )}
  </div>
);

const GlassCard: React.FC<{ children: React.ReactNode; className?: string; accent?: string }> = ({ children, className = '', accent }) => (
  <div
    className={`relative rounded-3xl border border-slate-200/80 overflow-hidden ${className}`}
    style={{
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 4px 24px -4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    }}
  >
    {accent && <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />}
    <div className="p-6">{children}</div>
  </div>
);

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  textColor: string;
  trend?: string;
  trendUp?: boolean;
  sub?: string;
}
const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon, bgColor, textColor, trend, trendUp, sub }) => (
  <motion.div variants={fadeUp}
    className="relative rounded-3xl border border-slate-200/80 p-5 overflow-hidden group hover:-translate-y-1 transition-all duration-300 cursor-default"
    style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.05)' }}
  >
    <div className={`w-11 h-11 rounded-2xl ${bgColor} flex items-center justify-center mb-4 ${textColor}`}>
      {icon}
    </div>
    <div className="text-3xl font-black text-slate-900 leading-none mb-1">{value}</div>
    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
    {trend && (
      <div className={`flex items-center gap-1 mt-2 text-[10px] font-bold ${trendUp ? 'text-emerald-600' : 'text-rose-500'}`}>
        {trendUp ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
        {trend}
      </div>
    )}
    {sub && <div className="text-[9px] text-slate-400 mt-1 font-semibold">{sub}</div>}
  </motion.div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-xl text-xs font-bold">
      <p className="text-slate-500 mb-1 uppercase tracking-wide text-[9px]">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-black">{p.name}: {p.value}{p.unit || ''}</p>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface AdminAnalyticsProps {
  complaints: Complaint[];
  sensors: Sensor[];
  workers: User[];
  users: User[];
  userLocation?: [number, number];
  locationStatus?: 'requesting' | 'granted' | 'denied';
}

const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({
  complaints,
  sensors,
  workers,
  users,
  userLocation = [11.6643, 78.1460],
  locationStatus = 'granted'
}) => {
  const [liveTime, setLiveTime] = useState(new Date());
  const [activeMapFilter, setActiveMapFilter] = useState<'all' | 'overflow' | 'nearly-full' | 'normal'>('all');

  const [liveFeeds, setLiveFeeds] = useState(THINGSPEAK_FEEDS);

  // Tick clock
  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll live ThingSpeak feeds for Channel 3303265
  useEffect(() => {
    const fetchFeeds = async () => {
      try {
        const res = await fetch('https://api.thingspeak.com/channels/3303265/feeds.json?api_key=IYJYSPYAMNZDWI20&results=5');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.feeds) && data.feeds.length > 0) {
            setLiveFeeds(data.feeds);
          }
        }
      } catch (e) {
        // Fallback to static feeds if network is offline
      }
    };
    fetchFeeds();
    const interval = setInterval(fetchFeeds, 5000);
    return () => clearInterval(interval);
  }, []);

  // Primary ultrasonic sensor (ESP32)
  const primarySensor = sensors.find(s => s.type === 'ultrasonic') || sensors[0];
  const liveDistance = primarySensor?.distance ?? 8;
  const liveFill = primarySensor?.value ?? 92;

  // Derived stats
  const totalBins = SMART_BINS.length;
  const overflowBins = SMART_BINS.filter(b => b.status === 'overflow').length;
  const nearlyFullBins = SMART_BINS.filter(b => b.status === 'nearly-full').length;
  const normalBins = SMART_BINS.filter(b => b.status === 'normal').length;
  const activeSensors = sensors.filter(s => s.isActive).length || sensors.length;
  const totalComplaints = complaints.length;
  const resolvedComplaints = complaints.filter(c => c.status === 'completed' || c.status === 'verified').length;
  const pendingComplaints = complaints.filter(c => c.status === 'pending').length;

  const workerPerformance = workers.map(w => {
    const assigned = complaints.filter(c => c.assignedTo === w.id);
    const completed = assigned.filter(c => c.status === 'completed' || c.status === 'verified').length;
    const pending = assigned.filter(c => c.status !== 'completed' && c.status !== 'verified').length;
    const efficiency = assigned.length > 0 ? Math.round((completed / assigned.length) * 100) : 0;
    return { name: w.name, avatar: w.avatar, assigned: assigned.length, completed, pending, efficiency };
  });

  const complaintDonutData = [
    { name: 'Pending', value: pendingComplaints, color: '#f59e0b' },
    { name: 'Assigned', value: complaints.filter(c => c.status === 'assigned').length, color: '#3b82f6' },
    { name: 'In Progress', value: complaints.filter(c => c.status === 'in-progress').length, color: '#8b5cf6' },
    { name: 'Completed', value: resolvedComplaints, color: '#10b981' },
  ];

  const binStatusData = [
    { name: 'Normal', value: normalBins, color: '#10b981' },
    { name: 'Nearly Full', value: nearlyFullBins, color: '#f59e0b' },
    { name: 'Overflow', value: overflowBins, color: '#ef4444' },
  ];

  const filteredBins = activeMapFilter === 'all' ? SMART_BINS : SMART_BINS.filter(b => b.status === activeMapFilter);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-10 pb-10"
    >
      {/* ═══════════════════ HEADER ═══════════════════ */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 leading-tight">
            Smart City <span className="text-indigo-600">Analytics</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            ESP32 Distance Telemetry + Browser Live Geolocation
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-wider">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Live · {liveTime.toLocaleTimeString()}
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-wider">
            <Cloud size={12} /> ThingSpeak (ESP32)
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-black uppercase tracking-wider ${
            locationStatus === 'granted' ? 'bg-purple-50 border-purple-100 text-purple-700' : 'bg-rose-50 border-rose-100 text-rose-700'
          }`}>
            <Navigation size={12} /> {locationStatus === 'granted' ? 'Browser GPS Active' : 'Live location unavailable.'}
          </div>
        </div>
      </motion.div>

      {/* Location Warning Banner if Denied */}
      {locationStatus === 'denied' && (
        <motion.div variants={fadeUp} className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-bold">
          <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />
          <span>
            <strong>Live location unavailable.</strong> Using predefined fallback location ({userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}). Enable browser location permission for real-time tracking.
          </span>
        </motion.div>
      )}

      {/* ═══════════════════ 1. KPI CARDS ═══════════════════ */}
      <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-4">
        <KpiCard label="Total Bins" value={totalBins} icon={<Trash2 size={20} />} color="indigo" bgColor="bg-indigo-50" textColor="text-indigo-600" sub="All deployed units" />
        <KpiCard label="Overflowing" value={overflowBins} icon={<AlertTriangle size={20} />} color="rose" bgColor="bg-rose-50" textColor="text-rose-600" trend="+2 from yesterday" trendUp={false} />
        <KpiCard label="Normal Bins" value={normalBins} icon={<CheckCircle2 size={20} />} color="emerald" bgColor="bg-emerald-50" textColor="text-emerald-600" trend="Stable" trendUp={true} />
        <KpiCard label="Active Workers" value={workers.length} icon={<HardHat size={20} />} color="amber" bgColor="bg-amber-50" textColor="text-amber-600" sub="On-field staff" />
        <KpiCard label="Total Complaints" value={totalComplaints} icon={<ClipboardList size={20} />} color="blue" bgColor="bg-blue-50" textColor="text-blue-600" />
        <KpiCard label="Resolved" value={resolvedComplaints} icon={<ThumbsUp size={20} />} color="emerald" bgColor="bg-emerald-50" textColor="text-emerald-600" trend="↑ 8% this week" trendUp={true} />
        <KpiCard label="Pending" value={pendingComplaints} icon={<Clock size={20} />} color="amber" bgColor="bg-amber-50" textColor="text-amber-600" />
        <KpiCard label="Live Sensors" value={`${activeSensors}/${sensors.length}`} icon={<Signal size={20} />} color="cyan" bgColor="bg-cyan-50" textColor="text-cyan-600" sub="ESP32 Distance" />
      </motion.div>

      {/* ═══════════════════ 2 & 3. PIE + LINE CHARTS ═══════════════════ */}
      <motion.div variants={stagger} className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Bin Status Pie */}
        <motion.div variants={fadeUp}>
          <GlassCard accent="bg-gradient-to-r from-indigo-500 to-violet-500">
            <SectionTitle icon={<Trash2 size={18} />} title="Garbage Bin Status" subtitle="Real-time fill level distribution across all deployed bins" badge="Live Telemetry" />
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative flex items-center justify-center">
                <PieChart width={180} height={180}>
                  <Pie data={binStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                    {binStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
                <div className="absolute text-center pointer-events-none">
                  <span className="block text-3xl font-black text-slate-800">{totalBins}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bins</span>
                </div>
              </div>
              <div className="flex-1 space-y-3 w-full">
                {binStatusData.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <span className="text-sm font-bold text-slate-600 flex-1">{item.name}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(item.value / totalBins) * 100}%`, background: item.color }} />
                    </div>
                    <span className="text-sm font-black text-slate-800 w-6 text-right">{item.value}</span>
                    <span className="text-[10px] font-bold text-slate-400 w-8 text-right">{Math.round((item.value / totalBins) * 100)}%</span>
                  </div>
                ))}
                <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                  <div className="text-center p-3 rounded-2xl bg-emerald-50">
                    <div className="text-xl font-black text-emerald-600">{normalBins}</div>
                    <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider mt-0.5">Normal</div>
                  </div>
                  <div className="text-center p-3 rounded-2xl bg-amber-50">
                    <div className="text-xl font-black text-amber-600">{nearlyFullBins}</div>
                    <div className="text-[9px] font-bold text-amber-500 uppercase tracking-wider mt-0.5">Nearly Full</div>
                  </div>
                  <div className="text-center p-3 rounded-2xl bg-rose-50">
                    <div className="text-xl font-black text-rose-600">{overflowBins}</div>
                    <div className="text-[9px] font-bold text-rose-500 uppercase tracking-wider mt-0.5">Overflow</div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Fill % Line Chart */}
        <motion.div variants={fadeUp}>
          <GlassCard accent="bg-gradient-to-r from-sky-500 to-indigo-500">
            <SectionTitle icon={<Activity size={18} />} title="Garbage Fill % Over Time" subtitle="ThingSpeak sensor distance feed — last 12 hours" badge="ThingSpeak Live" />
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={FILL_OVER_TIME} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 8 }} />
                  <Line type="monotone" dataKey="fill" name="Fill %" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#6366f1' }} unit="%" />
                  <Line type="monotone" dataKey="distance" name="Distance (cm)" stroke="#f43f5e" strokeWidth={2} dot={false} strokeDasharray="5 3" unit=" cm" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-indigo-500 inline-block rounded" /> Fill %</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-0 border-t-2 border-dashed border-rose-400 inline-block" /> Distance (cm)</span>
              <span className="ml-auto text-emerald-600 flex items-center gap-1"><TrendingUp size={10} /> Live distance tracking</span>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* ═══════════════════ 4. OVERFLOW FREQUENCY BAR CHART ═══════════════════ */}
      <motion.div variants={fadeUp}>
        <GlassCard accent="bg-gradient-to-r from-rose-500 to-orange-400">
          <SectionTitle icon={<BarChart3 size={18} />} title="Overflow Frequency per Bin" subtitle="Number of overflow incidents detected per bin this week" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={OVERFLOW_FREQUENCY} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="bin" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="overflows" name="Overflow Events" radius={[8, 8, 0, 0]} barSize={36}>
                  {OVERFLOW_FREQUENCY.map((entry, i) => (
                    <Cell key={i} fill={entry.overflows >= 8 ? '#ef4444' : entry.overflows >= 4 ? '#f59e0b' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-5 mt-3 pt-3 border-t border-slate-100 text-[10px] font-bold">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500 inline-block" /> Critical (8+)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Warning (4–7)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Normal (0–3)</span>
          </div>
        </GlassCard>
      </motion.div>

      {/* ═══════════════════ 5 & 6. COMPLAINT DONUT + WORKER TABLE ═══════════════════ */}
      <motion.div variants={stagger} className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Complaint Analytics Donut */}
        <motion.div variants={fadeUp}>
          <GlassCard accent="bg-gradient-to-r from-violet-500 to-purple-500">
            <SectionTitle icon={<ClipboardList size={18} />} title="Complaint Analytics" subtitle="Status breakdown of all reported complaints" />
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative flex items-center justify-center flex-shrink-0">
                <PieChart width={180} height={180}>
                  <Pie data={complaintDonutData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">
                    {complaintDonutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
                <div className="absolute text-center pointer-events-none">
                  <span className="block text-3xl font-black text-slate-800">{totalComplaints}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                </div>
              </div>
              <div className="flex-1 space-y-3 w-full">
                {complaintDonutData.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <span className="text-sm font-bold text-slate-600 w-24">{item.name}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: totalComplaints > 0 ? `${(item.value / totalComplaints) * 100}%` : '0%', background: item.color }} />
                    </div>
                    <span className="text-sm font-black text-slate-800 w-6 text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Worker Performance Table */}
        <motion.div variants={fadeUp}>
          <GlassCard accent="bg-gradient-to-r from-emerald-500 to-teal-500">
            <SectionTitle icon={<HardHat size={18} />} title="Worker Performance" subtitle="Field staff efficiency and task completion metrics" />
            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Worker', 'Assigned', 'Completed', 'Pending', 'Efficiency'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {workerPerformance.map((w, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {w.avatar && <img src={w.avatar} className="w-7 h-7 rounded-xl border border-slate-100" alt="" />}
                          <span className="font-bold text-slate-800 text-xs">{w.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-600 text-xs">{w.assigned}</td>
                      <td className="px-4 py-3"><span className="text-xs font-bold text-emerald-600">{w.completed}</span></td>
                      <td className="px-4 py-3"><span className="text-xs font-bold text-amber-600">{w.pending}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${w.efficiency}%`, background: w.efficiency >= 90 ? '#10b981' : w.efficiency >= 70 ? '#f59e0b' : '#ef4444' }} />
                          </div>
                          <span className={`text-xs font-black ${w.efficiency >= 90 ? 'text-emerald-600' : w.efficiency >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>{w.efficiency}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* ═══════════════════ 7. GPS HEAT MAP ═══════════════════ */}
      <motion.div variants={fadeUp}>
        <GlassCard accent="bg-gradient-to-r from-teal-500 to-cyan-500">
          <SectionTitle icon={<MapPin size={18} />} title="GPS Bin Heat Map" subtitle="Real-time locations and fill-level status combined with Browser Geolocation" badge="Browser GPS Active" />

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {(['all', 'overflow', 'nearly-full', 'normal'] as const).map(f => (
              <button
                key={f}
                onClick={() => setActiveMapFilter(f)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeMapFilter === f
                    ? f === 'overflow' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200'
                      : f === 'nearly-full' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                      : f === 'normal' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                      : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {f === 'all' ? `All (${SMART_BINS.length})` : f === 'overflow' ? `Overflow (${overflowBins})` : f === 'nearly-full' ? `Nearly Full (${nearlyFullBins})` : `Normal (${normalBins})`}
              </button>
            ))}
          </div>

          <div className="h-96 rounded-2xl overflow-hidden border border-slate-200 relative z-0">
            <MapContainer center={userLocation} zoom={14} style={{ height: '100%', width: '100%', zIndex: 0 }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Browser Live Location Marker (Always Visible) */}
              <Marker position={userLocation} icon={createBinIcon('browser', true)}>
                <Popup>
                  <div className="text-xs font-bold min-w-[160px]">
                    <div className="font-black text-purple-700 mb-1 flex items-center gap-1">
                      <Navigation size={12} /> Browser Live Location
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Bin ID:</span><span className="font-black text-slate-700 font-mono">ESP32-BIN-C2</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Garbage Fill %:</span>
                      <span className={`font-black ${liveFill > 80 ? 'text-rose-600' : 'text-indigo-600'}`}>{liveFill.toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Distance:</span><span className="font-black text-indigo-600">{liveDistance} cm</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Latitude:</span><span className="font-mono text-slate-700">{userLocation[0].toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Longitude:</span><span className="font-mono text-slate-700">{userLocation[1].toFixed(4)}</span>
                    </div>
                    <div className="mt-1 pt-1 border-t border-slate-100 text-[9px] text-slate-400 font-medium">
                      Last Updated: {liveTime.toLocaleTimeString()}
                    </div>
                  </div>
                </Popup>
              </Marker>

              {filteredBins.map(bin => (
                <Marker key={bin.id} position={[bin.lat, bin.lng]} icon={createBinIcon(bin.status, bin.status === 'overflow')}>
                  <Popup>
                    <div className="text-xs font-bold min-w-[140px]">
                      <div className="font-black text-slate-900 mb-1">{bin.name}</div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Bin ID:</span><span className="font-black text-slate-700 font-mono">{bin.id}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Fill Level:</span>
                        <span className={`font-black ${bin.status === 'overflow' ? 'text-rose-600' : bin.status === 'nearly-full' ? 'text-amber-600' : 'text-emerald-600'}`}>{bin.fill}%</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Distance:</span><span className="font-black text-indigo-600">{bin.distance} cm</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Map Legend */}
            <div className="absolute bottom-4 right-4 z-[400] bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl px-4 py-3 shadow-xl text-[10px] font-bold space-y-1.5">
              <div className="font-black text-slate-700 mb-2 uppercase tracking-wider text-[9px]">Legend</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block" /> Browser Live Location</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Normal</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Nearly Full</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-rose-500 inline-block" /> Overflow</div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ═══════════════════ 8 & 9. LIVE SENSOR + THINGSPEAK ═══════════════════ */}
      <motion.div variants={stagger} className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Live Sensor Panel */}
        <motion.div variants={fadeUp}>
          <GlassCard accent="bg-gradient-to-r from-indigo-500 to-blue-500">
            <SectionTitle icon={<Cpu size={18} />} title="Live Sensor Panel" subtitle="Combined ESP32 distance + Browser Geolocation telemetry" badge="Merged Telemetry" />
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Distance', value: `${liveDistance} cm`, icon: <Gauge size={16} />, color: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-600' },
                { label: 'Fill Percentage', value: `${liveFill.toFixed(0)}%`, icon: <Activity size={16} />, color: liveFill > 80 ? 'rose' : 'emerald', bg: liveFill > 80 ? 'bg-rose-50' : 'bg-emerald-50', text: liveFill > 80 ? 'text-rose-600' : 'text-emerald-600' },
                { label: 'Current Latitude', value: userLocation[0].toFixed(4), icon: <Navigation size={16} />, color: 'purple', bg: 'bg-purple-50', text: 'text-purple-600' },
                { label: 'Current Longitude', value: userLocation[1].toFixed(4), icon: <Navigation size={16} />, color: 'purple', bg: 'bg-purple-50', text: 'text-purple-600' },
                { label: 'Sensor Status', value: '🟢 Active', icon: <Radio size={16} />, color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700' },
                { label: 'WiFi Status', value: '🛜 Connected', icon: <Wifi size={16} />, color: 'sky', bg: 'bg-sky-50', text: 'text-sky-700' },
                { label: 'Geolocation Status', value: locationStatus === 'granted' ? '🟢 Live GPS' : '🔴 Unavailable', icon: <Navigation size={16} />, color: locationStatus === 'granted' ? 'emerald' : 'rose', bg: locationStatus === 'granted' ? 'bg-emerald-50' : 'bg-rose-50', text: locationStatus === 'granted' ? 'text-emerald-700' : 'text-rose-700' },
                { label: 'Last Updated', value: liveTime.toLocaleTimeString(), icon: <Clock size={16} />, color: 'slate', bg: 'bg-slate-50', text: 'text-slate-700' },
              ].map((item, i) => (
                <div key={i} className={`${item.bg} rounded-2xl p-3 border border-white/60`}>
                  <div className={`flex items-center gap-1.5 ${item.text} mb-1.5`}>
                    {item.icon}
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-70">{item.label}</span>
                  </div>
                  <div className={`text-sm font-black ${item.text} font-mono`}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Live fill progress */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">ESP32 Garbage Fill Level</span>
                <span className={`text-xl font-black ${liveFill > 80 ? 'text-rose-600' : 'text-indigo-600'}`}>{liveFill.toFixed(0)}%</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: liveFill > 80 ? '#ef4444' : 'linear-gradient(90deg, #6366f1, #10b981)' }}
                  animate={{ width: `${liveFill}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1">
                <span>Distance: {liveDistance} cm</span>
                <span>Threshold: 85%</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* ThingSpeak Analytics */}
        <motion.div variants={fadeUp}>
          <GlassCard accent="bg-gradient-to-r from-cyan-500 to-sky-500">
            <SectionTitle icon={<Cloud size={18} />} title="ThingSpeak Distance Analytics" subtitle="ESP32 distance field1 merged with browser coordinates" badge="ThingSpeak Live" />

            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: 'Current Distance', value: `${liveDistance} cm`, icon: <Gauge size={16} />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Average Distance', value: '18.4 cm', icon: <BarChart3 size={16} />, color: 'text-sky-600', bg: 'bg-sky-50' },
                { label: 'Max Fill %', value: `${Math.max(liveFill, 92).toFixed(0)}%`, icon: <TrendingUp size={16} />, color: 'text-rose-600', bg: 'bg-rose-50' },
                { label: 'Min Fill %', value: '15%', icon: <TrendingDown size={16} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              ].map((item, i) => (
                <div key={i} className={`${item.bg} rounded-2xl p-4 border border-white/60`}>
                  <div className={`${item.color} flex items-center gap-1.5 mb-2`}>{item.icon}<span className="text-[9px] font-black uppercase tracking-wider opacity-70">{item.label}</span></div>
                  <div className={`text-xl font-black ${item.color} font-mono`}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Feed Table */}
            <div className="rounded-2xl border border-slate-100 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest grid grid-cols-4">
                <span>Time</span><span>Distance</span><span>Fill %</span><span>Browser GPS</span>
              </div>
              {liveFeeds.map((feed, i) => (
                <div key={i} className="px-4 py-2.5 grid grid-cols-4 text-xs border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <span className="text-slate-400 font-medium font-mono text-[9px]">{new Date(feed.created_at).toLocaleTimeString()}</span>
                  <span className="font-bold text-indigo-600 font-mono">{i === 0 ? liveDistance : feed.field1} cm</span>
                  <span className={`font-bold font-mono ${(i === 0 ? liveFill : parseFloat(feed.field2)) >= 80 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {(i === 0 ? liveFill : parseFloat(feed.field2)).toFixed(0)}%
                  </span>
                  <span className="text-[9px] font-mono text-purple-600 font-bold truncate">
                    {userLocation[0].toFixed(2)}, {userLocation[1].toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-slate-400 mt-3 font-medium italic text-center">
              💡 ESP32 provides garbage distance (field1). Software automatically attaches browser coordinates.
            </p>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* ═══════════════════ 10. COLLECTION ANALYTICS ═══════════════════ */}
      <motion.div variants={fadeUp}>
        <GlassCard accent="bg-gradient-to-r from-amber-500 to-orange-400">
          <SectionTitle icon={<Target size={18} />} title="Collection Analytics" subtitle="Today's performance metrics for waste collection operations" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Collections Today', value: '38', sub: '+12 from yesterday', icon: <Trash2 size={22} />, color: 'bg-indigo-600', light: 'bg-indigo-50', text: 'text-indigo-600' },
              { label: 'Avg Response Time', value: '18 min', sub: '↓ 4 min improvement', icon: <Clock size={22} />, color: 'bg-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-600' },
              { label: 'Collection Efficiency', value: '94.5%', sub: 'Above target (90%)', icon: <Award size={22} />, color: 'bg-amber-600', light: 'bg-amber-50', text: 'text-amber-600' },
              { label: 'Overflow Prevented', value: '7', sub: 'Bins cleared before overflow', icon: <Shield size={22} />, color: 'bg-sky-600', light: 'bg-sky-50', text: 'text-sky-600' },
            ].map((item, i) => (
              <div key={i} className={`${item.light} rounded-3xl p-5 border border-white/60 hover:-translate-y-1 transition-all duration-300 cursor-default`}>
                <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center text-white mb-4 shadow-lg`}>
                  {item.icon}
                </div>
                <div className={`text-3xl font-black ${item.text} mb-1 font-mono`}>{item.value}</div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider leading-tight">{item.label}</div>
                <div className={`text-[9px] mt-2 font-bold ${item.text} opacity-70 flex items-center gap-1`}>
                  <TrendingUp size={9} /> {item.sub}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* ═══════════════════ 11. MONTHLY ANALYTICS ═══════════════════ */}
      <motion.div variants={fadeUp}>
        <GlassCard accent="bg-gradient-to-r from-purple-500 to-indigo-500">
          <SectionTitle icon={<Calendar size={18} />} title="Monthly Analytics" subtitle="Monthly collections, overflows and complaint trends" />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <BarChart3 size={12} /> Monthly Collections vs Overflows
              </h4>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MONTHLY_STATS} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                    <Bar dataKey="collections" name="Collections" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={14} />
                    <Bar dataKey="overflows" name="Overflows" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <Activity size={12} /> Monthly Complaint Trend
              </h4>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={MONTHLY_STATS} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="complaintGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="complaints" name="Complaints" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#complaintGrad)" dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ═══════════════════ 12. AI FUTURE PREDICTION ═══════════════════ */}
      <motion.div variants={fadeUp}>
        <div
          className="rounded-3xl border border-indigo-200/60 overflow-hidden relative"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.06) 50%, rgba(59,130,246,0.05) 100%)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="p-6 relative z-10">
            <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                  <Zap size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">AI Future Prediction</h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Smart pattern analysis and predictive overflow scheduling</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-indigo-200">
                <Star size={12} className="fill-white" /> AI Engine Active · 96% Confidence
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Next Overflow Prediction */}
              <div className="bg-white/70 backdrop-blur rounded-3xl border border-rose-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                    <AlertTriangle size={16} />
                  </div>
                  <span className="text-xs font-black text-slate-600 uppercase tracking-wider">Next Overflow Prediction</span>
                </div>
                <div className="space-y-3">
                  {HIGH_RISK_BINS.slice(0, 2).map((bin, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-rose-50 rounded-2xl border border-rose-100">
                      <div>
                        <div className="text-xs font-black text-slate-800">{bin.name}</div>
                        <div className="text-[9px] text-rose-500 font-bold uppercase">Bin {bin.id}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-rose-600 font-mono">{bin.nextOverflow}</div>
                        <div className="text-[9px] text-rose-400 font-bold">from now</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* High Risk Bins */}
              <div className="bg-white/70 backdrop-blur rounded-3xl border border-amber-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                    <Flame size={16} />
                  </div>
                  <span className="text-xs font-black text-slate-600 uppercase tracking-wider">High Risk Bins</span>
                </div>
                <div className="space-y-2">
                  {HIGH_RISK_BINS.map((bin, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="text-[9px] font-black text-slate-400 w-4 text-center">#{i + 1}</div>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-slate-700">{bin.name}</div>
                        <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${bin.riskScore}%`, background: bin.riskScore >= 90 ? '#ef4444' : bin.riskScore >= 70 ? '#f59e0b' : '#10b981' }} />
                        </div>
                      </div>
                      <div className="text-xs font-black" style={{ color: bin.riskScore >= 90 ? '#ef4444' : bin.riskScore >= 70 ? '#f59e0b' : '#10b981' }}>
                        {bin.riskScore}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expected Collection Schedule */}
              <div className="bg-white/70 backdrop-blur rounded-3xl border border-indigo-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Calendar size={16} />
                  </div>
                  <span className="text-xs font-black text-slate-600 uppercase tracking-wider">Collection Schedule</span>
                </div>
                <div className="space-y-2">
                  {COLLECTION_SCHEDULE.map((item, i) => (
                    <div key={i} className={`flex items-center gap-2 p-2.5 rounded-2xl border text-[10px] ${item.status === 'urgent' ? 'bg-rose-50 border-rose-100' : 'bg-indigo-50 border-indigo-100'}`}>
                      <span className={`font-black font-mono ${item.status === 'urgent' ? 'text-rose-600' : 'text-indigo-600'} w-10 flex-shrink-0`}>{item.time}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-700 truncate">{item.bin}</div>
                        <div className="text-slate-400 flex items-center gap-1"><HardHat size={8} /> {item.worker}</div>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-lg font-black uppercase text-[8px] ${item.status === 'urgent' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom confidence bar */}
            <div className="mt-6 p-4 bg-white/50 backdrop-blur rounded-2xl border border-indigo-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-600 flex items-center gap-1.5"><Eye size={12} /> AI Model Confidence</span>
                <span className="text-sm font-black text-indigo-600">96.3%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #3b82f6)' }}
                  initial={{ width: 0 }}
                  animate={{ width: '96.3%' }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AdminAnalytics;
