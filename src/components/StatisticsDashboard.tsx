import React, { useMemo } from 'react';
import { FamilyMember, FamilyStats } from '../types/family';
import { HeritageCrest } from './HeritageCrest';
import { getSubFamilyTags } from '../utils/subFamilyUtils';
import {
  Users,
  UserCheck,
  HeartHandshake,
  Layers,
  Sparkles,
  Award,
  GitBranch,
  Calendar,
  Percent,
  Crown,
  Shield,
  Gem,
  Flame,
  Waves
} from 'lucide-react';

interface StatisticsDashboardProps {
  stats: FamilyStats;
  members: FamilyMember[];
}

export const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ stats, members }) => {
  // Compute detailed distributions
  const detailedStats = useMemo(() => {
    const genCounts: Record<number, { total: number; males: number; females: number; living: number }> = {};
    const marriageAlliances: Record<string, number> = {};
    let albuhassonCount = 0;
    let alnesfCount = 0;
    let aldarwishCount = 0;
    let alazraqCount = 0;
    let jaberCount = 0;
    let nawasirCount = 0;
    let bothCount = 0;

    members.forEach(m => {
      const tags = getSubFamilyTags(m);
      if (tags.some(t => t.category === 'albuhasson')) albuhassonCount++;
      if (tags.some(t => t.category === 'alnesf')) alnesfCount++;
      if (tags.some(t => t.category === 'aldarwish')) aldarwishCount++;
      if (tags.some(t => t.category === 'alazraq')) alazraqCount++;
      if (tags.some(t => t.category === 'jaber')) jaberCount++;
      if (tags.some(t => t.category === 'nawasir')) nawasirCount++;
      if (tags.some(t => t.category === 'both')) bothCount++;

      const g = m.generation || 1;
      if (!genCounts[g]) {
        genCounts[g] = { total: 0, males: 0, females: 0, living: 0 };
      }
      genCounts[g].total++;
      if (m.gender === 'male') genCounts[g].males++;
      else genCounts[g].females++;
      if (m.is_living) genCounts[g].living++;

      // Track marriage alliances from spouse_info
      if (m.spouse_info) {
        const parts = m.spouse_info.split(/[،,]/);
        parts.forEach(p => {
          const trimmed = p.trim();
          if (trimmed && trimmed !== 'أعزب' && trimmed !== 'غير متزوجة') {
            // Check known families or extract name
            const match = trimmed.match(/(آل\s+[^\s]+|[^\s]+\s+بنت\s+[^\s]+)/);
            const familyKey = trimmed.includes('آل بوعينين')
              ? 'آل بوعينين'
              : trimmed.includes('الخاطر')
              ? 'الخاطر'
              : trimmed.includes('الماجد')
              ? 'الماجد'
              : trimmed.includes('السبيعي')
              ? 'السبيعي'
              : trimmed.includes('السعدون')
              ? 'السعدون'
              : trimmed.includes('الفايز')
              ? 'الفايز'
              : trimmed.includes('الناصر')
              ? 'الناصر'
              : 'أسر كريمة أخرى';

            marriageAlliances[familyKey] = (marriageAlliances[familyKey] || 0) + 1;
          }
        });
      }
    });

    const alliances = Object.entries(marriageAlliances)
      .map(([family, count]) => ({ family, count }))
      .sort((a, b) => b.count - a.count);

    return {
      genCounts,
      alliances,
      albuhassonCount,
      alnesfCount,
      aldarwishCount,
      alazraqCount,
      jaberCount,
      nawasirCount,
      bothCount
    };
  }, [members]);

  const malePercent = Math.round((stats.males / (stats.total || 1)) * 100);
  const femalePercent = 100 - malePercent;
  const livingPercent = Math.round((stats.living / (stats.total || 1)) * 100);
  const deceasedPercent = 100 - livingPercent;

  return (
    <div className="w-full max-w-7xl 2xl:max-w-[1700px] mx-auto px-3 sm:px-6 py-6 pb-24 md:pb-10 space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 md:p-8 border border-white/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
        <div className="flex items-center gap-4">
          <HeritageCrest size={56} className="shrink-0 drop-shadow-md" />
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              لوحة الإحصائيات والتحليلات الأسرية
            </h2>
            <p className="text-xs md:text-sm text-sky-300 mt-0.5">
              شجرة عائلة البوحسون · فخذ النواصر · آل جابر · قبيلة آل بوعينين
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/60 px-4 py-2.5 rounded-2xl border border-white/10">
          <span className="text-slate-400">الجد المؤسس:</span>
          <span className="font-bold text-white">{stats.patriarchName}</span>
        </div>
      </div>

      {/* KPI Cards Row (Tabular Figures) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Total Members */}
        <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>إجمالي أفراد الشجرة</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl md:text-4xl font-bold text-white font-mono tabular-nums mb-1">
            {stats.total}
          </div>
          <div className="text-[11px] text-sky-300 flex items-center gap-1">
            <span>سجلات موثقة في قاعدة البيانات</span>
          </div>
        </div>

        {/* Living Members */}
        <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>الأحياء (أطال الله أعمارهم)</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl md:text-4xl font-bold text-emerald-300 font-mono tabular-nums mb-1">
            {stats.living}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span>نسبة الأحياء: {livingPercent}% من العائلة</span>
          </div>
        </div>

        {/* Generational Depth */}
        <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>عمق الأجيال المتعاقبة</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl md:text-4xl font-bold text-amber-300 font-mono tabular-nums mb-1">
            {stats.generationsCount}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span>أجيال متصلة من الجد المؤسس</span>
          </div>
        </div>

        {/* Branches Count */}
        <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>الفروع الأسرية الكبرى</span>
            <GitBranch className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl md:text-4xl font-bold text-sky-300 font-mono tabular-nums mb-1">
            {stats.branches.length}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span>فروع ممتدة وموثقة الأنساب</span>
          </div>
        </div>
      </div>

      {/* Demographic Breakdown & Vital Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Gender Breakdown */}
        <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400" />
              <span>التوزيع الديموغرافي (الذكور والإناث)</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">{stats.total} فرد</span>
          </div>

          {/* Visual Dual Progress Bar */}
          <div className="w-full h-4 rounded-full bg-slate-900 overflow-hidden flex border border-white/10 p-0.5">
            <div
              style={{ width: `${malePercent}%` }}
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-r-full transition-all duration-500"
              title={`الذكور: ${stats.males} (${malePercent}%)`}
            />
            <div
              style={{ width: `${femalePercent}%` }}
              className="h-full bg-gradient-to-l from-rose-500 to-purple-500 rounded-l-full transition-all duration-500"
              title={`الإناث: ${stats.females} (${femalePercent}%)`}
            />
          </div>

          {/* Legend and Numbers */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-sky-950/30 border border-sky-400/20 rounded-2xl p-3 text-right">
              <span className="text-xs text-sky-300 font-semibold block mb-0.5">الذكور</span>
              <div className="text-2xl font-bold text-white font-mono tabular-nums">
                {stats.males} <span className="text-xs font-normal text-slate-400">({malePercent}%)</span>
              </div>
            </div>

            <div className="bg-rose-950/30 border border-rose-400/20 rounded-2xl p-3 text-right">
              <span className="text-xs text-rose-300 font-semibold block mb-0.5">الإناث</span>
              <div className="text-2xl font-bold text-white font-mono tabular-nums">
                {stats.females} <span className="text-xs font-normal text-slate-400">({femalePercent}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Vital Status (Living vs Deceased) */}
        <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              <span>الحالة الحياتية (الأحياء والمتوفون)</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">{stats.total} فرد</span>
          </div>

          {/* Visual Dual Progress Bar */}
          <div className="w-full h-4 rounded-full bg-slate-900 overflow-hidden flex border border-white/10 p-0.5">
            <div
              style={{ width: `${livingPercent}%` }}
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-r-full transition-all duration-500"
              title={`الأحياء: ${stats.living} (${livingPercent}%)`}
            />
            <div
              style={{ width: `${deceasedPercent}%` }}
              className="h-full bg-slate-700 rounded-l-full transition-all duration-500"
              title={`المتوفون: ${stats.deceased} (${deceasedPercent}%)`}
            />
          </div>

          {/* Legend and Numbers */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-2xl p-3 text-right">
              <span className="text-xs text-emerald-300 font-semibold block mb-0.5">الأحياء</span>
              <div className="text-2xl font-bold text-white font-mono tabular-nums">
                {stats.living} <span className="text-xs font-normal text-slate-400">({livingPercent}%)</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3 text-right">
              <span className="text-xs text-slate-400 font-semibold block mb-0.5">المتوفون (رحمهم الله)</span>
              <div className="text-2xl font-bold text-slate-300 font-mono tabular-nums">
                {stats.deceased} <span className="text-xs font-normal text-slate-500">({deceasedPercent}%)</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Sub-Families Lineage Distribution (البوحسون، النصف، الدرويش، الأزرق، آل جابر، النواصر) */}
      <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">
              وسم وتوزيع العائلات الفرعية (البوحسون · النصف · الدرويش · الأزرق · آل جابر · النواصر)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            تصنيف تلقائي متصل بنسب وتفرعات عائلة البوحسون
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {/* Albuhasson Card */}
          <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-sky-950/40 rounded-2xl p-4 border border-sky-400/30 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-sky-400" />
                <span>عائلة البوحسون</span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-sky-400/20 text-sky-300 px-2 py-0.5 rounded-full border border-sky-400/30">
                الأصل المعتمد
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-bold font-mono text-white">
                {detailedStats.albuhassonCount}
              </span>
              <span className="text-xs font-bold text-sky-300 font-mono">
                {Math.round((detailedStats.albuhassonCount / (stats.total || 1)) * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              سلالة وأبناء الجد المؤسس حسن بن محمد البوحسون.
            </p>
          </div>

          {/* Al-Nesf Card */}
          <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-indigo-950/40 rounded-2xl p-4 border border-indigo-400/30 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Gem className="w-4 h-4 text-indigo-400" />
                <span>عائلة النصف</span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-indigo-400/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-400/30">
                وسم نيلي
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-bold font-mono text-white">
                {detailedStats.alnesfCount}
              </span>
              <span className="text-xs font-bold text-indigo-300 font-mono">
                {Math.round((detailedStats.alnesfCount / (stats.total || 1)) * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              تفرعات وأنساب عائلة النصف الكريمة من قبيلة آل بوعينين.
            </p>
          </div>

          {/* Al-Darwish Card */}
          <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-orange-950/40 rounded-2xl p-4 border border-orange-400/30 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>عائلة الدرويش</span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-orange-400/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-400/30">
                وسم نحاسي
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-bold font-mono text-white">
                {detailedStats.aldarwishCount}
              </span>
              <span className="text-xs font-bold text-orange-300 font-mono">
                {Math.round((detailedStats.aldarwishCount / (stats.total || 1)) * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              تفرعات وأنساب عائلة الدرويش الكريمة من قبيلة آل بوعينين.
            </p>
          </div>

          {/* Al-Azraq Card */}
          <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-cyan-950/40 rounded-2xl p-4 border border-cyan-400/30 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Waves className="w-4 h-4 text-cyan-400" />
                <span>عائلة الأزرق</span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-cyan-400/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-400/30">
                وسم سماوي
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-bold font-mono text-white">
                {detailedStats.alazraqCount}
              </span>
              <span className="text-xs font-bold text-cyan-300 font-mono">
                {Math.round((detailedStats.alazraqCount / (stats.total || 1)) * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              تفرعات وأنساب عائلة الأزرق الكريمة من قبيلة آل بوعينين.
            </p>
          </div>

          {/* Al-Jaber Card */}
          <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-amber-950/40 rounded-2xl p-4 border border-amber-400/30 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>تفرعات آل جابر</span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                وسم ذهبي
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-bold font-mono text-white">
                {detailedStats.jaberCount}
              </span>
              <span className="text-xs font-bold text-amber-300 font-mono">
                {Math.round((detailedStats.jaberCount / (stats.total || 1)) * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              أفراد العائلة المنتسبون عبر فروع آل جابر ومحمد وعلي البوحسون.
            </p>
          </div>

          {/* Al-Nawasir Card */}
          <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-teal-950/40 rounded-2xl p-4 border border-teal-400/30 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-teal-400" />
                <span>فخذ النواصر</span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-teal-400/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-400/30">
                وسم تركوازي
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-bold font-mono text-white">
                {detailedStats.nawasirCount}
              </span>
              <span className="text-xs font-bold text-teal-300 font-mono">
                {Math.round((detailedStats.nawasirCount / (stats.total || 1)) * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              أفراد العائلة المنتسبون عبر فروع النواصر وإبراهيم وناصر البوحسون.
            </p>
          </div>

          {/* Both/Founding Card */}
          <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-800/80 rounded-2xl p-4 border border-white/10 shadow-lg relative overflow-hidden sm:col-span-2 lg:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>النسب الجامع والمؤسس (آل جابر والنواصر)</span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-white/10 text-white px-2 py-0.5 rounded-full border border-white/15">
                العمود الجامع
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-bold font-mono text-white">
                {detailedStats.bothCount}
              </span>
              <span className="text-xs font-bold text-sky-300 font-mono">
                {Math.round((detailedStats.bothCount / (stats.total || 1)) * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              الجد المؤسس والأصول الجامعة بين فخذ النواصر وتفرعات آل جابر وقبيلة آل بوعينين.
            </p>
          </div>
        </div>
      </div>

      {/* Generations & Branches Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Generational Breakdown */}
        <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            <span>توزيع الأفراد حسب الأجيال المتعاقبة</span>
          </h3>

          <div className="space-y-3 pt-2">
            {Object.entries(detailedStats.genCounts).map(([genStr, data]) => {
              const genNum = parseInt(genStr);
              const percentage = Math.round((data.total / stats.total) * 100);

              const titles: Record<number, string> = {
                1: 'الجيل الأول (الجد المؤسس)',
                2: 'الجيل الثاني (الأبناء)',
                3: 'الجيل الثالث (الأحفاد)',
                4: 'الجيل الرابع (الكفاءات المعاصرة)',
                5: 'الجيل الخامس (الشباب والنشء)'
              };

              return (
                <div key={genNum} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">
                      {titles[genNum] || `الجيل ${genNum}`}
                    </span>
                    <span className="font-mono text-sky-300 font-bold">
                      {data.total} فرد ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-white/5">
                    <div
                      style={{ width: `${percentage}%` }}
                      className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full"
                    />
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    <span>ذكور: {data.males}</span>
                    <span>·</span>
                    <span>إناث: {data.females}</span>
                    <span>·</span>
                    <span>أحياء: {data.living}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Family Branches Breakdown */}
        <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-sky-400" />
            <span>توزيع أفراد العائلة حسب الفروع</span>
          </h3>

          <div className="space-y-3 pt-2">
            {stats.branches.map(branch => {
              const percentage = Math.round((branch.count / stats.total) * 100);

              return (
                <div key={branch.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{branch.name}</span>
                    <span className="font-mono text-sky-300 font-bold">
                      {branch.count} فرد ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-white/5">
                    <div
                      style={{ width: `${percentage}%` }}
                      className="h-full bg-gradient-to-r from-sky-400 to-cyan-400 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Marital Alliances & Kinship Summary */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 border border-white/10 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <HeartHandshake className="w-6 h-6 text-sky-400" />
          <div>
            <h3 className="text-lg font-bold text-white">
              أواصر المصاهرة والقرابة التاريخية
            </h3>
            <p className="text-xs text-slate-400">
              ملخص المصاهرات والصلات مع العوائل والقبائل الكريمة عبر الأجيال
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
          {detailedStats.alliances.map(alliance => (
            <div
              key={alliance.family}
              className="bg-slate-900/60 border border-white/10 rounded-2xl p-3.5 flex items-center justify-between gap-2"
            >
              <div>
                <span className="text-xs font-bold text-white block">{alliance.family}</span>
                <span className="text-[10px] text-slate-400">مصاهرات موثقة</span>
              </div>
              <span className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 text-sky-300 font-mono text-xs font-bold flex items-center justify-center">
                {alliance.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
