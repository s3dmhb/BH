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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92dvh] sm:max-h-[88dvh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 md:p-8 border border-slate-200 shadow-2xl text-right">
        
        {/* Mobile handle */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 sm:top-5 sm:left-5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 active:scale-95 z-10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              لوحة الإدارة، النسخ الاحتياطي، ونشر GitHub Pages
            </h2>
            <p className="text-xs text-sky-800 font-bold">
              تصدير واستيراد قاعدة البيانات ومزامنة الشجرة التفاعلية
            </p>
          </div>
        </div>

        {/* Firebase Live Cloud Sync Banner */}
        <div className="mb-4 p-4 rounded-2xl bg-sky-50/70 border border-sky-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-700 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 block">
                  المزامنة السحابية الحية (Firebase Firestore)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span>متصلة ولحظية</span>
                </span>
              </div>
              <span className="text-[11px] text-slate-600">
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
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition-all whitespace-nowrap active:scale-95 disabled:opacity-50"
            >
              {isSeeding ? 'جاري المزامنة...' : 'مزامنة وتثبيت الشجرة في السحابة'}
            </button>
          )}
        </div>

        {/* Admin Login Status Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isAdmin
                ? 'bg-sky-100 text-sky-800 border border-sky-300'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                {isAdmin
                  ? `جلسة المدير نشطة (${currentUser?.email || 'saad'})`
                  : 'صلاحيات المدير مغلقة'}
              </span>
              <span className="text-[11px] text-slate-600">
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
                className="px-3.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل الخروج</span>
              </button>
            ) : (
              <button
                onClick={onRequireLogin}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition-all"
              >
                تسجيل الدخول (Google / saad)
              </button>
            )}
          </div>
        </div>

        {/* Toast Notification */}
        {notification && (
          <div
            className={`mb-6 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold ${
              notification.type === 'success'
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border border-rose-300 text-rose-900'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Action Grid */}
        <div className="space-y-6 text-xs md:text-sm">
          
          {/* Section 1: Backup & Exports */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600" />
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
                className="p-4 rounded-2xl border border-emerald-300 hover:border-emerald-400 bg-emerald-50/50 text-right group transition-all shadow-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 mb-2 group-hover:scale-105 transition-transform">
                  <Copy className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-emerald-900 text-xs mb-1">1. نسخ كود البيانات للمشروع</h4>
                <p className="text-[11px] text-slate-600 leading-normal">
                  نسخ الكود ولصقه في المحادثة مع المساعد لتحديث ملف الكود المصدري قبل النشر إلى GitHub.
                </p>
              </button>

              {/* Download initialFamilyData.ts File */}
              <button
                onClick={() => {
                  exportTypeScriptFile(members);
                  showNotification('success', 'تم تنزيل ملف initialFamilyData.ts! يمكنك استبداله مباشرة في مجلد src/data/ في مستودع GitHub.');
                }}
                className="p-4 rounded-2xl border border-teal-300 hover:border-teal-400 bg-teal-50/50 text-right group transition-all shadow-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-teal-100 border border-teal-300 flex items-center justify-center text-teal-800 mb-2 group-hover:scale-105 transition-transform">
                  <FileCode className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-teal-900 text-xs mb-1">2. تحميل ملف initialFamilyData.ts</h4>
                <p className="text-[11px] text-slate-600 leading-normal">
                  تحميل ملف الكود المصدري المحدث فوراً لرفعه واستبداله في GitHub.
                </p>
              </button>

              {/* Export JSON */}
              <button
                onClick={() => {
                  exportToJSON(members);
                  showNotification('success', 'تم تصدير ملف النسخة الاحتياطية JSON بنجاح.');
                }}
                className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white text-right group transition-all shadow-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 mb-2 group-hover:scale-105 transition-transform">
                  <Database className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-slate-900 text-xs mb-1">نسخة احتياطية (JSON)</h4>
                <p className="text-[11px] text-slate-500 leading-normal">
                  حفظ نسخة كاملة من قاعدة بيانات الشجرة لاستعادتها لاحقاً.
                </p>
              </button>

              {/* Export CSV / Excel */}
              <button
                onClick={() => {
                  exportToCSV(members);
                  showNotification('success', 'تم تصدير ملف Excel/CSV المرمز باللغة العربية بنجاح.');
                }}
                className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white text-right group transition-all shadow-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 mb-2 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-slate-900 text-xs mb-1">جداول إكسل (CSV)</h4>
                <p className="text-[11px] text-slate-500 leading-normal">
                  تصدير السجلات إلى جدول إكسل متوافق تماماً مع الحروف العربية.
                </p>
              </button>

              {/* Export Standalone HTML (GitHub Pages Ready) */}
              <button
                onClick={() => {
                  exportStandaloneHTML(members);
                  showNotification('success', 'تم تنزيل ملف index.html الجاهز للاستضافة على GitHub Pages بنجاح!');
                }}
                className="p-4 rounded-2xl border border-amber-300 hover:border-amber-400 bg-amber-50/50 text-right group transition-all sm:col-span-2 lg:col-span-2 shadow-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 mb-2 group-hover:scale-105 transition-transform">
                  <Globe className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-amber-950 text-xs mb-1">تجهيز GitHub Pages كصفحة واحدة منفردة (index.html)</h4>
                <p className="text-[11px] text-slate-600 leading-normal">
                  تحميل ملف منفرد self-contained (`index.html`) يحتوي على كافة البيانات والتصميم مدمجين وجاهز للرفع المباشر.
                </p>
              </button>
            </div>
          </div>

          {/* Section 2: Import & Restore */}
          <div className="pt-2 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>استيراد واستعادة البيانات:</span>
            </h3>

            {isAdmin ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Import JSON File */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs mb-1">استيراد ملف JSON احتياطي</h4>
                    <p className="text-[11px] text-slate-600 leading-normal mb-3">
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
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-emerald-800 cursor-pointer shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>اختيار ملف JSON من الجهاز</span>
                    </label>
                  </div>
                </div>

                {/* Reset to Seed Data */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs mb-1">استعادة الشجرة التراثية الأصلية</h4>
                    <p className="text-[11px] text-slate-600 leading-normal mb-3">
                      إعادة ضبط البيانات للأصل الموثق (5 أجيال كاملة من الجد المؤسس حسن بن محمد آل بوعينين).
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={handleReset}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                      <span>إعادة ضبط للأصل التاريخي</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-950 mb-0.5">
                      عمليات استيراد وتعديل قاعدة البيانات مقفلة
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      يقتصر استيراد الملفات واستعادة السجلات على مدير النظام (saad) فقط.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onRequireLogin}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-amber-400 text-xs font-bold text-amber-900 shrink-0 shadow-xs"
                >
                  تسجيل الدخول لتفعيل الاستيراد
                </button>
              </div>
            )}
          </div>

          {/* Section 2.5: Multi-Device Sync & GitHub Export Clarification */}
          <div className="pt-2 border-t border-slate-200">
            <div className="bg-gradient-to-br from-amber-50/60 to-slate-50 p-5 rounded-2xl border border-amber-300 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs md:text-sm font-bold text-slate-900">
                    لماذا لا تنعكس الإضافات على GitHub بعد النشر من الإعدادات؟ وما هو الحل؟
                  </h3>
                  <span className="text-[11px] text-amber-800 font-bold">
                    توضيح تقني دقيق وطرق تثبيت البيانات في مستودع GitHub للأبد
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-700 space-y-3 leading-relaxed">
                <p>
                  عندما تضيف أو تعدل فرداً في واجهة الشجرة من متصفحك، فإن التطبيق يقوم بحفظه فوراً في <strong className="text-emerald-700">الذاكرة المحلية لمتصفحك فقط (Local Storage)</strong>. بينما ميزة <strong className="text-slate-900">نشر / تصدير المشروع إلى GitHub عبر الإعدادات</strong> تقوم برفع <strong className="text-amber-800">ملفات الكود المصدري للمشروع</strong> (الموجودة في الخادم)، وتحديداً الملف الرسمي: <code className="text-emerald-800 font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded">src/data/initialFamilyData.ts</code>.
                </p>

                <p className="text-slate-600">
                  ولأن المتصفح لا يستطيع الكتابة مباشرة في ملفات الكود المصدري لأسباب أمنية، فإن مستودع GitHub يظل محتفظاً بالبيانات الأصلية فقط ما لم يتم تحديث ذلك الملف.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Action 1 */}
                  <div className="bg-white p-3.5 rounded-xl border border-emerald-300 space-y-2 shadow-xs">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span>الحل الأسهل (التحديث عبر المساعد ثم النشر):</span>
                    </span>
                    <p className="text-[11px] text-slate-600">
                      1. اضغط على الزر الأخضر أعلاه <strong className="text-emerald-800 font-bold">"1. نسخ كود البيانات للمشروع"</strong>.<br />
                      2. الصق الكود هنا في المحادثة مع المساعد واطلب منه تثبيته.<br />
                      3. سيقوم المساعد بتحديث ملف <code className="text-emerald-800 font-mono text-[10px]">initialFamilyData.ts</code> فوراً.<br />
                      4. بعد ذلك، انشر المشروع لـ GitHub من الإعدادات وستجد جميع الإضافات معتمدة ودائمة لكل أفراد الأسرة!
                    </p>
                  </div>

                  {/* Action 2 */}
                  <div className="bg-white p-3.5 rounded-xl border border-teal-300 space-y-2 shadow-xs">
                    <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-teal-600" />
                      <span>الحل المباشر (تنزيل الملف ورفعه يدوياً لـ GitHub):</span>
                    </span>
                    <p className="text-[11px] text-slate-600">
                      1. اضغط على زر <strong className="text-teal-800 font-bold">"2. تحميل ملف initialFamilyData.ts"</strong> أعلاه.<br />
                      2. افتح مستودعك على GitHub، ثم ادخل المجلد <code className="text-teal-800 font-mono text-[10px]">src/data/</code>.<br />
                      3. اضغط <strong className="text-slate-900 font-bold">Add file ➔ Upload files</strong> واستبدل الملف بالملف الجديد الذي قمت بتنزيله.<br />
                      4. سيقوم GitHub Actions بنشر الموقع الجديد آلياً.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: GitHub Pages Deployment Quick Guide */}
          <div className="pt-2 border-t border-slate-200">
            <div className="bg-gradient-to-br from-emerald-50/60 to-slate-50 p-5 rounded-2xl border border-emerald-300 space-y-3">
              <h3 className="text-xs md:text-sm font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>النشر التلقائي المباشر على GitHub Pages (CI/CD):</span>
              </h3>
              
              <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
                <p>
                  تم تجهيز المشروع بملف سير العمل التلقائي <code className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-emerald-800 font-mono">.github/workflows/deploy.yml</code> وضبط مسارات الحزم بنظام المسار النسبي <code className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-emerald-800 font-mono">base: './'</code>، بحيث يتم بناء ونشر أي تعديل تقوم به هنا تلقائياً فور مزامنتها مع مستودع GitHub الخاص بك.
                </p>

                <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-1.5 shadow-xs">
                  <span className="text-[11px] font-bold text-emerald-900 block">خطوة تفعيل النشر لمرة واحدة في مستودع GitHub:</span>
                  <ol className="list-decimal list-inside text-[11px] text-slate-600 space-y-1">
                    <li>افتح مستودع المشروع في حسابك على GitHub.</li>
                    <li>انتقل إلى التبويب: <code className="text-amber-800 font-mono">Settings</code> ➔ <code className="text-amber-800 font-mono">Pages</code>.</li>
                    <li>تحت قسم <code className="text-amber-800 font-mono">Build and deployment</code>، اختر في خانة <code className="text-emerald-800 font-mono">Source</code>: <strong className="text-slate-900 font-bold">GitHub Actions</strong>.</li>
                    <li>انتهى! ستتولى المنصة بناء ونشر الموقع تلقائياً عند كل مزامنة في غضون ثوانٍ.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Close */}
        <div className="pt-5 mt-6 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
