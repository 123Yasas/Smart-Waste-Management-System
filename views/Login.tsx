
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Card } from '../components/UI';
import { LogIn, ShieldCheck, UserCircle, HardHat } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');

  const demoAccounts = [
    { role: 'Admin', email: 'admin@civic.com', icon: ShieldCheck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { role: 'Citizen', email: 'citizen@civic.com', icon: UserCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { role: 'Worker', email: 'worker@civic.com', icon: HardHat, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100/50 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-100/50 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ y: -10 }}
            animate={{ y: 0 }}
            className="inline-flex p-4 bg-white rounded-3xl shadow-xl shadow-indigo-500/10 border border-indigo-50 mb-4"
          >
            <ShieldCheck className="w-10 h-10 text-indigo-600" />
          </motion.div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-slate-900">
            Civic<span className="text-indigo-600">Flow</span>
          </h1>
          <p className="text-slate-500 font-medium">Smart Urban Accountability Platform</p>
        </div>

        <Card className="!p-8 !bg-white/80 !backdrop-blur-xl !border-white">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Login Identifier</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              />
            </div>

            <Button 
              className="w-full" 
              icon={LogIn}
              onClick={() => onLogin(email)}
              disabled={!email}
            >
              Access Portal
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest"><span className="bg-white px-3 text-slate-400">Simulation Access</span></div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => onLogin(acc.email)}
                  className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${acc.bg}`}>
                      <acc.icon className={`w-5 h-5 ${acc.color}`} />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-slate-800">{acc.role}</div>
                      <div className="text-[10px] text-slate-500 font-mono uppercase">{acc.email}</div>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <LogIn size={16} className="text-indigo-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Card>

        <p className="mt-8 text-center text-slate-400 text-sm font-medium">
          &copy; 2024 CivicFlow Municipal Services
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
