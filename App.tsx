import React, { useState, useMemo, useEffect } from 'react';
import { PageId, RoleMode, SaleEntry, Seller, SystemConfig } from './types';
import { dataService } from './services/dataService';
import {
  computeStoreKpis,
  computeTeamKpis,
  computeSellerPerformances,
  computeWeeklyBreakdown,
  generateSmartAlerts,
} from './utils/calculations';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { MobileNav } from './components/Layout/MobileNav';
import { ExecutiveDashboard } from './components/Dashboard/ExecutiveDashboard';
import { TeamDashboard } from './components/Team/TeamDashboard';
import { SellersDashboard } from './components/Sellers/SellersDashboard';
import { StoreDashboard } from './components/Store/StoreDashboard';
import { EntriesManager } from './components/Entries/EntriesManager';
import { GoalsDashboard } from './components/Goals/GoalsDashboard';
import { AnalyticsDashboard } from './components/Analytics/AnalyticsDashboard';
import { SettingsView } from './components/Settings/SettingsView';
import { TodayModal } from './components/Today/TodayModal';
import { GoogleSheetsSyncModal } from './components/Settings/GoogleSheetsSyncModal';
import { Modal } from './components/Common/Modal';
import { formatCurrency } from './utils/formatters';

export function App() {
  // Navigation & Access State
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [roleMode, setRoleMode] = useState<RoleMode>('guilherme');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals State
  const [isNewEntryModalOpen, setIsNewEntryModalOpen] = useState(false);
  const [isTodayModalOpen, setIsTodayModalOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  // Data Store State
  const [entries, setEntries] = useState<SaleEntry[]>(() => dataService.getEntries());
  const [config, setConfig] = useState<SystemConfig>(() => dataService.getConfig());
  const [sellers, setSellers] = useState<Seller[]>(() => dataService.getSellers());
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => dataService.getLastSyncTime());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Quick New Entry Form State (for Header / Sidebar button)
  const [quickEntryData, setQuickEntryData] = useState({
    data: '2026-09-24',
    vendedor: 'Arnaldo',
    faturamento: '',
    numVendas: '',
    observacao: '',
  });

  // Calculate live ticket in modal
  const liveTicket = useMemo(() => {
    const fat = parseFloat(quickEntryData.faturamento) || 0;
    const ven = parseInt(quickEntryData.numVendas, 10) || 0;
    if (ven <= 0) return 0;
    return Number((fat / ven).toFixed(2));
  }, [quickEntryData.faturamento, quickEntryData.numVendas]);

  // Derived Business Computations
  const activeSellers = useMemo(() => sellers.filter((s) => s.ativo), [sellers]);

  const storeKpis = useMemo(() => {
    return computeStoreKpis(entries, config);
  }, [entries, config]);

  const teamKpis = useMemo(() => {
    // Only calculate for sales reps (Alessandra, Felipe, Arnaldo)
    const teamEntries = entries.filter((e) =>
      ['alessandra', 'felipe', 'arnaldo'].includes(e.vendedor.toLowerCase())
    );
    return computeTeamKpis(teamEntries, config, 3);
  }, [entries, config]);

  const sellerPerformances = useMemo(() => {
    return computeSellerPerformances(entries, sellers, config);
  }, [entries, sellers, config]);

  const weeklyBreakdown = useMemo(() => {
    return computeWeeklyBreakdown(entries, config, 'loja');
  }, [entries, config]);

  const smartAlerts = useMemo(() => {
    return generateSmartAlerts(storeKpis, teamKpis, weeklyBreakdown);
  }, [storeKpis, teamKpis, weeklyBreakdown]);

  // Handlers
  const handleRefreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const freshEntries = dataService.getEntries();
      const freshConfig = dataService.getConfig();
      const freshSellers = dataService.getSellers();
      setEntries([...freshEntries]);
      setConfig({ ...freshConfig });
      setSellers([...freshSellers]);
      setLastSyncTime(dataService.touchLastSync());
      setIsRefreshing(false);
    }, 400);
  };

  const handleAddEntry = (entryData: Omit<SaleEntry, 'id' | 'ticketMedio' | 'createdAt'>) => {
    dataService.addEntry(entryData);
    setEntries(dataService.getEntries());
    setLastSyncTime(dataService.getLastSyncTime());
  };

  const handleUpdateEntry = (id: string, partial: Partial<SaleEntry>) => {
    dataService.updateEntry(id, partial);
    setEntries(dataService.getEntries());
    setLastSyncTime(dataService.getLastSyncTime());
  };

  const handleDeleteEntry = (id: string) => {
    dataService.deleteEntry(id);
    setEntries(dataService.getEntries());
    setLastSyncTime(dataService.getLastSyncTime());
  };

  const handleSaveConfig = (newConfig: SystemConfig) => {
    dataService.saveConfig(newConfig);
    setConfig(newConfig);
    setLastSyncTime(dataService.getLastSyncTime());
  };

  const handleSaveSellers = (newSellers: Seller[]) => {
    dataService.saveSellers(newSellers);
    setSellers(newSellers);
    setLastSyncTime(dataService.getLastSyncTime());
  };

  const handleResetDemo = () => {
    dataService.resetToDemo();
    setEntries(dataService.getEntries());
    setConfig(dataService.getConfig());
    setSellers(dataService.getSellers());
    setLastSyncTime(dataService.getLastSyncTime());
  };

  const handleClearEntries = () => {
    dataService.clearAllEntries();
    setEntries([]);
    setLastSyncTime(dataService.getLastSyncTime());
  };

  const handleQuickEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fat = parseFloat(quickEntryData.faturamento);
    const ven = parseInt(quickEntryData.numVendas, 10);
    if (isNaN(fat) || isNaN(ven) || ven <= 0) return;

    handleAddEntry({
      data: quickEntryData.data,
      vendedor: quickEntryData.vendedor,
      faturamento: fat,
      numVendas: ven,
      observacao: quickEntryData.observacao,
      origem: 'manual',
    });

    setIsNewEntryModalOpen(false);
    setQuickEntryData({
      data: '2026-09-24',
      vendedor: sellers[0]?.nome || 'Arnaldo',
      faturamento: '',
      numVendas: '',
      observacao: '',
    });
  };

  // Section 45 Test filler
  const fillSection45Test = () => {
    setQuickEntryData({
      data: '2026-09-24',
      vendedor: 'Arnaldo',
      faturamento: '12568.30',
      numVendas: '100',
      observacao: 'Validação oficial Seção 45 (Ticket esperado: R$ 125,68)',
    });
  };

  // Render Active Page
  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <ExecutiveDashboard
            storeKpis={storeKpis}
            teamKpis={teamKpis}
            weeklyBreakdown={weeklyBreakdown}
            smartAlerts={smartAlerts}
            entries={entries}
            config={config}
            onNavigateTo={setCurrentPage}
            onOpenNewEntry={() => setIsNewEntryModalOpen(true)}
          />
        );

      case 'equipe':
        return (
          <TeamDashboard
            teamKpis={teamKpis}
            config={config}
            entries={entries}
            onOpenNewEntry={() => setIsNewEntryModalOpen(true)}
          />
        );

      case 'vendedores':
        return (
          <SellersDashboard
            sellers={sellers}
            performances={sellerPerformances}
            entries={entries}
            config={config}
            onOpenNewEntry={() => setIsNewEntryModalOpen(true)}
          />
        );

      case 'loja':
        return (
          <StoreDashboard
            storeKpis={storeKpis}
            config={config}
            entries={entries}
            onOpenNewEntry={() => setIsNewEntryModalOpen(true)}
          />
        );

      case 'lancamentos':
        return (
          <EntriesManager
            entries={entries}
            sellers={sellers}
            onAddEntry={handleAddEntry}
            onUpdateEntry={handleUpdateEntry}
            onDeleteEntry={handleDeleteEntry}
            onRefresh={handleRefreshData}
          />
        );

      case 'metas':
        return (
          <GoalsDashboard
            storeKpis={storeKpis}
            teamKpis={teamKpis}
            sellerPerformances={sellerPerformances}
            config={config}
            entries={entries}
          />
        );

      case 'analises':
        return (
          <AnalyticsDashboard
            entries={entries}
            config={config}
            storeKpis={storeKpis}
            teamKpis={teamKpis}
          />
        );

      case 'configuracoes':
        return (
          <SettingsView
            config={config}
            sellers={sellers}
            onSaveConfig={handleSaveConfig}
            onSaveSellers={handleSaveSellers}
            onResetDemo={handleResetDemo}
            onClearEntries={handleClearEntries}
            onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col antialiased selection:bg-[#35C759]/30 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        roleMode={roleMode}
        onRoleModeChange={setRoleMode}
        onOpenNewEntry={() => setIsNewEntryModalOpen(true)}
        onRefreshData={handleRefreshData}
        isRefreshing={isRefreshing}
        lastSyncTime={lastSyncTime}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen">
        {/* Top Header */}
        <Header
          currentPage={currentPage}
          roleMode={roleMode}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenNewEntry={() => setIsNewEntryModalOpen(true)}
          onOpenTodayModal={() => setIsTodayModalOpen(true)}
          onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
          onRefreshData={handleRefreshData}
          isRefreshing={isRefreshing}
          diasDecorridos={config.diasDecorridos}
          diasOperacionais={config.diasOperacionais}
          mesReferenciaNome={config.nomeMesReferencia}
        />

        {/* Page Container */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          {renderPageContent()}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onOpenNewEntry={() => setIsNewEntryModalOpen(true)}
          roleMode={roleMode}
        />
      </div>

      {/* MODAL: NOVO LANÇAMENTO RÁPIDO (Seção 34, 35 & 45) */}
      <Modal
        isOpen={isNewEntryModalOpen}
        onClose={() => setIsNewEntryModalOpen(false)}
        title="Novo Lançamento Comercial"
        subtitle="Informe a data, vendedor, faturamento e número de vendas."
      >
        <form onSubmit={handleQuickEntrySubmit} className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={fillSection45Test}
              className="text-[11px] font-semibold text-[#F5C542] hover:underline"
            >
              Preencher Teste Seção 45 (Arnaldo 24/09: R$ 12.568,30 / 100)
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#8A8A8A] block mb-1">
              Data
            </label>
            <input
              type="date"
              required
              value={quickEntryData.data}
              onChange={(e) =>
                setQuickEntryData({ ...quickEntryData, data: e.target.value })
              }
              className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#35C759]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#8A8A8A] block mb-1">
              Vendedor
            </label>
            <select
              value={quickEntryData.vendedor}
              onChange={(e) =>
                setQuickEntryData({ ...quickEntryData, vendedor: e.target.value })
              }
              className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#35C759]"
            >
              {sellers.map((s) => (
                <option key={s.id} value={s.nome}>
                  {s.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#8A8A8A] block mb-1">
                Faturamento (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="Ex: 12568.30"
                value={quickEntryData.faturamento}
                onChange={(e) =>
                  setQuickEntryData({ ...quickEntryData, faturamento: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-[#35C759]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#8A8A8A] block mb-1">
                Número de Vendas
              </label>
              <input
                type="number"
                min="1"
                required
                placeholder="Ex: 100"
                value={quickEntryData.numVendas}
                onChange={(e) =>
                  setQuickEntryData({ ...quickEntryData, numVendas: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-[#35C759]"
              />
            </div>
          </div>

          {/* Section 35: Live Ticket Médio calculation display */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-[#35C759]/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] block">
                Ticket Médio (Automático)
              </span>
              <span className="text-xl font-extrabold text-[#35C759] font-mono">
                {formatCurrency(liveTicket)}
              </span>
            </div>
            <span className="text-xs text-[#8A8A8A]">
              Calculado automaticamente
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#8A8A8A] block mb-1">
              Observação (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Venda de plantas ornamentais e vasos"
              value={quickEntryData.observacao}
              onChange={(e) =>
                setQuickEntryData({ ...quickEntryData, observacao: e.target.value })
              }
              className="w-full px-3.5 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#35C759]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={() => setIsNewEntryModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8A8A8A] hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#35C759] hover:bg-[#2db34e] text-black text-xs font-bold transition-all shadow-[0_0_15px_rgba(53,199,89,0.3)]"
            >
              SALVAR LANÇAMENTO
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: VISÃO HOJE (#33) */}
      <TodayModal
        isOpen={isTodayModalOpen}
        onClose={() => setIsTodayModalOpen(false)}
        entries={entries}
        config={config}
        storeKpis={storeKpis}
        targetDate="2026-09-24"
      />

      {/* MODAL: GOOGLE SHEETS SYNC (#36 & 37) */}
      <GoogleSheetsSyncModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        config={config}
        onConfigChange={handleSaveConfig}
        onRefreshData={handleRefreshData}
      />
    </div>
  );
}
export default App;
