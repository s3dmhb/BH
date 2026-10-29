import React, { useState } from 'react';
import { X, Lock, KeyRound, User, Eye, EyeOff, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (username: string, pass: string) => { success: boolean; error?: string };
  onLoginWithGoogle?: () => Promise<{ success: boolean; error?: string }>;
  onSuccess?: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onLoginWithGoogle,
  onSuccess
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim() || !password.trim()) {
      setErrorMessage('يرجى إدخال اسم المستخدم وكلمة المرور.');
      return;
    }

    const res = onLogin(username, password);
    if (res.success) {
      setUsername('');
      setPassword('');
      onSuccess?.();
      onClose();
    } else {
      setErrorMessage(res.error || 'بيانات الدخول غير صحيحة.');
    }
  };

  const handleGoogleSignIn = async () => {
    if (!onLoginWithGoogle) return;
    setIsGoogleLoading(true);
    setErrorMessage('');
    try {
      const res = await onLoginWithGoogle();
      if (res.success) {
        onSuccess?.();
        onClose();
      } else {
        setErrorMessage(res.error || 'فشل تسجيل الدخول بحساب Google.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'حدث خطأ أثناء الاتصال مع Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl text-right">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 left-5 w-8 h-8 rounded-full glass-btn flex items-center justify-center text-slate-300 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-sky-300 shadow-lg">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-white">
              تسجيل دخول إدارة الشجرة
            </h2>
            <p className="text-xs text-sky-300 font-medium">
              تفعيل المزامنة السحابية الفورية (Firebase Firestore)
            </p>
          </div>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Method 1: Google Cloud Real-Time Auth */}
        {onLoginWithGoogle && (
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs md:text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-white/10 transition-all active:scale-[0.99] disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{isGoogleLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول السريع بحساب Google'}</span>
            </button>
            <p className="text-[11px] text-sky-300/90 text-center mt-2 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>موصى به للمزامنة السحابية المباشرة بين كافة المتصفحات والجوالات</span>
            </p>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] text-slate-500 font-medium">أو عبر كلمة المرور المحلية</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
          </div>
        )}

        {/* Passcode Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs md:text-sm">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>اسم المستخدم (Username):</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="اسم المستخدم..."
              required
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400/50 font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-sky-400" />
              <span>كلمة المرور (Password):</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••"
                required
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl pr-3.5 pl-10 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400/50 font-mono text-sm tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-950/50 transition-all active:scale-[0.99]"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>دخول بكلمة المرور</span>
            </button>
          </div>
        </form>

        <div className="mt-5 pt-4 border-t border-white/5 text-[11px] text-slate-400 text-center leading-relaxed">
          <span>هذه المنطقة مخصصة لمدير قاعدة البيانات لحفظ وتوثيق أنساب الأسرة سحابياً.</span>
        </div>
      </div>
    </div>
  );
};
