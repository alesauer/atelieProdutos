import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Printer,
  Sparkles,
  Share2,
  Check,
  Settings2,
  Phone,
} from 'lucide-react';
import type { Category, ItemTypeDefinition, Product, SalesLinkItem } from '../types';
import { getProductImageUrl, handleImageError } from '../utils/imageUrl';

interface ProductCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categories: Category[];
  itemTypes: ItemTypeDefinition[];
}

export const ProductCatalogModal: React.FC<ProductCatalogModalProps> = ({
  isOpen,
  onClose,
  products,
  categories,
}) => {
  // Configurações do Catálogo
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [onlyActive, setOnlyActive] = useState<boolean>(true);
  const [itemsPerPage, setItemsPerPage] = useState<number>(4); // 2 (Revista Destaque) ou 4 (Vitrine Equilibrada)
  const [showPrices, setShowPrices] = useState<boolean>(true);
  const [showVariations, setShowVariations] = useState<boolean>(true);
  const [showLinks, setShowLinks] = useState<boolean>(true);
  const [includeCover, setIncludeCover] = useState<boolean>(true);
  const [includeBackCover, setIncludeBackCover] = useState<boolean>(true);
  const [contactPhone, setContactPhone] = useState<string>('(47) 99999-9999');
  const [instagramHandle, setInstagramHandle] = useState<string>('@ateliecasaluma');
  const [customSubtitle, setCustomSubtitle] = useState<string>('Arte em Cimento, Velas Aromáticas & Decoração Autoral');
  const [copiedShare, setCopiedShare] = useState<boolean>(false);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(true);

  // Fechar no ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtragem dos produtos para o catálogo
  const catalogProducts = useMemo(() => {
    return products.filter((p) => {
      // Por padrão catálogo é focado em Produtos Acabados
      if (p.item_type !== 'PRODUTO_ACABADO') return false;
      if (onlyActive && !p.is_active) return false;
      if (selectedCategory !== 'TODAS' && String(p.category_id) !== selectedCategory) return false;
      return true;
    });
  }, [products, onlyActive, selectedCategory]);

  // Divisão dos produtos em páginas
  const productPages = useMemo(() => {
    const pages: Product[][] = [];
    for (let i = 0; i < catalogProducts.length; i += itemsPerPage) {
      pages.push(catalogProducts.slice(i, i + itemsPerPage));
    }
    return pages;
  }, [catalogProducts, itemsPerPage]);

  const totalPages = (includeCover ? 1 : 0) + productPages.length + (includeBackCover ? 1 : 0);

  // Formatação de Preço
  const formatPrice = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined || val === '') return 'Sob consulta';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/\./g, '').replace(',', '.'));
    if (isNaN(num) || num <= 0) return 'Sob consulta';
    return `R$ ${num.toFixed(2).replace('.', ',')}`;
  };

  // Disparar Impressão / Salvar PDF
  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Catalogo-Atelie-Casa-Luma-${new Date().getFullYear()}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  // Compartilhar texto rápido para WhatsApp
  const handleShareWhatsApp = async () => {
    const text = `🌿 *Ateliê Casa Luma — Catálogo de Peças Artesanais*\n\nConheça nossas coleções exclusivas de peças em cimento, velas aromáticas e decorações autorais.\n\n📱 Pedidos e Encomendas: ${contactPhone}\n📷 Instagram: ${instagramHandle}\n\nEntre em contato para receber nosso catálogo completo em PDF e orçamentos personalizados! ✨`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 3000);
    } catch {
      alert('Texto copiado para a área de transferência.');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal na Tela */}
      <div
        className="no-print"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(30, 26, 22, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9999,
          overflow: 'hidden',
        }}
      >
        {/* Barra Superior de Ações */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderBottom: '1px solid var(--border-medium)',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--brand-accent-light)',
                color: 'var(--brand-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', color: 'var(--brand-primary)', margin: 0, fontWeight: 700 }}>
                Catálogo de Produtos em PDF
              </h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {catalogProducts.length} itens selecionados • Total de {totalPages} página(s) A4
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="btn-secondary"
              style={{
                fontSize: '0.85rem',
                padding: '8px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Settings2 size={16} />
              <span>{isConfigOpen ? 'Ocultar Opções' : 'Personalizar Catálogo'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="btn-secondary"
              style={{
                fontSize: '0.85rem',
                padding: '8px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: copiedShare ? '#ecfdf5' : undefined,
                color: copiedShare ? '#047857' : undefined,
                borderColor: copiedShare ? '#a7f3d0' : undefined,
              }}
              title="Copiar mensagem para divulgação via WhatsApp"
            >
              {copiedShare ? <Check size={16} /> : <Share2 size={16} />}
              <span>{copiedShare ? 'Texto Copiado!' : 'WhatsApp'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary"
              style={{
                fontSize: '0.88rem',
                padding: '8px 18px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--brand-accent)',
                borderColor: 'var(--brand-accent)',
              }}
              title="Abrir diálogo de impressão e salvar em PDF de alta qualidade"
            >
              <Printer size={17} />
              <span>Baixar / Salvar PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="btn-icon"
              style={{ border: 'none', background: 'none', color: 'var(--text-secondary)' }}
              title="Fechar visualização"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Painel de Configurações Retrátil */}
        {isConfigOpen && (
          <div
            style={{
              backgroundColor: 'var(--bg-sand-light)',
              borderBottom: '1px solid var(--border-medium)',
              padding: '14px 24px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px 24px',
              alignItems: 'center',
              fontSize: '0.82rem',
              flexShrink: 0,
            }}
          >
            {/* Filtro por Categoria */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="cat-filter" style={{ margin: 0, fontWeight: 600, color: 'var(--brand-primary)' }}>
                Categoria:
              </label>
              <select
                id="cat-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ padding: '4px 10px', fontSize: '0.82rem', borderRadius: 'var(--radius-xs)', minWidth: '130px' }}
              >
                <option value="TODAS">Todas</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id.toString()}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Layout dos Produtos */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="layout-select" style={{ margin: 0, fontWeight: 600, color: 'var(--brand-primary)' }}>
                Layout:
              </label>
              <select
                id="layout-select"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                style={{ padding: '4px 10px', fontSize: '0.82rem', borderRadius: 'var(--radius-xs)' }}
              >
                <option value={4}>4 Produtos / Pág (Vitrine)</option>
                <option value={2}>2 Produtos / Pág (Revista Destaque)</option>
              </select>
            </div>

            {/* Toggles Rápidos */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeCover}
                onChange={(e) => setIncludeCover(e.target.checked)}
              />
              <span>Capa Editorial</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showPrices}
                onChange={(e) => setShowPrices(e.target.checked)}
              />
              <span>Exibir Preços</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showVariations}
                onChange={(e) => setShowVariations(e.target.checked)}
              />
              <span>Variações (Cores/Modelos)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(e) => setOnlyActive(e.target.checked)}
              />
              <span>Somente Ativos</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showLinks}
                onChange={(e) => setShowLinks(e.target.checked)}
              />
              <span>Links de Lojas</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeBackCover}
                onChange={(e) => setIncludeBackCover(e.target.checked)}
              />
              <span>Página de Contato</span>
            </label>

            {/* WhatsApp e Instagram */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>WhatsApp:</span>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                style={{ padding: '3px 8px', fontSize: '0.8rem', width: '130px', borderRadius: 'var(--radius-xs)' }}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>Instagram:</span>
              <input
                type="text"
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                style={{ padding: '3px 8px', fontSize: '0.8rem', width: '130px', borderRadius: 'var(--radius-xs)' }}
                placeholder="@ateliecasaluma"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>Subtítulo da Capa:</span>
              <input
                type="text"
                value={customSubtitle}
                onChange={(e) => setCustomSubtitle(e.target.value)}
                style={{ padding: '3px 8px', fontSize: '0.8rem', width: '180px', borderRadius: 'var(--radius-xs)' }}
                placeholder="Subtítulo da capa"
              />
            </div>
          </div>
        )}

        {/* Área Central de Pré-visualização das Páginas A4 */}
        <div className="catalog-screen-preview" style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontSize: '0.82rem', marginBottom: '8px', opacity: 0.85 }}>
            💡 Dica: No diálogo de impressão, escolha <strong>"Salvar como PDF"</strong> e marque <strong>"Gráficos de segundo plano"</strong> para exportar com cores e fotos perfeitas.
          </div>

          <div id="catalog-content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '28px', alignItems: 'center' }}>
            {renderCatalogContent({
              catalogProducts,
              productPages,
              includeCover,
              includeBackCover,
              itemsPerPage,
              showPrices,
              showVariations,
              showLinks,
              contactPhone,
              instagramHandle,
              customSubtitle,
              formatPrice,
              totalPages,
            })}
          </div>
        </div>
      </div>

      {/* Portal Isolado para Impressão Nativa (Apenas visível via @media print) */}
      <div id="catalog-print-portal" style={{ display: 'none' }}>
        {renderCatalogContent({
          catalogProducts,
          productPages,
          includeCover,
          includeBackCover,
          itemsPerPage,
          showPrices,
          showVariations,
          showLinks,
          contactPhone,
          instagramHandle,
          customSubtitle,
          formatPrice,
          totalPages,
        })}
      </div>
    </>
  );
};

// Renderizador Modular das Páginas A4 (Reaproveitado na Tela e no Portal de Impressão)
interface RenderParams {
  catalogProducts: Product[];
  productPages: Product[][];
  includeCover: boolean;
  includeBackCover: boolean;
  itemsPerPage: number;
  showPrices: boolean;
  showVariations: boolean;
  showLinks: boolean;
  contactPhone: string;
  instagramHandle: string;
  customSubtitle: string;
  formatPrice: (val: string | number | null | undefined) => string;
  totalPages: number;
}

function renderCatalogContent({
  catalogProducts,
  productPages,
  includeCover,
  includeBackCover,
  itemsPerPage,
  showPrices,
  showVariations,
  showLinks,
  contactPhone,
  instagramHandle,
  customSubtitle,
  formatPrice,
  totalPages,
}: RenderParams) {
  // Foto de destaque da capa (primeiro produto com foto)
  const coverProduct = catalogProducts.find((p) => p.images && p.images.length > 0) || catalogProducts[0];
  const coverImageUrl = coverProduct ? getProductImageUrl(coverProduct.primary_image_url || (coverProduct.images?.[0]?.url || coverProduct.images?.[0]?.file_path)) : null;

  return (
    <>
      {/* PÁGINA 1: CAPA EDITORIAL DE ALTO LUXO */}
      {includeCover && (
        <div className="catalog-a4-page">
          <div className="catalog-cover-border">
            {/* Topo da Capa: Monograma & Nome da Marca */}
            <div style={{ paddingTop: '10mm' }}>
              <div
                style={{
                  letterSpacing: '5px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--brand-accent)',
                  textTransform: 'uppercase',
                  marginBottom: '10px',
                }}
              >
                ✦ Ateliê Artesanal ✦
              </div>

              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '3.6rem',
                  fontWeight: 600,
                  lineHeight: 1.05,
                  color: 'var(--brand-primary)',
                  margin: '0 0 8px 0',
                  letterSpacing: '1px',
                }}
              >
                Casa Luma
              </h1>

              <div
                style={{
                  fontSize: '0.9rem',
                  letterSpacing: '3px',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                }}
              >
                Design em Cimento & Velas Autorais
              </div>
            </div>

            {/* Centro da Capa: Foto Heroica em Moldura Oval / Arco */}
            <div
              style={{
                width: '120mm',
                height: '115mm',
                margin: '8mm auto',
                borderRadius: '80mm 80mm 20mm 20mm',
                overflow: 'hidden',
                boxShadow: '0 12px 30px rgba(74, 65, 55, 0.15)',
                border: '3px solid #ffffff',
                outline: '1px solid #d6ccbe',
                backgroundColor: 'var(--bg-sand-light)',
                position: 'relative',
              }}
            >
              {coverImageUrl ? (
                <img
                  src={coverImageUrl}
                  alt="Ateliê Casa Luma Destaque"
                  onError={handleImageError}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--brand-accent)',
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.8rem',
                  }}
                >
                  Casa Luma
                </div>
              )}
            </div>

            {/* Base da Capa: Título do Catálogo e Informações */}
            <div style={{ paddingBottom: '10mm', maxWidth: '140mm' }}>
              <div
                style={{
                  display: 'inline-block',
                  padding: '5px 18px',
                  backgroundColor: 'var(--brand-accent)',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  borderRadius: 'var(--radius-full)',
                  marginBottom: '14px',
                }}
              >
                Catálogo Oficial • Coleções
              </div>

              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.25rem',
                  color: 'var(--brand-primary)',
                  lineHeight: 1.45,
                  fontStyle: 'italic',
                  margin: '0 0 12px 0',
                }}
              >
                "{customSubtitle}"
              </p>

              <div
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-tertiary)',
                  letterSpacing: '1px',
                }}
              >
                {instagramHandle} • WhatsApp: {contactPhone}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PÁGINAS DE PRODUTOS */}
      {productPages.map((pageItems, pageIdx) => {
        const thisPageNum = (includeCover ? 1 : 0) + pageIdx + 1;

        return (
          <div key={`cat-page-${pageIdx}`} className="catalog-a4-page">
            {/* Cabeçalho de Página Discreto */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '8px',
                borderBottom: '1px solid #d6ccbe',
                marginBottom: '14px',
                fontSize: '0.74rem',
                color: 'var(--text-secondary)',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--brand-accent)', fontWeight: 700 }}>✦</span>
                <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>Ateliê Casa Luma</span>
                <span>• Coleção Artesanal</span>
              </div>
              <div>
                Pág. {thisPageNum} de {totalPages}
              </div>
            </div>

            {/* Grid de Produtos */}
            <div
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: itemsPerPage === 2 ? '1fr' : '1fr 1fr',
                gridTemplateRows: itemsPerPage === 2 ? '1fr 1fr' : '1fr 1fr',
                gap: itemsPerPage === 2 ? '22px' : '16px',
                alignContent: 'start',
              }}
            >
              {pageItems.map((prod) => {
                const prodImg = getProductImageUrl(
                  prod.primary_image_url || (prod.images && prod.images.length > 0 ? prod.images[0].url || prod.images[0].file_path : null)
                );

                // Links de marketplaces
                let parsedLinks: SalesLinkItem[] = [];
                if (prod.sales_links) {
                  try {
                    parsedLinks = JSON.parse(prod.sales_links);
                  } catch {}
                }

                return (
                  <div
                    key={prod.id}
                    className="catalog-product-card"
                    style={{
                      border: '1px solid #e8e1d7',
                      borderRadius: '12px',
                      padding: itemsPerPage === 2 ? '16px 20px' : '12px',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      flexDirection: itemsPerPage === 2 ? 'row' : 'column',
                      gap: itemsPerPage === 2 ? '20px' : '10px',
                      overflow: 'hidden',
                      position: 'relative',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                    }}
                  >
                    {/* Imagem do Produto */}
                    <div
                      style={{
                        width: itemsPerPage === 2 ? '180px' : '100%',
                        height: itemsPerPage === 2 ? '180px' : '125px',
                        flexShrink: 0,
                        borderRadius: '8px',
                        overflow: 'hidden',
                        backgroundColor: 'var(--bg-sand-light)',
                        border: '1px solid #e9e1d7',
                        position: 'relative',
                      }}
                    >
                      <img
                        src={prodImg}
                        alt={prod.name}
                        onError={handleImageError}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                      {prod.category && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '6px',
                            left: '6px',
                            backgroundColor: 'rgba(255, 255, 255, 0.94)',
                            color: 'var(--brand-primary)',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            letterSpacing: '0.5px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          }}
                        >
                          {prod.category.name}
                        </span>
                      )}
                    </div>

                    {/* Detalhes do Produto */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        {/* Linha SKU e Nome */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                          <h3
                            style={{
                              fontFamily: 'var(--font-serif)',
                              fontSize: itemsPerPage === 2 ? '1.4rem' : '1.05rem',
                              fontWeight: 700,
                              color: 'var(--brand-primary)',
                              margin: '0 0 2px 0',
                              lineHeight: 1.2,
                            }}
                          >
                            {prod.name}
                          </h3>
                        </div>

                        <div
                          style={{
                            fontSize: '0.68rem',
                            color: 'var(--text-tertiary)',
                            fontWeight: 600,
                            letterSpacing: '0.5px',
                            marginBottom: '6px',
                          }}
                        >
                          CÓD / SKU: {prod.sku}
                        </div>

                        {/* Descrição */}
                        {prod.description && (
                          <p
                            style={{
                              fontSize: itemsPerPage === 2 ? '0.82rem' : '0.74rem',
                              color: 'var(--text-secondary)',
                              lineHeight: 1.35,
                              margin: '0 0 8px 0',
                              fontStyle: 'italic',
                              display: '-webkit-box',
                              WebkitLineClamp: itemsPerPage === 2 ? 3 : 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {prod.description}
                          </p>
                        )}

                        {/* Ficha Técnica: Material & Cor */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                          {prod.material && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                padding: '2px 6px',
                                backgroundColor: 'var(--bg-sand-light)',
                                borderRadius: '4px',
                                color: 'var(--text-secondary)',
                                fontWeight: 500,
                              }}
                            >
                              🧱 {prod.material}
                            </span>
                          )}
                          {prod.color && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                padding: '2px 6px',
                                backgroundColor: 'var(--bg-sand-light)',
                                borderRadius: '4px',
                                color: 'var(--text-secondary)',
                                fontWeight: 500,
                              }}
                            >
                              🎨 Cor: {prod.color}
                            </span>
                          )}
                        </div>

                        {/* Variações de Cores/Modelos */}
                        {showVariations && prod.variations && prod.variations.length > 0 && (
                          <div style={{ marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              Opções / Cores disponíveis:
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '3px' }}>
                              {prod.variations.map((v) => (
                                <span
                                  key={v.id}
                                  style={{
                                    fontSize: '0.65rem',
                                    padding: '2px 6px',
                                    backgroundColor: '#fff5f0',
                                    border: '1px solid #ffdcd4',
                                    borderRadius: '4px',
                                    color: '#ee4d2d',
                                    fontWeight: 600,
                                  }}
                                >
                                  {v.variation_name || v.color || v.sku}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Rodapé do Card: Preço e Links */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-end',
                          paddingTop: '6px',
                          borderTop: '1px dashed #e8e1d7',
                          marginTop: '6px',
                        }}
                      >
                        {showPrices ? (
                          <div>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', display: 'block', textTransform: 'uppercase' }}>
                              Preço de Venda
                            </span>
                            <span
                              style={{
                                fontFamily: 'var(--font-serif)',
                                fontSize: itemsPerPage === 2 ? '1.45rem' : '1.2rem',
                                fontWeight: 700,
                                color: 'var(--brand-accent)',
                              }}
                            >
                              {formatPrice(prod.sale_price)}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                            Sob encomenda
                          </span>
                        )}

                        {showLinks && parsedLinks.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            {parsedLinks.slice(0, 2).map((l, lIdx) => (
                              <span
                                key={lIdx}
                                style={{
                                  fontSize: '0.62rem',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: l.platform.toLowerCase().includes('shopee') ? '#fff5f0' : '#f5efe8',
                                  color: l.platform.toLowerCase().includes('shopee') ? '#ee4d2d' : 'var(--brand-primary)',
                                  border: '1px solid #e8e1d7',
                                  fontWeight: 600,
                                }}
                              >
                                {l.platform}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rodapé de Página Elegante */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '10px',
                borderTop: '1px solid #d6ccbe',
                marginTop: '12px',
                fontSize: '0.74rem',
                color: 'var(--text-secondary)',
              }}
            >
              <span>{instagramHandle} • Feito à mão com afeto e dedicação</span>
              <span style={{ fontWeight: 600, color: 'var(--brand-accent)' }}>WhatsApp: {contactPhone}</span>
            </div>
          </div>
        );
      })}

      {/* PÁGINA FINAL: CONTRA-CAPA & COMO ENCOMENDAR */}
      {includeBackCover && (
        <div className="catalog-a4-page">
          <div className="catalog-cover-border" style={{ justifyContent: 'space-between' }}>
            {/* Topo da Contra-Capa */}
            <div style={{ paddingTop: '8mm' }}>
              <div style={{ letterSpacing: '4px', fontSize: '0.8rem', color: 'var(--brand-accent)', textTransform: 'uppercase', marginBottom: '8px' }}>
                ✦ Como Encomendar ✦
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', color: 'var(--brand-primary)', margin: 0 }}>
                Peças Personalizadas & Pedidos
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '120mm', margin: '8px auto 0' }}>
                Produzimos com matérias-primas selecionadas, respeitando o tempo de cura natural do cimento e a maciez das ceras vegetais.
              </p>
            </div>

            {/* 3 Passos para Pedido */}
            <div style={{ width: '100%', maxWidth: '140mm', display: 'flex', flexDirection: 'column', gap: '14px', margin: '14mm 0' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 16px',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e8e1d7',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--brand-accent-light)',
                    color: 'var(--brand-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    flexShrink: 0,
                  }}
                >
                  1
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--brand-primary)' }}>Escolha seus Itens & Cores</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Anote os códigos (SKU) e as cores desejadas deste catálogo para enviar em seu pedido.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 16px',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e8e1d7',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--brand-accent-light)',
                    color: 'var(--brand-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    flexShrink: 0,
                  }}
                >
                  2
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--brand-primary)' }}>Envie para Nosso WhatsApp</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Atendimento rápido e personalizado para confirmar disponibilidade, frete e prazo de produção.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 16px',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e8e1d7',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--brand-accent-light)',
                    color: 'var(--brand-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    flexShrink: 0,
                  }}
                >
                  3
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--brand-primary)' }}>Produção & Envio Seguro</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Peças embaladas com plástico bolha reforçado e papel seda para chegarem perfeitas até você.
                  </p>
                </div>
              </div>
            </div>

            {/* Cartão de Contato Central */}
            <div
              style={{
                paddingBottom: '8mm',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'var(--brand-primary)',
                  color: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 4px 14px rgba(74, 65, 55, 0.2)',
                }}
              >
                <Phone size={18} color="var(--brand-accent-light)" />
                <span style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '1px' }}>
                  {contactPhone}
                </span>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Instagram: <strong style={{ color: 'var(--brand-accent)' }}>{instagramHandle}</strong>
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                Pág. {totalPages} de {totalPages} • Ateliê Casa Luma © {new Date().getFullYear()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
