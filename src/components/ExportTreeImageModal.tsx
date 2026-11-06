import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Sparkles,
  Settings2,
  FileImage,
  Printer
} from 'lucide-react';
import {
  TreeImageExportOptions,
  ExportTreeStyle,
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

export const ExportTreeImageModal: React.FC<ExportTreeImageModalProps> = ({
  isOpen,
  onClose,
  members
}) => {
  // Options State - Vertical Hierarchical Chart as the sole export style
  const style: ExportTreeStyle = 'vertical';
  const [theme, setTheme] = useState<ExportTheme>('parchment');
  const [resolution, setResolution] = useState<ExportResolution>('ultra_4k');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedSubFamily, setSelectedSubFamily] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [showDates, setShowDates] = useState<boolean>(true);
  const [showVerses, setShowVerses] = useState<boolean>(true);

  // UI state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [previewScale, setPreviewScale] = useState<number>(1);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // Canvases
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fullCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Available branches & sub-families
  const branches = React.useMemo(() => {
    const set = new Set<string>();
    members.forEach(m => {
      if (m.branch) set.add(m.branch);
    });
    return Array.from(set);
  }, [members]);

  const subFamilies = React.useMemo(() => {
    return ['البوحسون', 'النصف', 'الدرويش', 'الأزرق', 'آل جابر', 'النواصر'];
  }, []);

  // Render on preview canvas (Sole style: Vertical Hierarchical Chart)
  const renderPreview = useCallback(() => {
    if (!previewCanvasRef.current || !isOpen) return;
    setIsGenerating(true);

    const canvas = previewCanvasRef.current;
    const options: TreeImageExportOptions = {
      style: 'vertical',
      theme,
      resolution: 'hd', // Preview uses lighter resolution for ultra-fast response
      selectedBranch,
      selectedSubFamily,
      genderFilter,
      showDates,
      showVerses
    };

    try {
      renderVerticalBranchingChart(canvas, members, options);
    } catch (err) {
      console.error('Error rendering tree preview:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [theme, selectedBranch, selectedSubFamily, genderFilter, showDates, showVerses, members, isOpen]);

  useEffect(() => {
    if (isOpen) {
      renderPreview();
    }
  }, [renderPreview, isOpen]);

  if (!isOpen) return null;

  // Handle Full Resolution Export Download
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Create off-screen canvas at requested export resolution
      const exportCanvas = document.createElement('canvas');
      const options: TreeImageExportOptions = {
        style: 'vertical',
        theme,
        resolution,
        selectedBranch,
        selectedSubFamily,
        genderFilter,
        showDates,
        showVerses
      };

      renderVerticalBranchingChart(exportCanvas, members, options);

      const branchName = selectedSubFamily !== 'all' ? `_${selectedSubFamily}` : '';
      const filename = `شجرة_عائلة_آل_بوعينين_المخطط_الهيكلي_الرأسي${branchName}_${Date.now()}.png`;

      downloadCanvasAsPNG(exportCanvas, filename);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle Web Share or Clipboard Copy
  const handleShare = async () => {
    try {
      const exportCanvas = previewCanvasRef.current;
      if (!exportCanvas) return;

      exportCanvas.toBlob(async (blob) => {
        if (!blob) return;

        // Try Web Share API with image file
        if (navigator.canShare && navigator.canShare({ files: [new File([blob], 'tree.png', { type: 'image/png' })] })) {
          const file = new File([blob], 'شجرة_عائلة_آل_بوعينين.png', { type: 'image/png' });
          await navigator.share({
            title: 'شجرة عائلة آل بوعينين (البوحسون)',
            text: 'صورة شجرة أنساب وذرية عائلة آل بوعينين الكرام',
            files: [file]
          });
        } else if (navigator.clipboard && (window as any).ClipboardItem) {
          // Copy image to clipboard
          await navigator.clipboard.write([
            new (window as any).ClipboardItem({ 'image/png': blob })
          ]);
          setCopiedSuccess(true);
          setTimeout(() => setCopiedSuccess(false), 3000);
        } else {
          // Fallback download
          handleDownload();
        }
      });
    } catch (err) {
      console.warn('Share not supported or cancelled:', err);
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[96dvh] sm:max-h-[94vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl overflow-hidden text-right">
        
        {/* Mobile drag handle */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-2 sm:hidden" />

        {/* Modal Top Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shadow-sm">
              <FileImage className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>تصدير شجرة العائلة كصورة (PNG) عالية الجودة</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono font-bold">
                  جاهزة للطباعة والمشاركة
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                المخطط الهيكلي الرأسي عالي الدقة، جاهز للطباعة الفاخرة والمشاركة والتأطير
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split into Settings & Preview Canvas */}
        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-200">
          
          {/* Controls & Configuration Sidebar */}
          <div className="w-full lg:w-96 p-4 sm:p-5 space-y-4 sm:space-y-5 shrink-0 bg-slate-50/70 overflow-y-auto">
            
            {/* 1. Style Selection */}
            <div>
              <label className="block text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" />
                <span>نمط التصدير المعتمد:</span>
              </label>

              <div className="p-3.5 rounded-2xl border bg-emerald-50/80 border-emerald-300 shadow-xs flex items-start gap-3">
                <div className="p-2 rounded-xl mt-0.5 bg-emerald-600 text-white shrink-0">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">المخطط الهيكلي الرأسي</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                      النمط المعتمد
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    يبدأ من الجد الأعلى في القمة ويتفرع رأسياً للأسفل عبر بطاقات الأجيال المنفصلة مع اسم الشهرة لكل شخص وتمييز الرجال والنساء والأحياء والمتوفين.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Theme & Colors */}
            <div>
              <label className="block text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" />
                <span>نمط المظهر والألوان:</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTheme('parchment')}
                  className={`p-2 rounded-xl text-center text-xs font-bold border transition-all ${
                    theme === 'parchment'
                      ? 'bg-amber-100/70 border-amber-400 text-amber-900 ring-1 ring-amber-400 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="block w-4 h-4 mx-auto mb-1 rounded-full bg-[#f4ece1] border border-amber-600/50" />
                  ورق عتيق
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('emerald')}
                  className={`p-2 rounded-xl text-center text-xs font-bold border transition-all ${
                    theme === 'emerald'
                      ? 'bg-emerald-100/70 border-emerald-400 text-emerald-900 ring-1 ring-emerald-400 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="block w-4 h-4 mx-auto mb-1 rounded-full bg-[#06261c] border border-emerald-400" />
                  زمردي فاخر
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('classic')}
                  className={`p-2 rounded-xl text-center text-xs font-bold border transition-all ${
                    theme === 'classic'
                      ? 'bg-slate-100 border-slate-400 text-slate-900 ring-1 ring-slate-400 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="block w-4 h-4 mx-auto mb-1 rounded-full bg-white border border-slate-300" />
                  أبيض ناصع
                </button>
              </div>
            </div>

            {/* 3. Export Resolution */}
            <div>
              <label className="block text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5" />
                <span>دقة وجودة الصورة عند التحميل:</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setResolution('ultra_4k')}
                  className={`p-2.5 rounded-xl text-right border text-xs transition-all ${
                    resolution === 'ultra_4k'
                      ? 'bg-emerald-100/80 border-emerald-400 text-emerald-950 ring-1 ring-emerald-400 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>فائقة الدقة (4K)</span>
                    <span className="text-[10px] text-amber-700 font-bold">موصى به</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">3200×4500px - للطباعة A3/A2</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResolution('hd')}
                  className={`p-2.5 rounded-xl text-right border text-xs transition-all ${
                    resolution === 'hd'
                      ? 'bg-emerald-100/80 border-emerald-400 text-emerald-950 ring-1 ring-emerald-400 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="font-bold text-slate-900">دقة عالية (HD)</div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">2000×2800px - للمشاركة</span>
                </button>
              </div>
            </div>

            {/* 4. Branch & Sub-Family Filter */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    العائلة الفرعية:
                  </label>
                  <select
                    value={selectedSubFamily}
                    onChange={(e) => setSelectedSubFamily(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-sm"
                  >
                    <option value="all">كافة العائلات</option>
                    {subFamilies.map(sf => (
                      <option key={sf} value={sf}>{sf}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    الفرع العائلي:
                  </label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-sm"
                  >
                    <option value="all">كافة الفروع</option>
                    {branches.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  تضمين الأفراد:
                </label>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-sm"
                >
                  <option value="all">الذكور والإناث</option>
                  <option value="male">الذكور فقط</option>
                  <option value="female">الإناث فقط</option>
                </select>
              </div>

              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-center justify-between">
                <span className="font-semibold">نمط الأسماء: الاسم الأول فقط</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  تناسق مثالي
                </span>
              </div>
            </div>

            {/* 5. Toggles */}
            <div className="space-y-2 pt-1 border-t border-slate-200">
              <label className="flex items-center justify-between text-xs text-slate-700 font-bold cursor-pointer">
                <span>إظهار التواريخ وحالات الوفاة</span>
                <input
                  type="checkbox"
                  checked={showDates}
                  onChange={(e) => setShowDates(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-0 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Canvas Live Preview Container */}
          <div className="flex-1 flex flex-col p-4 sm:p-6 bg-slate-100/70 items-center justify-center min-h-[380px] sm:min-h-[420px] relative overflow-hidden">
            
            {/* Preview Toolbar */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm p-1 rounded-xl border border-slate-200 shadow-md">
              <button
                type="button"
                onClick={() => setPreviewScale(prev => Math.min(prev + 0.15, 2.0))}
                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700"
                title="تكبير المعاينة"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewScale(prev => Math.max(prev - 0.15, 0.5))}
                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700"
                title="تصغير المعاينة"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewScale(1)}
                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700"
                title="إعادة التوسيط"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Generating Indicator */}
            {isGenerating && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-xs">
                <div className="px-4 py-2 rounded-xl bg-white border border-emerald-300 text-xs text-emerald-800 font-bold flex items-center gap-2 shadow-lg">
                  <span className="w-3 h-3 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                  <span>جاري رسم المعاينة الحية...</span>
                </div>
              </div>
            )}

            {/* Scrollable Preview Canvas Frame */}
            <div className="w-full h-full flex items-center justify-center overflow-auto max-h-[65vh] p-2">
              <div
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out'
                }}
                className="shadow-xl rounded-2xl border-4 border-amber-600/30 overflow-hidden shrink-0 bg-[#fbf8f2]"
              >
                <canvas
                  ref={previewCanvasRef}
                  className="max-h-[58vh] w-auto h-auto block object-contain"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-2 text-center font-medium">
              معاينة تفاعلية فورية · سيتم إنشاء وتحميل ملف PNG بدقة فائقة عند الضغط على زر التحميل أدناه
            </p>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="font-bold text-slate-800">المخطط الهيكلي الرأسي المتفرع</span>
            <span>·</span>
            <span>{resolution === 'ultra_4k' ? 'دقة فائقة (3200×4500px)' : 'دقة عالية (2000×2800px)'}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleShare}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-800 flex items-center gap-1.5 transition-colors shadow-xs"
              title="مشاركة الصورة أو نسخها"
            >
              {copiedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>تم نسخ الصورة للحافظة!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-emerald-600" />
                  <span>مشاركة / نسخ</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-emerald-600/30 active:scale-[0.99] disabled:opacity-50 transition-all"
            >
              {isDownloading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>جاري معالجة وتنزيل ملف PNG...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>تحميل كصورة عالية الجودة (PNG)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
