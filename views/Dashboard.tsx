import React, { useState, useMemo, useEffect } from 'react';
import AdminAnalytics from './AdminAnalytics';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Complaint, Sensor, ComplaintStatus } from '../types';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  LayoutDashboard, 
  ClipboardList, 
  PlusCircle, 
  BarChart3, 
  Settings, 
  LogOut, 
  Bell, 
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Trash2,
  Zap,
  ArrowRight,
  UserCheck,
  Building,
  Navigation,
  ShieldCheck,
  Cpu,
  AlertCircle,
  Signal,
  RefreshCw,
  TrendingDown,
  Gauge,
  TrendingUp,
  Wifi,
  Activity,
  Database,
  HardHat,
  Users,
  Map as MapIcon,
  Loader2
} from 'lucide-react';
import { Button, Card, Badge, Modal } from '../components/UI';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend } from 'recharts';
import { analyzeComplaint } from '../services/geminiService';

const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const RecenterMap: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && typeof center[0] === 'number' && typeof center[1] === 'number') {
      try {
        const currentZoom = (map && typeof map.getZoom === 'function') ? (map.getZoom() || 15) : 15;
        map.setView([center[0], center[1]], currentZoom, { animate: true });
      } catch (e) {
        console.warn("Leaflet setView safely caught:", e);
      }
    }
  }, [center, map]);
  return null;
};

const MapEvents: React.FC<{ onMapClick: (latlng: L.LatLng) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
};

const createMarkerIcon = (color: 'green' | 'yellow' | 'red' | 'purple', pulse: boolean = false) => {
  const bgClasses = {
    green: 'bg-emerald-500 border-emerald-100',
    yellow: 'bg-amber-500 border-amber-100',
    red: 'bg-rose-500 border-rose-100',
    purple: 'bg-indigo-600 border-indigo-100'
  };

  const html = `
    <div class="relative flex items-center justify-center w-6 h-6">
      ${pulse ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full ${bgClasses[color].split(' ')[0]} opacity-75"></span>` : ''}
      <span class="relative inline-flex rounded-full h-4 w-4 ${bgClasses[color]} border-2 shadow-md"></span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-div-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const IOT_DAILY_COLLECTION = [
  { name: 'Mon', amount: 12 },
  { name: 'Tue', amount: 15 },
  { name: 'Wed', amount: 18 },
  { name: 'Thu', amount: 14 },
  { name: 'Fri', amount: 22 },
  { name: 'Sat', amount: 25 },
  { name: 'Sun', amount: 19 },
];

const IOT_OVERFLOW_EVENTS = [
  { name: 'Mon', events: 2 },
  { name: 'Tue', events: 4 },
  { name: 'Wed', events: 6 },
  { name: 'Thu', events: 3 },
  { name: 'Fri', events: 8 },
  { name: 'Sat', events: 10 },
  { name: 'Sun', events: 5 },
];

const IOT_COMPLAINT_CATEGORIES = [
  { name: 'Garbage Overflow', value: 28, color: '#f43f5e' },
  { name: 'Wet Waste', value: 15, color: '#10b981' },
  { name: 'Dry Waste', value: 20, color: '#3b82f6' },
  { name: 'Plastic Waste', value: 18, color: '#f59e0b' },
  { name: 'E-Waste', value: 7, color: '#8b5cf6' },
];

const IOT_WORKER_PERFORMANCE = [
  { name: 'Karthik', completed: 24, responseTime: 45, completionRate: 96 },
  { name: 'Priya', completed: 31, responseTime: 32, completionRate: 98 },
  { name: 'Vijay', completed: 28, responseTime: 38, completionRate: 95 },
];

const IOT_ALERTS_LOG = [
  { status: 'red', text: 'Garbage Overflow Detected', time: 'Just Now', icon: '🔴', details: 'Bin C2 level at 92%' },
  { status: 'yellow', text: 'Bin Almost Full', time: '10 mins ago', icon: '🟡', details: 'Bin S1 level at 82%' },
  { status: 'info', text: 'GPS Updated', time: '25 mins ago', icon: '📡', details: 'Device ESP32 ping success' },
  { status: 'info', text: 'ThingSpeak Synced', time: '30 mins ago', icon: '☁', details: 'Channel #283912 feed updated' },
  { status: 'worker', text: 'Worker Assigned', time: '1 hour ago', icon: '👷', details: 'Priya assigned to C2' },
  { status: 'success', text: 'Garbage Collected', time: '2 hours ago', icon: '✅', details: 'Bin S3 cleared successfully' },
];

const IOT_SMART_BINS = [
  { id: 'C2', name: 'Market Central (C2)', lat: 11.6643, lng: 78.1460, status: 'red', fill: 92 },
  { id: 'B1', name: 'Bus Stand Entry', lat: 11.6680, lng: 78.1420, status: 'green', fill: 20 },
  { id: 'B2', name: 'Railway Station Gate 1', lat: 11.6610, lng: 78.1490, status: 'yellow', fill: 78 },
  { id: 'B3', name: 'City Hospital Corner', lat: 11.6710, lng: 78.1400, status: 'green', fill: 15 },
  { id: 'B4', name: 'Main Bazaar Road', lat: 11.6620, lng: 78.1380, status: 'yellow', fill: 84 },
  { id: 'B5', name: 'Anna Park Entrance', lat: 11.6590, lng: 78.1520, status: 'red', fill: 95 },
  { id: 'B6', name: 'Town Hall Circle', lat: 11.6700, lng: 78.1500, status: 'green', fill: 45 },
  { id: 'B7', name: 'New Housing Unit', lat: 11.6660, lng: 78.1440, status: 'yellow', fill: 81 },
];

const IOT_FILL_24H = [
  { hour: '08:00', level: 45 },
  { hour: '12:00', level: 55 },
  { hour: '16:00', level: 68 },
  { hour: '20:00', level: 75 },
  { hour: '00:00', level: 82 },
  { hour: '04:00', level: 88 },
  { hour: '08:00', level: 92 },
];

interface DashboardProps {
  user: User;
  onLogout: () => void;
  complaints: Complaint[];
  sensors: Sensor[];
  userLocation?: [number, number];
  locationStatus?: 'requesting' | 'granted' | 'denied';
  onUpdateComplaint: (id: string, status: ComplaintStatus, assignedTo?: string) => void;
  onAddComplaint: (complaint: any) => void;
  workers: User[];
  users: User[];
}

const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  onLogout, 
  complaints, 
  sensors, 
  userLocation = [11.6643, 78.1460],
  locationStatus = 'granted',
  onUpdateComplaint, 
  onAddComplaint,
  workers,
  users
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'analytics' | 'map'>('overview');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<{ isOpen: boolean, complaintId: string }>({ isOpen: false, complaintId: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [newReport, setNewReport] = useState<{ title: string; description: string; location: string; coordinates?: [number, number] }>({ title: '', description: '', location: '' });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const stats = useMemo(() => ({
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'pending').length,
    inProgress: complaints.filter(c => c.status === 'assigned' || c.status === 'in-progress').length,
    completed: complaints.filter(c => c.status === 'completed' || c.status === 'verified').length,
  }), [complaints]);

  const filteredComplaints = useMemo(() => {
    let base = complaints;
    if (user.role === 'citizen') {
      base = complaints.filter(c => c.reportedBy === user.id || c.reportedBy === '2' || c.reportedBy === 'system');
    } else if (user.role === 'worker') {
      base = complaints.filter(c => c.assignedTo === user.id || c.reportedBy === 'system' || c.status === 'pending');
    }

    if (!searchQuery.trim()) return base;

    const q = searchQuery.toLowerCase().trim();
    return base.filter(c => 
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q) ||
      c.status.toLowerCase().includes(q) ||
      c.priority.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.type.toLowerCase().includes(q)
    );
  }, [complaints, user, searchQuery]);

  const dynamicChartData = useMemo(() => {
    const pendingCount = filteredComplaints.filter(c => c.status === 'pending').length;
    const activeCount = filteredComplaints.filter(c => c.status === 'assigned' || c.status === 'in-progress').length;
    const resolvedCount = filteredComplaints.filter(c => c.status === 'completed' || c.status === 'verified').length;

    return [
      { name: 'Pending', count: pendingCount, color: '#f59e0b' },     // Amber
      { name: 'Active', count: activeCount, color: '#3b82f6' },       // Blue
      { name: 'Resolved', count: resolvedCount, color: '#10b981' }    // Emerald
    ];
  }, [filteredComplaints]);

  const handleCreateReport = async () => {
    setIsAnalyzing(true);
    const analysis = await analyzeComplaint(newReport.description);
    onAddComplaint({
      ...newReport,
      type: analysis.type,
      priority: analysis.priority
    });
    setIsAnalyzing(false);
    setIsReportModalOpen(false);
    setNewReport({ title: '', description: '', location: '' });
  };

  const handleFetchLocation = () => {
    setIsFetchingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Simulated reverse geocoding for UI demonstration
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setNewReport(prev => ({ ...prev, location: `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)} (Detected Zone)`, coordinates: [lat, lng] }));
          setIsFetchingLocation(false);
        },
        (error) => {
          console.error("Error fetching location", error);
          setIsFetchingLocation(false);
        }
      );
    } else {
      setIsFetchingLocation(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Reference ID',
      'Title',
      'Description',
      'Category',
      'Source',
      'Location',
      'Status',
      'Priority',
      'Reported By',
      'Field Staff',
      'Created At'
    ];

    const rows = filteredComplaints.map(c => {
      const reportedByName = c.reportedBy === 'system' 
        ? 'System Sensor' 
        : (users.find(u => u.id === c.reportedBy)?.name || 'Citizen');
      const assignedWorkerName = c.assignedTo 
        ? (workers.find(w => w.id === c.assignedTo)?.name || 'Worker') 
        : 'Unassigned';

      const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;

      return [
        escape(c.id),
        escape(c.title),
        escape(c.description),
        escape(c.type),
        escape(c.source),
        escape(c.location),
        escape(c.status),
        escape(c.priority),
        escape(reportedByName),
        escape(assignedWorkerName),
        escape(new Date(c.createdAt).toLocaleDateString())
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `civicflow_reports_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  const selectedComplaintForAssignment = useMemo(() => 
    complaints.find(c => c.id === isAssignModalOpen.complaintId), 
    [isAssignModalOpen.complaintId, complaints]
  );

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'map', label: 'Live Map', icon: MapIcon },
    { id: 'reports', label: 'Reports', icon: ClipboardList },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, adminOnly: true },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="w-20 md:w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-40 shadow-sm">
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Zap className="text-white fill-white" size={20} />
            </div>
            <span className="hidden md:block font-extrabold text-xl tracking-tight text-slate-900">Civic<span className="text-indigo-600">Flow</span></span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.filter(item => !item.adminOnly || user.role === 'admin').map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 relative group ${
                activeTab === item.id 
                ? 'bg-indigo-50 text-indigo-700' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {activeTab === item.id && (
                <motion.div layoutId="nav-active" className="absolute left-0 w-1 h-6 bg-indigo-600 rounded-r-full" />
              )}
              <item.icon size={20} className={activeTab === item.id ? 'text-indigo-600' : ''} />
              <span className="hidden md:block font-bold text-sm uppercase tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-4 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
          >
            <LogOut size={20} />
            <span className="hidden md:block font-bold text-sm uppercase tracking-wide">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-20 md:ml-64 p-4 md:p-10">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900">
              {activeTab === 'overview' ? `Hello, ${user.name}` : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                {user.role} Authorization • Live Monitoring
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search reports by title, bin ID, status, location..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white border border-slate-200 rounded-2xl pl-12 pr-10 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all w-72 md:w-80 shadow-sm font-bold text-slate-800"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-black text-sm p-1"
                >
                  ✕
                </button>
              )}
            </div>
            <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all">
              <Bell size={20} />
            </button>
            <div className="p-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-3 pr-4">
              <img src={user.avatar} className="w-10 h-10 rounded-xl" alt="" />
              <div className="hidden lg:block text-left">
                <p className="text-xs font-black text-slate-900">{user.name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Verified Official</p>
              </div>
            </div>
          </div>
        </header>

        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'System Alerts', value: stats.total, icon: ClipboardList, color: 'indigo', bg: 'bg-indigo-50' },
                { label: 'Unresolved', value: stats.pending, icon: Clock, color: 'amber', bg: 'bg-amber-50' },
                { label: 'Active Fixes', value: stats.inProgress, icon: Zap, color: 'blue', bg: 'bg-blue-50' },
                { label: 'Resolved', value: stats.completed, icon: CheckCircle2, color: 'emerald', bg: 'bg-emerald-50' },
              ].map((stat, i) => (
                <Card key={i} className="flex flex-col justify-between hover:shadow-2xl hover:shadow-indigo-500/5 transition-all cursor-default">
                  <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center mb-6`}>
                    <stat.icon className={`text-${stat.color}-600`} size={24} />
                  </div>
                  <div>
                    <div className="text-4xl font-black text-slate-900">{stat.value}</div>
                    <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">{stat.label}</div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Reports Column */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                  <h2 className="text-lg font-black flex items-center gap-3 pl-2">
                    <TrendingUp className="text-indigo-600" size={20} />
                    Current Queue
                  </h2>
                  {user.role === 'citizen' && (
                    <Button icon={PlusCircle} onClick={() => setIsReportModalOpen(true)}>File Report</Button>
                  )}
                </div>

                <div className="space-y-4">
                  {filteredComplaints.length > 0 ? filteredComplaints.slice(0, 5).map((complaint) => (
                    <Card key={complaint.id} className="group hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
                      <div className="flex justify-between items-center gap-4">
                        <div className="flex gap-5 flex-1">
                          <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center ${complaint.type === 'garbage' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {complaint.type === 'garbage' ? <Trash2 size={28} /> : <Zap size={28} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                              <h3 className="font-black text-lg text-slate-900 truncate">{complaint.title}</h3>
                              <Badge type={complaint.status} />
                              <Badge type={complaint.priority} />
                            </div>
                            <p className="text-slate-500 text-sm line-clamp-1 mb-3">{complaint.description}</p>
                            <div className="flex items-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                              <a 
                                href={complaint.coordinates 
                                  ? `https://www.google.com/maps/search/?api=1&query=${complaint.coordinates[0]},${complaint.coordinates[1]}`
                                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(complaint.location)}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 hover:text-indigo-600 transition-colors cursor-pointer"
                              >
                                <MapPin size={14} className="text-indigo-400" /> {complaint.location}
                              </a>
                              <span className="flex items-center gap-2"><Clock size={14} className="text-indigo-400" /> {new Date(complaint.createdAt).toLocaleDateString()}</span>
                              <span className="px-2 py-0.5 bg-slate-50 rounded text-slate-500 font-mono">ID: {complaint.id}</span>
                            </div>

                            {/* Citizen / Reporter & Assignee Connection */}
                            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 flex-wrap">
                              {/* Reported By */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reported By:</span>
                                {complaint.reportedBy === 'system' ? (
                                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-extrabold uppercase tracking-wide">
                                    <Zap size={10} className="fill-indigo-600" />
                                    <span>System Sensor</span>
                                  </div>
                                ) : (
                                  (() => {
                                    const reporter = users.find(u => u.id === complaint.reportedBy);
                                    return (
                                      <div className="flex items-center gap-1">
                                        <img src={reporter?.avatar || 'https://picsum.photos/seed/default/200'} className="w-5 h-5 rounded-full border border-slate-100" alt="" />
                                        <span className="text-xs font-bold text-slate-700">{reporter?.name || 'Rahul (Citizen)'}</span>
                                      </div>
                                    );
                                  })()
                                )}
                              </div>

                              {/* Assignee & Work Status */}
                              <div className="flex items-center gap-1.5 sm:ml-auto">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Work Status:</span>
                                {complaint.assignedTo ? (
                                  (() => {
                                    const assignee = users.find(u => u.id === complaint.assignedTo);
                                    const name = assignee?.name || 'Worker';
                                    if (complaint.status === 'completed' || complaint.status === 'verified') {
                                      return (
                                        <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-extrabold uppercase tracking-wide">
                                          <CheckCircle2 size={12} className="text-emerald-600" />
                                          <span>Resolved by {name}</span>
                                        </div>
                                      );
                                    }
                                    if (complaint.status === 'in-progress') {
                                      return (
                                        <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-extrabold uppercase tracking-wide animate-pulse">
                                          <Clock size={12} className="text-blue-600" />
                                          <span>Accepted & Fixing by {name}</span>
                                        </div>
                                      );
                                    }
                                    return (
                                      <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-extrabold uppercase tracking-wide">
                                        <img src={assignee?.avatar || 'https://picsum.photos/seed/default/200'} className="w-4 h-4 rounded-full" alt="" />
                                        <span>Assigned to {name} (Pending Acceptance)</span>
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <span className="text-xs text-slate-400 italic font-semibold">Unassigned</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 min-w-[150px]">
                          {user.role === 'admin' && complaint.status === 'pending' && (
                            <Button size="sm" onClick={() => setIsAssignModalOpen({ isOpen: true, complaintId: complaint.id })}>
                              Dispatch Worker
                            </Button>
                          )}
                          {user.role === 'worker' && (complaint.status === 'assigned' || complaint.status === 'pending') && (
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={() => onUpdateComplaint(complaint.id, 'in-progress', user.id)}>
                              🚀 Accept & Start Work
                            </Button>
                          )}
                          {user.role === 'worker' && complaint.status === 'in-progress' && (
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={() => onUpdateComplaint(complaint.id, 'completed', user.id)}>
                              ✅ Mark Completed & Resolved
                            </Button>
                          )}
                          {user.role === 'worker' && (complaint.status === 'completed' || complaint.status === 'verified') && (
                            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black text-center flex items-center justify-center gap-1">
                              <CheckCircle2 size={14} /> Completed
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  )) : (
                    <div className="p-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                      <ClipboardList size={48} className="mx-auto text-slate-300 mb-4" />
                      <p className="font-bold text-slate-400">No active reports found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Column */}
              <div className="space-y-8">
                {/* IoT Monitor — Restricted strictly to Admin Role */}
                {user.role === 'admin' && (
                  <div>
                    <h2 className="text-sm font-black mb-4 uppercase tracking-widest text-slate-400 pl-2">IoT Sensor Hub</h2>
                    <div className="space-y-4">
                      {sensors.slice().sort((a, b) => (a.id === 'S1' ? -1 : b.id === 'S1' ? 1 : 0)).map(s => {
                        if (s.id === 'S1') {
                          console.log('[Dashboard rendered value]', { id: s.id, distance: s.distance, value: s.value });
                        }
                        return (
                          <Card key={s.id} className={`!p-5 border-l-4 ${
                            !s.isActive && s.id === 'S1'
                              ? 'border-l-slate-400 opacity-70'
                              : s.id === 'S1'
                              ? 'border-l-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                              : 'border-l-indigo-600'
                          } hover:translate-x-1 transition-transform`}>
                          {s.id === 'S1' && (
                            <div className={`mb-2 px-2.5 py-1 border rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-between ${
                              s.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              <span className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${
                                  s.isActive ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'
                                }`}></span>
                                {s.isActive ? '⚡ LIVE HARDWARE SENSOR (ThingSpeak #3303265)' : '📴 ESP32 OFFLINE — No live data'}
                              </span>
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                                s.isActive ? 'bg-emerald-200/60 text-emerald-800' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {s.isActive ? 'ESP32 STREAM' : 'DEVICE OFF'}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                !s.isActive && s.id === 'S1'
                                  ? 'bg-slate-100 text-slate-400'
                                  : s.id === 'S1'
                                  ? 'bg-emerald-100 text-emerald-600'
                                  : s.value > 80
                                  ? 'bg-rose-100 text-rose-600'
                                  : s.value > 50
                                  ? 'bg-amber-100 text-amber-600'
                                  : 'bg-emerald-100 text-emerald-600'
                              }`}>
                                {s.type === 'ultrasonic' ? <Trash2 size={18} /> : <Zap size={18} />}
                              </div>
                              <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                  {s.type === 'ultrasonic' ? 'Capacity' : 'Level'}
                                </div>
                                <div className="text-sm font-black text-slate-900">{s.location}</div>
                                {/* Show distance row ONLY for the real ESP32 sensor */}
                                {s.id === 'S1' && (
                                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                                    Distance : {s.isActive ? `${s.distance ?? '--'} cm` : '-- (offline)'}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {(!s.isActive && s.id === 'S1') ? (
                                <div className="text-xl font-black text-slate-400">OFFLINE</div>
                              ) : (
                                <div className={`text-2xl font-black ${
                                  s.value > 80 ? 'text-rose-600'
                                  : s.value > 50 ? 'text-amber-500'
                                  : 'text-emerald-600'
                                }`}>
                                  {s.value.toFixed(0)}%
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Animated Progress Bar — 3-color */}
                          <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              className={`h-full ${
                                !s.isActive && s.id === 'S1'
                                  ? 'bg-slate-300'
                                  : s.value > 80
                                  ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                                  : s.value > 50
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-500'
                              }`}
                              animate={{ width: `${(!s.isActive && s.id === 'S1') ? 100 : s.value}%` }}
                            />
                          </div>

                          {/* Live Telemetry Data Box — ONLY for S1 (real ESP32 hardware) */}
                          {s.id === 'S1' && (
                            <div className="mt-3 text-xs font-mono bg-slate-50 border border-slate-100 p-2.5 rounded-xl space-y-1 text-slate-700">
                              <div className="flex justify-between items-center pb-1 border-b border-slate-200/60 text-[10px] font-sans">
                                <span className={`flex items-center gap-1 font-bold ${
                                  s.isActive ? 'text-emerald-600' : 'text-slate-400'
                                }`}>
                                  <span className={`w-2 h-2 rounded-full ${
                                    s.isActive ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'
                                  }`}></span>
                                  {s.isActive ? 'Live Hardware Stream' : 'No Signal'}
                                </span>
                                <span className="text-slate-400 font-medium">3s Poll Cycle</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Distance :</span>
                                <strong className={s.isActive ? 'text-indigo-600 font-bold' : 'text-slate-400'}>
                                  {s.isActive ? `${s.distance ?? '--'} cm` : '-- cm (device off)'}
                                </strong>
                              </div>
                              <div className="flex justify-between">
                                <span>Fill Level :</span>
                                <strong className={
                                  !s.isActive ? 'text-slate-400'
                                  : s.value > 80 ? 'text-rose-600 font-bold'
                                  : s.value > 50 ? 'text-amber-500 font-bold'
                                  : 'text-emerald-600 font-bold'
                                }>
                                  {!s.isActive ? 'OFFLINE' : `${s.value.toFixed(1)}%`}
                                </strong>
                              </div>
                              <div className="flex justify-between text-[10px] text-slate-400 font-sans">
                                <span>Last Ping :</span>
                                <span>{new Date(s.lastUpdate).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                    </div>
                  </div>
                )}

                {/* Performance Chart */}
                <Card className="!p-6">
                  <h2 className="text-sm font-black mb-6 uppercase tracking-widest text-slate-400">Issue Status Summary</h2>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dynamicChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          tickLine={false} 
                          axisLine={false} 
                          tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} 
                        />
                        <YAxis 
                          tickLine={false} 
                          axisLine={false} 
                          allowDecimals={false}
                          tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} 
                        />
                        <Tooltip 
                          cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }}
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}
                          labelStyle={{ fontWeight: 'black', color: '#1e293b' }}
                          itemStyle={{ fontWeight: 'bold' }}
                        />
                        <Bar 
                          dataKey="count" 
                          radius={[8, 8, 0, 0]} 
                          barSize={32}
                        >
                          {dynamicChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </div>

            {/* Admin-only: Field Staff & Workload Connections */}
            {user.role === 'admin' && (
              <div className="mt-8 pt-8 border-t border-slate-200">
                <h2 className="text-xl font-black mb-6 flex items-center gap-3 text-slate-800">
                  <HardHat className="text-indigo-600" size={24} />
                  Field Staff Directory & Active Assignments
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {workers.map(worker => {
                    const assignedTasks = complaints.filter(c => c.assignedTo === worker.id);
                    return (
                      <Card key={worker.id} className="hover:shadow-lg transition-all duration-300 bg-white">
                        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100">
                          <img src={worker.avatar} className="w-12 h-12 rounded-xl shadow-sm" alt="" />
                          <div>
                            <h3 className="font-black text-slate-900">{worker.name}</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                              <MapPin size={10} className="text-indigo-500" /> Sector: {worker.stationedAt || 'General'}
                            </p>
                          </div>
                          <span className="ml-auto px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-black rounded-xl">
                            {assignedTasks.length} Active Task{assignedTasks.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="space-y-3">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Assigned Works</p>
                          {assignedTasks.length > 0 ? (
                            assignedTasks.map(task => (
                              <div key={task.id} className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-100 flex items-center justify-between transition-colors">
                                <div className="min-w-0 pr-2">
                                  <p className="text-xs font-black text-slate-800 truncate">{task.title}</p>
                                  <p className="text-[9px] font-bold text-slate-400 truncate">{task.location}</p>
                                </div>
                                <Badge type={task.status} />
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 italic py-2">No pending assignments</p>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
               <h2 className="text-2xl font-black">Issue Database</h2>
               <div className="flex gap-3">
                 <Button variant="ghost" size="sm" onClick={handleExportCSV}>Export Data</Button>
                 <Button variant="ghost" size="sm">Filter List</Button>
               </div>
             </div>
             
             <div className="overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200">
                    <tr>
                      <th className="px-8 py-5">Reference</th>
                      <th className="px-8 py-5">Issue Title</th>
                      <th className="px-8 py-5">Reported By</th>
                      <th className="px-8 py-5">Location</th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5">Priority</th>
                      <th className="px-8 py-5">Category</th>
                      <th className="px-8 py-5">Field Staff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredComplaints.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors cursor-pointer group">
                        <td className="px-8 py-5 font-mono text-[10px] text-slate-400 font-bold">#{c.id.substring(0, 8)}</td>
                        <td className="px-8 py-5 font-bold text-slate-900">{c.title}</td>
                        <td className="px-8 py-5">
                          {c.reportedBy === 'system' ? (
                            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                              <Zap size={12} className="text-indigo-500" /> System
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                               <img src={users.find(u => u.id === c.reportedBy)?.avatar} className="w-5 h-5 rounded-full border border-slate-100" alt="" />
                               <span className="text-xs font-bold text-slate-700">{users.find(u => u.id === c.reportedBy)?.name || 'Citizen'}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-5 text-sm text-slate-600">
                          <a 
                            href={c.coordinates 
                              ? `https://www.google.com/maps/search/?api=1&query=${c.coordinates[0]},${c.coordinates[1]}`
                              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.location)}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-indigo-600 hover:underline transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <MapPin size={12} className="text-indigo-400" /> {c.location}
                          </a>
                        </td>
                        <td className="px-8 py-5"><Badge type={c.status} /></td>
                        <td className="px-8 py-5"><Badge type={c.priority} /></td>
                        <td className="px-8 py-5 capitalize font-semibold text-slate-600 text-sm">{c.type}</td>
                        <td className="px-8 py-5">
                          {c.assignedTo ? (
                            <div className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-black">
                                 {workers.find(w => w.id === c.assignedTo)?.name.charAt(0)}
                               </div>
                               <span className="text-xs font-bold text-slate-600">{workers.find(w => w.id === c.assignedTo)?.name}</span>
                            </div>
                          ) : <span className="text-xs text-slate-400 italic">Unassigned</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {activeTab === 'analytics' && user.role === 'admin' && (
          <AdminAnalytics
            complaints={complaints}
            sensors={sensors}
            workers={workers}
            users={users}
            userLocation={userLocation}
            locationStatus={locationStatus}
          />
        )}

        {false && (
          <div className="space-y-8">
            {/* Top row - 2 Large Cards */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* LEFT CARD - Bin Status Distribution */}
              <Card className="glass-card hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Trash2 className="text-indigo-600" size={20} />
                    Bin Status Distribution
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Live Telemetry
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Left part: Donut chart & Stats */}
                  <div className="md:col-span-6 flex flex-col items-center">
                    <div className="relative flex items-center justify-center">
                      <PieChart width={160} height={160}>
                        <Pie
                          data={[
                            { name: 'Empty Bins', value: 18 },
                            { name: 'Half Filled', value: 14 },
                            { name: 'Nearly Full', value: 10 },
                            { name: 'Overflow', value: 8 }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          <Cell fill="#10b981" /> {/* Empty */}
                          <Cell fill="#f59e0b" /> {/* Half Filled */}
                          <Cell fill="#f97316" /> {/* Nearly Full */}
                          <Cell fill="#ef4444" /> {/* Overflow */}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                      <div className="absolute text-center">
                        <span className="block text-2xl font-black text-slate-800">50</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Bins</span>
                      </div>
                    </div>
                    
                    {/* Metrics list */}
                    <div className="w-full mt-4 grid grid-cols-2 gap-3 text-center">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="block text-sm font-black text-slate-800">50</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Total Bins</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="block text-sm font-black text-emerald-600">47</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Active Bins</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="block text-sm font-black text-rose-600">8</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Overflow Bins</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="block text-sm font-black text-indigo-600">74%</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Avg Fill Level</span>
                      </div>
                    </div>
                  </div>

                  {/* Right part: Legend & KPI Cards */}
                  <div className="md:col-span-6 space-y-4">
                    {/* Colors legend */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-100/55">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Empty – 18</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Half Filled – 14</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Nearly Full – 10</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Overflow – 8</span>
                    </div>

                    {/* 2x2 KPI cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow transition-shadow">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1"><AlertCircle size={10} className="text-rose-500" /> Today's Alerts</div>
                        <span className="text-lg font-black text-slate-800">12</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow transition-shadow">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-500" /> Today's Collections</div>
                        <span className="text-lg font-black text-slate-800">38</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow transition-shadow">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1"><TrendingUp size={10} className="text-indigo-500" /> Efficiency</div>
                        <span className="text-lg font-black text-indigo-600">94.5%</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow transition-shadow">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1"><Wifi size={10} className="text-cyan-500" /> Devices Online</div>
                        <span className="text-lg font-black text-cyan-600">47/50</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* RIGHT CARD - Smart Waste Analytics */}
              <Card className="glass-card hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                {/* Top Section - Live Sensor Information */}
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-md font-black text-slate-900 flex items-center gap-2">
                      <Cpu className="text-indigo-600" size={18} />
                      Live Sensor Information
                    </h3>
                    <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border border-emerald-100">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      ESP32 Connected ✅
                    </div>
                  </div>
                  
                  {/* Telemetry data grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-100 mb-4">
                    <div>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Sensor Type</span>
                      <span className="text-xs font-black text-slate-800">Ultrasonic</span>
                    </div>
                    <div>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Distance</span>
                      <span className="text-xs font-black text-indigo-600 font-mono">8 cm</span>
                    </div>
                    <div>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider font-semibold text-rose-600">Fill Level</span>
                      <span className="text-xs font-black text-rose-600 font-mono">92%</span>
                    </div>
                    <div>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider font-semibold text-rose-600">Status</span>
                      <span className="text-[10px] font-bold text-rose-700 flex items-center gap-0.5">🔴 Overflow Detected</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200/50">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Bin ID</span>
                      <span className="text-xs font-black text-slate-800 font-mono">C2</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200/50">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Latitude</span>
                      <span className="text-xs font-black text-slate-800 font-mono">11.6643</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200/50">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Longitude</span>
                      <span className="text-xs font-black text-slate-800 font-mono">78.1460</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200/50">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Last Updated</span>
                      <span className="text-xs font-black text-slate-800 flex items-center gap-0.5"><Clock size={10} className="text-indigo-400" /> Just Now</span>
                    </div>
                  </div>
                </div>

                {/* Middle Section - Small Line Graph */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Activity size={10} /> Garbage Fill Level (Last 24 Hours)
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                      <TrendingUp size={10} /> Increasing Trend
                    </span>
                  </div>
                  <div className="h-16 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={IOT_FILL_24H} margin={{ top: 2, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="hour" tick={{ fill: '#94a3b8', fontSize: 8 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 8 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                        <Tooltip contentStyle={{ fontSize: '9px', padding: '4px', borderRadius: '6px' }} />
                        <Line type="monotone" dataKey="level" stroke="#6366f1" strokeWidth={1.5} dot={{ r: 2, fill: '#6366f1' }} activeDot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Bottom Section - Recent IoT Alerts */}
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertTriangle size={10} className="text-amber-500" /> Recent IoT Alerts
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {IOT_ALERTS_LOG.map((log, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100/80 text-[10px]">
                        <span>{log.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-700 truncate leading-none">{log.text}</p>
                          <span className="text-[8px] text-slate-400">{log.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* Middle Section - Live Smart Bin Analytics */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Database className="text-indigo-600" size={24} />
                    Live Smart Bin Analytics
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">Weekly diagnostics logs and performance reports from deployed systems.</p>
                </div>
                
                {/* Small Status Indicators (Top right corner of section) */}
                <div className="flex flex-wrap gap-2 text-[9px] font-extrabold uppercase tracking-wide">
                  <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-100 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    ESP32 Connected
                  </span>
                  <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-100 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    WiFi Connected
                  </span>
                  <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-100 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    ThingSpeak Online
                  </span>
                  <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-100 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    GPS Active
                  </span>
                  <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-100 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Backend Connected
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Bar Chart: Daily Waste Collection */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1">
                    <BarChart3 size={14} className="text-indigo-500" /> Daily Waste Collection
                  </h4>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={IOT_DAILY_COLLECTION} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Area Chart: Overflow Events */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1">
                    <Signal size={14} className="text-rose-500" /> Overflow Events
                  </h4>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={IOT_OVERFLOW_EVENTS} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="events" stroke="#f43f5e" fillOpacity={1} fill="url(#colorEvents)" strokeWidth={1.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pie Chart: Complaint Categories */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <AlertTriangle size={14} className="text-amber-500" /> Complaint Categories
                  </h4>
                  <div className="h-44 w-full flex flex-col items-center justify-center">
                    <ResponsiveContainer width="100%" height="75%">
                      <PieChart>
                        <Pie
                          data={IOT_COMPLAINT_CATEGORIES}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={50}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {IOT_COMPLAINT_CATEGORIES.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-1.5 justify-center text-[8px] font-bold text-slate-500 mt-1">
                      {IOT_COMPLAINT_CATEGORIES.map((entry, index) => (
                        <span key={index} className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                          {entry.name} ({entry.value})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Worker Performance */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1">
                    <HardHat size={14} className="text-indigo-500" /> Worker Performance
                  </h4>
                  <div className="space-y-3.5 flex-1 flex flex-col justify-center">
                    {IOT_WORKER_PERFORMANCE.map((worker, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-black text-slate-700">
                          <span className="flex items-center gap-1"><Users size={10} className="text-slate-400" /> {worker.name}</span>
                          <span className="font-mono text-indigo-600">{worker.completed} Done • {worker.completionRate}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${worker.completionRate}%` }} />
                        </div>
                        <div className="text-[8px] text-slate-400 font-bold text-right uppercase tracking-wider">
                          Resp Time: {worker.responseTime}m avg
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section - Interactive GPS Map & AI Prediction */}
            <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 pl-2">
                <MapIcon className="text-indigo-600" size={22} />
                Interactive GPS Map & Real-time Tracking
              </h2>
              
              <div className="h-96 w-full rounded-3xl overflow-hidden border border-slate-200 shadow-sm relative z-0">
                <MapContainer center={[11.6643, 78.1460]} zoom={14} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {/* Smart Bins status markers */}
                  {IOT_SMART_BINS.map(bin => (
                    <Marker 
                      key={bin.id} 
                      position={[bin.lat, bin.lng]} 
                      icon={createMarkerIcon(bin.status === 'red' ? 'red' : bin.status === 'yellow' ? 'yellow' : 'green', bin.status === 'red')}
                    >
                      <Popup>
                        <div className="text-xs">
                          <div className="font-black text-slate-900">{bin.name}</div>
                          <div className="text-[10px] text-slate-500 uppercase mt-1">Fill Level: <strong className={bin.status === 'red' ? 'text-rose-600' : bin.status === 'yellow' ? 'text-amber-500' : 'text-emerald-600'}>{bin.fill}%</strong></div>
                          <div className="text-[9px] text-slate-400 mt-0.5 font-semibold">Status: {bin.status === 'red' ? '🔴 Overflow Detected' : bin.status === 'yellow' ? '🟡 Nearly Full' : '🟢 Normal'}</div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {/* Live ESP32 Tracker Marker */}
                  <Marker 
                    position={[11.6643, 78.1460]} 
                    icon={createMarkerIcon('purple', true)}
                  >
                    <Popup>
                      <div className="text-xs">
                        <div className="font-black text-indigo-700 flex items-center gap-1">Live ESP32 Device</div>
                        <div className="text-[10px] text-slate-500 mt-1">Status: Active & connected</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">Transmitting live GPS telemetry</div>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>

                {/* Floating AI Prediction Card */}
                <div className="absolute bottom-4 left-4 z-[400] max-w-[240px] w-full">
                  <div className="bg-white/95 backdrop-blur-md border border-indigo-100 p-4 rounded-2xl shadow-xl">
                    <div className="flex items-center gap-1.5 mb-2 text-indigo-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-indigo-50 pb-1.5">
                      <Activity size={12} className="animate-pulse" />
                      AI Prediction
                    </div>
                    <div className="space-y-1.5 text-[10px] font-bold">
                      <div className="flex justify-between">
                        <span className="text-slate-400 uppercase tracking-tight">Expected Overflow:</span>
                        <span className="font-extrabold text-rose-600 font-mono">12 bins</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 uppercase tracking-tight">Critical Zone:</span>
                        <span className="text-slate-800">Market Area</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 uppercase tracking-tight">Suggested Route:</span>
                        <span className="text-indigo-600 bg-indigo-50 px-1 rounded font-mono">Route A</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-100">
                        <span className="text-slate-400 uppercase tracking-tight">Confidence:</span>
                        <span className="text-emerald-600 font-extrabold">96%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="space-y-4">
            {locationStatus === 'denied' && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-800 text-xs font-bold">
                <AlertCircle size={16} className="text-rose-600" />
                <span>Live location unavailable. Displaying predefined default location ({userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}).</span>
              </div>
            )}
            <div className="h-[calc(100vh-200px)] w-full rounded-3xl overflow-hidden border border-slate-200 shadow-sm relative z-0">
              {/* Map Interaction Legend & Live GPS Button */}
              <div className="absolute top-4 left-4 z-[400] flex items-center gap-3">
                <button
                  onClick={() => {
                    if ("geolocation" in navigator) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          alert(`Live GPS Acquired! Latitude: ${pos.coords.latitude.toFixed(4)}, Longitude: ${pos.coords.longitude.toFixed(4)}`);
                        },
                        (err) => alert(`Geolocation error: ${err.message}. Please check browser location permissions.`),
                        { enableHighAccuracy: true, timeout: 10000 }
                      );
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 transition-all cursor-pointer pointer-events-auto"
                >
                  <Navigation size={14} className="animate-spin" /> 📍 Acquire Live GPS Coordinates
                </button>
              </div>

              {(user.role === 'admin' || user.role === 'citizen') && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-slate-200 pointer-events-none">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <MapPin size={16} className="text-indigo-600" /> Click anywhere on map to drop a new report
                  </span>
                </div>
              )}
              
              <MapContainer center={userLocation} zoom={15} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                <RecenterMap center={userLocation} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapEvents 
                  onMapClick={(latlng) => {
                    if (user.role === 'admin' || user.role === 'citizen') {
                      setNewReport(prev => ({
                        ...prev,
                        location: `GPS: ${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`,
                        coordinates: [latlng.lat, latlng.lng]
                      }));
                      setIsReportModalOpen(true);
                    }
                  }} 
                />

                {/* Browser Live Location & Primary ESP32 Sensor Marker */}
                <Marker position={userLocation} icon={createMarkerIcon('purple', true)}>
                  <Popup>
                    <div className="text-xs font-bold min-w-[180px]">
                      <div className="font-black text-indigo-700 mb-1 flex items-center gap-1">
                        <Navigation size={12} /> Primary ESP32 Sensor (S1)
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Status:</span>
                        <span className={`font-black ${(sensors[0]?.value || 0) > 80 ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}`}>
                          {(sensors[0]?.value || 0) > 80 ? '🔴 OVERFLOW' : '🟢 NORMAL'}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Fill Level:</span>
                        <span className="font-black text-slate-800">{(sensors[0]?.value || 20).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Distance:</span>
                        <span className="font-black text-indigo-600">{sensors[0]?.distance ?? 80} cm</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Live GPS:</span>
                        <span className="font-mono text-slate-700">{userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>

                {filteredComplaints.map(c => {
                  const pos: [number, number] = (c.source === 'sensor' || c.reportedBy === 'system') ? userLocation : (c.coordinates || userLocation);
                  return (
                    <Marker key={c.id} position={pos} icon={createMarkerIcon(c.priority === 'critical' ? 'red' : 'yellow', c.priority === 'critical')}>
                      <Popup>
                        <div className="font-bold text-slate-900">{c.title}</div>
                        <div className="text-xs text-slate-500 uppercase text-indigo-600 mb-1">{c.status}</div>
                        <div className="text-[10px] text-slate-500">
                          <strong>Reported by:</strong> {c.reportedBy === 'system' ? 'System Sensor' : users.find(u => u.id === c.reportedBy)?.name || 'Citizen'}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          <strong>Assignee:</strong> {c.assignedTo ? users.find(u => u.id === c.assignedTo)?.name || 'Worker' : 'Unassigned'}
                        </div>
                        <div className="text-[10px] font-mono text-indigo-600 mt-1">
                          📍 Live Position: {pos[0].toFixed(4)}, {pos[1].toFixed(4)}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
                {sensors.map(s => s.coordinates && s.id !== 'S1' && (
                  <Marker key={s.id} position={s.coordinates} icon={createMarkerIcon(s.value > 80 ? 'red' : s.value > 50 ? 'yellow' : 'green', s.value > 80)}>
                    <Popup>
                      <div className="font-bold text-slate-900">Sensor: {s.location}</div>
                      <div className="text-xs text-slate-500 uppercase">
                        Distance: {s.distance ?? Math.max(5, Math.round(100 - s.value))} cm • Fill: {s.value.toFixed(0)}%
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="Issue Submission">
        <div className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Subject</label>
            <input 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" 
              placeholder="e.g. Pothole on 5th Ave"
              value={newReport.title}
              onChange={(e) => setNewReport(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
            <textarea 
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" 
              placeholder="Provide context. Our AI will automatically categorize and prioritize based on severity."
              value={newReport.description}
              onChange={(e) => setNewReport(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Incident Location</label>
            <div className="relative">
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 pr-12 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" 
                placeholder="Street or Landmark"
                value={newReport.location}
                onChange={(e) => setNewReport(prev => ({ ...prev, location: e.target.value }))}
              />
              <button 
                onClick={handleFetchLocation}
                disabled={isFetchingLocation}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors disabled:opacity-50"
                title="Get current location"
              >
                {isFetchingLocation ? <Loader2 className="animate-spin" size={20} /> : <Navigation size={20} />}
              </button>
            </div>
            <p className="mt-2 text-[10px] text-slate-500 font-medium italic">* Providing an accurate location helps our field staff reach the site faster.</p>
          </div>
          <Button 
            className="w-full py-4 text-md" 
            isLoading={isAnalyzing}
            onClick={handleCreateReport}
          >
            Launch AI Assessment & Submit
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isAssignModalOpen.isOpen} onClose={() => setIsAssignModalOpen({ isOpen: false, complaintId: '' })} title="Dispatch Field Staff">
        <div className="space-y-4">
          <div className="bg-indigo-50 p-4 rounded-2xl mb-4 border border-indigo-100">
            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Issue Location</div>
            <div className="flex items-center gap-2 text-indigo-900 font-bold">
              <MapPin size={16} />
              {selectedComplaintForAssignment?.location || 'Unknown'}
            </div>
          </div>
          
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Available Technicians</p>
          <div className="space-y-3">
            {workers.map(worker => {
              const isLocalMatch = selectedComplaintForAssignment?.location.toLowerCase().includes(worker.stationedAt?.toLowerCase() || 'none');
              
              return (
                <button
                  key={worker.id}
                  onClick={() => {
                    onUpdateComplaint(isAssignModalOpen.complaintId, 'assigned', worker.id);
                    setIsAssignModalOpen({ isOpen: false, complaintId: '' });
                  }}
                  className={`w-full flex items-center justify-between p-5 border rounded-2xl transition-all text-left group ${
                    isLocalMatch 
                    ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400' 
                    : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-indigo-400'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img src={worker.avatar} className="w-12 h-12 rounded-xl shadow-sm" alt="" />
                      {isLocalMatch && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                          <CheckCircle2 size={10} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-black text-slate-900 flex items-center gap-2">
                        {worker.name}
                        {isLocalMatch && <Badge type="Verified Near Issue" />}
                      </div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                        <MapPin size={10} /> Stationed: {worker.stationedAt || 'Unassigned'}
                      </div>
                    </div>
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center transition-all ${
                    isLocalMatch ? 'text-emerald-500 group-hover:bg-emerald-600 group-hover:text-white' : 'text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white'
                  }`}>
                    <ArrowRight size={20} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
