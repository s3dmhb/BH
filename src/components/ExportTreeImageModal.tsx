import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FamilyMember } from '../types/family';
import {
  X,
  Download,
  Share2,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  GitBranch,
  Palette,
  FileImage,
  Printer,
  Filter
} from 'lucide-react';
import {
  TreeImageExportOptions,
  ExportTheme,
  ExportResolution,
  renderVerticalBranchingChart,
  downloadCanvasAsPNG
} from '../utils/treeImageGenerator';

interface ExportTreeImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
}

const THEME_OPTIONS: Array<{
  id: ExportTheme;
  label: string;
  desc: string;
  swatchBg: string;
  swatchBorder: string;
  accentDot: string;
}> = [
  {
    id: 'modern',
    label: 'أبيض عصري',
    desc: 'خلفية ناصعة وخطوط سماوية واضحة',
    swatchBg: '#ffffff',
    swatchBorder: '#38bdf8',
    accentDot: '#0284c7'
  },
  {
    id: 'parchment',
    label: 'عاجي دافئ',
    desc: 'لمسة تراثية مشرقة مريحة للعين',
    swatchBg: '#faf3e4',
    swatchBorder: '#d4af37',
    accentDot: '#b45309'
  },
  {
    id: 'sage',
    label: 'نعناعي فاتح',
    desc: 'أخضر هادئ ناعم للطباعة الفاخرة',
    swatchBg: '#ecfdf5',
    swatchBorder: '#34d399',
    accentDot: '#047857'
  }
];

export const ExportTreeImageModal: React.FC<ExportTreeImageModalProps> = ({
  isOpen,
  onClose,
  members
}) => {
  // Light-only modern themes (dark/black removed per preference)
  const [theme, setTheme] = useState<ExportTheme>('modern');
  const [resolution, setResolution] = useState<ExportResolution>('ultra_4k');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedSubFamily, setSelectedSubFamily] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [showDates, setShowDates] = useState<boolean>(true);

  // UI state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [previewScale, setPreviewScale] = useState<number>(1);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const branches = useMemo(() => {
    const set = new Set<string>();
    members.forEach(m => {
      if (m.branch) set.add(m.branch);
    });
    return Array.from(set);
  }, [members]);

  const subFamilies = useMemo(() => {
    return ['البوحسون', 'النصف', 'الدرويش', 'الأزرق', 'آل جابر', 'النواصر'];
  }, []);

  const renderPreview = useCallback(() => {
    if (!previewCanvasRef.current || !isOpen) return;
    setIsGenerating(true);

    const canvas = previewCanvasRef.current;
    const options: TreeImageExportOptions = {
      style: 'vertical',
      theme,
      resolution: 'hd',
      selectedBranch,
      selectedSubFamily,
      genderFilter,
      showDates
    };

    try {
      renderVerticalBranchingChart(canvas, members, options);
    } catch (err) {
      console.error('Error rendering tree preview:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [theme, selectedBranch, selectedSubFamily, genderFilter, showDates, members, isOpen]);

  useEffect(() => {
    if (isOpen) {
      renderPreview();
    }
  }, [renderPreview, isOpen]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const exportCanvas = document.createElement('canvas');
      const options: TreeImageExportOptions = {
        style: 'vertical',
        theme,
        resolution,
        selectedBranch,
        selectedSubFamily,
        genderFilter,
        showDates
      };

      renderVerticalBranchingChart(exportCanvas, members, options);

      const branchName = selectedSubFamily !== 'all' ? `_${selectedSubFamily}` : '';
      const filename = `شجرة_عائلة_آل_بوعينين_المخطط_الرأسي${branchName}_${Date.now()}.png`;

      downloadCanvasAsPNG(exportCanvas, filename);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    try {
      const exportCanvas = previewCanvasRef.current;
      if (!exportCanvas) return;

      exportCanvas.toBlob(async blob => {
        if (!blob) return;

        if (navigator.canShare && navigator.canShare({ files: [new File([blob], 'tree.png', { type: 'image/png' })] })) {
          const file = new File([blob], 'شجرة_عائلة_آل_بوعينين.png', { type: 'image/png' });
          await navigator.share({
            title: 'شجرة عائلة آل بوعينين (البوحسون)',
            text: 'صورة شجرة أنساب وذرية عائلة آل بوعينين الكرام',
            files: [file]
          });
        } else if (navigator.clipboard && (window as any).ClipboardItem) {
          await navigator.clipboard.write([
            new (window as any).ClipboardItem({ 'image/png': blob })
          ]);
          setCopiedSuccess(true);
          setTimeout(() => setCopiedSuccess(false), 3000);
        } else {
          handleDownload();
        }
      });
    } catch (err) {
      console.warn('Share not supported or cancelled:', err);
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[96dvh] sm:max-h-[92vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl overflow-hidden text-right">
        {/* Mobile drag handle */}
        <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0">
              <FileImage className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                تصدير شجرة العائلة كصورة عالية الجودة
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                المخطط الهيكلي الرأسي الحديث · الاسم الأول لكل فرد مع الحفاظ على اسم الجد المؤسس · جاهز للطباعة والمشاركة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shrink-0"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-200">
          {/* Controls Sidebar */}
          <div className="w-full lg:w-[360px] p-4 sm:p-5 space-y-5 shrink-0 bg-slate-50/70 overflow-y-auto">
            {/* 1. Active Layout Summary */}
            <div className="flex items-start gap-3 pb-4 border-b border-slate-200">
              <div className="p-2 rounded-xl bg-sky-600 text-white shrink-0">
                <GitBranch className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">المخطط الهيكلي الرأسي</span>
                  <span className="text-[11px] font-semibold text-sky-700">معتمد</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  تصميم هندسي نظيف يرتب كل جيل في مستوى مستقل مع اسم الشهرة، وتمييز واضح بين الرجال والنساء والأحياء والمتوفين.
                </p>
              </div>
            </div>

            {/* 2. Light Theme & Colors Selector (No black/dark option) */}
            <div>
              <label className="text-xs font-bold text-slate-800 mb-2.5 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-sky-600" />
                <span>نمط الألوان والورق:</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {THEME_OPTIONS.map(opt => {
                  const active = theme === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTheme(opt.id)}
                      title={opt.desc}
                      className={`min-h-[68px] p-2.5 rounded-xl text-center text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1.5 ${
                        active
                          ? 'bg-white border-sky-500 text-slate-900 ring-2 ring-sky-500/25 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-xs"
                        style={{ backgroundColor: opt.swatchBg, borderColor: opt.swatchBorder }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.accentDot }} />
                      </span>
                      <span className="whitespace-nowrap">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Export Resolution */}
            <div>
              <label className="text-xs font-bold text-slate-800 mb-2.5 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-sky-600" />
                <span>دقة الصورة عند التحميل:</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setResolution('ultra_4k')}
                  className={`p-3 rounded-xl text-right border text-xs transition-all ${
                    resolution === 'ultra_4k'
                      ? 'bg-sky-50/70 border-sky-500 text-slate-900 ring-1 ring-sky-500/30 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold text-slate-900 flex items-center justify-between gap-1">
                    <span>فائقة (4K)</span>
                    <span className="text-[10px] text-sky-700 font-semibold">للطباعة</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5 tabular-nums">A3 / A2 عالي الدقة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResolution('hd')}
                  className={`p-3 rounded-xl text-right border text-xs transition-all ${
                    resolution === 'hd'
                      ? 'bg-sky-50/70 border-sky-500 text-slate-900 ring-1 ring-sky-500/30 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold text-slate-900">عالية (HD)</div>
                  <span className="text-[10px] text-slate-500 block mt-0.5 tabular-nums">مناسبة للواتساب والجوال</span>
                </button>
              </div>
            </div>

            {/* 4. Branch & Sub-Family Filters */}
            <div className="space-y-3 pt-1 border-t border-slate-200">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 pt-2">
                <Filter className="w-3.5 h-3.5 text-sky-600" />
                <span>تصفية النطاق المراد تصديره:</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    العائلة الفرعية:
                  </label>
                  <select
                    value={selectedSubFamily}
                    onChange={e => setSelectedSubFamily(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                  >
                    <option value="all">كافة العائلات</option>
                    {subFamilies.map(sf => (
                      <option key={sf} value={sf}>{sf}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    الفرع العائلي:
                  </label>
                  <select
                    value={selectedBranch}
                    onChange={e => setSelectedBranch(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                  >
                    <option value="all">كافة الفروع</option>
                    {branches.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  تضمين الأفراد:
                </label>
                <select
                  value={genderFilter}
                  onChange={e => setGenderFilter(e.target.value as 'all' | 'male' | 'female')}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                >
                  <option value="all">الذكور والإناث</option>
                  <option value="male">الذكور فقط</option>
                  <option value="female">الإناث فقط</option>
                </select>
              </div>
            </div>

            {/* 5. Display Toggle */}
            <div className="pt-2 border-t border-slate-200">
              <label className="flex items-center justify-between text-xs text-slate-800 font-bold cursor-pointer py-1">
                <span>إظهار سنة الميلاد في البطاقات</span>
                <input
                  type="checkbox"
                  checked={showDates}
                  onChange={e => setShowDates(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-0 cursor-pointer accent-sky-600"
                />
              </label>
            </div>
          </div>

          {/* Canvas Live Preview Stage */}
          <div className="flex-1 flex flex-col p-4 sm:p-6 bg-slate-100 items-center justify-center min-h-[360px] sm:min-h-[440px] relative overflow-hidden">
            {/* Preview Zoom Controls */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-white/95 backdrop-blur-sm p-1 rounded-xl border border-slate-200 shadow-sm">
              <button
                type="button"
                onClick={() => setPreviewScale(prev => Math.min(prev + 0.15, 2.0))}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-700"
                title="تكبير المعاينة"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewScale(prev => Math.max(prev - 0.15, 0.5))}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-700"
                title="تصغير المعاينة"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewScale(1)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-700"
                title="إعادة التوسيط"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Generating Indicator */}
            {isGenerating && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-xs">
                <div className="px-4 py-2 rounded-xl bg-white border border-sky-200 text-xs text-sky-800 font-bold flex items-center gap-2 shadow-md">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-sky-600 border-t-transparent animate-spin" />
                  <span>جاري تحديث المعاينة...</span>
                </div>
              </div>
            )}

            {/* Preview Frame */}
            <div className="w-full h-full flex items-center justify-center overflow-auto max-h-[62vh] p-2">
              <div
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out'
                }}
                className="shadow-xl rounded-2xl border border-slate-200 overflow-hidden shrink-0 bg-white"
              >
                <canvas
                  ref={previewCanvasRef}
                  className="max-h-[56vh] w-auto h-auto block object-contain"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-3 text-center font-medium">
              معاينة حية للتصميم · يتم توليد الصورة الكاملة بالدقة المختارة عند التحميل
            </p>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 font-medium flex items-center gap-2">
            <span className="font-bold text-slate-800">المخطط الهيكلي الرأسي</span>
            <span aria-hidden="true">·</span>
            <span>{resolution === 'ultra_4k' ? 'دقة فائقة للطباعة (4K)' : 'دقة عالية للمشاركة (HD)'}</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleShare}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1.5 transition-colors whitespace-nowrap"
              title="مشاركة الصورة أو نسخها"
            >
              {copiedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>تم النسخ!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-sky-600" />
                  <span>مشاركة / نسخ</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="min-h-[44px] flex-1 sm:flex-initial px-6 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] disabled:opacity-50 transition-all whitespace-nowrap"
            >
              {isDownloading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>جاري التصدير...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>تحميل صورة PNG</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
