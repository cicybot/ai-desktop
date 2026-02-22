import React, { useState } from 'react';
import { X, User as UserIcon, Github, Mail } from 'lucide-react';
import { cn } from '../lib/utils';
import { User } from '../types';
import { Logo } from './Logo';

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
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering && password !== confirmPassword) {
        alert("Passwords do not match");
        return;
    }
    // Mock login/register
    const mockUser: User = {
      id: 'u-' + Math.random().toString(36).substr(2, 9),
      name: isRegistering ? name : (email.split('@')[0] || 'User'),
      email: email,
      plan: 'free',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
    };
    onLogin(mockUser);
  };

  const handleSocialLogin = (provider: 'google' | 'github') => {
      // Mock social login
      const mockUser: User = {
          id: 'u-' + provider + '-' + Math.random().toString(36).substr(2, 9),
          name: provider === 'google' ? 'Google User' : 'GitHub User',
          email: `user@${provider}.com`,
          plan: 'free',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${provider}`
      };
      onLogin(mockUser);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#16181d] border border-[#2a2e35] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-[#2a2e35] rounded-lg transition-colors z-50"
        >
          <X size={20} />
        </button>

        <div className="p-8 flex flex-col max-h-[90vh] overflow-y-auto">
          <div className="mb-8">
            <Logo size="lg" />
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
              <h2 className="text-2xl font-bold text-white mb-2">{isRegistering ? 'Create Account' : 'Welcome Back'}</h2>
              <p className="text-gray-400 mb-6 text-sm">{isRegistering ? 'Sign up to get started with ZapOS.' : 'Sign in to access your cloud desktop.'}</p>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                  <button 
                    onClick={() => handleSocialLogin('google')}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#252932] hover:bg-[#2a2e35] border border-[#333] rounded-lg text-white transition-colors text-sm font-medium"
                  >
                      <Mail size={16} className="text-red-500" />
                      <span>Google</span>
                  </button>
                  <button 
                    onClick={() => handleSocialLogin('github')}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#252932] hover:bg-[#2a2e35] border border-[#333] rounded-lg text-white transition-colors text-sm font-medium"
                  >
                      <Github size={16} />
                      <span>GitHub</span>
                  </button>
              </div>

              <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#333]"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-[#16181d] px-2 text-gray-500">Or continue with</span>
                  </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {isRegistering && (
                    <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Full Name</label>
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-[#252932] border border-[#333] rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 transition-colors"
                        placeholder="John Doe"
                        required
                    />
                    </div>
                )}
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
                {isRegistering && (
                    <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Confirm Password</label>
                    <input 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-[#252932] border border-[#333] rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 transition-colors"
                        placeholder="••••••••"
                        required
                    />
                    </div>
                )}
                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors mt-4"
                >
                  {isRegistering ? 'Create Account' : 'Sign In'}
                </button>
              </form>
              
              <div className="mt-6 text-center text-xs text-gray-500">
                {isRegistering ? "Already have an account?" : "Don't have an account?"} 
                <button 
                    type="button"
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="text-blue-400 hover:underline ml-1"
                >
                    {isRegistering ? 'Sign in' : 'Sign up'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
