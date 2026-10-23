import React from 'react';
import { ViewMode } from '../types/family';
import { HeritageCrest } from './HeritageCrest';
import { Network, GitFork, Users, BarChart3, Plus, Settings2, Printer } from 'lucide-react';

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
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-emerald-500/20 px-4 md:px-8 py-3 transition-all duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 md:gap-8">
        
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <HeritageCrest size={40} className="shrink-0 drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]" />
          <div className="flex flex-col">
            <span className="text-lg md:text-xl font-bold tracking-tight text-white whitespace-nowrap">
              شجرة عائلة البوحسون
            </span>
            <span className="text-[11px] md:text-xs text-emerald-400 font-medium whitespace-nowrap">
              فخذ النواصر · آل جابر · قبيلة آل بوعينين
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Views (Segmented Apple Bar) */}
        <nav className="hidden lg:flex items-center gap-1 p-1 bg-slate-900/70 border border-emerald-500/20 rounded-xl">
          <button
            onClick={() => onViewChange('tree')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
              currentView === 'tree'
                ? 'bg-emerald-600/90 text-white shadow-md shadow-emerald-950/50'
                : 'text-slate-300 hover:text-white hover:bg-emerald-950/40'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>الشجرة التفاعلية</span>
          </button>

          <button
            onClick={() => onViewChange('lineage')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
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
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
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
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
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
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onPrint}
            title="طباعة الشجرة وحفظ تقرير PDF"
            className="p-2 md:px-3 md:py-2 text-xs font-medium text-slate-200 glass-btn rounded-xl flex items-center gap-1.5 hover:text-white"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline whitespace-nowrap">طباعة PDF</span>
          </button>

          <button
            onClick={onOpenAdminPanel}
            title="لوحة الإدارة والنسخ الاحتياطي"
            className="p-2 md:px-3 md:py-2 text-xs font-medium text-slate-200 glass-btn rounded-xl flex items-center gap-1.5 hover:text-white"
          >
            <Settings2 className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline whitespace-nowrap">النسخ الاحتياطي</span>
          </button>

          {/* Admin status & actions */}
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAddModal}
                className="px-3.5 py-2 text-xs font-semibold text-emerald-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 rounded-xl shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 transition-all whitespace-nowrap active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة فرد</span>
              </button>

              <button
                onClick={onLogout}
                title="تسجيل خروج المدير (saad)"
                className="px-2.5 py-2 text-xs font-medium text-amber-200 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/30 rounded-xl flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <span className="hidden sm:inline">المدير: سعد</span>
                <span className="text-[11px] underline">خروج</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLoginModal}
              className="px-3.5 py-2 text-xs font-semibold text-slate-200 glass-btn hover:text-white hover:border-emerald-400/50 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap"
              title="دخول المشرف (saad) لإضافة وتعديل وحذف السجلات"
            >
              <span>دخول المدير</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Sub-bar */}
      <div className="flex lg:hidden items-center justify-around mt-2 pt-2 border-t border-emerald-500/15 text-xs">
        <button
          onClick={() => onViewChange('tree')}
          className={`flex items-center gap-1 py-1 px-2 rounded-md ${
            currentView === 'tree' ? 'text-emerald-400 font-bold bg-emerald-950/50' : 'text-slate-400'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>الشجرة</span>
        </button>
        <button
          onClick={() => onViewChange('lineage')}
          className={`flex items-center gap-1 py-1 px-2 rounded-md ${
            currentView === 'lineage' ? 'text-emerald-400 font-bold bg-emerald-950/50' : 'text-slate-400'
          }`}
        >
          <GitFork className="w-3.5 h-3.5" />
          <span>النسب</span>
        </button>
        <button
          onClick={() => onViewChange('directory')}
          className={`flex items-center gap-1 py-1 px-2 rounded-md ${
            currentView === 'directory' ? 'text-emerald-400 font-bold bg-emerald-950/50' : 'text-slate-400'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>الدليل</span>
        </button>
        <button
          onClick={() => onViewChange('stats')}
          className={`flex items-center gap-1 py-1 px-2 rounded-md ${
            currentView === 'stats' ? 'text-emerald-400 font-bold bg-emerald-950/50' : 'text-slate-400'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>الإحصائيات</span>
        </button>
      </div>
    </header>
  );
};
