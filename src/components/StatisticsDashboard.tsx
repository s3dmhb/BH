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
    <div className="w-full max-w-7xl 2xl:max-w-[1700px] mx-auto px-3 sm:px-6 py-5 pb-24 md:pb-10 space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 md:p-8 border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
        <div className="flex items-center gap-4">
          <HeritageCrest size={56} className="shrink-0 drop-shadow-sm" />
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              لوحة الإحصائيات والتحليلات الأسرية
            </h2>
            <p className="text-xs md:text-sm text-sky-800 font-semibold mt-0.5">
              شجرة عائلة البوحسون · فخذ النواصر · آل جابر · قبيلة آل بوعينين
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-100/90 px-4 py-2.5 rounded-2xl border border-slate-200">
          <span className="text-slate-500 font-medium">الجد المؤسس:</span>
          <span className="font-bold text-slate-900">{stats.patriarchName}</span>
        </div>
      </div>

      {/* KPI Cards Row (Tabular Figures) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Total Members */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span>إجمالي أفراد الشجرة</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-3xl md:text-4xl font-bold text-slate-900 font-mono tabular-nums mb-1">
            {stats.total}
          </div>
          <div className="text-[11px] text-sky-700 font-semibold flex items-center gap-1">
            <span>سجلات موثقة في قاعدة البيانات</span>
          </div>
        </div>

        {/* Living Members */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span>الأحياء (أطال الله أعمارهم)</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl md:text-4xl font-bold text-emerald-700 font-mono tabular-nums mb-1">
            {stats.living}
          </div>
          <div className="text-[11px] text-slate-600 flex items-center gap-1">
            <span>نسبة الأحياء: {livingPercent}% من العائلة</span>
          </div>
        </div>

        {/* Generational Depth */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span>عمق الأجيال المتعاقبة</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl md:text-4xl font-bold text-amber-700 font-mono tabular-nums mb-1">
            {stats.generationsCount}
          </div>
          <div className="text-[11px] text-slate-600 flex items-center gap-1">
            <span>أجيال متصلة من الجد المؤسس</span>
          </div>
        </div>

        {/* Branches Count */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span>الفروع الأسرية الكبرى</span>
            <GitBranch className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-3xl md:text-4xl font-bold text-sky-800 font-mono tabular-nums mb-1">
            {stats.branches.length}
          </div>
          <div className="text-[11px] text-slate-600 flex items-center gap-1">
            <span>فروع ممتدة وموثقة الأنساب</span>
          </div>
        </div>
      </div>

      {/* Demographic Breakdown & Vital Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Gender Breakdown */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-600" />
              <span>التوزيع الديموغرافي (الذكور والإناث)</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">{stats.total} فرد</span>
          </div>

          {/* Visual Dual Progress Bar */}
          <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200 p-0.5">
            <div
              style={{ width: `${malePercent}%` }}
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-r-full transition-all duration-500"
              title={`الذكور: ${stats.males} (${malePercent}%)`}
            />
            <div
              style={{ width: `${femalePercent}%` }}
              className="h-full bg-gradient-to-l from-rose-500 to-pink-600 rounded-l-full transition-all duration-500"
              title={`الإناث: ${stats.females} (${femalePercent}%)`}
            />
          </div>

          {/* Legend and Numbers */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3 text-right">
              <span className="text-xs text-sky-800 font-bold block mb-0.5">الذكور</span>
              <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {stats.males} <span className="text-xs font-normal text-slate-500">({malePercent}%)</span>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-right">
              <span className="text-xs text-rose-800 font-bold block mb-0.5">الإناث</span>
              <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {stats.females} <span className="text-xs font-normal text-slate-500">({femalePercent}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Vital Status (Living vs Deceased) */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <span>الحالة الحياتية (الأحياء والمتوفون)</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">{stats.total} فرد</span>
          </div>

          {/* Visual Dual Progress Bar */}
          <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200 p-0.5">
            <div
              style={{ width: `${livingPercent}%` }}
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-r-full transition-all duration-500"
              title={`الأحياء: ${stats.living} (${livingPercent}%)`}
            />
            <div
              style={{ width: `${deceasedPercent}%` }}
              className="h-full bg-slate-300 rounded-l-full transition-all duration-500"
              title={`المتوفون: ${stats.deceased} (${deceasedPercent}%)`}
            />
          </div>

          {/* Legend and Numbers */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-right">
              <span className="text-xs text-emerald-800 font-bold block mb-0.5">الأحياء</span>
              <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {stats.living} <span className="text-xs font-normal text-slate-500">({livingPercent}%)</span>
              </div>
            </div>

            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3 text-right">
              <span className="text-xs text-slate-700 font-bold block mb-0.5">المتوفون (رحمهم الله)</span>
              <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {stats.deceased} <span className="text-xs font-normal text-slate-500">({deceasedPercent}%)</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Sub-Families Lineage Distribution */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-slate-900">
              وسم وتوزيع العائلات الفرعية (البوحسون · النصف · الدرويش · الأزرق · آل جابر · النواصر)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            تصنيف تلقائي متصل بنسب وتفرعات عائلة البوحسون
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {/* Albuhasson Card */}
          <div className="bg-gradient-to-br from-sky-50/70 to-slate-50 rounded-2xl p-4 border border-sky-300 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-sky-600" />
                <span>عائلة البوحسون</span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full border border-sky-200">
                الأصل المعتمد
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-bold font-mono text-slate-900">
                {detailedStats.albuhassonCount}
              </span>
              <span className="text-xs font-bold text-sky-700 font-mono">
                {Math.round((detailedStats.albuhassonCount / (stats.total || 1)) * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
              سلالة وأبناء الجد المؤسس حسن بن محمد البوحسون.
            </p>
          </div>

          {/* Al-Nesf Card */}
          <div className="bg-gradient-to-br from-indigo-50/70 to-slate-50 rounded-2xl p-4 border border-indigo-300 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Gem className="w-4 h-4 text-indigo-600" />
                <span>عائلة النصف</span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full border border-indigo-200">
                وسم نيلي
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-bold font-mono text-slate-900">
                {detailedStats.alnesfCount}
              </span>
              <span className="text-xs font-bold text-indigo-700 font-mono">
                {Math.round((detailedStats.alnesfCount / (stats.total || 1)) * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
              تفرعات وأنساب عائلة النصف الكريمة من قبيلة آل بوعينين.
            </p>
          </div>

          {/* Al-Darwish Card */}
          <div className="bg-gradient-to-br from-amber-50/70 to-slate-50 rounded-2xl p-4 border border-amber-300 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-600" />
                <span>عائلة الدرويش</span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
                وسم نحاسي
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-bold font-mono text-slate-900">
                {detailedStats.aldarwishCount}
              </span>
              <span className="text-xs font-bold text-amber-800 font-mono">
                {Math.round((detailedStats.aldarwishCount / (stats.total || 1)) * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
              تفرعات وأنساب عائلة الدرويش الكريمة من قبيلة آل بوعينين.
            </p>
          </div>

          {/* Al-Azraq Card */}
          <div className="bg-gradient-to-br from-cyan-50/70 to-slate-50 rounded-2xl p-4 border border-cyan-300 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-cyan-900 flex items-center gap-1.5">
                <Waves className="w-4 h-4 text-cyan-600" />
                <span>عائلة الأزرق</span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full border border-cyan-200">
                وسم سماوي
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-bold font-mono text-slate-900">
                {detailedStats.alazraqCount}
              </span>
              <span className="text-xs font-bold text-cyan-700 font-mono">
                {Math.round((detailedStats.alazraqCount / (stats.total || 1)) * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
              تفرعات وأنساب عائلة الأزرق الكريمة من قبيلة آل بوعينين.
            </p>
          </div>

          {/* Al-Jaber Card */}
          <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/50 rounded-2xl p-4 border border-amber-300 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-600" />
                <span>تفرعات آل جابر</span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
                وسم ذهبي
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-bold font-mono text-slate-900">
                {detailedStats.jaberCount}
              </span>
              <span className="text-xs font-bold text-amber-800 font-mono">
                {Math.round((detailedStats.jaberCount / (stats.total || 1)) * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
              أفراد العائلة المنتسبون عبر فروع آل جابر ومحمد وعلي البوحسون.
            </p>
          </div>

          {/* Al-Nawasir Card */}
          <div className="bg-gradient-to-br from-teal-50/70 to-slate-50 rounded-2xl p-4 border border-teal-300 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-teal-600" />
                <span>فخذ النواصر</span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full border border-teal-200">
                وسم تركوازي
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-bold font-mono text-slate-900">
                {detailedStats.nawasirCount}
              </span>
              <span className="text-xs font-bold text-teal-700 font-mono">
                {Math.round((detailedStats.nawasirCount / (stats.total || 1)) * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
              أفراد العائلة المنتسبون عبر فروع النواصر وإبراهيم وناصر البوحسون.
            </p>
          </div>

          {/* Both/Founding Card */}
          <div className="bg-gradient-to-br from-slate-50 to-sky-50/50 rounded-2xl p-4 border border-slate-300 shadow-sm relative overflow-hidden sm:col-span-2 lg:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>النسب الجامع والمؤسس (آل جابر والنواصر)</span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full border border-slate-300">
                العمود الجامع
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-bold font-mono text-slate-900">
                {detailedStats.bothCount}
              </span>
              <span className="text-xs font-bold text-sky-800 font-mono">
                {Math.round((detailedStats.bothCount / (stats.total || 1)) * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
              الجد المؤسس والأصول الجامعة بين فخذ النواصر وتفرعات آل جابر وقبيلة آل بوعينين.
            </p>
          </div>
        </div>
      </div>

      {/* Generations & Branches Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Generational Breakdown */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-600" />
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
                    <span className="font-bold text-slate-800">
                      {titles[genNum] || `الجيل ${genNum}`}
                    </span>
                    <span className="font-mono text-sky-800 font-bold">
                      {data.total} فرد ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                    <div
                      style={{ width: `${percentage}%` }}
                      className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full"
                    />
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
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
        <div className="glass-panel rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-sky-600" />
            <span>توزيع أفراد العائلة حسب الفروع</span>
          </h3>

          <div className="space-y-3 pt-2">
            {stats.branches.map(branch => {
              const percentage = Math.round((branch.count / stats.total) * 100);

              return (
                <div key={branch.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{branch.name}</span>
                    <span className="font-mono text-sky-800 font-bold">
                      {branch.count} فرد ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                    <div
                      style={{ width: `${percentage}%` }}
                      className="h-full bg-gradient-to-r from-sky-500 to-teal-500 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Marital Alliances & Kinship Summary */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <HeartHandshake className="w-6 h-6 text-sky-600" />
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              أواصر المصاهرة والقرابة التاريخية
            </h3>
            <p className="text-xs text-slate-500">
              ملخص المصاهرات والصلات مع العوائل والقبائل الكريمة عبر الأجيال
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
          {detailedStats.alliances.map(alliance => (
            <div
              key={alliance.family}
              className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-2 shadow-xs"
            >
              <div>
                <span className="text-xs font-bold text-slate-900 block">{alliance.family}</span>
                <span className="text-[10px] text-slate-500">مصاهرات موثقة</span>
              </div>
              <span className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 font-mono text-xs font-bold flex items-center justify-center">
                {alliance.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
