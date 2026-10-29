import React, { useState } from 'react';
import { ViewMode, FamilyMember } from './types/family';
import { useFamilyStorage } from './hooks/useFamilyStorage';
import { useAdminAuth } from './hooks/useAdminAuth';
import { Header } from './components/Header';
import { TreeView } from './components/TreeView';
import { LineagePathView } from './components/LineagePathView';
import { DirectoryView } from './components/DirectoryView';
import { StatisticsDashboard } from './components/StatisticsDashboard';
import { MemberDetailModal } from './components/MemberDetailModal';
import { MemberFormModal } from './components/MemberFormModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { PrintReportView } from './components/PrintReportView';
import { ExportTreeImageModal } from './components/ExportTreeImageModal';

export default function App() {
  const {
    members,
    memberMap,
    stats,
    isCloudConnected,
    cloudSyncStatus,
    isSeeding,
    seedDatabaseToCloud,
    addMember,
    updateMember,
    deleteMember,
    importJSON,
    resetToDefault,
    exportTypeScriptCode,
    getPaternalLineage,
    getChildren
  } = useFamilyStorage();

  const { isAdmin, currentUser, login, loginWithGoogle, logout } = useAdminAuth();

  const [currentView, setCurrentView] = useState<ViewMode>('tree');

  // Modals state
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isExportImageModalOpen, setIsExportImageModalOpen] = useState(false);

  // Quick switch to Lineage view with specific member selected
  const handleViewLineage = (member: FamilyMember) => {
    setCurrentView('lineage');
    setSelectedMember(null);
  };

  const handleOpenAddModal = () => {
    if (!isAdmin) {
      setIsLoginModalOpen(true);
      return;
    }
    setEditingMember(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (member: FamilyMember) => {
    if (!isAdmin) {
      setIsLoginModalOpen(true);
      return;
    }
    setEditingMember(member);
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (data: Omit<FamilyMember, 'id'>) => {
    if (!isAdmin) {
      setIsLoginModalOpen(true);
      return;
    }
    if (editingMember) {
      updateMember(editingMember.id, data);
    } else {
      addMember(data);
    }
    setIsFormModalOpen(false);
    setEditingMember(null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans selection:bg-sky-500/25 selection:text-sky-100 relative overflow-x-hidden">
      
      {/* Ambient Apple Cupertino Multi-Spectrum Luminous Auroras */}
      <div className="fixed top-[-10%] right-[15%] w-[550px] h-[550px] bg-sky-500/[0.04] rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] left-[10%] w-[600px] h-[600px] bg-indigo-500/[0.04] rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed top-1/3 left-1/4 w-[450px] h-[450px] bg-rose-500/[0.025] rounded-full blur-[130px] pointer-events-none -z-10" />
      <div className="fixed top-1/2 right-1/3 w-[400px] h-[400px] bg-amber-500/[0.025] rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Screen Interactive UI (Hidden during print) */}
      <div className="no-print flex flex-col flex-1">
        {/* Navigation Header */}
        <Header
          currentView={currentView}
          onViewChange={setCurrentView}
          onOpenAddModal={handleOpenAddModal}
          onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
          onPrint={handlePrint}
          onOpenExportImage={() => setIsExportImageModalOpen(true)}
          isAdmin={isAdmin}
          currentUser={currentUser}
          isCloudConnected={isCloudConnected}
          cloudSyncStatus={cloudSyncStatus}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onLogout={logout}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">
          {currentView === 'tree' && (
            <TreeView
              members={members}
              onSelectMember={(m) => setSelectedMember(m)}
              onOpenExportImage={() => setIsExportImageModalOpen(true)}
            />
          )}

          {currentView === 'lineage' && (
            <LineagePathView
              members={members}
              memberMap={memberMap}
              getPaternalLineage={getPaternalLineage}
              onSelectMember={(m) => setSelectedMember(m)}
            />
          )}

          {currentView === 'directory' && (
            <DirectoryView
              members={members}
              memberMap={memberMap}
              onSelectMember={(m) => setSelectedMember(m)}
              onViewLineage={handleViewLineage}
              onDelete={deleteMember}
              isAdmin={isAdmin}
            />
          )}

          {currentView === 'stats' && (
            <StatisticsDashboard
              stats={stats}
              members={members}
            />
          )}
        </main>

        {/* Global Footer */}
        <footer className="w-full border-t border-emerald-500/15 py-6 pb-20 md:pb-6 px-4 md:px-8 text-center text-xs text-slate-400 glass-panel">
          <div className="max-w-7xl 2xl:max-w-[1700px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-semibold text-slate-200">
                شجرة عائلة البوحسون
              </span>
              <span>· فخذ النواصر · آل جابر · قبيلة آل بوعينين</span>
            </div>

            <div className="text-slate-400 flex items-center gap-3 text-[11px]">
              <span>تطبيق الويب التفاعلي للتوثيق العائلي واستضافة GitHub Pages</span>
              <span>·</span>
              <button
                onClick={() => setIsAdminPanelOpen(true)}
                className="text-emerald-400 hover:underline"
              >
                لوحة الإدارة والنسخ
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Print Document View (Only active when printing) */}
      <PrintReportView
        members={members}
        stats={stats}
        memberMap={memberMap}
      />

      {/* Member Details Modal */}
      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onEdit={handleOpenEditModal}
          onDelete={deleteMember}
          onViewLineage={handleViewLineage}
          father={selectedMember.father_id ? memberMap.get(selectedMember.father_id) || null : null}
          childrenList={getChildren(selectedMember.id)}
          isAdmin={isAdmin}
          onRequireLogin={() => setIsLoginModalOpen(true)}
        />
      )}

      {/* Add / Edit Member CRUD Modal */}
      {isFormModalOpen && (
        <MemberFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingMember(null);
          }}
          onSubmit={handleFormSubmit}
          onDelete={deleteMember}
          initialData={editingMember}
          members={members}
        />
      )}

      {/* Admin, Backup, and GitHub Pages Panel */}
      {isAdminPanelOpen && (
        <AdminPanelModal
          isOpen={isAdminPanelOpen}
          onClose={() => setIsAdminPanelOpen(false)}
          members={members}
          onImportJSON={importJSON}
          onResetToDefault={resetToDefault}
          onExportTypeScriptCode={exportTypeScriptCode}
          onSeedDatabaseToCloud={seedDatabaseToCloud}
          isCloudConnected={isCloudConnected}
          isSeeding={isSeeding}
          currentUser={currentUser}
          isAdmin={isAdmin}
          onRequireLogin={() => setIsLoginModalOpen(true)}
          onLogout={logout}
        />
      )}

      {/* Admin Login Modal (Google Auth / saad) */}
      {isLoginModalOpen && (
        <AdminLoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLogin={login}
          onLoginWithGoogle={loginWithGoogle}
        />
      )}

      {/* Export as High-Resolution Image Modal */}
      {isExportImageModalOpen && (
        <ExportTreeImageModal
          isOpen={isExportImageModalOpen}
          onClose={() => setIsExportImageModalOpen(false)}
          members={members}
        />
      )}
    </div>
  );
}
