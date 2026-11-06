import React from 'react';
import { ViewMode, FamilyMember } from '../types/family';
import { HeritageCrest } from './HeritageCrest';
import { HeaderQuickSearch } from './HeaderQuickSearch';
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
  members: FamilyMember[];
  memberMap?: Map<string, FamilyMember>;
  onSelectMember: (member: FamilyMember) => void;
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
  onLogout,
  members,
  memberMap,
  onSelectMember
}) => {
  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80 px-3 sm:px-6 md:px-8 py-2.5 sm:py-3 transition-all duration-200">
        <div className="max-w-7xl 2xl:max-w-[1700px] mx-auto flex items-center justify-between gap-2 sm:gap-6">
          
          {/* Zone 1: Brand Wordmark & Heritage Crest & Cloud Live Indicator */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <HeritageCrest size={36} className="sm:w-10 sm:h-10 shrink-0 drop-shadow-[0_2px_12px_rgba(2,132,199,0.15)]" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap">
                  شجرة عائلة البوحسون
                </span>
                {/* Live Cloud Sync Indicator */}
                <span
                  title={isCloudConnected ? "مزامنة سحابية حية نشطة (Firebase Firestore)" : "جاري الاتصال بالسحابة..."}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 border border-slate-200 text-slate-700 shadow-xs"
                >
                  <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-amber-500'}`} />
                  <span className="hidden sm:inline">سحابة حية (Firestore)</span>
                </span>
              </div>
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium whitespace-nowrap hidden xs:inline">
                فخذ النواصر · آل جابر · قبيلة آل بوعينين
              </span>
            </div>
          </div>

          {/* Quick Instant Search Bar */}
          <HeaderQuickSearch
            members={members}
            memberMap={memberMap}
            onSelectMember={onSelectMember}
            className="flex-1 max-w-[180px] sm:max-w-[220px] md:max-w-[240px] lg:max-w-xs xl:max-w-sm mx-1 sm:mx-2"
          />

          {/* Zone 2: Navigation Views (Desktop Segmented Apple Bar) */}
          <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-100/90 border border-slate-200 rounded-2xl shadow-inner">
            <button
              onClick={() => onViewChange('tree')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all whitespace-nowrap ${
                currentView === 'tree'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Network className="w-3.5 h-3.5 text-sky-600" />
              <span>مخطط النسب والقرابة المتصل</span>
            </button>

            <button
              onClick={() => onViewChange('lineage')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all whitespace-nowrap ${
                currentView === 'lineage'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <GitFork className="w-3.5 h-3.5 text-amber-600" />
              <span>مسار النسب العمودي</span>
            </button>

            <button
              onClick={() => onViewChange('directory')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all whitespace-nowrap ${
                currentView === 'directory'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-teal-600" />
              <span>دليل الأفراد</span>
            </button>

            <button
              onClick={() => onViewChange('stats')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all whitespace-nowrap ${
                currentView === 'stats'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-rose-600" />
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
                className="p-2 sm:px-3 sm:py-2 text-xs font-medium text-slate-700 glass-btn rounded-xl flex items-center gap-1.5 hover:text-slate-900"
              >
                <FileImage className="w-4 h-4 text-sky-600" />
                <span className="hidden xl:inline whitespace-nowrap">تصدير كصورة</span>
              </button>
            )}

            {/* Print button (desktop) */}
            <button
              onClick={onPrint}
              title="طباعة الشجرة وحفظ تقرير PDF"
              className="p-2 sm:px-2.5 sm:py-2 text-xs font-medium text-slate-700 glass-btn rounded-xl flex items-center gap-1.5 hover:text-slate-900"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span className="hidden xl:inline whitespace-nowrap">طباعة PDF</span>
            </button>

            {/* Backup / Admin button */}
            <button
              onClick={onOpenAdminPanel}
              title="لوحة الإدارة والنسخ الاحتياطي"
              className="p-2 sm:px-2.5 sm:py-2 text-xs font-medium text-slate-700 glass-btn rounded-xl flex items-center gap-1.5 hover:text-slate-900"
            >
              <Settings2 className="w-4 h-4 text-slate-500" />
              <span className="hidden xl:inline whitespace-nowrap">النسخ الاحتياطي</span>
            </button>

            {/* Admin status & actions */}
            {isAdmin ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onOpenAddModal}
                  className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-white bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 rounded-xl shadow-md flex items-center gap-1 transition-all whitespace-nowrap active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden xs:inline">إضافة فرد</span>
                </button>

                <button
                  onClick={onLogout}
                  title={`تسجيل خروج (${currentUser?.email || 'saad'})`}
                  className="px-2 sm:px-2.5 py-1.5 sm:py-2 text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl flex items-center gap-1 transition-colors whitespace-nowrap"
                >
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="" className="w-4 h-4 rounded-full" />
                  ) : null}
                  <span className="hidden sm:inline">
                    {currentUser?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : 'سعد')}
                  </span>
                  <LogOut className="w-3.5 h-3.5 text-amber-700" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-medium text-slate-700 glass-btn hover:text-slate-900 hover:border-sky-400 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap"
                title="دخول المشرف لإضافة وتعديل وحذف السجلات"
              >
                <Lock className="w-3.5 h-3.5 text-sky-600" />
                <span className="hidden xs:inline">دخول المشرف</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Floating Apple iOS Bottom Navigation Dock on Mobile (Thumb Reachable) */}
      <div className="md:hidden fixed bottom-2 inset-x-2 sm:inset-x-4 z-40 bg-white/95 backdrop-blur-2xl rounded-2xl p-1 shadow-[0_12px_40px_rgba(15,23,42,0.12)] border border-slate-200/90 flex items-center justify-around pb-safe">
        <button
          onClick={() => onViewChange('tree')}
          className={`flex-1 min-h-[44px] flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
            currentView === 'tree'
              ? 'bg-sky-600 text-white font-bold shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Network className={`w-4 h-4 mb-0.5 ${currentView === 'tree' ? 'text-white' : 'text-sky-600'}`} />
          <span className="text-[10px]">مخطط القرابة</span>
        </button>

        <button
          onClick={() => onViewChange('lineage')}
          className={`flex-1 min-h-[44px] flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
            currentView === 'lineage'
              ? 'bg-amber-600 text-white font-bold shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <GitFork className={`w-4 h-4 mb-0.5 ${currentView === 'lineage' ? 'text-white' : 'text-amber-600'}`} />
          <span className="text-[10px]">سلسلة النسب</span>
        </button>

        <button
          onClick={() => onViewChange('directory')}
          className={`flex-1 min-h-[44px] flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
            currentView === 'directory'
              ? 'bg-teal-600 text-white font-bold shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className={`w-4 h-4 mb-0.5 ${currentView === 'directory' ? 'text-white' : 'text-teal-600'}`} />
          <span className="text-[10px]">الدليل</span>
        </button>

        <button
          onClick={() => onViewChange('stats')}
          className={`flex-1 min-h-[44px] flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
            currentView === 'stats'
              ? 'bg-rose-600 text-white font-bold shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <BarChart3 className={`w-4 h-4 mb-0.5 ${currentView === 'stats' ? 'text-white' : 'text-rose-600'}`} />
          <span className="text-[10px]">الإحصائيات</span>
        </button>
      </div>
    </>
  );
};
