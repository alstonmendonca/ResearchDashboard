import React, { useState } from 'react';
import { Microscope, User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

const LoginForm = ({ onLogin, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    onLogin(username, password);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 mb-4">
            <Microscope className="w-7 h-7 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="font-serif text-2xl text-slate-900 tracking-tight mb-1">SHANTHI</h1>
          <p className="text-sm text-slate-400">Research Dashboard</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl p-8 border border-slate-400">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Sign in</h2>
            <p className="text-sm text-slate-400">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-slate-900">
                Username
              </label>
              <div className="mt-1.5 relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full bg-white border border-slate-400 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-900">
                Password
              </label>
              <div className="mt-1.5 relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-white border border-slate-400 rounded-xl pl-10 pr-12 py-3 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-white border border-slate-400 rounded-xl px-4 py-3 text-sm text-slate-900 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 text-white py-3 px-4 rounded-xl font-medium text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6">
          <div className="rounded-xl px-4 py-3 border border-slate-400">
            <p className="text-xs text-slate-900 font-medium mb-2">Demo Credentials</p>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span>Username: <code className="text-slate-900">admin</code></span>
              <span>Password: <code className="text-slate-900">test123</code></span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">
          Research Dashboard v1.0
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
