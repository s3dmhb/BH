import React from 'react';
import { ViewMode } from '../types/family';
import { HeritageCrest } from './HeritageCrest';
import { User } from 'firebase/auth';
import { Network, GitFork, Users, BarChart3, Plus, Settings2, Printer, Lock, LogOut, Cloud, Sparkles, FileImage } from 'lucide-react';

interface HeaderProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onOpenAddModal: () => void;
  onOpenAdminPanel: () => void;
  onPrint: () => void;
  onOpenExportImage?: () => void;
  isAdmin: boolean;
  currentUser?: User | null;
  isCloudConnected?: boolean;
  cloudSyncStatus?: 'connecting' | 'connected' | 'offline' | 'error';
  onOpenLoginModal: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  onOpenAddModal,
  onOpenAdminPanel,
  onPrint,
  onOpenExportImage,
  isAdmin,
  currentUser,
  isCloudConnected = true,
  cloudSyncStatus = 'connected',
  onOpenLoginModal,
  onLogout
}) => {
  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/[0.08] px-3 sm:px-6 md:px-8 py-2.5 sm:py-3 transition-all duration-200">
        <div className="max-w-7xl 2xl:max-w-[1700px] mx-auto flex items-center justify-between gap-2 sm:gap-6">
          
          {/* Zone 1: Brand Wordmark & Heritage Crest & Cloud Live Indicator */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <HeritageCrest size={36} className="sm:w-10 sm:h-10 shrink-0 drop-shadow-[0_0_16px_rgba(56,189,248,0.25)]" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-white whitespace-nowrap">
                  شجرة عائلة البوحسون
                </span>
                {/* Live Cloud Sync Indicator */}
                <span
                  title={isCloudConnected ? "مزامنة سحابية حية نشطة (Firebase Firestore)" : "جاري الاتصال بالسحابة..."}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.05] border border-white/[0.08] text-sky-200 shadow-sm"
                >
                  <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]' : 'bg-amber-400'}`} />
                  <span className="hidden sm:inline">سحابة حية (Firestore)</span>
                </span>
              </div>
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium whitespace-nowrap hidden xs:inline">
                فخذ النواصر · آل جابر · قبيلة آل بوعينين
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Views (Desktop Segmented Apple Bar) */}
          <nav className="hidden md:flex items-center gap-1 p-1 bg-white/[0.04] border border-white/[0.08] rounded-2xl backdrop-blur-md">
            <button
              onClick={() => onViewChange('tree')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all whitespace-nowrap ${
                currentView === 'tree'
                  ? 'bg-white/15 text-white shadow-sm border border-white/10 backdrop-blur-md font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Network className="w-3.5 h-3.5 text-sky-400" />
              <span>مخطط النسب والقرابة المتصل</span>
            </button>

            <button
              onClick={() => onViewChange('lineage')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all whitespace-nowrap ${
                currentView === 'lineage'
                  ? 'bg-white/15 text-white shadow-sm border border-white/10 backdrop-blur-md font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <GitFork className="w-3.5 h-3.5 text-amber-400" />
              <span>مسار النسب العمودي</span>
            </button>

            <button
              onClick={() => onViewChange('directory')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all whitespace-nowrap ${
                currentView === 'directory'
                  ? 'bg-white/15 text-white shadow-sm border border-white/10 backdrop-blur-md font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-teal-400" />
              <span>دليل الأفراد</span>
            </button>

            <button
              onClick={() => onViewChange('stats')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all whitespace-nowrap ${
                currentView === 'stats'
                  ? 'bg-white/15 text-white shadow-sm border border-white/10 backdrop-blur-md font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-rose-400" />
              <span>الإحصائيات</span>
            </button>
          </nav>

          {/* Zone 3: Primary Action & Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Export as Image Button */}
            {onOpenExportImage && (
              <button
                onClick={onOpenExportImage}
                title="تصدير شجرة العائلة كصورة (PNG) عالية الجودة"
                className="p-2 sm:px-3 sm:py-2 text-xs font-medium text-slate-200 glass-btn rounded-xl flex items-center gap-1.5 hover:text-white"
              >
                <FileImage className="w-4 h-4 text-sky-400" />
                <span className="hidden xl:inline whitespace-nowrap">تصدير كصورة</span>
              </button>
            )}

            {/* Print button (desktop) */}
            <button
              onClick={onPrint}
              title="طباعة الشجرة وحفظ تقرير PDF"
              className="p-2 sm:px-2.5 sm:py-2 text-xs font-medium text-slate-300 glass-btn rounded-xl flex items-center gap-1.5 hover:text-white"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span className="hidden xl:inline whitespace-nowrap">طباعة PDF</span>
            </button>

            {/* Backup / Admin button */}
            <button
              onClick={onOpenAdminPanel}
              title="لوحة الإدارة والنسخ الاحتياطي"
              className="p-2 sm:px-2.5 sm:py-2 text-xs font-medium text-slate-300 glass-btn rounded-xl flex items-center gap-1.5 hover:text-white"
            >
              <Settings2 className="w-4 h-4 text-slate-400" />
              <span className="hidden xl:inline whitespace-nowrap">النسخ الاحتياطي</span>
            </button>

            {/* Admin status & actions */}
            {isAdmin ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onOpenAddModal}
                  className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-300 hover:from-sky-300 hover:to-emerald-200 rounded-xl shadow-lg shadow-sky-950/40 flex items-center gap-1 transition-all whitespace-nowrap active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden xs:inline">إضافة فرد</span>
                </button>

                <button
                  onClick={onLogout}
                  title={`تسجيل خروج (${currentUser?.email || 'saad'})`}
                  className="px-2 sm:px-2.5 py-1.5 sm:py-2 text-xs font-medium text-amber-200 bg-amber-950/50 hover:bg-amber-900/70 border border-amber-500/25 rounded-xl flex items-center gap-1 transition-colors whitespace-nowrap"
                >
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="" className="w-4 h-4 rounded-full" />
                  ) : null}
                  <span className="hidden sm:inline">
                    {currentUser?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : 'سعد')}
                  </span>
                  <LogOut className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-medium text-slate-200 glass-btn hover:text-white hover:border-sky-400/40 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap"
                title="دخول المشرف لإضافة وتعديل وحذف السجلات"
              >
                <Lock className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden xs:inline">دخول المشرف</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Floating Apple iOS Bottom Navigation Dock on Mobile (Thumb Reachable) */}
      <div className="md:hidden fixed bottom-3 inset-x-3 z-40 glass-panel rounded-2xl p-1.5 shadow-2xl border border-white/10 flex items-center justify-around backdrop-blur-2xl bg-slate-950/80">
        <button
          onClick={() => onViewChange('tree')}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
            currentView === 'tree'
              ? 'bg-white/15 text-white font-bold shadow-sm border border-white/10'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Network className="w-4 h-4 mb-0.5 text-sky-400" />
          <span className="text-[10px]">مخطط القرابة</span>
        </button>

        <button
          onClick={() => onViewChange('lineage')}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
            currentView === 'lineage'
              ? 'bg-white/15 text-white font-bold shadow-sm border border-white/10'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <GitFork className="w-4 h-4 mb-0.5 text-amber-400" />
          <span className="text-[10px]">سلسلة النسب</span>
        </button>

        <button
          onClick={() => onViewChange('directory')}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
            currentView === 'directory'
              ? 'bg-white/15 text-white font-bold shadow-sm border border-white/10'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 mb-0.5 text-teal-400" />
          <span className="text-[10px]">الدليل</span>
        </button>

        <button
          onClick={() => onViewChange('stats')}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
            currentView === 'stats'
              ? 'bg-white/15 text-white font-bold shadow-sm border border-white/10'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4 mb-0.5 text-rose-400" />
          <span className="text-[10px]">الإحصائيات</span>
        </button>
      </div>
    </>
  );
};
