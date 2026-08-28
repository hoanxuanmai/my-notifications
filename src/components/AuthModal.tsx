import React, { useState } from 'react';
import {
  X,
  User,
  ShieldCheck,
  Key,
  Mail,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  LogOut,
  Zap,
} from 'lucide-react';
import { AuthUser } from '../types';
import { notificationService } from '../services/notificationService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  onUserChanged: (user: AuthUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
}) => {
  const [email, setEmail] = useState('admin@app.com');
  const [password, setPassword] = useState('admin@app.com');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; text: string } | null>(null);

  if (!isOpen) return null;

  const allPresetUsers = notificationService.getAllUsers();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setFeedback(null);

    try {
      const result = await notificationService.login(email.trim(), password.trim());
      setFeedback({ success: true, text: result.message });
      onUserChanged(result.user);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setFeedback({ success: false, text: err?.message || 'Đăng nhập thất bại' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelect = async (user: AuthUser) => {
    setEmail(user.email);
    setPassword(user.email);
    notificationService.switchUser(user);
    onUserChanged(user);
    setFeedback({
      success: true,
      text: `Đã chuyển sang tài khoản ${user.email} (${user.role.toUpperCase()})`,
    });
    setTimeout(() => {
      onClose();
    }, 700);
  };

  const handleLogout = () => {
    notificationService.logout();
    onUserChanged(notificationService.getCurrentUser());
    setFeedback({ success: true, text: 'Đã đăng xuất' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Xác thực & Chuyển đổi Tài khoản
              </h3>
              <p className="text-xs text-slate-400">
                Kiểm thử phân quyền RLS & thông báo theo Recipient
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5">
          
          {/* Quick Select Preset Accounts */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
              Chọn nhanh tài khoản thử nghiệm:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {allPresetUsers.map((u) => {
                const isSelected = currentUser.email.toLowerCase() === u.email.toLowerCase();
                return (
                  <button
                    key={u.id}
                    onClick={() => handleQuickSelect(u)}
                    type="button"
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-500/30'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                        u.role === 'admin' ? 'bg-rose-500/20 text-rose-300' : 'bg-cyan-500/20 text-cyan-300'
                      }`}>
                        {u.role.toUpperCase()}
                      </span>
                      {isSelected && <span className="text-[10px] text-emerald-400 font-bold ml-auto">ACTIVE</span>}
                    </div>
                    <span className="text-xs font-bold text-white truncate">{u.email}</span>
                    <span className="text-[11px] text-slate-400 truncate">{u.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Login */}
          <form onSubmit={handleLogin} className="space-y-3.5 pt-2 border-t border-slate-800">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Email Đăng nhập
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@app.com"
                  required
                  className="w-full pl-10 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-cyan-300 font-mono focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Mật khẩu (Password)
              </label>
              <div className="relative">
                <Key className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="admin@app.com"
                  className="w-full pl-10 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-cyan-300 font-mono focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Tài khoản mặc định: <code>admin@app.com</code> / <code>admin@app.com</code>
              </p>
            </div>

            {/* Feedback Alert */}
            {feedback && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  feedback.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {feedback.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between gap-3">
              {currentUser.isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1.5"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Đăng xuất</span>
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>{isLoading ? 'Đang xác thực...' : 'Đăng nhập & Áp dụng'}</span>
                </button>
              </div>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};
