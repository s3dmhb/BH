import { FamilyMember } from '../types/family';

/**
 * Export family members as formatted JSON file
 */
export function exportToJSON(members: FamilyMember[], filename = 'albuhasson_family_tree.json') {
  const dataStr = JSON.stringify(members, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
  triggerDownload(blob, filename);
}

/**
 * Export family members as Excel-compatible CSV with UTF-8 BOM
 */
export function exportToCSV(members: FamilyMember[], filename = 'albuhasson_family_tree.csv') {
  const memberMap = new Map<string, FamilyMember>();
  members.forEach(m => memberMap.set(m.id, m));

  const headers = [
    'المعرف',
    'الاسم الكامل',
    'اسم الشهرة',
    'الجنس',
    'اسم الأب',
    'سنة الميلاد',
    'سنة الوفاة',
    'الحالة',
    'الجيل',
    'الفرع',
    'الزوج / الزوجات',
    'السيرة الذاتية (للذكور)',
    'ملخص الأبناء (للإناث)',
    'ملاحظات خاصة (للإناث)'
  ];

  const escapeCSV = (val?: string | number | null) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = members.map(m => {
    const father = m.father_id ? memberMap.get(m.father_id)?.full_name || 'غير محدد' : 'الجد المؤسس';
    const status = m.is_living ? 'حي يرزق' : 'رحمه الله';
    const gender = m.gender === 'male' ? 'ذكر' : 'أنثى';

    return [
      escapeCSV(m.id),
      escapeCSV(m.full_name),
      escapeCSV(m.nickname),
      escapeCSV(gender),
      escapeCSV(father),
      escapeCSV(m.birth_date),
      escapeCSV(m.death_date || ''),
      escapeCSV(status),
      escapeCSV(m.generation || 1),
      escapeCSV(m.branch || ''),
      escapeCSV(m.spouse_info || ''),
      escapeCSV(m.gender === 'male' ? m.bio || '' : ''),
      escapeCSV(m.gender === 'female' ? m.children_summary || '' : ''),
      escapeCSV(m.gender === 'female' ? m.notes || '' : '')
    ].join(',');
  });

  // Prepend UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

/**
 * Helper to trigger browser download of a Blob
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a standalone, self-contained single HTML file for instant GitHub Pages deployment
 */
export function generateStandaloneHTML(members: FamilyMember[]): string {
  const serializedData = JSON.stringify(members);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>شجرة عائلة البوحسون - GitHub Pages Edition</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Cairo', system-ui, sans-serif; background-color: #03130c; color: #f1f5f9; }
    .glass { background: rgba(4, 30, 18, 0.65); backdrop-filter: blur(16px); border: 1px solid rgba(16, 185, 129, 0.2); }
    .glass-card { background: rgba(6, 44, 26, 0.55); backdrop-filter: blur(12px); border: 1px solid rgba(52, 211, 153, 0.18); transition: all 0.2s; }
    .glass-card:hover { transform: translateY(-2px); border-color: rgba(52, 211, 153, 0.4); }
  </style>
</head>
<body class="min-h-screen p-4 md:p-8">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <header class="glass rounded-2xl p-6 mb-8 text-center shadow-2xl relative">
      <div class="absolute top-4 left-4 flex items-center gap-2">
        <button id="adminLoginBtn" class="text-xs px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900 transition-colors">
          دخول المدير (saad)
        </button>
        <button id="addMemberBtn" class="hidden text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-colors">
          + إضافة فرد
        </button>
      </div>

      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-2xl font-bold mb-3 shadow-inner">
        ب
      </div>
      <h1 class="text-3xl md:text-4xl font-bold text-white tracking-wide mb-2">شجرة عائلة البوحسون</h1>
      <p class="text-emerald-400 font-medium text-sm md:text-base">فخذ النواصر · آل جابر · قبيلة آل بوعينين</p>
      <div class="mt-4 flex flex-wrap justify-center gap-3 text-xs text-slate-300">
        <span class="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/20">نسخة جاهزة ومستضافة على GitHub Pages</span>
        <span class="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/20" id="totalMembersBadge">جاري التحميل...</span>
      </div>
    </header>

    <!-- Search Bar -->
    <div class="glass rounded-xl p-4 mb-6">
      <input type="text" id="searchInput" placeholder="ابحث بالاسم الكامل أو اسم الشهرة (مثال: الوجيه، أبو حسن، النوخذة)..." 
        class="w-full bg-slate-900/80 border border-emerald-500/30 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 text-sm">
    </div>

    <!-- Cards Grid -->
    <div id="membersGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Injected via JavaScript -->
    </div>
  </div>

  <!-- Admin Login Modal -->
  <div id="loginModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="glass max-w-sm w-full p-6 rounded-2xl border border-emerald-500/30 text-right">
      <h3 class="text-lg font-bold text-white mb-2">تسجيل دخول المدير</h3>
      <p class="text-xs text-emerald-400 mb-4">صلاحيات إدارة وتعديل أفراد العائلة</p>
      <input type="text" id="loginUser" placeholder="اسم المستخدم (saad)" class="w-full bg-slate-900 border border-emerald-500/30 rounded-lg p-2.5 text-xs text-white mb-2.5">
      <input type="password" id="loginPass" placeholder="كلمة المرور (33740)" class="w-full bg-slate-900 border border-emerald-500/30 rounded-lg p-2.5 text-xs text-white mb-4">
      <div id="loginError" class="text-rose-400 text-xs mb-3 hidden">بيانات الدخول غير صحيحة.</div>
      <div class="flex gap-2">
        <button id="doLoginBtn" class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs">تسجيل الدخول</button>
        <button id="closeLoginBtn" class="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-xs">إلغاء</button>
      </div>
    </div>
  </div>

  <script>
    let members = ${serializedData};
    const saved = localStorage.getItem('albuhasson_family_tree_v1');
    if (saved) {
      try { members = JSON.parse(saved); } catch(e){}
    }
    let isAdmin = localStorage.getItem('albuhasson_admin_auth_v1') === 'true';

    const grid = document.getElementById('membersGrid');
    const searchInput = document.getElementById('searchInput');
    const badge = document.getElementById('totalMembersBadge');
    const adminBtn = document.getElementById('adminLoginBtn');
    const addBtn = document.getElementById('addMemberBtn');
    const loginModal = document.getElementById('loginModal');

    function updateAdminUI() {
      if (isAdmin) {
        adminBtn.textContent = 'خروج المدير (سعد)';
        adminBtn.className = 'text-xs px-3 py-1.5 rounded-lg bg-amber-950 border border-amber-500/30 text-amber-300 hover:bg-amber-900';
        addBtn.classList.remove('hidden');
      } else {
        adminBtn.textContent = 'دخول المدير (saad)';
        adminBtn.className = 'text-xs px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900';
        addBtn.classList.add('hidden');
      }
    }
    updateAdminUI();

    adminBtn.onclick = () => {
      if (isAdmin) {
        isAdmin = false;
        localStorage.removeItem('albuhasson_admin_auth_v1');
        updateAdminUI();
        render(members);
      } else {
        loginModal.classList.remove('hidden');
      }
    };
    document.getElementById('closeLoginBtn').onclick = () => loginModal.classList.add('hidden');
    document.getElementById('doLoginBtn').onclick = () => {
      const u = document.getElementById('loginUser').value.trim().toLowerCase();
      const p = document.getElementById('loginPass').value.trim();
      const err = document.getElementById('loginError');
      if (u === 'saad' && p === '33740') {
        isAdmin = true;
        localStorage.setItem('albuhasson_admin_auth_v1', 'true');
        loginModal.classList.add('hidden');
        err.classList.add('hidden');
        updateAdminUI();
        render(members);
      } else {
        err.classList.remove('hidden');
      }
    };

    addBtn.onclick = () => {
      if (!isAdmin) return alert('يتطلب تسجيل دخول المدير.');
      const name = prompt('أدخل الاسم الكامل للفرد:');
      if (!name) return;
      const nick = prompt('اسم الشهرة / اللقب:') || '';
      const gender = confirm('هل الفرد ذكر؟ (موافق = ذكر / إلغاء = أنثى)') ? 'male' : 'female';
      const newM = {
        id: 'albuhasson-' + Date.now(),
        full_name: name,
        nickname: nick,
        gender: gender,
        father_id: null,
        birth_date: prompt('سنة الميلاد (مثال 1980):') || '',
        is_living: true,
        branch: 'الفرع العام',
        generation: 5
      };
      members.push(newM);
      localStorage.setItem('albuhasson_family_tree_v1', JSON.stringify(members));
      render(members);
    };

    badge.textContent = 'إجمالي الأفراد: ' + members.length;

    function render(list) {
      grid.innerHTML = '';
      badge.textContent = 'إجمالي الأفراد: ' + members.length;
      if (list.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12 text-slate-400">لا توجد نتائج مطابقة للبحث.</div>';
        return;
      }
      list.forEach(m => {
        const isMale = m.gender === 'male';
        const card = document.createElement('div');
        card.className = 'glass-card rounded-xl p-5 flex flex-col justify-between';
        
        let details = '';
        if (isMale) {
          details = \`
            <div class="text-xs text-emerald-300/80 mb-2">
              <span class="font-semibold text-slate-300">الزوجات:</span> \${m.spouse_info || 'غير مدون'}
            </div>
            \${m.bio ? \`<p class="text-xs text-slate-300 leading-relaxed border-t border-emerald-500/10 pt-2 line-clamp-3">\${m.bio}</p>\` : ''}
          \`;
        } else {
          details = \`
            <div class="text-xs text-pink-300/80 mb-1">
              <span class="font-semibold text-slate-300">الزوج:</span> \${m.spouse_info || 'غير مدون'}
            </div>
            <div class="text-xs text-slate-300 mb-2">
              <span class="font-semibold text-slate-300">الأبناء:</span> \${m.children_summary || 'غير مدون'}
            </div>
            \${m.notes ? \`<p class="text-xs text-slate-400 leading-relaxed border-t border-pink-500/10 pt-2">\${m.notes}</p>\` : ''}
          \`;
        }

        let adminActions = '';
        if (isAdmin) {
          adminActions = \`
            <div class="pt-2 mt-2 border-t border-white/10 flex justify-end">
              <button onclick="deleteMember('\${m.id}')" class="text-[10px] text-rose-400 hover:underline">حذف السجل</button>
            </div>
          \`;
        }

        card.innerHTML = \`
          <div>
            <div class="flex items-start justify-between gap-2 mb-3">
              <div>
                <h3 class="text-base font-bold text-white">\${m.full_name}</h3>
                <span class="text-xs text-emerald-400 font-medium">\${m.nickname || ''}</span>
              </div>
              <span class="text-xs px-2 py-0.5 rounded-full \${m.is_living ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}">
                \${m.is_living ? 'حي يرزق' : 'رحمه الله'}
              </span>
            </div>
            <div class="text-xs text-slate-400 mb-3 flex items-center gap-2">
              <span>الجيل: \${m.generation || 1}</span>
              <span>·</span>
              <span>الميلاد: \${m.birth_date || '-'}</span>
              \${m.death_date ? \`<span>- الوفاة: \${m.death_date}</span>\` : ''}
            </div>
            \${details}
            \${adminActions}
          </div>
        \`;
        grid.appendChild(card);
      });
    }

    window.deleteMember = (id) => {
      if (!isAdmin) return alert('غير مصرح لك.');
      if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
        members = members.filter(m => m.id !== id);
        localStorage.setItem('albuhasson_family_tree_v1', JSON.stringify(members));
        render(members);
      }
    };

    render(members);

    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) return render(members);
      const filtered = members.filter(m => 
        (m.full_name && m.full_name.toLowerCase().includes(q)) ||
        (m.nickname && m.nickname.toLowerCase().includes(q)) ||
        (m.bio && m.bio.toLowerCase().includes(q))
      );
      render(filtered);
    });
  </script>
</body>
</html>`;
}

/**
 * Trigger download of the single standalone HTML ready for GitHub Pages
 */
export function exportStandaloneHTML(members: FamilyMember[], filename = 'index.html') {
  const content = generateStandaloneHTML(members);
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  triggerDownload(blob, filename);
}
