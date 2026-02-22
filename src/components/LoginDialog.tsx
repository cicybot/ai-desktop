import React, { useState } from 'react';
import { X, User as UserIcon, Check, CreditCard, Shield, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { User, PLANS, Plan } from '../types';

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLogin: (user: User) => void;
  onLogout: () => void;
  onUpgrade: (planId: 'free' | 'pro' | 'enterprise') => void;
}

export function LoginDialog({ isOpen, onClose, user, onLogin, onLogout, onUpgrade }: LoginDialogProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login
    const mockUser: User = {
      id: 'u-123',
      name: email.split('@')[0] || 'User',
      email: email,
      plan: 'free',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
    };
    onLogin(mockUser);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1c1f26] border border-[#2a2e35] rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row h-[600px]">
        
        {/* Left Side: User Profile or Login Form */}
        <div className="w-full md:w-1/3 bg-[#16181d] p-8 flex flex-col border-r border-[#2a2e35]">
          <div className="flex items-center gap-2 mb-8 text-yellow-500">
            <Zap size={24} fill="currentColor" />
            <span className="font-bold text-xl text-white">ZapOS</span>
          </div>

          {user ? (
            <div className="flex-1 flex flex-col">
              <div className="flex flex-col items-center mb-8">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-1 mb-4">
                  <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full bg-[#1c1f26]" />
                </div>
                <h2 className="text-xl font-bold text-white">{user.name}</h2>
                <p className="text-gray-400 text-sm">{user.email}</p>
                <div className="mt-2 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-medium uppercase tracking-wider border border-blue-500/20">
                  {user.plan} Plan
                </div>
              </div>

              <div className="mt-auto space-y-3">
                <button className="w-full py-2 px-4 bg-[#2a2e35] hover:bg-[#333] text-white rounded-lg transition-colors flex items-center justify-center gap-2">
                  <UserIcon size={16} /> Edit Profile
                </button>
                <button 
                  onClick={onLogout}
                  className="w-full py-2 px-4 border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  Log Out
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-gray-400 mb-6 text-sm">Sign in to access your cloud desktop.</p>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Email</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#252932] border border-[#333] rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 transition-colors"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Password</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#252932] border border-[#333] rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 transition-colors"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors mt-4"
                >
                  Sign In
                </button>
              </form>
              
              <div className="mt-6 text-center text-xs text-gray-500">
                Don't have an account? <button className="text-blue-400 hover:underline">Sign up</button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Plans & Features */}
        <div className="flex-1 bg-[#1c1f26] p-8 overflow-y-auto relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-[#2a2e35] rounded-lg transition-colors"
          >
            <X size={20} />
          </button>

          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-2">Upgrade Your Workspace</h2>
            <p className="text-gray-400 mb-8">Choose the plan that fits your needs.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map((plan) => {
                const isCurrent = user?.plan === plan.id;
                return (
                  <div 
                    key={plan.id}
                    className={cn(
                      "rounded-xl p-5 border transition-all duration-200 flex flex-col",
                      isCurrent 
                        ? "bg-blue-500/5 border-blue-500/50 shadow-lg shadow-blue-500/10" 
                        : "bg-[#252932] border-[#333] hover:border-gray-500"
                    )}
                  >
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-bold text-white">${plan.price}</span>
                        <span className="text-sm text-gray-500">/mo</span>
                      </div>
                    </div>

                    <ul className="space-y-3 mb-6 flex-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                          <Check size={14} className="text-green-400 mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => user && onUpgrade(plan.id)}
                      disabled={!user || isCurrent}
                      className={cn(
                        "w-full py-2 rounded-lg text-sm font-medium transition-colors",
                        isCurrent
                          ? "bg-blue-500/20 text-blue-400 cursor-default"
                          : user 
                            ? "bg-white text-black hover:bg-gray-200"
                            : "bg-[#333] text-gray-500 cursor-not-allowed"
                      )}
                    >
                      {isCurrent ? 'Current Plan' : user ? 'Upgrade' : 'Sign in to Upgrade'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 grid grid-cols-2 gap-6">
              <div className="flex gap-4 p-4 bg-[#252932]/50 rounded-xl border border-[#333]">
                <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 h-fit">
                  <Shield size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Enterprise Security</h4>
                  <p className="text-sm text-gray-400">Bank-grade encryption and security protocols to keep your data safe.</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-[#252932]/50 rounded-xl border border-[#333]">
                <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400 h-fit">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Flexible Billing</h4>
                  <p className="text-sm text-gray-400">Pay monthly or annually. Cancel anytime with no hidden fees.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
