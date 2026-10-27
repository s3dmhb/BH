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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[94vh] flex flex-col glass-panel rounded-3xl border border-emerald-500/30 shadow-2xl overflow-hidden text-right">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50">
              <FileImage className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>تصدير شجرة العائلة كصورة (PNG) عالية الجودة</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  جاهزة للطباعة والمشاركة
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                المخطط الهيكلي الرأسي عالي الدقة، جاهز للطباعة الفاخرة والمشاركة والتأطير
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full glass-btn flex items-center justify-center text-slate-400 hover:text-white"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split into Settings (Left on RTL) & Preview Canvas (Right on RTL) */}
        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-white/10">
          
          {/* Controls & Configuration Sidebar */}
          <div className="w-full lg:w-96 p-4 sm:p-5 space-y-5 shrink-0 bg-slate-950/40 overflow-y-auto">
            
            {/* 1. Style Selection (Single Approved Choice: Vertical Hierarchical Chart) */}
            <div>
              <label className="block text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" />
                <span>نمط التصدير المعتمد:</span>
              </label>

              <div className="p-3.5 rounded-2xl border bg-emerald-950/80 border-emerald-400 shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/80 flex items-start gap-3">
                <div className="p-2 rounded-xl mt-0.5 bg-emerald-500 text-emerald-950 shrink-0">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">المخطط الهيكلي الرأسي</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                      النمط المعتمد
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    يبدأ من الجد الأعلى في القمة ويتفرع رأسياً للأسفل عبر بطاقات الأجيال المنفصلة مع اسم الشهرة لكل شخص وتمييز الرجال والنساء والأحياء والمتوفين.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Theme & Colors */}
            <div>
              <label className="block text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" />
                <span>نمط المظهر والألوان:</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTheme('parchment')}
                  className={`p-2 rounded-xl text-center text-xs font-medium border transition-all ${
                    theme === 'parchment'
                      ? 'bg-amber-950/50 border-amber-400 text-amber-200 ring-1 ring-amber-400'
                      : 'bg-slate-900/60 border-white/10 text-slate-400'
                  }`}
                >
                  <span className="block w-4 h-4 mx-auto mb-1 rounded-full bg-[#f4ece1] border border-amber-600/50" />
                  ورق ملكي عتيق
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('emerald')}
                  className={`p-2 rounded-xl text-center text-xs font-medium border transition-all ${
                    theme === 'emerald'
                      ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400'
                      : 'bg-slate-900/60 border-white/10 text-slate-400'
                  }`}
                >
                  <span className="block w-4 h-4 mx-auto mb-1 rounded-full bg-[#06261c] border border-emerald-400" />
                  زمردي داكن فاخر
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('classic')}
                  className={`p-2 rounded-xl text-center text-xs font-medium border transition-all ${
                    theme === 'classic'
                      ? 'bg-slate-800 border-white text-white ring-1 ring-white'
                      : 'bg-slate-900/60 border-white/10 text-slate-400'
                  }`}
                >
                  <span className="block w-4 h-4 mx-auto mb-1 rounded-full bg-white border border-slate-300" />
                  أبيض ناصع للطباعة
                </button>
              </div>
            </div>

            {/* 3. Export Resolution */}
            <div>
              <label className="block text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5" />
                <span>دقة وجودة الصورة عند التحميل:</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setResolution('ultra_4k')}
                  className={`p-2.5 rounded-xl text-right border text-xs transition-all ${
                    resolution === 'ultra_4k'
                      ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400'
                      : 'bg-slate-900/60 border-white/10 text-slate-400'
                  }`}
                >
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>فائقة الدقة (4K)</span>
                    <span className="text-[10px] text-amber-300">موصى به</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">3200×4500px - للطباعة الكبيرة A3/A2</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResolution('hd')}
                  className={`p-2.5 rounded-xl text-right border text-xs transition-all ${
                    resolution === 'hd'
                      ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400'
                      : 'bg-slate-900/60 border-white/10 text-slate-400'
                  }`}
                >
                  <div className="font-bold text-white">دقة عالية (HD)</div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">2000×2800px - للواتساب والمشاركة</span>
                </button>
              </div>
            </div>

            {/* 4. Branch & Sub-Family Filter */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    العائلة الفرعية:
                  </label>
                  <select
                    value={selectedSubFamily}
                    onChange={(e) => setSelectedSubFamily(e.target.value)}
                    className="w-full bg-slate-900 border border-emerald-500/30 rounded-xl p-2 text-xs text-white focus:outline-none"
                  >
                    <option value="all">كافة العائلات</option>
                    {subFamilies.map(sf => (
                      <option key={sf} value={sf}>{sf}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    الفرع العائلي:
                  </label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full bg-slate-900 border border-emerald-500/30 rounded-xl p-2 text-xs text-white focus:outline-none"
                  >
                    <option value="all">كافة الفروع</option>
                    {branches.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  تضمين الأفراد:
                </label>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value as any)}
                  className="w-full bg-slate-900 border border-emerald-500/30 rounded-xl p-2 text-xs text-white focus:outline-none"
                >
                  <option value="all">الذكور والإناث</option>
                  <option value="male">الذكور فقط</option>
                  <option value="female">الإناث فقط</option>
                </select>
              </div>

              <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center justify-between">
                <span>نمط الأسماء: الاسم الأول فقط</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  تناسق مثالي مع المستطيلات
                </span>
              </div>
            </div>

            {/* 5. Toggles */}
            <div className="space-y-2 pt-1 border-t border-white/5">
              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                <span>إظهار التواريخ وحالات الوفاة</span>
                <input
                  type="checkbox"
                  checked={showDates}
                  onChange={(e) => setShowDates(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-0 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Canvas Live Preview Container */}
          <div className="flex-1 flex flex-col p-4 sm:p-6 bg-slate-950/70 items-center justify-center min-h-[420px] relative overflow-hidden">
            
            {/* Preview Toolbar */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 glass-panel p-1 rounded-xl border border-white/10 shadow-lg">
              <button
                type="button"
                onClick={() => setPreviewScale(prev => Math.min(prev + 0.15, 2.0))}
                className="w-7 h-7 rounded-lg glass-btn flex items-center justify-center text-slate-300 hover:text-white"
                title="تكبير المعاينة"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewScale(prev => Math.max(prev - 0.15, 0.5))}
                className="w-7 h-7 rounded-lg glass-btn flex items-center justify-center text-slate-300 hover:text-white"
                title="تصغير المعاينة"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewScale(1)}
                className="w-7 h-7 rounded-lg glass-btn flex items-center justify-center text-slate-300 hover:text-white"
                title="إعادة التوسيط"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Generating Indicator */}
            {isGenerating && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-xs">
                <div className="px-4 py-2 rounded-xl bg-slate-900 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2 shadow-2xl">
                  <span className="w-3 h-3 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
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
                className="shadow-2xl rounded-2xl border-4 border-amber-600/30 overflow-hidden shrink-0 bg-[#fbf8f2]"
              >
                <canvas
                  ref={previewCanvasRef}
                  className="max-h-[58vh] w-auto h-auto block object-contain"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-2 text-center">
              معاينة تفاعلية فورية · سيتم إنشاء وتحميل ملف PNG بدقة فائقة عند الضغط على زر التحميل أدناه
            </p>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>المخطط الهيكلي الرأسي المتفرع</span>
            <span className="text-slate-600">·</span>
            <span>{resolution === 'ultra_4k' ? 'دقة فائقة (3200×4500px)' : 'دقة عالية (2000×2800px)'}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleShare}
              className="px-4 py-2.5 rounded-xl glass-btn text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors"
              title="مشاركة الصورة أو نسخها"
            >
              {copiedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>تم نسخ الصورة للحافظة!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  <span>مشاركة / نسخ</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-emerald-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/60 active:scale-[0.99] disabled:opacity-50 transition-all"
            >
              {isDownloading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-emerald-950 border-t-transparent animate-spin" />
                  <span>جاري معالجة وتنزيل ملف PNG...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>تحميل كصورة عالي الجودة (PNG)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
