import React from 'react';
import { FamilyMember, FamilyStats } from '../types/family';
import { HeritageCrest } from './HeritageCrest';

interface PrintReportViewProps {
  members: FamilyMember[];
  stats: FamilyStats;
  memberMap: Map<string, FamilyMember>;
}

export const PrintReportView: React.FC<PrintReportViewProps> = ({ members, stats, memberMap }) => {
  const currentDate = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Group by generation
  const groupedByGen: Record<number, FamilyMember[]> = {};
  members.forEach(m => {
    const g = m.generation || 1;
    if (!groupedByGen[g]) groupedByGen[g] = [];
    groupedByGen[g].push(m);
  });

  const genKeys = Object.keys(groupedByGen).map(Number).sort((a, b) => a - b);

  return (
    <div className="hidden print:block p-8 bg-white text-black font-sans text-right" dir="rtl">
      {/* Official Header */}
      <div className="border-b-2 border-emerald-800 pb-6 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-950 mb-1">
            وثيقة وسجل شجرة عائلة البوحسون
          </h1>
          <p className="text-sm font-semibold text-emerald-800 mb-1">
            فخذ النواصر · آل جابر · قبيلة آل بوعينين الكريمة
          </p>
          <p className="text-xs text-gray-600">
            تاريخ التوثيق والطباعة: {currentDate}
          </p>
        </div>
        <div className="w-16 h-16">
          <HeritageCrest size={64} />
        </div>
      </div>

      {/* Summary Statistics Strip */}
      <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4 grid grid-cols-4 gap-4 text-center text-xs">
        <div>
          <span className="text-gray-500 block">إجمالي أفراد العائلة</span>
          <span className="text-base font-bold text-gray-900">{stats.total}</span>
        </div>
        <div>
          <span className="text-gray-500 block">الذكور / الإناث</span>
          <span className="text-base font-bold text-gray-900">{stats.males} ذكر / {stats.females} أنثى</span>
        </div>
        <div>
          <span className="text-gray-500 block">الأحياء / المتوفون</span>
          <span className="text-base font-bold text-gray-900">{stats.living} حي / {stats.deceased} متوفى</span>
        </div>
        <div>
          <span className="text-gray-500 block">عمق الأجيال</span>
          <span className="text-base font-bold text-gray-900">{stats.generationsCount} أجيال متعاقبة</span>
        </div>
      </div>

      {/* Generations Tables */}
      <div className="space-y-6">
        {genKeys.map(gen => {
          const genMembers = groupedByGen[gen];

          return (
            <div key={gen} className="break-inside-avoid mb-6">
              <h2 className="text-sm font-bold text-emerald-900 border-b border-emerald-600 pb-1 mb-2">
                الجيل {gen} ({genMembers.length} فرد)
              </h2>

              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-emerald-50 border-b border-gray-300 text-gray-700">
                    <th className="p-1.5 font-bold">الاسم الكامل</th>
                    <th className="p-1.5 font-bold">الشهرة</th>
                    <th className="p-1.5 font-bold">الأب</th>
                    <th className="p-1.5 font-bold">الفترة</th>
                    <th className="p-1.5 font-bold">الحالة</th>
                    <th className="p-1.5 font-bold">الفرع</th>
                    <th className="p-1.5 font-bold">الزوج / الزوجات</th>
                    <th className="p-1.5 font-bold">ملاحظات / سيرة</th>
                  </tr>
                </thead>
                <tbody>
                  {genMembers.map(m => {
                    const father = m.father_id ? memberMap.get(m.father_id) : null;
                    const isMale = m.gender === 'male';

                    return (
                      <tr key={m.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-1.5 font-semibold">{m.full_name}</td>
                        <td className="p-1.5 text-gray-600">{m.nickname || '-'}</td>
                        <td className="p-1.5 text-gray-700">{father ? father.full_name : 'الجد المؤسس'}</td>
                        <td className="p-1.5 text-gray-600 font-mono">
                          {m.birth_date} {m.death_date ? `- ${m.death_date}` : ''}
                        </td>
                        <td className="p-1.5 text-gray-700">{m.is_living ? 'حي' : 'متوفى'}</td>
                        <td className="p-1.5 text-gray-600">{m.branch || 'العام'}</td>
                        <td className="p-1.5 text-gray-700">{m.spouse_info || '-'}</td>
                        <td className="p-1.5 text-gray-600 max-w-xs truncate">
                          {isMale ? m.bio || '-' : m.children_summary ? `الأبناء: ${m.children_summary}` : m.notes || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* Footer stamp */}
      <div className="mt-12 pt-4 border-t border-gray-300 text-center text-xs text-gray-500 flex items-center justify-between">
        <span>شجرة عائلة البوحسون · فخذ النواصر · آل جابر · قبيلة آل بوعينين</span>
        <span>صفحة وثائقية معتمدة</span>
      </div>
    </div>
  );
};
