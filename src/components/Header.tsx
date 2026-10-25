import React from 'react';
import { ViewMode } from '../types/family';
import { HeritageCrest } from './HeritageCrest';
import { Network, GitFork, Users, BarChart3, Plus, Settings2, Printer, Lock, LogOut } from 'lucide-react';

interface HeaderProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onOpenAddModal: () => void;
  onOpenAdminPanel: () => void;
  onPrint: () => void;
  isAdmin: boolean;
  onOpenLoginModal: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  onOpenAddModal,
  onOpenAdminPanel,
  onPrint,
  isAdmin,
  onOpenLoginModal,
  onLogout
}) => {
  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-emerald-500/20 px-3 sm:px-6 md:px-8 py-2.5 sm:py-3 transition-all duration-200">
        <div className="max-w-7xl 2xl:max-w-[1700px] mx-auto flex items-center justify-between gap-2 sm:gap-6">
          
          {/* Zone 1: Brand Wordmark & Heritage Crest */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <HeritageCrest size={36} className="sm:w-10 sm:h-10 shrink-0 drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]" />
            <div className="flex flex-col">
              <span className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-white whitespace-nowrap">
                شجرة عائلة البوحسون
              </span>
              <span className="text-[10px] sm:text-xs text-emerald-400 font-medium whitespace-nowrap hidden xs:inline">
                فخذ النواصر · آل جابر · قبيلة آل بوعينين
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Views (Desktop Segmented Apple Bar) */}
          <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-900/70 border border-emerald-500/20 rounded-xl">
            <button
              onClick={() => onViewChange('tree')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                currentView === 'tree'
                  ? 'bg-emerald-600/90 text-white shadow-md shadow-emerald-950/50'
                  : 'text-slate-300 hover:text-white hover:bg-emerald-950/40'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>مخطط النسب والقرابة المتصل</span>
            </button>

            <button
              onClick={() => onViewChange('lineage')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                currentView === 'lineage'
                  ? 'bg-emerald-600/90 text-white shadow-md shadow-emerald-950/50'
                  : 'text-slate-300 hover:text-white hover:bg-emerald-950/40'
              }`}
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>مسار النسب العمودي</span>
            </button>

            <button
              onClick={() => onViewChange('directory')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                currentView === 'directory'
                  ? 'bg-emerald-600/90 text-white shadow-md shadow-emerald-950/50'
                  : 'text-slate-300 hover:text-white hover:bg-emerald-950/40'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>دليل الأفراد</span>
            </button>

            <button
              onClick={() => onViewChange('stats')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                currentView === 'stats'
                  ? 'bg-emerald-600/90 text-white shadow-md shadow-emerald-950/50'
                  : 'text-slate-300 hover:text-white hover:bg-emerald-950/40'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>الإحصائيات</span>
            </button>
          </nav>

          {/* Zone 3: Primary Action & Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Print button (desktop) */}
            <button
              onClick={onPrint}
              title="طباعة الشجرة وحفظ تقرير PDF"
              className="p-2 sm:px-2.5 sm:py-2 text-xs font-medium text-slate-200 glass-btn rounded-xl flex items-center gap-1.5 hover:text-white"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span className="hidden xl:inline whitespace-nowrap">طباعة PDF</span>
            </button>

            {/* Backup / Admin button */}
            <button
              onClick={onOpenAdminPanel}
              title="لوحة الإدارة والنسخ الاحتياطي"
              className="p-2 sm:px-2.5 sm:py-2 text-xs font-medium text-slate-200 glass-btn rounded-xl flex items-center gap-1.5 hover:text-white"
            >
              <Settings2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden xl:inline whitespace-nowrap">النسخ الاحتياطي</span>
            </button>

            {/* Admin status & actions */}
            {isAdmin ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onOpenAddModal}
                  className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-emerald-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 rounded-xl shadow-lg shadow-emerald-900/30 flex items-center gap-1 transition-all whitespace-nowrap active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden xs:inline">إضافة فرد</span>
                </button>

                <button
                  onClick={onLogout}
                  title="تسجيل خروج المدير (saad)"
                  className="px-2 sm:px-2.5 py-1.5 sm:py-2 text-xs font-medium text-amber-200 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/30 rounded-xl flex items-center gap-1 transition-colors whitespace-nowrap"
                >
                  <span className="hidden sm:inline">سعد</span>
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-slate-200 glass-btn hover:text-white hover:border-emerald-400/50 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap"
                title="دخول المشرف (saad) لإضافة وتعديل وحذف السجلات"
              >
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden xs:inline">دخول المدير</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Floating Apple iOS Bottom Navigation Dock on Mobile (Thumb Reachable) */}
      <div className="md:hidden fixed bottom-3 inset-x-3 z-40 glass-panel rounded-2xl p-1.5 shadow-2xl border border-emerald-500/30 flex items-center justify-around backdrop-blur-2xl">
        <button
          onClick={() => onViewChange('tree')}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
            currentView === 'tree'
              ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/50 scale-102'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Network className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">مخطط القرابة</span>
        </button>

        <button
          onClick={() => onViewChange('lineage')}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
            currentView === 'lineage'
              ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/50 scale-102'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <GitFork className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">سلسلة النسب</span>
        </button>

        <button
          onClick={() => onViewChange('directory')}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
            currentView === 'directory'
              ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/50 scale-102'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">الدليل</span>
        </button>

        <button
          onClick={() => onViewChange('stats')}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
            currentView === 'stats'
              ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/50 scale-102'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">الإحصائيات</span>
        </button>
      </div>
    </>
  );
};
