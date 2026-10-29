import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  QrCode,
  MessageSquare,
  FileText,
  Database,
  Download,
  Upload,
  FileSpreadsheet,
  HardDrive,
  RefreshCw,
  Trash2,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Server,
  Image as ImageIcon,
  Info,
  Check,
} from 'lucide-react';
import { api } from '../api/client';
import { Modal } from './Modal';
import type { SystemStatus, CompanyInfo, WhatsAppTemplates, StudioPolicies } from '../types';

type SectionTab = 'empresa' | 'mensagens' | 'backup' | 'import_export' | 'manutencao';

export const OtherSettingsTab: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<SectionTab>('empresa');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Estados dos Dados
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    trade_name: 'Ateliê Casa Luma',
    legal_name: 'Ateliê Casa Luma Decorações Artesanais',
    document: '',
    state_registration: '',
    phone: '(31) 98337-1642',
    email: 'contato@casaluma.com.br',
    address_line: '',
    city: 'Belo Horizonte',
    state: 'MG',
    zip_code: '',
    pix_key: '31983371642',
    pix_key_type: 'Celular',
    pix_bank: 'Nubank',
    pix_owner_name: 'Ateliê Casa Luma',
    logo_url: null,
  });

  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplates>({
    order_confirmation: 'Olá, {cliente}! 🌿\nSeu pedido #{pedido} no Ateliê Casa Luma foi confirmado no valor de {valor}.\nJá estamos preparando tudo com muito carinho!',
    pix_billing: 'Olá, {cliente}! ✨\nSegue a chave Pix para pagamento do seu pedido #{pedido}:\n🔑 Chave Pix ({tipo}): {chave_pix}\n🏦 Banco: {banco}\n👤 Titular: {titular}\n💰 Valor total: {valor}',
    shipping_notification: 'Olá, {cliente}! 📦✨\nSuas peças artesanais do Ateliê Casa Luma já foram enviadas!\nCódigo de rastreio: {rastreio}\nObrigada por apoiar o artesanato autoral!',
    follow_up: 'Olá, {cliente}! 🌸\nTudo bem? Suas peças chegaram com segurança? Adoraríamos ver como ficaram no seu ambiente! Se puder, marque nosso Instagram @ateliecasaluma 📸',
  });

  const [studioPolicies, setStudioPolicies] = useState<StudioPolicies>({
    production_cure_time: '3 a 5 dias úteis para cura natural do cimento e maturação das essências',
    care_instructions: 'Peças em cimento: limpar com pano seco ou levemente umedecido; não utilizar abrasivos. Velas: aparar o pavio a 5mm antes de cada queima e deixar a cera derreter até a borda na primeira queima.',
    warranty_terms: 'Garantia artesanal de 30 dias para eventuais defeitos de fabricação.',
  });

  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  // Estados de Upload de Logo
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Estados de Backup e Restauração
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreKeyword, setRestoreKeyword] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<any>(null);

  // Estados de Importação e Exportação
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [exportingResource, setExportingResource] = useState<string | null>(null);
  const [importResource, setImportResource] = useState<'products' | 'customers'>('products');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);

  // Estados de Manutenção
  const [cleaningImages, setCleaningImages] = useState(false);
  const [cleanImagesResult, setCleanImagesResult] = useState<any>(null);
  const [optimizingDb, setOptimizingDb] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<any>(null);

  // Estados do Modal de Zerar Dados de Teste
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmWord, setResetConfirmWord] = useState('');
  const [resetting, setResetting] = useState(false);

  // Carregar dados iniciais
  const loadInitialData = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [settingsData, statusData] = await Promise.all([
        api.getSettings(),
        api.getSystemStatus(),
      ]);

      if (settingsData.company_info) {
        setCompanyInfo((prev) => ({ ...prev, ...settingsData.company_info }));
      }
      if (settingsData.whatsapp_templates) {
        setWhatsappTemplates((prev) => ({ ...prev, ...settingsData.whatsapp_templates }));
      }
      if (settingsData.studio_policies) {
        setStudioPolicies((prev) => ({ ...prev, ...settingsData.studio_policies }));
      }
      setSystemStatus(statusData);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao carregar configurações do sistema.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  // --- Salvar Empresa e Pix ---
  const handleSaveCompanyInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSetting('company_info', companyInfo, 'Dados Oficiais do Ateliê');
      showToast('success', 'Dados oficiais da empresa e chave Pix salvos com sucesso!');
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao salvar dados da empresa.');
    } finally {
      setSaving(false);
    }
  };

  // Upload da Logo
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const res = await api.uploadLogo(file);
      setCompanyInfo((prev) => ({ ...prev, logo_url: res.logo_url }));
      showToast('success', 'Logomarca atualizada com sucesso!');
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao fazer upload da logomarca.');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  // --- Salvar Modelos WhatsApp ---
  const handleSaveTemplates = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSetting('whatsapp_templates', whatsappTemplates, 'Modelos de Mensagens WhatsApp');
      showToast('success', 'Modelos de mensagens do WhatsApp atualizados com sucesso!');
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao salvar modelos.');
    } finally {
      setSaving(false);
    }
  };

  // --- Salvar Políticas ---
  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSetting('studio_policies', studioPolicies, 'Políticas Padrão do Ateliê');
      showToast('success', 'Políticas do ateliê salvas com sucesso!');
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao salvar políticas.');
    } finally {
      setSaving(false);
    }
  };

  // --- Exportar Backup ZIP ---
  const handleExportBackup = async () => {
    try {
      await api.exportBackup();
      showToast('success', 'Download do backup iniciado com sucesso!');
    } catch (err: any) {
      showToast('error', err.message || 'Falha ao gerar arquivo de backup.');
    }
  };

  // --- Restaurar Backup ZIP ---
  const handleRestoreBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile) {
      alert('Selecione um arquivo .ZIP de backup.');
      return;
    }
    if (restoreKeyword.trim().toUpperCase() !== 'RESTAURAR') {
      alert('Digite exatamente a palavra RESTAURAR para autorizar a restauração.');
      return;
    }

    setRestoring(true);
    setRestoreResult(null);
    try {
      const res = await api.restoreBackup(restoreFile, restoreKeyword.trim().toUpperCase());
      setRestoreResult(res);
      showToast('success', 'Backup restaurado com sucesso no banco de dados!');
      loadInitialData();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao restaurar backup.');
    } finally {
      setRestoring(false);
    }
  };

  // --- Exportação de Recursos ---
  const handleExportResource = async (resource: 'products' | 'customers' | 'sales' | 'stock') => {
    setExportingResource(resource);
    try {
      await api.exportResource(resource, exportFormat);
      showToast('success', `Exportação de ${resource} (${exportFormat.toUpperCase()}) concluída!`);
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao exportar dados.');
    } finally {
      setExportingResource(null);
    }
  };

  // --- Download de Modelo de Importação ---
  const handleDownloadTemplate = async () => {
    try {
      await api.downloadTemplate(importResource, exportFormat);
      showToast('success', `Modelo para importação de ${importResource} baixado com sucesso!`);
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao baixar modelo.');
    }
  };

  // --- Executar Importação em Massa ---
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      alert('Selecione um arquivo .xlsx ou .csv para importar.');
      return;
    }

    setImporting(true);
    setImportResult(null);
    try {
      const res = await api.importResource(importResource, importFile);
      setImportResult(res);
      if (res.success > 0) {
        showToast('success', `${res.success} registro(s) importado(s) com sucesso!`);
      } else {
        showToast('error', 'Nenhum registro foi importado. Verifique os erros.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao processar importação.');
    } finally {
      setImporting(false);
    }
  };

  // --- Manutenção: Limpeza de Fotos Órfãs ---
  const handleCleanOrphanedImages = async () => {
    if (!confirm('Deseja escanear o disco e remover fotos órfãs que não estão associadas a nenhum produto?')) {
      return;
    }
    setCleaningImages(true);
    setCleanImagesResult(null);
    try {
      const res = await api.cleanOrphanedImages();
      setCleanImagesResult(res);
      showToast('success', `Limpeza concluída! ${res.removed_count} foto(s) removida(s) (${res.freed_formatted} liberados).`);
      // Atualizar status
      const updatedStatus = await api.getSystemStatus();
      setSystemStatus(updatedStatus);
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao limpar imagens órfãs.');
    } finally {
      setCleaningImages(false);
    }
  };

  // --- Manutenção: Otimização de Tabelas MySQL ---
  const handleOptimizeDatabase = async () => {
    setOptimizingDb(true);
    setOptimizeResult(null);
    try {
      const res = await api.optimizeDatabase();
      setOptimizeResult(res);
      showToast('success', 'Tabelas do banco de dados otimizadas com sucesso!');
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao otimizar banco de dados.');
    } finally {
      setOptimizingDb(false);
    }
  };

  // --- Manutenção: Zerar Dados de Teste ---
  const handleResetDemoData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetConfirmWord.trim().toUpperCase() !== 'ZERAR DADOS') {
      alert('Digite exatamente a frase "ZERAR DADOS" para confirmar.');
      return;
    }
    if (!resetPassword) {
      alert('Digite sua senha de administrador.');
      return;
    }

    setResetting(true);
    try {
      const res = await api.resetDemoData(resetPassword);
      showToast('success', res.message || 'Dados de teste zerados com sucesso!');
      setIsResetModalOpen(false);
      setResetPassword('');
      setResetConfirmWord('');
      loadInitialData();
    } catch (err: any) {
      alert(err.message || 'Falha ao zerar dados de teste.');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <Loader2 size={32} className="spin-animation" color="var(--brand-accent)" style={{ margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Carregando configurações avançadas do sistema...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Toast Feedback */}
      {feedback && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 18px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: feedback.type === 'success' ? 'var(--status-success-bg, #f0fdf4)' : 'var(--status-danger-bg, #fef2f2)',
            color: feedback.type === 'success' ? 'var(--status-success-text, #166534)' : 'var(--status-danger-text, #991b1b)',
            border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Sub-navegação interna da aba Outros */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          overflowX: 'auto',
          paddingBottom: '8px',
        }}
      >
        <button
          type="button"
          onClick={() => setCurrentSection('empresa')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: currentSection === 'empresa' ? '1px solid var(--brand-accent)' : '1px solid var(--border-medium)',
            backgroundColor: currentSection === 'empresa' ? 'var(--brand-accent)' : '#fff',
            color: currentSection === 'empresa' ? '#fff' : 'var(--text-primary)',
            fontSize: '0.88rem',
            fontWeight: currentSection === 'empresa' ? 600 : 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <Building2 size={16} />
          <span>Empresa, Pix & Logo</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentSection('mensagens')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: currentSection === 'mensagens' ? '1px solid var(--brand-accent)' : '1px solid var(--border-medium)',
            backgroundColor: currentSection === 'mensagens' ? 'var(--brand-accent)' : '#fff',
            color: currentSection === 'mensagens' ? '#fff' : 'var(--text-primary)',
            fontSize: '0.88rem',
            fontWeight: currentSection === 'mensagens' ? 600 : 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <MessageSquare size={16} />
          <span>Mensagens WhatsApp & Políticas</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentSection('backup')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: currentSection === 'backup' ? '1px solid var(--brand-accent)' : '1px solid var(--border-medium)',
            backgroundColor: currentSection === 'backup' ? 'var(--brand-accent)' : '#fff',
            color: currentSection === 'backup' ? '#fff' : 'var(--text-primary)',
            fontSize: '0.88rem',
            fontWeight: currentSection === 'backup' ? 600 : 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <Database size={16} />
          <span>Backup & Restauração</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentSection('import_export')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: currentSection === 'import_export' ? '1px solid var(--brand-accent)' : '1px solid var(--border-medium)',
            backgroundColor: currentSection === 'import_export' ? 'var(--brand-accent)' : '#fff',
            color: currentSection === 'import_export' ? '#fff' : 'var(--text-primary)',
            fontSize: '0.88rem',
            fontWeight: currentSection === 'import_export' ? 600 : 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <FileSpreadsheet size={16} />
          <span>Importar & Exportar</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentSection('manutencao')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: currentSection === 'manutencao' ? '1px solid var(--brand-accent)' : '1px solid var(--border-medium)',
            backgroundColor: currentSection === 'manutencao' ? 'var(--brand-accent)' : '#fff',
            color: currentSection === 'manutencao' ? '#fff' : 'var(--text-primary)',
            fontSize: '0.88rem',
            fontWeight: currentSection === 'manutencao' ? 600 : 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <Server size={16} />
          <span>Manutenção & Diagnóstico</span>
        </button>
      </div>

      {/* SEÇÃO 1: DADOS OFICIAIS, PIX E LOGO */}
      {currentSection === 'empresa' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {/* Card de Logomarca Oficial */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 600, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ImageIcon size={20} color="var(--brand-accent)" />
              <span>Logomarca Oficial do Ateliê</span>
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Esta imagem é exibida no cabeçalho do Catálogo PDF, nos orçamentos e nos comprovantes oficiais.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '20px', backgroundColor: 'var(--bg-sand-light)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-medium)' }}>
              {companyInfo.logo_url ? (
                <div style={{ position: 'relative', width: '160px', height: '160px', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: '#fff', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={companyInfo.logo_url}
                    alt="Logo Ateliê"
                    style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }}
                  />
                </div>
              ) : (
                <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'var(--bg-sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                  <ImageIcon size={48} opacity={0.6} />
                </div>
              )}

              <input
                type="file"
                ref={logoInputRef}
                accept="image/png, image/jpeg, image/webp"
                style={{ display: 'none' }}
                onChange={handleLogoChange}
              />

              <button
                type="button"
                className="btn-secondary"
                disabled={uploadingLogo}
                onClick={() => logoInputRef.current?.click()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {uploadingLogo ? <Loader2 size={16} className="spin-animation" /> : <Upload size={16} />}
                <span>{companyInfo.logo_url ? 'Substituir Logomarca' : 'Fazer Upload da Logo'}</span>
              </button>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Formatos: PNG, JPG ou WEBP (máx. 5MB)</span>
            </div>
          </div>

          {/* Card de Configurações Chave Pix */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 600, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <QrCode size={20} color="var(--brand-accent)" />
              <span>Chave Pix para Cobrança</span>
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Dados bancários inseridos automaticamente nas mensagens automáticas de cobrança via WhatsApp.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Tipo da Chave Pix
                </label>
                <select
                  value={companyInfo.pix_key_type}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, pix_key_type: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="Celular">Celular</option>
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="E-mail">E-mail</option>
                  <option value="Chave Aleatória">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Chave Pix
                </label>
                <input
                  type="text"
                  placeholder="Ex: 31983371642 ou contato@casaluma.com.br"
                  value={companyInfo.pix_key}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, pix_key: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Banco / Instituição
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Nubank, Inter, Itaú"
                    value={companyInfo.pix_bank}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, pix_bank: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Nome do Titular
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Ateliê Casa Luma"
                    value={companyInfo.pix_owner_name}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, pix_owner_name: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card de Dados Cadastrais e Fiscais Oficiais (Ocupa 2 colunas se houver espaço) */}
          <div className="card" style={{ padding: '24px', gridColumn: '1 / -1' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 600, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} color="var(--brand-accent)" />
              <span>Dados Cadastrais & Fiscais do Ateliê</span>
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Identificação comercial completa impressa em ordens de serviço, relatórios e recibos.
            </p>

            <form onSubmit={handleSaveCompanyInfo}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    value={companyInfo.trade_name}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, trade_name: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Razão Social
                  </label>
                  <input
                    type="text"
                    value={companyInfo.legal_name}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, legal_name: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    CNPJ / CPF
                  </label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={companyInfo.document}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, document: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Inscrição Estadual (IE / MEI)
                  </label>
                  <input
                    type="text"
                    placeholder="Isento ou nº"
                    value={companyInfo.state_registration}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, state_registration: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    WhatsApp Oficial
                  </label>
                  <input
                    type="text"
                    value={companyInfo.phone}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    E-mail de Contato
                  </label>
                  <input
                    type="email"
                    value={companyInfo.email}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Endereço / Logradouro
                  </label>
                  <input
                    type="text"
                    placeholder="Rua, número e complemento"
                    value={companyInfo.address_line}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, address_line: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={companyInfo.city}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, city: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                      UF
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={companyInfo.state}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, state: e.target.value.toUpperCase() })}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                      CEP
                    </label>
                    <input
                      type="text"
                      placeholder="30000-000"
                      value={companyInfo.zip_code}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, zip_code: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  {saving ? <Loader2 size={16} className="spin-animation" /> : <Check size={16} />}
                  <span>Salvar Informações da Empresa & Pix</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEÇÃO 2: MODELOS DE MENSAGENS WHATSAPP E POLÍTICAS */}
      {currentSection === 'mensagens' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card Modelos WhatsApp */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 600, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={20} color="var(--brand-accent)" />
              <span>Modelos de Mensagens para WhatsApp</span>
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Personalize o texto que é gerado com um clique nas vendas e no módulo CRM de clientes.
            </p>

            <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-sand-light)', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Info size={16} color="var(--brand-accent)" />
              <span>
                Variáveis disponíveis: <code>{'{cliente}'}</code>, <code>{'{pedido}'}</code>, <code>{'{valor}'}</code>, <code>{'{chave_pix}'}</code>, <code>{'{tipo}'}</code>, <code>{'{banco}'}</code>, <code>{'{titular}'}</code>, <code>{'{rastreio}'}</code>
              </span>
            </div>

            <form onSubmit={handleSaveTemplates} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  1. Confirmação de Pedido Realizado
                </label>
                <textarea
                  rows={3}
                  value={whatsappTemplates.order_confirmation}
                  onChange={(e) => setWhatsappTemplates({ ...whatsappTemplates, order_confirmation: e.target.value })}
                  style={{ width: '100%', fontFamily: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  2. Cobrança e Envio de Dados Pix
                </label>
                <textarea
                  rows={4}
                  value={whatsappTemplates.pix_billing}
                  onChange={(e) => setWhatsappTemplates({ ...whatsappTemplates, pix_billing: e.target.value })}
                  style={{ width: '100%', fontFamily: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  3. Notificação de Envio e Código de Rastreio
                </label>
                <textarea
                  rows={3}
                  value={whatsappTemplates.shipping_notification}
                  onChange={(e) => setWhatsappTemplates({ ...whatsappTemplates, shipping_notification: e.target.value })}
                  style={{ width: '100%', fontFamily: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  4. Mensagem de Pós-Venda e Fidelização
                </label>
                <textarea
                  rows={3}
                  value={whatsappTemplates.follow_up}
                  onChange={(e) => setWhatsappTemplates({ ...whatsappTemplates, follow_up: e.target.value })}
                  style={{ width: '100%', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="submit" className="btn-primary" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  {saving ? <Loader2 size={16} className="spin-animation" /> : <Check size={16} />}
                  <span>Salvar Modelos de WhatsApp</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card Políticas Padrão do Ateliê */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 600, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="var(--brand-accent)" />
              <span>Políticas & Orientações do Ateliê</span>
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Prazos de cura natural, recomendações de cuidados com peças e termos de garantia artesanal.
            </p>

            <form onSubmit={handleSavePolicies} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Prazo de Produção e Cura Natural
                </label>
                <input
                  type="text"
                  value={studioPolicies.production_cure_time}
                  onChange={(e) => setStudioPolicies({ ...studioPolicies, production_cure_time: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Instruções de Cuidados com as Peças (Cimento & Velas)
                </label>
                <textarea
                  rows={3}
                  value={studioPolicies.care_instructions}
                  onChange={(e) => setStudioPolicies({ ...studioPolicies, care_instructions: e.target.value })}
                  style={{ width: '100%', fontFamily: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Termos de Garantia do Produto Artesanal
                </label>
                <textarea
                  rows={2}
                  value={studioPolicies.warranty_terms}
                  onChange={(e) => setStudioPolicies({ ...studioPolicies, warranty_terms: e.target.value })}
                  style={{ width: '100%', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="submit" className="btn-primary" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  {saving ? <Loader2 size={16} className="spin-animation" /> : <Check size={16} />}
                  <span>Salvar Políticas do Ateliê</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEÇÃO 3: BACKUP E RESTAURAÇÃO */}
      {currentSection === 'backup' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          {/* Card Download de Backup */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-sand)', borderRadius: 'var(--radius-md)', color: 'var(--brand-accent)' }}>
                <Download size={28} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                  Exportar Backup Completo (.ZIP)
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Gera um pacote seguro contendo o banco de dados integral e todas as fotos de mídia cadastradas.
                </p>
              </div>
            </div>

            <div style={{ padding: '14px', backgroundColor: 'var(--bg-sand-light)', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--brand-primary)' }}>O arquivo .ZIP exportado inclui:</p>
              <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Arquivo <code>database_dump.json</code> com todas as tabelas (produtos, vendas, clientes, etc.)</li>
                <li>Pasta <code>media/</code> com todas as imagens dos produtos</li>
                <li>Arquivo <code>metadata.json</code> com carimbo de data, versão e autor</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleExportBackup}
              className="btn-primary"
              style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
            >
              <Download size={18} />
              <span>Baixar Backup Completo Agora</span>
            </button>
          </div>

          {/* Card Restauração de Backup */}
          <div className="card" style={{ padding: '24px', borderLeft: '4px solid var(--status-warning-text, #b45309)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: 'var(--radius-md)', color: '#b45309' }}>
                <ShieldAlert size={28} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                  Restaurar Backup do Sistema
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Recupere dados e mídias a partir de um backup .ZIP exportado anteriormente.
                </p>
              </div>
            </div>

            <div style={{ padding: '14px', backgroundColor: '#fffbeb', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '0.84rem', color: '#92400e', border: '1px solid #fde68a' }}>
              <strong>Atenção:</strong> A restauração irá mesclar e atualizar registros com base no arquivo enviado. Recomenda-se exportar um backup antes de iniciar.
            </div>

            <button
              type="button"
              onClick={() => {
                setRestoreFile(null);
                setRestoreKeyword('');
                setRestoreResult(null);
                setIsRestoreModalOpen(true);
              }}
              className="btn-secondary"
              style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
            >
              <Upload size={18} />
              <span>Selecionar Arquivo .ZIP e Restaurar</span>
            </button>
          </div>
        </div>
      )}

      {/* SEÇÃO 4: IMPORTAR E EXPORTAR */}
      {currentSection === 'import_export' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card Exportação Rápida */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={20} color="var(--brand-accent)" />
                  <span>Exportação Rápida de Relatórios & Planilhas</span>
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Exporte relatórios operacionais formatados com cabeçalhos profissionais para Excel (.xlsx) ou CSV.
                </p>
              </div>

              {/* Seletor de Formato */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Formato:</span>
                <div style={{ display: 'flex', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-medium)' }}>
                  <button
                    type="button"
                    onClick={() => setExportFormat('xlsx')}
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      backgroundColor: exportFormat === 'xlsx' ? 'var(--brand-accent)' : '#fff',
                      color: exportFormat === 'xlsx' ? '#fff' : 'var(--text-secondary)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      backgroundColor: exportFormat === 'csv' ? 'var(--brand-accent)' : '#fff',
                      color: exportFormat === 'csv' ? '#fff' : 'var(--text-secondary)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    CSV (Excel compatível)
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <button
                type="button"
                disabled={exportingResource === 'products'}
                onClick={() => handleExportResource('products')}
                className="btn-secondary"
                style={{ padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', textAlign: 'left' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>Catálogo de Produtos</span>
                  {exportingResource === 'products' ? <Loader2 size={16} className="spin-animation" /> : <Download size={16} />}
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>SKU, categoria, preço, estoque, dimensões e peso</span>
              </button>

              <button
                type="button"
                disabled={exportingResource === 'customers'}
                onClick={() => handleExportResource('customers')}
                className="btn-secondary"
                style={{ padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', textAlign: 'left' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>Base de Clientes (CRM)</span>
                  {exportingResource === 'customers' ? <Loader2 size={16} className="spin-animation" /> : <Download size={16} />}
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>Nomes, WhatsApp, e-mail, canal, cidade e tags</span>
              </button>

              <button
                type="button"
                disabled={exportingResource === 'sales'}
                onClick={() => handleExportResource('sales')}
                className="btn-secondary"
                style={{ padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', textAlign: 'left' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>Histórico de Vendas</span>
                  {exportingResource === 'sales' ? <Loader2 size={16} className="spin-animation" /> : <Download size={16} />}
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>Pedidos, cliente, método de pagamento e valor total</span>
              </button>

              <button
                type="button"
                disabled={exportingResource === 'stock'}
                onClick={() => handleExportResource('stock')}
                className="btn-secondary"
                style={{ padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', textAlign: 'left' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>Movimentações de Estoque</span>
                  {exportingResource === 'stock' ? <Loader2 size={16} className="spin-animation" /> : <Download size={16} />}
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>Entradas, saídas, perdas e custos unitários</span>
              </button>
            </div>
          </div>

          {/* Card Importação em Massa com Planilha Modelo */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 600, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={20} color="var(--brand-accent)" />
              <span>Importação em Massa via Planilha</span>
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Adicione múltiplos produtos ou clientes de uma só vez utilizando nosso modelo padronizado.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              {/* Passo 1: Baixar Modelo */}
              <div style={{ padding: '18px', backgroundColor: 'var(--bg-sand-light)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--brand-accent)', color: '#fff', fontSize: '0.78rem', fontWeight: 700 }}>1</span>
                    <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: 'var(--brand-primary)' }}>Baixar Planilha Modelo</h4>
                  </div>
                  <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Faça o download do arquivo preenchível de exemplo com as colunas corretas.
                  </p>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                      Tipo de Cadastro:
                    </label>
                    <select
                      value={importResource}
                      onChange={(e) => setImportResource(e.target.value as any)}
                      style={{ width: '100%' }}
                    >
                      <option value="products">Produtos & Variações</option>
                      <option value="customers">Clientes (CRM)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}
                >
                  <Download size={16} />
                  <span>Baixar Modelo ({importResource === 'products' ? 'Produtos' : 'Clientes'})</span>
                </button>
              </div>

              {/* Passo 2: Upload e Processamento */}
              <div style={{ padding: '18px', backgroundColor: 'var(--bg-sand-light)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--brand-accent)', color: '#fff', fontSize: '0.78rem', fontWeight: 700 }}>2</span>
                    <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: 'var(--brand-primary)' }}>Enviar Planilha Preenchida</h4>
                  </div>
                  <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Envie o arquivo .xlsx ou .csv preenchido para validação e cadastro automático.
                  </p>

                  <input
                    type="file"
                    accept=".xlsx, .csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    style={{ width: '100%', marginBottom: '14px', fontSize: '0.82rem' }}
                  />
                </div>

                <button
                  type="button"
                  disabled={!importFile || importing}
                  onClick={handleImportSubmit}
                  className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}
                >
                  {importing ? <Loader2 size={16} className="spin-animation" /> : <Upload size={16} />}
                  <span>{importing ? 'Importando...' : 'Iniciar Importação'}</span>
                </button>
              </div>
            </div>

            {/* Resultado da Importação */}
            {importResult && (
              <div
                style={{
                  marginTop: '20px',
                  padding: '16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: importResult.success > 0 ? 'var(--status-success-bg, #f0fdf4)' : 'var(--status-danger-bg, #fef2f2)',
                  border: `1px solid ${importResult.success > 0 ? '#bbf7d0' : '#fecaca'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: importResult.success > 0 ? '#166534' : '#991b1b', marginBottom: '8px' }}>
                  {importResult.success > 0 ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  <span>
                    Importação concluída: {importResult.success} registro(s) adicionado(s) ou atualizado(s).
                  </span>
                </div>

                {importResult.errors && importResult.errors.length > 0 && (
                  <div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#991b1b' }}>Avisos e erros encontrados ({importResult.errors.length}):</span>
                    <ul style={{ margin: '6px 0 0', paddingLeft: '18px', maxHeight: '120px', overflowY: 'auto', fontSize: '0.78rem', color: '#b91c1c' }}>
                      {importResult.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEÇÃO 5: MANUTENÇÃO & DIAGNÓSTICO DO SERVIDOR */}
      {currentSection === 'manutencao' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card Status do Servidor e Diagnóstico */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 600, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={20} color="var(--brand-accent)" />
              <span>Diagnóstico Técnico do Servidor</span>
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Métricas em tempo real de integridade, contadores de registros e consumo de armazenamento.
            </p>

            {systemStatus ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ padding: '16px', backgroundColor: 'var(--bg-sand-light)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Banco de Dados MySQL</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: systemStatus.database_status.includes('Online') ? '#10b981' : '#ef4444' }} />
                    <strong style={{ fontSize: '0.95rem', color: 'var(--brand-primary)' }}>{systemStatus.database_status}</strong>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Conexão Ativa & Estável</span>
                </div>

                <div style={{ padding: '16px', backgroundColor: 'var(--bg-sand-light)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Fotos & Mídia</span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--brand-primary)', display: 'block' }}>{systemStatus.media_storage_formatted}</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{systemStatus.media_files_count} arquivo(s) salvos</span>
                </div>

                <div style={{ padding: '16px', backgroundColor: 'var(--bg-sand-light)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Produtos & Variações</span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--brand-primary)', display: 'block' }}>{systemStatus.counts.products_total}</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{systemStatus.counts.products_finished} acabados / {systemStatus.counts.variations_count} variações</span>
                </div>

                <div style={{ padding: '16px', backgroundColor: 'var(--bg-sand-light)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Clientes Cadastrados</span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--brand-primary)', display: 'block' }}>{systemStatus.counts.customers_count}</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Na base do CRM</span>
                </div>

                <div style={{ padding: '16px', backgroundColor: 'var(--bg-sand-light)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Total de Vendas</span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--brand-primary)', display: 'block' }}>{systemStatus.counts.sales_count}</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Pedidos registrados</span>
                </div>

                <div style={{ padding: '16px', backgroundColor: 'var(--bg-sand-light)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Versão do Sistema</span>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--brand-primary)', display: 'block' }}>v{systemStatus.version}</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{systemStatus.server_time}</span>
                </div>
              </div>

            ) : (
              <p style={{ color: 'var(--text-tertiary)' }}>Status não disponível.</p>
            )}
          </div>

          {/* Card Ferramentas de Manutenção */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 600, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HardDrive size={20} color="var(--brand-accent)" />
              <span>Ferramentas de Manutenção & Limpeza</span>
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Otimizações preventivas para manter o sistema rápido e liberar espaço em disco.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* Limpar fotos órfãs */}
              <div style={{ padding: '18px', backgroundColor: 'var(--bg-sand-light)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '0.92rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                    Limpeza de Fotos Órfãs
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Exclui arquivos de imagens antigas na pasta de mídia que foram desvinculadas de produtos deletados.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={cleaningImages}
                  onClick={handleCleanOrphanedImages}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {cleaningImages ? <Loader2 size={16} className="spin-animation" /> : <Trash2 size={16} />}
                  <span>Limpar Fotos Órfãs</span>
                </button>
                {cleanImagesResult && (
                  <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>
                    ✓ {cleanImagesResult.removed_count} foto(s) removida(s) ({cleanImagesResult.freed_formatted} liberados)
                  </span>
                )}
              </div>

              {/* Otimizar MySQL */}
              <div style={{ padding: '18px', backgroundColor: 'var(--bg-sand-light)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '0.92rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                    Otimização de Índices (MySQL)
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Executa OPTIMIZE TABLE e ANALYZE TABLE nas tabelas para desfragmentar índices e acelerar consultas.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={optimizingDb}
                  onClick={handleOptimizeDatabase}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {optimizingDb ? <Loader2 size={16} className="spin-animation" /> : <RefreshCw size={16} />}
                  <span>Otimizar Tabelas</span>
                </button>
                {optimizeResult && (
                  <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>
                    ✓ {optimizeResult.details?.length || 0} tabelas processadas e desfragmentadas com sucesso!
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card Zona de Perigo: Zerar Dados de Teste */}
          <div className="card" style={{ padding: '24px', border: '1px solid #fecaca', backgroundColor: '#fffbfb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <ShieldAlert size={22} color="#dc2626" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#991b1b' }}>
                Zona de Perigo: Zerar Dados Operacionais de Teste
              </h3>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#7f1d1d' }}>
              Esta ação apaga vendas, ordens de produção, lançamentos financeiros e movimentações de estoque de teste, mantendo os usuários cadastrados e configurações base intactos.
            </p>

            <button
              type="button"
              onClick={() => {
                setResetPassword('');
                setResetConfirmWord('');
                setIsResetModalOpen(true);
              }}
              style={{
                backgroundColor: '#dc2626',
                color: '#fff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Trash2 size={16} />
              <span>Zerar Dados de Teste com Segurança</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE RESTAURAÇÃO DE BACKUP */}
      <Modal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        title="Restaurar Backup do Sistema (.ZIP)"
      >
        <form onSubmit={handleRestoreBackup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '12px', backgroundColor: '#fffbeb', borderRadius: 'var(--radius-sm)', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.82rem' }}>
            <p style={{ margin: '0 0 4px', fontWeight: 600 }}>Aviso de Substituição:</p>
            O backup será aplicado sobre o banco de dados atual. Para confirmar esta ação crítica, você deve digitar a palavra-chave abaixo.
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
              Selecione o arquivo .ZIP de backup:
            </label>
            <input
              type="file"
              accept=".zip"
              onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
              required
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
              Digite a palavra <span style={{ color: '#b45309', fontWeight: 700 }}>RESTAURAR</span> para confirmar:
            </label>
            <input
              type="text"
              placeholder="RESTAURAR"
              value={restoreKeyword}
              onChange={(e) => setRestoreKeyword(e.target.value)}
              required
              style={{ width: '100%', textTransform: 'uppercase' }}
            />
          </div>

          {restoreResult && (
            <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: 'var(--radius-sm)', color: '#166534', fontSize: '0.82rem' }}>
              <strong>Resultado:</strong> {restoreResult.message}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsRestoreModalOpen(false)}
              disabled={restoring}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={restoring || !restoreFile || restoreKeyword.trim().toUpperCase() !== 'RESTAURAR'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {restoring ? <Loader2 size={16} className="spin-animation" /> : <Upload size={16} />}
              <span>{restoring ? 'Restaurando...' : 'Confirmar Restauração'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL DE CONFIRMAÇÃO: ZERAR DADOS DE TESTE */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Confirmação Estrita: Zerar Dados de Teste"
      >
        <form onSubmit={handleResetDemoData} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.82rem' }}>
            <p style={{ margin: '0 0 6px', fontWeight: 700 }}>Ação Irreversível:</p>
            Serão apagados: todas as vendas, pedidos, ordens de produção artesanal, histórico de estoque e lançamentos financeiros.
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
              1. Digite a frase <span style={{ color: '#dc2626', fontWeight: 700 }}>ZERAR DADOS</span>:
            </label>
            <input
              type="text"
              placeholder="ZERAR DADOS"
              value={resetConfirmWord}
              onChange={(e) => setResetConfirmWord(e.target.value)}
              required
              style={{ width: '100%', textTransform: 'uppercase' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
              2. Sua senha de acesso ao sistema:
            </label>
            <input
              type="password"
              placeholder="Senha do usuário logado"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsResetModalOpen(false)}
              disabled={resetting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={resetting || resetConfirmWord.trim().toUpperCase() !== 'ZERAR DADOS' || !resetPassword}
              style={{
                backgroundColor: '#dc2626',
                color: '#fff',
                border: 'none',
                padding: '9px 18px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                opacity: resetConfirmWord.trim().toUpperCase() !== 'ZERAR DADOS' || !resetPassword ? 0.6 : 1,
              }}
            >
              {resetting ? <Loader2 size={16} className="spin-animation" /> : <Trash2 size={16} />}
              <span>{resetting ? 'Apagando dados...' : 'Confirmar e Zerar Dados'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
