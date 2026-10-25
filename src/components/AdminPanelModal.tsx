import React, { useRef, useState } from 'react';
import { FamilyMember } from '../types/family';
import { exportToJSON, exportToCSV, exportStandaloneHTML, exportTypeScriptFile } from '../utils/exportUtils';
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  FileCode,
  RotateCcw,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Database,
  ExternalLink,
  Lock,
  ShieldCheck,
  LogOut,
  Copy,
  GitBranch
} from 'lucide-react';

import { User } from 'firebase/auth';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  onImportJSON: (jsonString: string) => Promise<{ success: boolean; count?: number; error?: string }> | { success: boolean; count?: number; error?: string };
  onResetToDefault: () => void;
  onExportTypeScriptCode?: () => string;
  onSeedDatabaseToCloud?: () => Promise<{ success: boolean; count?: number; error?: string }>;
  isCloudConnected?: boolean;
  isSeeding?: boolean;
  currentUser?: User | null;
  isAdmin: boolean;
  onRequireLogin: () => void;
  onLogout: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  members,
  onImportJSON,
  onResetToDefault,
  onExportTypeScriptCode,
  onSeedDatabaseToCloud,
  isCloudConnected = true,
  isSeeding = false,
  currentUser,
  isAdmin,
  onRequireLogin,
  onLogout
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = await onImportJSON(content);
        if (result.success) {
          showNotification('success', `تم استيراد ${result.count} فرداً بنجاح في قاعدة البيانات السحابية!`);
        } else {
          showNotification('error', result.error || 'فشل استيراد الملف. يرجى التأكد من صيغة JSON.');
        }
      }
    };
    reader.onerror = () => {
      showNotification('error', 'حدث خطأ أثناء قراءة الملف من جهازك.');
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = () => {
    if (window.confirm('هل أنت متأكد من إعادة ضبط الشجرة للأصل التراثي التاريخي؟ ستتم استعادة البيانات المعتمدة لجميع الفروع.')) {
      onResetToDefault();
      showNotification('success', 'تمت استعادة البيانات التراثية الأساسية بنجاح.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[88dvh] overflow-y-auto glass-panel rounded-3xl p-5 sm:p-6 md:p-8 border border-emerald-500/30 shadow-2xl text-right">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 sm:top-5 sm:left-5 w-9 h-9 rounded-full glass-btn flex items-center justify-center text-slate-300 hover:text-white active:scale-95 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              لوحة الإدارة، النسخ الاحتياطي، ونشر GitHub Pages
            </h2>
            <p className="text-xs text-emerald-400">
              تصدير واستيراد قاعدة البيانات ومزامنة الشجرة التفاعلية
            </p>
          </div>
        </div>

        {/* Firebase Live Cloud Sync Banner */}
        <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-teal-950/60 to-slate-900 border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-900/80 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shrink-0">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white block">
                  المزامنة السحابية الحية (Firebase Firestore)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>متصلة ولحظية</span>
                </span>
              </div>
              <span className="text-[11px] text-slate-300">
                كل تعديل أو إضافة يتم حفظه في السحابة فوراً ويظهر لجميع الأفراد والمتصفحات في نفس الثانية.
              </span>
            </div>
          </div>

          {onSeedDatabaseToCloud && (
            <button
              onClick={async () => {
                const res = await onSeedDatabaseToCloud();
                if (res.success) {
                  showNotification('success', `تمت مزامنة ورفع ${res.count} فرداً من الشجرة التراثية إلى سحابة Firestore بنجاح! تظهر للجميع فوراً.`);
                } else {
                  showNotification('error', res.error || 'فشلت المزامنة السحابية');
                }
              }}
              disabled={isSeeding}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all whitespace-nowrap active:scale-95 disabled:opacity-50"
            >
              {isSeeding ? 'جاري المزامنة...' : 'مزامنة وتثبيت الشجرة في السحابة'}
            </button>
          )}
        </div>

        {/* Admin Login Status Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/25 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isAdmin
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-400/30'
                : 'bg-amber-950 text-amber-300 border border-amber-400/30'
            }`}>
              {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                {isAdmin
                  ? `جلسة المدير نشطة (${currentUser?.email || 'saad'})`
                  : 'صلاحيات المدير مغلقة'}
              </span>
              <span className="text-[11px] text-slate-400">
                {isAdmin
                  ? 'لديك كامل الصلاحيات لإضافة، تعديل، وحذف السجلات وتنعكس سحابياً فوراً.'
                  : 'سجل الدخول بحساب Google أو كلمة المرور لإجراء التعديلات وحفظها سحابياً.'}
              </span>
            </div>
          </div>

          <div>
            {isAdmin ? (
              <button
                onClick={onLogout}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل الخروج</span>
              </button>
            ) : (
              <button
                onClick={onRequireLogin}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-emerald-950 text-xs font-bold shadow-md hover:from-emerald-400 hover:to-teal-300 transition-all"
              >
                تسجيل الدخول (Google / saad)
              </button>
            )}
          </div>
        </div>

        {/* Toast Notification */}
        {notification && (
          <div
            className={`mb-6 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-semibold ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 border border-emerald-400/40 text-emerald-200'
                : 'bg-rose-950/90 border border-rose-400/40 text-rose-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Action Grid */}
        <div className="space-y-6 text-xs md:text-sm">
          
          {/* Section 1: Backup & Exports */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>تصدير البيانات والنسخ الاحتياطي:</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Copy TypeScript Code for Permanent GitHub Project Sync */}
              <button
                onClick={() => {
                  if (onExportTypeScriptCode) {
                    const code = onExportTypeScriptCode();
                    navigator.clipboard.writeText(code);
                    showNotification('success', 'تم نسخ كود البيانات (TypeScript) بنجاح! الصقه هنا في محادثة المساعد لتحديث ملف المشروع فوراً.');
                  }
                }}
                className="glass-panel p-4 rounded-2xl border border-emerald-400/40 hover:border-emerald-300 bg-emerald-950/30 text-right group transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-900/80 border border-emerald-400/50 flex items-center justify-center text-emerald-300 mb-2 group-hover:scale-105 transition-transform">
                  <Copy className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-emerald-300 text-xs mb-1">1. نسخ كود البيانات للمشروع</h4>
                <p className="text-[11px] text-slate-300 leading-normal">
                  نسخ الكود ولصقه في المحادثة مع المساعد لتحديث ملف الكود المصدري قبل النشر إلى GitHub.
                </p>
              </button>

              {/* Download initialFamilyData.ts File */}
              <button
                onClick={() => {
                  exportTypeScriptFile(members);
                  showNotification('success', 'تم تنزيل ملف initialFamilyData.ts! يمكنك استبداله مباشرة في مجلد src/data/ في مستودع GitHub.');
                }}
                className="glass-panel p-4 rounded-2xl border border-teal-400/40 hover:border-teal-300 bg-teal-950/30 text-right group transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-teal-900/80 border border-teal-400/50 flex items-center justify-center text-teal-300 mb-2 group-hover:scale-105 transition-transform">
                  <FileCode className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-teal-300 text-xs mb-1">2. تحميل ملف initialFamilyData.ts</h4>
                <p className="text-[11px] text-slate-300 leading-normal">
                  تحميل ملف الكود المصدري المحدث فوراً لرفعه واستبداله في GitHub.
                </p>
              </button>

              {/* Export JSON */}
              <button
                onClick={() => {
                  exportToJSON(members);
                  showNotification('success', 'تم تصدير ملف النسخة الاحتياطية JSON بنجاح.');
                }}
                className="glass-panel p-4 rounded-2xl border border-emerald-500/20 hover:border-emerald-400/50 text-right group transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2 group-hover:scale-105 transition-transform">
                  <Database className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-white text-xs mb-1">نسخة احتياطية (JSON)</h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  حفظ نسخة كاملة من قاعدة بيانات الشجرة لاستعادتها لاحقاً.
                </p>
              </button>

              {/* Export CSV / Excel */}
              <button
                onClick={() => {
                  exportToCSV(members);
                  showNotification('success', 'تم تصدير ملف Excel/CSV المرمز باللغة العربية بنجاح.');
                }}
                className="glass-panel p-4 rounded-2xl border border-emerald-500/20 hover:border-emerald-400/50 text-right group transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-white text-xs mb-1">جداول إكسل (CSV)</h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  تصدير السجلات إلى جدول إكسل متوافق تماماً مع الحروف العربية.
                </p>
              </button>

              {/* Export Standalone HTML (GitHub Pages Ready) */}
              <button
                onClick={() => {
                  exportStandaloneHTML(members);
                  showNotification('success', 'تم تنزيل ملف index.html الجاهز للاستضافة على GitHub Pages بنجاح!');
                }}
                className="glass-panel p-4 rounded-2xl border border-amber-500/30 hover:border-amber-400/60 bg-amber-950/20 text-right group transition-all sm:col-span-2 lg:col-span-2"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-300 mb-2 group-hover:scale-105 transition-transform">
                  <Globe className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-amber-300 text-xs mb-1">تجهيز GitHub Pages كصفحة واحدة منفردة (index.html)</h4>
                <p className="text-[11px] text-slate-300 leading-normal">
                  تحميل ملف منفرد self-contained (`index.html`) يحتوي على كافة البيانات والتصميم مدمجين وجاهز للرفع المباشر.
                </p>
              </button>
            </div>
          </div>

          {/* Section 2: Import & Restore */}
          <div className="pt-2 border-t border-white/10">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>استيراد واستعادة البيانات:</span>
            </h3>

            {isAdmin ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Import JSON File */}
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/10 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-white text-xs mb-1">استيراد ملف JSON احتياطي</h4>
                    <p className="text-[11px] text-slate-400 leading-normal mb-3">
                      ارفع ملف JSON محفوظاً مسبقاً لاستبدال أو تحديث قاعدة البيانات المحلية.
                    </p>
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="jsonFileInput"
                    />
                    <label
                      htmlFor="jsonFileInput"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl glass-btn text-xs font-semibold text-emerald-300 hover:text-white cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>اختيار ملف JSON من الجهاز</span>
                    </label>
                  </div>
                </div>

                {/* Reset to Seed Data */}
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/10 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-white text-xs mb-1">استعادة الشجرة التراثية الأصلية</h4>
                    <p className="text-[11px] text-slate-400 leading-normal mb-3">
                      إعادة ضبط البيانات للأصل الموثق (5 أجيال كاملة من الجد المؤسس حسن بن محمد آل بوعينين).
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={handleReset}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>إعادة ضبط للأصل التاريخي</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/60 p-5 rounded-2xl border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white mb-0.5">
                      عمليات استيراد وتعديل قاعدة البيانات مقفلة
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      يقتصر استيراد الملفات واستعادة السجلات على مدير النظام (saad) فقط.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onRequireLogin}
                  className="px-4 py-2 rounded-xl glass-btn text-xs font-semibold text-amber-300 hover:text-white shrink-0"
                >
                  تسجيل الدخول لتفعيل الاستيراد
                </button>
              </div>
            )}
          </div>

          {/* Section 2.5: Multi-Device Sync & GitHub Export Clarification */}
          <div className="pt-2 border-t border-white/10">
            <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 p-5 rounded-2xl border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-950/90 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs md:text-sm font-bold text-white">
                    لماذا لا تنعكس الإضافات على GitHub بعد النشر من الإعدادات؟ وما هو الحل؟
                  </h3>
                  <span className="text-[11px] text-amber-300">
                    توضيح تقني دقيق وطرق تثبيت البيانات في مستودع GitHub للأبد
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
                <p>
                  عندما تضيف أو تعدل فرداً في واجهة الشجرة من متصفحك، فإن التطبيق يقوم بحفظه فوراً في <strong className="text-emerald-400">الذاكرة المحلية لمتصفحك فقط (Local Storage)</strong>. بينما ميزة <strong className="text-white">نشر / تصدير المشروع إلى GitHub عبر الإعدادات</strong> تقوم برفع <strong className="text-amber-300">ملفات الكود المصدري للمشروع</strong> (الموجودة في الخادم)، وتحديداً الملف الرسمي: <code className="text-emerald-400 font-mono bg-slate-950 px-1.5 py-0.5 rounded">src/data/initialFamilyData.ts</code>.
                </p>

                <p className="text-slate-200">
                  ولأن المتصفح لا يستطيع الكتابة مباشرة في ملفات الكود المصدري لأسباب أمنية، فإن مستودع GitHub يظل محتفظاً بالبيانات الأصلية فقط ما لم يتم تحديث ذلك الملف.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Action 1 */}
                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-emerald-500/30 space-y-2">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>الحل الأسهل (التحديث عبر المساعد ثم النشر):</span>
                    </span>
                    <p className="text-[11px] text-slate-300">
                      1. اضغط على الزر الأخضر أعلاه <strong className="text-emerald-300 font-semibold">"1. نسخ كود البيانات للمشروع"</strong>.<br />
                      2. الصق الكود هنا في المحادثة مع المساعد واطلب منه تثبيته.<br />
                      3. سيقوم المساعد بتحديث ملف <code className="text-emerald-400 font-mono text-[10px]">initialFamilyData.ts</code> فوراً.<br />
                      4. بعد ذلك، انشر المشروع لـ GitHub من الإعدادات وستجد جميع الإضافات معتمدة ودائمة لكل أفراد الأسرة!
                    </p>
                  </div>

                  {/* Action 2 */}
                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-teal-500/30 space-y-2">
                    <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-teal-400" />
                      <span>الحل المباشر (تنزيل الملف ورفعه يدوياً لـ GitHub):</span>
                    </span>
                    <p className="text-[11px] text-slate-300">
                      1. اضغط على زر <strong className="text-teal-300 font-semibold">"2. تحميل ملف initialFamilyData.ts"</strong> أعلاه.<br />
                      2. افتح مستودعك على GitHub، ثم ادخل المجلد <code className="text-teal-300 font-mono text-[10px]">src/data/</code>.<br />
                      3. اضغط <strong className="text-white">Add file ➔ Upload files</strong> واستبدل الملف بالملف الجديد الذي قمت بتنزيله.<br />
                      4. سيقوم GitHub Actions بنشر الموقع الجديد آلياً.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: GitHub Pages Deployment Quick Guide */}
          <div className="pt-2 border-t border-white/10">
            <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900/90 p-5 rounded-2xl border border-emerald-500/20 space-y-3">
              <h3 className="text-xs md:text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>النشر التلقائي المباشر على GitHub Pages (CI/CD):</span>
              </h3>
              
              <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <p>
                  تم تجهيز المشروع بملف سير العمل التلقائي <code className="bg-slate-950 px-1.5 py-0.5 rounded text-emerald-400 font-mono">.github/workflows/deploy.yml</code> وضبط مسارات الحزم بنظام المسار النسبي <code className="bg-slate-950 px-1.5 py-0.5 rounded text-emerald-400 font-mono">base: './'</code>، بحيث يتم بناء ونشر أي تعديل تقوم به هنا تلقائياً فور مزامنتها مع مستودع GitHub الخاص بك.
                </p>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-emerald-500/15 space-y-1.5">
                  <span className="text-[11px] font-semibold text-emerald-300 block">خطوة تفعيل النشر لمرة واحدة في مستودع GitHub:</span>
                  <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-1">
                    <li>افتح مستودع المشروع في حسابك على GitHub.</li>
                    <li>انتقل إلى التبويب: <code className="text-amber-300 font-mono">Settings</code> ➔ <code className="text-amber-300 font-mono">Pages</code>.</li>
                    <li>تحت قسم <code className="text-amber-300 font-mono">Build and deployment</code>، اختر في خانة <code className="text-emerald-300 font-mono">Source</code>: <strong className="text-white">GitHub Actions</strong>.</li>
                    <li>انتهى! ستتولى المنصة بناء ونشر الموقع تلقائياً عند كل مزامنة في غضون ثوانٍ.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Close */}
        <div className="pt-5 mt-6 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
