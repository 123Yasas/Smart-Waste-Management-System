import React, { useState, useEffect, useRef } from 'react';
import { 
  INITIAL_USERS, 
  INITIAL_COMPLAINTS, 
  INITIAL_SENSORS 
} from './store';
import { User, Complaint, UserRole, Sensor, ComplaintStatus } from './types';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import { motion, AnimatePresence } from 'framer-motion';

// Default fallback coordinates if user denies location permission
const DEFAULT_LOCATION: [number, number] = [11.6643, 78.1460];

// ── ThingSpeak Configuration ──────────────────────────────────────────────────
export const THINGSPEAK_CHANNEL_ID = '3303265'; // Your Arduino Channel ID (Fill)
export const THINGSPEAK_READ_API_KEY = 'IYJYSPYAMNZDWI20'; // Your Read API Key

interface ToastNotification {
  id: string;
  title: string;
  binId: string;
  distance: number;
  fillPercentage: number;
  location: string;
  coordinates: [number, number];
  timestamp: string;
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<ToastNotification | null>(null);

  // Browser Geolocation State
  const [userLocation, setUserLocation] = useState<[number, number]>(DEFAULT_LOCATION);
  const [locationStatus, setLocationStatus] = useState<'requesting' | 'granted' | 'denied'>('requesting');
  const userLocationRef = useRef<[number, number]>(DEFAULT_LOCATION);
  userLocationRef.current = userLocation;

  // Track ThingSpeak entry_id — if it changes, ESP32 sent new data
  const lastProcessedEntryIdRef = useRef<number>(0);
  const isOverflowStateActiveRef = useRef<boolean>(false);
  // Track WHEN we last saw a new entry_id (browser time — no timezone issues)
  const lastNewEntryTimeRef = useRef<number>(0);
  // Last known valid distance from ThingSpeak (default 30 cm for small bin)
  const lastKnownDistanceRef = useRef<number>(30);

  // 1. Request Browser Location Permission on mount & track live physical position continuously
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          setLocationStatus('granted');
        },
        (err) => console.warn("Initial geolocation lookup:", err.message),
        { enableHighAccuracy: false, timeout: 10000 }
      );
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          setLocationStatus('granted');
        },
        (error) => console.warn("Geolocation watch update:", error.message),
        {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 5000
        }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setLocationStatus('denied');
    }
  }, []);

  // Update sensor S1 coordinates dynamically whenever live browser userLocation updates
  useEffect(() => {
    setSensors(prev => prev.map(s => s.id === 'S1' ? { ...s, coordinates: userLocation } : s));
  }, [userLocation]);

  // Fetch initial data from backend API, fall back to local data if unavailable
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [usersRes, complaintsRes, sensorsRes] = await Promise.all([
          fetch('/api/users').then(res => { if (!res.ok) throw new Error('users'); return res.json(); }),
          fetch('/api/complaints').then(res => { if (!res.ok) throw new Error('complaints'); return res.json(); }),
          fetch('/api/sensors').then(res => { if (!res.ok) throw new Error('sensors'); return res.json(); })
        ]);
        setUsers(Array.isArray(usersRes) && usersRes.length > 0 ? usersRes : INITIAL_USERS);
        setComplaints(Array.isArray(complaintsRes) ? complaintsRes : INITIAL_COMPLAINTS);
        setSensors(Array.isArray(sensorsRes) ? sensorsRes : INITIAL_SENSORS);
        
        const loadedSensors: Sensor[] = Array.isArray(sensorsRes) ? sensorsRes : INITIAL_SENSORS;
        const formattedSensors = loadedSensors.map(s => {
          const dist = s.distance ?? Math.max(5, Math.round(100 - s.value));
          return {
            ...s,
            distance: dist,
            binId: s.binId || s.id,
            coordinates: s.id === 'S1' ? userLocationRef.current : (s.coordinates || DEFAULT_LOCATION)
          };
        });
        setSensors(formattedSensors);
      } catch (error) {
        console.warn('Backend unavailable, using local demo data:', error);
        setUsers(INITIAL_USERS);
        setComplaints(INITIAL_COMPLAINTS);
        
        const formattedSensors: Sensor[] = INITIAL_SENSORS.map(s => {
          const dist = s.distance ?? Math.max(5, Math.round(100 - s.value));
          return {
            ...s,
            distance: dist,
            binId: s.id === 'S1' ? 'C2' : s.id,
            coordinates: s.id === 'S1' ? userLocationRef.current : (s.coordinates || DEFAULT_LOCATION)
          };
        });
        setSensors(formattedSensors);
      }
    };
    fetchInitialData();
  }, []);

  // Helper: Reverse Geocode browser coordinates to real place name
  const getLivePlaceName = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      if (res.ok) {
        const data = await res.json();
        const address = data.address;
        const place = address?.suburb || address?.neighbourhood || address?.quarter || address?.road || address?.city_district || address?.city;
        if (place) {
          return `${place} (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        }
      }
    } catch (e) {}
    return `Live GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  // Helper to acquire live browser coordinates on demand
  const getLiveBrowserLocation = (): Promise<[number, number]> => {
    return new Promise((resolve) => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const fresh: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            setUserLocation(fresh);
            resolve(fresh);
          },
          () => resolve(userLocationRef.current),
          { timeout: 8000, enableHighAccuracy: false }
        );
      } else {
        resolve(userLocationRef.current);
      }
    });
  };

  // 2. POLL THINGSPEAK & EVENT-DRIVEN COMPLAINT CREATION (EVERY 3 SECONDS)
  useEffect(() => {
    const initializeLatestEntryId = async () => {
      try {
        const apiKeyParam = THINGSPEAK_READ_API_KEY ? `&api_key=${THINGSPEAK_READ_API_KEY}` : '';
        const url = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?results=1${apiKeyParam}`;
        const tsRes = await fetch(url);
        if (tsRes.ok) {
          const tsData = await tsRes.json();
          const latestFeed = tsData?.feeds?.[0];
          if (latestFeed?.entry_id) {
            // Seed the initial entry_id so the first NEW upload is detected correctly
            lastProcessedEntryIdRef.current = latestFeed.entry_id;
            const initDist = parseFloat(latestFeed.field1 ?? '80');
            if (!isNaN(initDist)) lastKnownDistanceRef.current = initDist;
            // ✅ Always mark as ONLINE on startup if ThingSpeak has any valid data.
            // The 2-minute timeout will handle ESP32-off detection naturally.
            // The old 30s initAge check was too strict — caused OFFLINE state
            // whenever the page loaded 31+ seconds after the last ESP32 upload.
            lastNewEntryTimeRef.current = Date.now();
          }
        }
      } catch (e) {}
    };
    initializeLatestEntryId();

    const interval = setInterval(async () => {
      let liveDistance: number | null = null;
      let feedEntryId: number | null = null;

      try {
        const apiKeyParam = THINGSPEAK_READ_API_KEY ? `&api_key=${THINGSPEAK_READ_API_KEY}` : '';
        const url = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?results=1${apiKeyParam}`;
        const tsRes = await fetch(url);
        if (tsRes.ok) {
          const tsData = await tsRes.json();
          const latestFeed = tsData?.feeds?.[0];

          if (latestFeed?.field1 !== undefined && latestFeed?.field1 !== null) {
            const parsedDist = parseFloat(latestFeed.field1);
            if (!isNaN(parsedDist)) {
              liveDistance = parsedDist;
              feedEntryId = latestFeed.entry_id ?? null;

              // ── Key: detect a NEW upload from ESP32 by watching entry_id change ──
              if (feedEntryId !== null && feedEntryId !== lastProcessedEntryIdRef.current) {
                lastProcessedEntryIdRef.current = feedEntryId;
                lastNewEntryTimeRef.current = Date.now(); // Browser time — no timezone issues
                lastKnownDistanceRef.current = parsedDist;
                console.log('[ThingSpeak] NEW entry_id:', feedEntryId, '→', parsedDist, 'cm');
              } else {
                // Same entry_id = ThingSpeak hasn't received a new upload yet.
                // Update lastKnown so we always have the freshest distance.
                lastKnownDistanceRef.current = parsedDist;
                console.log('[ThingSpeak] Same entry_id, distance:', parsedDist, 'cm');
              }
            }

            // Parse Field 2 & Field 3 (Live GPS Lat / Lon from Hardware)
            if (latestFeed.field2 && latestFeed.field3) {
              const parsedLat = parseFloat(latestFeed.field2);
              const parsedLon = parseFloat(latestFeed.field3);
              if (!isNaN(parsedLat) && !isNaN(parsedLon) && (parsedLat !== 36.7783 || parsedLon !== -119.4179)) {
                userLocationRef.current = [parsedLat, parsedLon];
              }
            }
          }
        }
      } catch (e) {
        console.error('[ThingSpeak Fetch Error]', e);
      }

      setSensors(prev => {
        return prev.map(s => {
          if (s.id !== 'S1') return s;

          // ── Online/Offline detection using entry_id + browser time (timezone-safe) ──
          // ESP32 uploads every ~15s. If no new entry_id for 2 minutes → device is off.
          const OFFLINE_AFTER_MS = 2 * 60 * 1000;
          const isDeviceOnline = lastNewEntryTimeRef.current > 0 &&
            (Date.now() - lastNewEntryTimeRef.current) < OFFLINE_AFTER_MS;

          // ── OFFLINE ──
          if (!isDeviceOnline) {
            return {
              ...s,
              location: '⚡ Live ESP32 Hardware Bin',
              value: 0,
              distance: 30,
              isActive: false,
              lastUpdate: new Date().toISOString()
            };
          }

          // ── ONLINE: use real distance, NO jitter, NO fake values ──
          // If this poll got a fresh liveDistance, use it; else use last known value
          const rawDist = liveDistance !== null ? liveDistance : lastKnownDistanceRef.current;

          // Clamp to HC-SR04 practical range for small bin (30 cm height)
          let distance = Math.max(0.5, Math.min(400, rawDist));
          distance = Number(distance.toFixed(1));

          // Fill % for 30 cm small bin: 2 cm = 100% full, 30 cm = 0% (empty bin)
          let fillPercentage = 0;
          if (distance <= 2.0) {
            fillPercentage = 100;
          } else if (distance >= 30.0) {
            fillPercentage = 0;
          } else {
            fillPercentage = Math.round(((30.0 - distance) / 28.0) * 100);
          }
          fillPercentage = Math.max(0, Math.min(100, fillPercentage));

          console.log('[S1 ONLINE (30cm Bin)]', distance, 'cm →', fillPercentage, '%');

          const coords = userLocationRef.current;

          // Overflow alert when distance <= 5 cm (>= 89% full on a 30cm bin)
          const isOverflow = fillPercentage >= 90 || distance <= 5.0;
          if (isOverflow) {
            getLiveBrowserLocation().then(async (freshCoords) => {
              const placeName = await getLivePlaceName(freshCoords[0], freshCoords[1]);
              triggerOverflowEvent('S1', placeName, distance, fillPercentage, freshCoords);
            });
          }

          return {
            ...s,
            location: '⚡ Live ESP32 Hardware Bin',
            value: fillPercentage,
            distance,
            isActive: true,
            coordinates: coords,
            lastUpdate: new Date().toISOString()
          };
        });
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Create a NEW Complaint & ONE Toast Notification with real-time location
  const triggerOverflowEvent = async (
    binId: string,
    locationName: string,
    distance: number,
    fillPercentage: number,
    coords: [number, number]
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    const title = `Garbage Overflow Alert — Distance: ${distance.toFixed(2)} cm (${fillPercentage}% full)`;
    const desc = `Live ESP32 Hardware Detection: Measured Distance = ${distance.toFixed(2)} cm, Bin Capacity = ${fillPercentage}% full. Timestamp: ${timestamp}. Live Location: ${locationName}`;
    const locString = locationName;

    // 1. Show Toast Notification
    setActiveToast({
      id: `toast-${Date.now()}`,
      title,
      binId,
      distance,
      fillPercentage,
      location: locString,
      coordinates: coords,
      timestamp
    });

    setTimeout(() => {
      setActiveToast(prev => (prev?.binId === binId ? null : prev));
    }, 2800);

    // 2. Create NEW Complaint in React State & MongoDB with live browser location
    const newComplaint: Complaint = {
      id: `C${Date.now().toString().slice(-4)}`,
      title,
      description: desc,
      type: 'garbage',
      source: 'sensor',
      location: locString,
      coordinates: coords,
      status: 'pending',
      priority: 'critical',
      reportedBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Update sensor location in state to match live location
    setSensors(prev => prev.map(s => s.id === 'S1' ? { ...s, location: locString, coordinates: coords } : s));

    // Prepend to React state immediately so System Alerts & Queue update instantly
    setComplaints(prev => [newComplaint, ...prev]);

    // Save to MongoDB
    try {
      await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newComplaint)
      });
    } catch (e) {
      console.warn('MongoDB backend offline, complaint saved in React state.');
    }
  };

  const handleLogin = (email: string) => {
    const user = users.find(u => u.email === email);
    if (user) setCurrentUser(user);
  };

  const handleLogout = () => setCurrentUser(null);

  const updateComplaintStatus = async (id: string, status: ComplaintStatus, assignedTo?: string) => {
    try {
      const res = await fetch(`/api/complaints/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, assignedTo })
      });
      if (res.ok) {
        const updated = await res.json();
        setComplaints(prev => prev.map(c => c.id === id ? updated : c));
        return;
      }
    } catch (error) {
      console.error('Error updating complaint status:', error);
    }
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status, assignedTo: assignedTo || c.assignedTo, updatedAt: new Date().toISOString() } : c));
  };

  const addComplaint = async (complaint: Partial<Complaint>) => {
    const coords = complaint.coordinates || userLocation;
    const newComp = {
      title: complaint.title || 'Untitled',
      description: complaint.description || '',
      type: complaint.type || 'other',
      source: 'citizen',
      location: complaint.location || `GPS: ${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`,
      coordinates: coords,
      status: 'pending',
      priority: complaint.priority || 'medium',
      reportedBy: currentUser?.id || '2',
    };

    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newComp)
      });
      if (res.ok) {
        const saved = await res.json();
        setComplaints(prev => [saved, ...prev]);
        return;
      }
    } catch (error) {
      console.error('Error adding complaint:', error);
    }

    const fallbackComp: Complaint = {
      id: `C${Date.now().toString().slice(-4)}`,
      ...newComp,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Complaint;
    setComplaints(prev => [fallbackComp, ...prev]);
  };

  return (
    <div className="min-h-screen relative">
      {/* Floating Event Notification Toast (Admin Only) */}
      <AnimatePresence>
        {activeToast && currentUser?.role === 'admin' && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 right-6 z-[9999] max-w-sm w-full bg-rose-600 text-white p-5 rounded-3xl shadow-2xl border border-rose-400 flex items-start justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white flex-shrink-0 animate-bounce">
                🚨
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-rose-200">
                  New Overflow Alert · {activeToast.timestamp}
                </div>
                <h4 className="font-black text-sm text-white mt-0.5">{activeToast.title}</h4>
                <div className="text-xs text-rose-100 mt-1 font-medium space-y-0.5">
                  <p>Distance: <strong className="font-mono">{activeToast.distance} cm</strong> ({activeToast.fillPercentage}% full)</p>
                  <p>Location: <span className="font-mono text-[10px]">{activeToast.location}</span></p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveToast(null)}
              className="text-rose-200 hover:text-white text-lg font-bold p-1 leading-none"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!currentUser ? (
          <Login key="login" onLogin={handleLogin} />
        ) : (
          <Dashboard 
            key="dashboard"
            user={currentUser} 
            onLogout={handleLogout} 
            complaints={complaints}
            sensors={sensors}
            userLocation={userLocation}
            locationStatus={locationStatus}
            onUpdateComplaint={updateComplaintStatus}
            onAddComplaint={addComplaint}
            workers={users.filter(u => u.role === 'worker')}
            users={users}
          />
        )}
      </AnimatePresence>

      {/* IoT Simulation Toggle */}
      {currentUser && (
        <div className="fixed bottom-6 right-6 z-50">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsSimulationOpen(!isSimulationOpen)}
            className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/50 hover:bg-indigo-500 transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </motion.button>
          
          <AnimatePresence>
            {isSimulationOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                className="absolute bottom-16 right-0 w-80 glass p-4 rounded-2xl border border-white/10 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">ESP32 Telemetry Simulation</h3>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${locationStatus === 'granted' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                    {locationStatus === 'granted' ? 'GPS Active' : 'GPS Unavailable'}
                  </span>
                </div>
                <div className="space-y-4">
                  {sensors.map(s => (
                    <div key={s.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{s.location} ({s.id})</span>
                        <span className={`font-mono font-bold ${(s.distance ?? 30) <= 5 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                          {(s.distance ?? 30) <= 5 ? '🔴 Overflow' : '🟢 Normal'} · {s.distance ?? 30} cm
                        </span>
                      </div>
                      <input 
                        type="range" 
                        min="2" max="30" 
                        value={s.distance ?? 30}
                        onChange={async (e) => {
                          const dist = parseInt(e.target.value);
                          const fill = dist <= 2 ? 100 : dist >= 30 ? 0 : Math.round(((30 - dist) / 28) * 100);
                          setSensors(prev => prev.map(curr => curr.id === s.id ? { ...curr, distance: dist, value: fill, lastUpdate: new Date().toISOString() } : curr));
                        }}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                  ))}
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <button
                      onClick={async () => {
                        const coords = userLocationRef.current;
                        const placeName = await getLivePlaceName(coords[0], coords[1]);
                        triggerOverflowEvent('S1', placeName, 12, 88, coords);
                      }}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5"
                    >
                      🚨 Trigger Manual Test Alert
                    </button>
                    <p className="text-[10px] text-slate-400 font-mono text-center">
                      Browser Live GPS: {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default App;
