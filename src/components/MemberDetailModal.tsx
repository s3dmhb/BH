import React from 'react';
import { FamilyMember } from '../types/family';
import { HeritageCrest, FemaleHeritageBadge } from './HeritageCrest';
import { SubFamilyBadge } from './SubFamilyBadge';
import {
  X,
  Edit3,
  Trash2,
  GitFork,
  Calendar,
  Heart,
  Users2,
  FileText,
  ShieldAlert,
  Lock,
  Crown
} from 'lucide-react';

interface MemberDetailModalProps {
  member: FamilyMember | null;
  onClose: () => void;
  onEdit: (member: FamilyMember) => void;
  onDelete: (id: string) => void;
  onViewLineage: (member: FamilyMember) => void;
  father: FamilyMember | null;
  childrenList: FamilyMember[];
  isAdmin: boolean;
  onRequireLogin: () => void;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  member,
  onClose,
  onEdit,
  onDelete,
  onViewLineage,
  father,
  childrenList,
  isAdmin,
  onRequireLogin
}) => {
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  if (!member) return null;

  const isMale = member.gender === 'male';

  const handleConfirmDelete = () => {
    if (isAdmin) {
      onDelete(member.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Card */}
      <div className="relative w-full max-w-2xl max-h-[88dvh] overflow-y-auto glass-panel rounded-3xl p-5 sm:p-6 md:p-8 border border-emerald-500/30 shadow-2xl text-right">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 sm:top-5 sm:left-5 w-9 h-9 rounded-full glass-btn flex items-center justify-center text-slate-300 hover:text-white active:scale-95 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Member Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 border-b border-white/10 pb-6 mb-6">
          {/* Avatar or Badge */}
          <div className="shrink-0 relative">
            {isMale ? (
              member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={member.full_name}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-400/50 shadow-xl"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 border-2 border-emerald-400/40 flex items-center justify-center text-emerald-200 font-bold text-3xl shadow-xl">
                  {member.full_name.charAt(0)}
                </div>
              )
            ) : (
              /* Strictly NO photo for females */
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-950/70 to-rose-950/90 border-2 border-pink-500/40 flex items-center justify-center shadow-xl">
                <FemaleHeritageBadge size={48} />
              </div>
            )}
            <span className="absolute -bottom-2 -left-2 text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-900 border border-white/20 text-emerald-300">
              الجيل {member.generation || 1}
            </span>
          </div>

          {/* Titles & Status */}
          <div className="flex-1 text-center sm:text-right">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  member.is_living
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {member.is_living ? 'على قيد الحياة (حي يرزق)' : 'متوفى (رحمه الله)'}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-white/10">
                {member.branch || 'الفرع العام'}
              </span>
              <span className="text-xs font-mono text-slate-400">
                {isMale ? 'ذكر' : 'أنثى'}
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
              {member.full_name}
            </h2>

            {member.nickname && (
              <p className={`text-sm font-semibold ${isMale ? 'text-emerald-400' : 'text-pink-300'}`}>
                {member.nickname}
              </p>
            )}

            <div className="mt-2.5 flex justify-center sm:justify-start">
              <SubFamilyBadge member={member} size="md" />
            </div>
          </div>
        </div>

        {/* Detailed Metadata Grid */}
        <div className="space-y-4 text-xs md:text-sm text-slate-200">
          
          {/* Sub-Family Heritage & Clan Banner */}
          <div className="bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-emerald-950/40 p-3.5 sm:p-4 rounded-2xl border border-emerald-500/30 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3 shadow-md">
            <div>
              <span className="text-emerald-400 font-bold text-xs mb-1 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>الوسم والانتساب العائلي (فخذ النواصر - آل جابر):</span>
              </span>
              <p className="text-slate-300 text-xs leading-relaxed">
                ينتسب هذا الفرد المبارك إلى سلالة البوحسون ضمن فخذ النواصر وتفرعات آل جابر من قبيلة آل بوعينين الكريمة.
              </p>
            </div>
            <div className="shrink-0">
              <SubFamilyBadge member={member} size="md" />
            </div>
          </div>
          
          {/* Lifespan & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-white/5">
              <span className="text-slate-400 block text-[11px] mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>سنة الميلاد / العمر:</span>
              </span>
              <span className="font-semibold text-white">
                {member.birth_date ? `${member.birth_date} م` : 'غير مدون'}
              </span>
            </div>

            <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-white/5">
              <span className="text-slate-400 block text-[11px] mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>سنة الوفاة:</span>
              </span>
              <span className="font-semibold text-white">
                {member.death_date ? `${member.death_date} م` : member.is_living ? 'أطال الله في عمره' : 'غير مدون'}
              </span>
            </div>
          </div>

          {/* Father & Ancestry */}
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-4">
            <div>
              <span className="text-slate-400 block text-[11px] mb-1">نسب الأب:</span>
              <span className="font-bold text-white text-sm">
                {father ? father.full_name : 'الجد المؤسس (رأس هذا الفرع)'}
              </span>
            </div>
            <button
              onClick={() => {
                onClose();
                onViewLineage(member);
              }}
              className="glass-btn px-3 py-1.5 rounded-xl text-xs font-medium text-emerald-300 hover:text-white flex items-center gap-1 shrink-0"
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>استعراض سلسلة النسب</span>
            </button>
          </div>

          {/* Gender-specific information */}
          {isMale ? (
            <>
              {member.spouse_info && (
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-emerald-500/15">
                  <span className="text-emerald-400 font-semibold block text-xs mb-1.5 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5" />
                    <span>أسماء الزوجات والمصاهرات:</span>
                  </span>
                  <p className="text-slate-200 leading-relaxed">{member.spouse_info}</p>
                </div>
              )}

              {member.bio && (
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-emerald-500/15">
                  <span className="text-emerald-400 font-semibold block text-xs mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>السيرة الذاتية والنبذة التاريخية:</span>
                  </span>
                  <p className="text-slate-200 leading-relaxed whitespace-pre-line">{member.bio}</p>
                </div>
              )}
            </>
          ) : (
            <>
              {member.spouse_info && (
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-pink-500/15">
                  <span className="text-pink-300 font-semibold block text-xs mb-1.5 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5" />
                    <span>اسم الزوج:</span>
                  </span>
                  <p className="text-slate-200">{member.spouse_info}</p>
                </div>
              )}

              {member.children_summary && (
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-pink-500/15">
                  <span className="text-pink-300 font-semibold block text-xs mb-1.5 flex items-center gap-1.5">
                    <Users2 className="w-3.5 h-3.5" />
                    <span>أسماء الأبناء والبنات:</span>
                  </span>
                  <p className="text-slate-200 leading-relaxed">{member.children_summary}</p>
                </div>
              )}

              {member.notes && (
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-pink-500/15">
                  <span className="text-pink-300 font-semibold block text-xs mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>ملاحظات خاصة:</span>
                  </span>
                  <p className="text-slate-200 leading-relaxed whitespace-pre-line">{member.notes}</p>
                </div>
              )}
            </>
          )}

          {/* Children List in Database */}
          {childrenList.length > 0 && (
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5">
              <span className="text-slate-400 font-semibold block text-xs mb-2 flex items-center gap-1.5">
                <Users2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>الذرية المسجلة في الشجرة ({childrenList.length} فرد):</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {childrenList.map(c => (
                  <span
                    key={c.id}
                    className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/20 text-xs text-slate-200"
                  >
                    {c.full_name} ({c.gender === 'male' ? 'ابن' : 'ابنة'})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Box (In-UI, only for admin) */}
        {isAdmin && confirmDelete && (
          <div className="mt-6 p-4 rounded-2xl bg-rose-950/80 border-2 border-rose-500/50 text-right animate-in fade-in duration-150">
            <div className="flex items-start gap-3 mb-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-white mb-1">
                  تأكيد حذف سجل الفرد نهائياً
                </h4>
                <p className="text-xs text-rose-200 leading-relaxed">
                  هل أنت متأكد من حذف سجل <strong className="text-white underline">{member.full_name}</strong>؟
                  {childrenList.length > 0 && (
                    <span className="block mt-1 font-semibold text-amber-300">
                      تنبيه: هذا الفرد مسجل كأب لـ ({childrenList.length}) من الأبناء. سيتم نقل أبنائه إلى الجد السابق تلقائياً للحفاظ على تماسك الشجرة.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-rose-500/30">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                إلغاء التراجع
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-950/60"
              >
                <Trash2 className="w-4 h-4" />
                <span>نعم، حذف السجل الآن</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Action Buttons (CRUD) */}
        {!confirmDelete && (
          <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-t border-white/10">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!isAdmin) {
                    onClose();
                    onRequireLogin();
                  } else {
                    onClose();
                    onEdit(member);
                  }
                }}
                className="glass-btn px-4 py-2 rounded-xl text-xs font-semibold text-emerald-300 hover:text-white flex items-center gap-1.5"
              >
                {isAdmin ? <Edit3 className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
                <span>{isAdmin ? 'تعديل السجل' : 'تعديل (إذن المدير)'}</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-950/80 border border-rose-500/30 flex items-center gap-1.5 transition-colors"
                  title="حذف هذا السجل نهائياً"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>حذف السجل</span>
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
            >
              إغلاق
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
