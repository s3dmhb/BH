import React, { useMemo } from 'react';
import { FamilyMember, FamilyStats } from '../types/family';
import { HeritageCrest } from './HeritageCrest';
import {
  Users,
  UserCheck,
  HeartHandshake,
  Layers,
  Sparkles,
  Award,
  GitBranch,
  Calendar,
  Percent
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

    members.forEach(m => {
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

    return { genCounts, alliances };
  }, [members]);

  const malePercent = Math.round((stats.males / (stats.total || 1)) * 100);
  const femalePercent = 100 - malePercent;
  const livingPercent = Math.round((stats.living / (stats.total || 1)) * 100);
  const deceasedPercent = 100 - livingPercent;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 border border-emerald-500/25 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <HeritageCrest size={56} className="shrink-0 drop-shadow-md" />
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              لوحة الإحصائيات والتحليلات الأسرية
            </h2>
            <p className="text-xs md:text-sm text-emerald-400 mt-0.5">
              شجرة عائلة البوحسون · فخذ النواصر · آل جابر · قبيلة آل بوعينين
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/80 px-4 py-2.5 rounded-2xl border border-emerald-500/20">
          <span className="text-slate-400">الجد المؤسس:</span>
          <span className="font-bold text-white">{stats.patriarchName}</span>
        </div>
      </div>

      {/* KPI Cards Row (Tabular Figures) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Total Members */}
        <div className="glass-panel rounded-2xl p-5 border border-emerald-500/20 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>إجمالي أفراد الشجرة</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl md:text-4xl font-bold text-white font-mono tabular-nums mb-1">
            {stats.total}
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <span>سجلات موثقة في قاعدة البيانات</span>
          </div>
        </div>

        {/* Living Members */}
        <div className="glass-panel rounded-2xl p-5 border border-emerald-500/20 shadow-lg">
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
        <div className="glass-panel rounded-2xl p-5 border border-emerald-500/20 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>عمق الأجيال المتعاقبة</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl md:text-4xl font-bold text-amber-300 font-mono tabular-nums mb-1">
            {stats.generationsCount}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span>أجيال متصلة من الجد المؤسس</span>
          </div>
        </div>

        {/* Branches Count */}
        <div className="glass-panel rounded-2xl p-5 border border-emerald-500/20 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>الفروع الأسرية الكبرى</span>
            <GitBranch className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl md:text-4xl font-bold text-teal-300 font-mono tabular-nums mb-1">
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
        <div className="glass-panel rounded-3xl p-6 border border-emerald-500/20 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <span>التوزيع الديموغرافي (الذكور والإناث)</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">{stats.total} فرد</span>
          </div>

          {/* Visual Dual Progress Bar */}
          <div className="w-full h-4 rounded-full bg-slate-900 overflow-hidden flex border border-white/10 p-0.5">
            <div
              style={{ width: `${malePercent}%` }}
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-r-full transition-all duration-500"
              title={`الذكور: ${stats.males} (${malePercent}%)`}
            />
            <div
              style={{ width: `${femalePercent}%` }}
              className="h-full bg-gradient-to-l from-rose-600 to-pink-400 rounded-l-full transition-all duration-500"
              title={`الإناث: ${stats.females} (${femalePercent}%)`}
            />
          </div>

          {/* Legend and Numbers */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-2xl p-3 text-right">
              <span className="text-xs text-emerald-400 font-semibold block mb-0.5">الذكور</span>
              <div className="text-2xl font-bold text-white font-mono tabular-nums">
                {stats.males} <span className="text-xs font-normal text-slate-400">({malePercent}%)</span>
              </div>
            </div>

            <div className="bg-rose-950/40 border border-pink-500/20 rounded-2xl p-3 text-right">
              <span className="text-xs text-pink-400 font-semibold block mb-0.5">الإناث</span>
              <div className="text-2xl font-bold text-white font-mono tabular-nums">
                {stats.females} <span className="text-xs font-normal text-slate-400">({femalePercent}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Vital Status (Living vs Deceased) */}
        <div className="glass-panel rounded-3xl p-6 border border-emerald-500/20 shadow-xl space-y-4">
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
            <div className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-3 text-right">
              <span className="text-xs text-emerald-300 font-semibold block mb-0.5">الأحياء</span>
              <div className="text-2xl font-bold text-white font-mono tabular-nums">
                {stats.living} <span className="text-xs font-normal text-slate-400">({livingPercent}%)</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-3 text-right">
              <span className="text-xs text-slate-400 font-semibold block mb-0.5">المتوفون (رحمهم الله)</span>
              <div className="text-2xl font-bold text-slate-300 font-mono tabular-nums">
                {stats.deceased} <span className="text-xs font-normal text-slate-500">({deceasedPercent}%)</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Generations & Branches Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Generational Breakdown */}
        <div className="glass-panel rounded-3xl p-6 border border-emerald-500/20 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
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
                    <span className="font-mono text-emerald-400 font-bold">
                      {data.total} فرد ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-white/5">
                    <div
                      style={{ width: `${percentage}%` }}
                      className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full"
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
        <div className="glass-panel rounded-3xl p-6 border border-emerald-500/20 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-emerald-400" />
            <span>توزيع أفراد العائلة حسب الفروع</span>
          </h3>

          <div className="space-y-3 pt-2">
            {stats.branches.map(branch => {
              const percentage = Math.round((branch.count / stats.total) * 100);

              return (
                <div key={branch.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{branch.name}</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {branch.count} فرد ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-white/5">
                    <div
                      style={{ width: `${percentage}%` }}
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Marital Alliances & Kinship Summary */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 border border-emerald-500/25 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <HeartHandshake className="w-6 h-6 text-emerald-400" />
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
              className="bg-slate-900/70 border border-emerald-500/20 rounded-2xl p-3.5 flex items-center justify-between gap-2"
            >
              <div>
                <span className="text-xs font-bold text-white block">{alliance.family}</span>
                <span className="text-[10px] text-slate-400">مصاهرات موثقة</span>
              </div>
              <span className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold flex items-center justify-center">
                {alliance.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
