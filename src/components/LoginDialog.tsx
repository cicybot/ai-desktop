import React, { useState } from 'react';
import { X, Key } from 'lucide-react';
import { User } from '../types';
import { authApi } from '../lib/api';
import { Logo } from './Logo';

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLogin: (user: User) => void;
  onLogout: () => void;
  onUpgrade: (planId: 'free' | 'pro' | 'enterprise') => void;
}

export function LoginDialog({ isOpen, onClose, user, onLogin, onLogout }: LoginDialogProps) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      localStorage.setItem('token', token.trim());
      const res = await authApi.verify();
      if (res.valid) {
        onLogin({
          id: 'u-token',
          name: 'Admin',
          email: '',
          plan: 'pro',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=admin`,
        });
      } else {
        setError('Token 无效');
        localStorage.removeItem('token');
      }
    } catch {
      setError('验证失败，请检查 Token');
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#16181d] border border-[#2a2e35] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-[#2a2e35] rounded-lg transition-colors z-50">
          <X size={20} />
        </button>

        <div className="p-8 flex flex-col">
          <div className="mb-8"><Logo size="lg" /></div>

          {user ? (
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-1 mb-4">
                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full bg-[#1c1f26]" />
              </div>
              <h2 className="text-xl font-bold text-white">{user.name}</h2>
              <div className="mt-2 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-medium uppercase border border-blue-500/20">{user.plan}</div>
              <button onClick={onLogout} className="mt-6 w-full py-2 px-4 border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                Log Out
              </button>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome</h2>
              <p className="text-gray-400 mb-6 text-sm">输入 API Token 登录</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">API Token</label>
                  <div className="relative">
                    <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="w-full bg-[#252932] border border-[#333] rounded-lg pl-10 pr-3 py-2 text-white outline-none focus:border-blue-500 transition-colors"
                      placeholder="粘贴你的 Token..."
                      required
                    />
                  </div>
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors">
                  {loading ? '验证中...' : '登录'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
