import React, { useState, useEffect } from 'react';
import { FamilyMember, Gender } from '../types/family';
import { X, Save, User, UserPlus, Heart, Users2, FileText, Image, ShieldAlert, Trash2 } from 'lucide-react';

interface MemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<FamilyMember, 'id'>) => void;
  onDelete?: (id: string) => void;
  initialData?: FamilyMember | null;
  members: FamilyMember[];
}

export const MemberFormModal: React.FC<MemberFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialData,
  members
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(initialData);

  // Form State
  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [nickname, setNickname] = useState(initialData?.nickname || '');
  const [gender, setGender] = useState<Gender>(initialData?.gender || 'male');
  const [fatherId, setFatherId] = useState<string>(initialData?.father_id || '');
  const [birthDate, setBirthDate] = useState(initialData?.birth_date || '');
  const [deathDate, setDeathDate] = useState(initialData?.death_date || '');
  const [isLiving, setIsLiving] = useState(initialData ? initialData.is_living : true);
  const [branch, setBranch] = useState(initialData?.branch || 'الفرع الرئيسي');
  const [subFamily, setSubFamily] = useState<string>(initialData?.sub_family || 'auto');

  // Male-specific fields
  const [spouseInfo, setSpouseInfo] = useState(initialData?.spouse_info || '');
  const [bio, setBio] = useState(initialData?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatar_url || '');

  // Female-specific fields
  const [childrenSummary, setChildrenSummary] = useState(initialData?.children_summary || '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Eligible fathers list: all male members excluding self
  const eligibleFathers = members.filter(m => m.gender === 'male' && m.id !== initialData?.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage('يرجى إدخال الاسم الكامل للشخص.');
      return;
    }

    const payload: Omit<FamilyMember, 'id'> = {
      full_name: fullName.trim(),
      nickname: nickname.trim(),
      gender,
      father_id: fatherId.trim() ? fatherId : null,
      birth_date: birthDate.trim(),
      death_date: isLiving ? undefined : deathDate.trim() || undefined,
      is_living: isLiving,
      branch: branch.trim() || 'الفرع العام',
      sub_family: subFamily === 'auto' ? undefined : (subFamily.trim() || undefined),
      spouse_info: spouseInfo.trim() || undefined,
      // Strictly enforce male vs female fields
      ...(gender === 'male'
        ? {
            bio: bio.trim() || undefined,
            avatar_url: avatarUrl.trim() || undefined
          }
        : {
            children_summary: childrenSummary.trim() || undefined,
            notes: notes.trim() || undefined
          })
    };

    onSubmit(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[88dvh] overflow-y-auto glass-panel rounded-3xl p-5 sm:p-6 md:p-8 border border-emerald-500/30 shadow-2xl text-right">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 left-4 sm:top-5 sm:left-5 w-9 h-9 rounded-full glass-btn flex items-center justify-center text-slate-300 hover:text-white active:scale-95 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
            {isEditing ? <User className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {isEditing ? 'تعديل بيانات فرد في الشجرة' : 'إضافة فرد جديد إلى شجرة العائلة'}
            </h2>
            <p className="text-xs text-emerald-400">
              إدارة بيانات أنساب عائلة البوحسون وتوثيق السجلات
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs md:text-sm">
          
          {/* Gender Selector Toggle */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">الجنس:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`py-2.5 px-4 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all ${
                  gender === 'male'
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                    : 'bg-slate-900/60 text-slate-400 border-white/10 hover:border-emerald-500/30'
                }`}
              >
                <span>ذكر (رجل)</span>
              </button>

              <button
                type="button"
                onClick={() => setGender('female')}
                className={`py-2.5 px-4 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all ${
                  gender === 'female'
                    ? 'bg-rose-600 text-white border-pink-400 shadow-md'
                    : 'bg-slate-900/60 text-slate-400 border-white/10 hover:border-pink-500/30'
                }`}
              >
                <span>أنثى (امرأة - بدون صورة)</span>
              </button>
            </div>
          </div>

          {/* Full Name & Nickname */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                الاسم الكامل رباعياً: <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: محمد بن حسن بن محمد البوحسون"
                required
                className="w-full bg-slate-900/90 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                اسم الشهرة / اللقب (للبحث السريع):
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="مثال: الوجيه، أبو أحمد، النوخذة، المستشار"
                className="w-full bg-slate-900/90 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Father Selector & Branch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                نسب الأب (ربط السلالة الأبوية):
              </label>
              <select
                value={fatherId}
                onChange={(e) => setFatherId(e.target.value)}
                className="w-full bg-slate-900/90 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-400"
              >
                <option value="">-- الجد المؤسس (لا يوجد أب مسجل) --</option>
                {eligibleFathers.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.full_name} ({f.nickname || `الجيل ${f.generation}`})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                الفرع العائلي:
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="مثال: فرع محمد، فرع علي، فرع إبراهيم"
                className="w-full bg-slate-900/90 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                وسم العائلة الفرعية:
              </label>
              <select
                value={subFamily}
                onChange={(e) => setSubFamily(e.target.value)}
                className="w-full bg-slate-900/90 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-400"
              >
                <option value="auto">تلقائي (حسب شجرة النسب والفرع)</option>
                <option value="آل جابر">آل جابر (وسم ذهبي فاخر)</option>
                <option value="النواصر">النواصر (وسم زمردي فاخر)</option>
                <option value="آل جابر والنواصر">آل جابر والنواصر (الجامع)</option>
              </select>
            </div>
          </div>

          {/* Vital Status & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                الحالة الحياتية:
              </label>
              <div className="flex items-center gap-2 h-[42px] px-3 rounded-xl bg-slate-900/90 border border-emerald-500/30">
                <input
                  type="checkbox"
                  id="isLivingCheck"
                  checked={isLiving}
                  onChange={(e) => setIsLiving(e.target.checked)}
                  className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-400"
                />
                <label htmlFor="isLivingCheck" className="text-xs text-white cursor-pointer select-none">
                  على قيد الحياة
                </label>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                سنة الميلاد:
              </label>
              <input
                type="text"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                placeholder="مثال: 1965"
                className="w-full bg-slate-900/90 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                سنة الوفاة (إن كان متوفى):
              </label>
              <input
                type="text"
                disabled={isLiving}
                value={deathDate}
                onChange={(e) => setDeathDate(e.target.value)}
                placeholder={isLiving ? 'حي يرزق' : 'مثال: 2015'}
                className="w-full bg-slate-900/90 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Conditional Fields based on Gender */}
          {gender === 'male' ? (
            <div className="space-y-3 pt-2 border-t border-emerald-500/20">
              <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <User className="w-4 h-4" />
                <span>حقول خاصة بالذكور:</span>
              </h4>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  أسماء الزوجات والمصاهرات:
                </label>
                <input
                  type="text"
                  value={spouseInfo}
                  onChange={(e) => setSpouseInfo(e.target.value)}
                  placeholder="مثال: مريم بنت راشد آل بوعينين، نورة بنت عبد العزيز"
                  className="w-full bg-slate-900/90 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  السيرة الذاتية والنبذة التاريخية والوظيفة:
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="اكتب نبذة تاريخية، المؤهلات، الإنجازات، المناصب، الأعمال الخيرية..."
                  className="w-full bg-slate-900/90 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5 text-emerald-400" />
                  <span>رابط الصورة المصغرة (اختياري - للذكور فقط):</span>
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full bg-slate-900/90 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-mono text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2 border-t border-pink-500/20">
              <h4 className="text-xs font-bold text-pink-400 flex items-center gap-1.5">
                <Heart className="w-4 h-4" />
                <span>حقول خاصة بالإناث (محفوظة بالكامل بدون أي صورة):</span>
              </h4>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  اسم الزوج:
                </label>
                <input
                  type="text"
                  value={spouseInfo}
                  onChange={(e) => setSpouseInfo(e.target.value)}
                  placeholder="مثال: محمد بن علي آل بوعينين"
                  className="w-full bg-slate-900/90 border border-pink-500/30 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-pink-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ملخص أسماء الأبناء والبنات:
                </label>
                <input
                  type="text"
                  value={childrenSummary}
                  onChange={(e) => setChildrenSummary(e.target.value)}
                  placeholder="مثال: عبد الله، فهد، سارة، نورة"
                  className="w-full bg-slate-900/90 border border-pink-500/30 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-pink-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ملاحظات خاصة:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أعمال البر، الدور الاجتماعي والتربوي، مراجع النسب..."
                  className="w-full bg-slate-900/90 border border-pink-500/30 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-pink-400"
                />
              </div>
            </div>
          )}

          {/* Delete confirmation inline box */}
          {confirmDelete && initialData && onDelete && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-right animate-in fade-in duration-150">
              <p className="text-xs text-rose-200 font-semibold mb-2">
                هل أنت متأكد من حذف سجل "{initialData.full_name}" بشكل نهائي؟
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(initialData.id);
                    onClose();
                  }}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-rose-950/60"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>تأكيد الحذف</span>
                </button>
              </div>
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10">
            <div>
              {isEditing && initialData && onDelete && !confirmDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-950/80 border border-rose-500/30 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>حذف السجل</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                إلغاء
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-emerald-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/50"
              >
                <Save className="w-4 h-4" />
                <span>{isEditing ? 'حفظ التعديلات' : 'إضافة الفرد للشجرة'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
