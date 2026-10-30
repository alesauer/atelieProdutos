import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Image as ImageIcon,
  Edit2,
  Trash2,
  Star,
  Upload,
  AlertCircle,
  Loader2,
  Package,
  Calculator,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Store,
  Palette,
  Layers,
  Copy,
  Check,
  Eye,
  AlertTriangle,
  Link2,
  FileText,
  Scale,
  Sparkles,
  RotateCcw,
  Save,
} from 'lucide-react';
import { api } from '../api/client';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { ProductCatalogModal } from '../components/ProductCatalogModal';
import { getProductImageUrl, handleImageError } from '../utils/imageUrl';
import type { Category, CostComponentItem, ItemType, ItemTypeDefinition, Product, ProductKitItem, ProductVariation, ProductColor, ProductMaterial, ProductSupply, ProductFormData, VariationFormData, SalesLinkItem, UnitOfMeasure } from '../types';

const WhatsAppIcon: React.FC<{ size?: number; color?: string; style?: React.CSSProperties }> = ({
  size = 16,
  color = '#25D366',
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ display: 'inline-block', verticalAlign: 'middle', color, flexShrink: 0, ...style }}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
  isPrimary: boolean;
}

// Helpers para campos numéricos com preenchimento da direita para a esquerda e sem zeros desnecessários
const formatCurrencyInputRTL = (rawValue: string, allowEmpty = false): string => {
  const digits = rawValue.replace(/\D/g, '');
  if (!digits) return allowEmpty ? '' : '0,00';
  const cents = parseInt(digits, 10);
  if (cents === 0) return allowEmpty ? '' : '0,00';
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};


const cleanStockValue = (val: string | number | null | undefined): string => {
  if (val === null || val === undefined || val === '') return '';
  const num = parseFloat(String(val));
  return isNaN(num) ? '' : String(num);
};

const parseCurrencyValue = (val: string | number | null | undefined): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const clean = String(val).replace(/\./g, '').replace(',', '.').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

const parseOptionalCurrencyValue = (val: string | number | null | undefined): number | null => {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  const clean = String(val).replace(/\./g, '').replace(',', '.').trim();
  if (!clean || clean === '0' || clean === '0.00') return null;
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
};

const parseStockValue = (val: string | number | null | undefined): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const clean = String(val).replace(/\./g, '').replace(',', '.').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

const formatWeight = (val?: number | string | null): string => {
  if (val == null || val === '') return '';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
  if (!num || isNaN(num) || num <= 0) return '';
  if (num >= 1000) {
    return `${(num / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 })} kg`;
  }
  return `${Math.round(num)} g`;
};

const PRODUCT_CREATE_DRAFT_KEY = 'casaluma_product_create_draft';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemTypeDefinition[]>([]);
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [materials, setMaterials] = useState<ProductMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memória recente / Rascunho automático do cadastro de produto
  const [draftRestoredAt, setDraftRestoredAt] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('TODOS');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');

  // Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    sku: '',
    name: '',
    description: '',
    color: '',
    size: '',
    material: '',
    item_type: 'PRODUTO_ACABADO',
    category_id: null,
    unit_id: 1,
    unit_cost: '0,00',
    cost_breakdown: '',
    sales_links: '',
    sale_price: '',
    weight: '',
    min_stock: '0',
    is_active: true,
    is_kit: false,
  });

  // Variações integradas no formulário do produto (Opção C - Híbrida Inteligente)
  const [hasVariations, setHasVariations] = useState(false);
  const [formVariations, setFormVariations] = useState<VariationFormData[]>([]);
  const [isQuickGenOpen, setIsQuickGenOpen] = useState(false);
  const [quickGenSelectedColors, setQuickGenSelectedColors] = useState<string[]>([]);
  const [quickGenSelectedSizes, setQuickGenSelectedSizes] = useState<string[]>([]);
  const [quickGenCustomColor, setQuickGenCustomColor] = useState('');
  const [quickGenCustomSize, setQuickGenCustomSize] = useState('');

  // Modais rápidos de Nova Cor e Novo Material
  const [isQuickColorModalOpen, setIsQuickColorModalOpen] = useState(false);
  const [quickColorName, setQuickColorName] = useState('');
  const [quickColorHex, setQuickColorHex] = useState('#d1d5db');
  const [quickColorTargetVarIndex, setQuickColorTargetVarIndex] = useState<number | null>(null);
  const [savingQuickColor, setSavingQuickColor] = useState(false);
  const [quickColorError, setQuickColorError] = useState<string | null>(null);


  const [isQuickMaterialModalOpen, setIsQuickMaterialModalOpen] = useState(false);
  const [quickMaterialName, setQuickMaterialName] = useState('');
  const [quickMaterialDesc, setQuickMaterialDesc] = useState('');
  const [savingQuickMaterial, setSavingQuickMaterial] = useState(false);
  const [quickMaterialError, setQuickMaterialError] = useState<string | null>(null);

  // Links de Vendas em Marketplaces
  const [salesLinks, setSalesLinks] = useState<SalesLinkItem[]>([]);
  const [newLinkPlatform, setNewLinkPlatform] = useState('Shopee');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  // Composição de Kit de Produtos
  const [kitItems, setKitItems] = useState<ProductKitItem[]>([]);
  const [selectedKitProductId, setSelectedKitProductId] = useState<string>('');
  const [selectedKitVariationId, setSelectedKitVariationId] = useState<string>('');
  const [selectedKitQuantity, setSelectedKitQuantity] = useState<string>('1');

  // Insumos de Produção e Calculadora de Composição de Custo Estimado
  const [supplies, setSupplies] = useState<ProductSupply[]>([]);
  const [isCostCalculatorOpen, setIsCostCalculatorOpen] = useState(false);
  const [costItems, setCostItems] = useState<CostComponentItem[]>([]);
  const [selectedSupplyId, setSelectedSupplyId] = useState<string>('');
  const [newCostItemName, setNewCostItemName] = useState('');
  const [newCostItemUnit, setNewCostItemUnit] = useState<string>('unid');
  const [newCostItemQuantity, setNewCostItemQuantity] = useState('1');
  const [newCostItemWeight, setNewCostItemWeight] = useState<string>('');
  const [newCostItemUnitCost, setNewCostItemUnitCost] = useState('');
  const [newCostItemBaseQuantity, setNewCostItemBaseQuantity] = useState<number>(1);
  const [newCostItemBaseCost, setNewCostItemBaseCost] = useState<number>(0);

  // Modal rápido de Criação de Insumo dentro do modal de Custo
  const [isQuickSupplyModalOpen, setIsQuickSupplyModalOpen] = useState(false);
  const [quickSupplyName, setQuickSupplyName] = useState('');
  const [quickSupplyCategory, setQuickSupplyCategory] = useState('Matéria-Prima');
  const [quickSupplyUnit, setQuickSupplyUnit] = useState('unid');
  const [quickSupplyBaseQty, setQuickSupplyBaseQty] = useState('1');
  const [quickSupplyBaseCost, setQuickSupplyBaseCost] = useState('');
  const [quickSupplyNotes, setQuickSupplyNotes] = useState('');
  const [savingQuickSupply, setSavingQuickSupply] = useState(false);
  const [quickSupplyError, setQuickSupplyError] = useState<string | null>(null);

  // Modal de Fotos
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageModalProduct, setImageModalProduct] = useState<Product | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Modo de Exibição (Padrão: Grade com fotos)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');

  // Fotos para Upload no Formulário de Produto (Novo ou Edição)
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [savingProduct, setSavingProduct] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Visualizador / Lightbox de Fotos da Grid
  const [lightboxProduct, setLightboxProduct] = useState<Product | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Modal de Encaminhamento via WhatsApp
  const [whatsAppProduct, setWhatsAppProduct] = useState<Product | null>(null);
  const [whatsAppPhone, setWhatsAppPhone] = useState('');
  const [whatsAppSelectedLink, setWhatsAppSelectedLink] = useState<string>('all');
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Modal de Detalhes do Produto (abre somente ao clicar)
  const [previewProductModal, setPreviewProductModal] = useState<Product | null>(null);
  const [previewModalActiveVarId, setPreviewModalActiveVarId] = useState<number | null>(null);

  // Variações e Subprodutos (Estilo Shopee)
  const [selectedVariationMap, setSelectedVariationMap] = useState<Record<number, number | null>>({});
  const [expandedTableVariations, setExpandedTableVariations] = useState<Record<number, boolean>>({});

  // Modal de Gestão de Variações de um Produto
  const [variationManageModalProduct, setVariationManageModalProduct] = useState<Product | null>(null);
  const [newVarName, setNewVarName] = useState('');
  const [newVarColor, setNewVarColor] = useState('');
  const [newVarSku, setNewVarSku] = useState('');
  const [newVarSalePrice, setNewVarSalePrice] = useState('');
  const [newVarUnitCost, setNewVarUnitCost] = useState('');
  const [newVarStock, setNewVarStock] = useState('0');
  const [savingNewVar, setSavingNewVar] = useState(false);
  const [varFormError, setVarFormError] = useState<string | null>(null);

  // Agrupamento de Produto Existente como Variação
  const [linkExistingChildId, setLinkExistingChildId] = useState<number | null>(null);
  const [linkExistingVarName, setLinkExistingVarName] = useState('');
  const [linkingProduct, setLinkingProduct] = useState(false);

  // Rastreamento de variações excluídas na edição para limpeza no banco
  const [deletedVariationIds, setDeletedVariationIds] = useState<number[]>([]);

  // Handlers de Variações no Formulário de Produto (Opção C - Híbrida)
  const handleToggleHasVariations = (checked: boolean) => {
    setHasVariations(checked);
    if (checked && formVariations.length === 0) {
      const baseColor = formData.color?.trim() || '';
      const baseSize = formData.size?.trim() || '';
      const initialName = baseColor && baseSize ? `${baseColor} - ${baseSize}` : (baseColor || baseSize || 'Padrão');
      const cleanColor = baseColor ? baseColor.toUpperCase().replace(/\s+/g, '-') : '';
      const cleanSize = baseSize ? baseSize.toUpperCase().replace(/\s+/g, '-') : '';
      const colorSuffix = cleanColor ? (cleanSize ? `${cleanColor}-${cleanSize}` : cleanColor) : '1';
      const initialSku = formData.sku ? `${formData.sku}-${colorSuffix}` : `PROD-${colorSuffix}`;
      setFormVariations([
        {
          sku: initialSku,
          variation_name: initialName,
          color: baseColor,
          size: baseSize,
          sale_price: formData.sale_price || '',
          unit_cost: formData.unit_cost || '0,00',
          initial_stock: '0',
          min_stock: formData.min_stock || '0',
        },
      ]);
    }
  };

  const handleAddEmptyVariation = () => {
    const nextIdx = formVariations.length + 1;
    const baseSku = formData.sku.trim() || 'PROD';
    const fallbackColor = formVariations.length === 0 && formData.color?.trim() ? formData.color.trim() : '';
    const cleanColor = fallbackColor ? fallbackColor.toUpperCase().replace(/\s+/g, '-') : '';
    const varSku = cleanColor ? `${baseSku}-${cleanColor}` : `${baseSku}-VAR${nextIdx}`;
    setFormVariations((prev) => [
      ...prev,
      {
        sku: varSku,
        variation_name: fallbackColor || `Variação ${nextIdx}`,
        color: fallbackColor,
        size: '',
        sale_price: formData.sale_price || '',
        unit_cost: formData.unit_cost || '0,00',
        initial_stock: '0',
        min_stock: '0',
      },
    ]);
  };

  const handleDuplicateVariation = (index: number) => {
    const source = formVariations[index];
    if (!source) return;
    const nextIdx = formVariations.length + 1;
    const cleanSku = source.sku ? `${source.sku}-C${nextIdx}` : `${formData.sku}-VAR${nextIdx}`;
    setFormVariations((prev) => [
      ...prev,
      {
        ...source,
        id: undefined,
        sku: cleanSku,
        variation_name: `${source.variation_name} (Cópia)`,
        initial_stock: '0',
      },
    ]);
  };

  const handleRemoveVariation = (index: number) => {
    const target = formVariations[index];
    if (target?.id) {
      setDeletedVariationIds((prev) => (prev.includes(target.id!) ? prev : [...prev, target.id!]));
    }
    setFormVariations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateVariation = (index: number, field: keyof VariationFormData, value: any) => {
    setFormVariations((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      if (field === 'color' || field === 'size') {
        const c = field === 'color' ? value : item.color;
        const s = field === 'size' ? value : item.size;
        if (c || s) {
          item.variation_name = `${c || ''}${c && s ? ' - ' : ''}${s || ''}`;
          if (formData.sku) {
            const cleanC = c ? c.toUpperCase().replace(/\s+/g, '-') : '';
            const cleanS = s ? s.toUpperCase().replace(/\s+/g, '-') : '';
            item.sku = `${formData.sku}-${cleanC}${cleanC && cleanS ? '-' : ''}${cleanS}`.replace(/-+$/, '');
          }
        }
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleApplyBasePriceAndCostToAll = () => {
    if (formVariations.length === 0) return;
    setFormVariations((prev) =>
      prev.map((v) => ({
        ...v,
        sale_price: formData.sale_price || '',
        unit_cost: formData.unit_cost || '0,00',
      }))
    );
  };

  const handleGenerateQuickCombinations = () => {
    const allColors = [...quickGenSelectedColors];
    if (quickGenCustomColor.trim() && !allColors.includes(quickGenCustomColor.trim())) {
      allColors.push(quickGenCustomColor.trim());
    }

    const allSizes = [...quickGenSelectedSizes];
    if (quickGenCustomSize.trim() && !allSizes.includes(quickGenCustomSize.trim())) {
      allSizes.push(quickGenCustomSize.trim());
    }

    if (allColors.length === 0 && allSizes.length === 0) {
      alert('Selecione pelo menos uma cor ou um tamanho para gerar a grade.');
      return;
    }

    const newRows: VariationFormData[] = [];
    const baseSku = formData.sku.trim() || 'PROD';

    if (allColors.length > 0 && allSizes.length > 0) {
      for (const c of allColors) {
        for (const s of allSizes) {
          const varName = `${c} - ${s}`;
          const cleanC = c.toUpperCase().replace(/\s+/g, '-');
          const cleanS = s.toUpperCase().replace(/\s+/g, '-');
          newRows.push({
            sku: `${baseSku}-${cleanC}-${cleanS}`,
            variation_name: varName,
            color: c,
            size: s,
            sale_price: formData.sale_price || '',
            unit_cost: formData.unit_cost || '0,00',
            initial_stock: '0',
            min_stock: '0',
          });
        }
      }
    } else if (allColors.length > 0) {
      for (const c of allColors) {
        const cleanC = c.toUpperCase().replace(/\s+/g, '-');
        newRows.push({
          sku: `${baseSku}-${cleanC}`,
          variation_name: c,
          color: c,
          size: '',
          sale_price: formData.sale_price || '',
          unit_cost: formData.unit_cost || '0,00',
          initial_stock: '0',
          min_stock: '0',
        });
      }
    } else {
      for (const s of allSizes) {
        const cleanS = s.toUpperCase().replace(/\s+/g, '-');
        newRows.push({
          sku: `${baseSku}-${cleanS}`,
          variation_name: s,
          color: '',
          size: s,
          sale_price: formData.sale_price || '',
          unit_cost: formData.unit_cost || '0,00',
          initial_stock: '0',
          min_stock: '0',
        });
      }
    }

    setFormVariations(newRows);
    setIsQuickGenOpen(false);
    setQuickGenCustomColor('');
    setQuickGenCustomSize('');
  };

  // Handlers de Variações Existentes
  const handleCreateVariation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variationManageModalProduct) return;
    if (!newVarName.trim()) {
      setVarFormError('Informe o nome da variação (ex: Branco, Cinza, P, M).');
      return;
    }
    const cleanSku = newVarSku.trim() || `${variationManageModalProduct.sku}-${newVarName.trim().toUpperCase().replace(/\s+/g, '-')}`;
    setSavingNewVar(true);
    setVarFormError(null);
    try {
      await api.createVariation(variationManageModalProduct.id, {
        sku: cleanSku,
        variation_name: newVarName.trim(),
        color: newVarColor.trim() || newVarName.trim(),
        sale_price: parseOptionalCurrencyValue(newVarSalePrice) ?? (variationManageModalProduct.sale_price ? Number(variationManageModalProduct.sale_price) : null),
        unit_cost: parseOptionalCurrencyValue(newVarUnitCost) ?? Number(variationManageModalProduct.unit_cost || 0),
        min_stock: 5,
        initial_stock: parseStockValue(newVarStock),
      });

      const updatedProd = await api.getProduct(variationManageModalProduct.id);
      setVariationManageModalProduct(updatedProd);
      setProducts((prev) => prev.map((p) => (p.id === updatedProd.id ? updatedProd : p)));
      setNewVarName('');
      setNewVarColor('');
      setNewVarSku('');
      setNewVarSalePrice('');
      setNewVarUnitCost('');
      setNewVarStock('0');
    } catch (err: any) {
      setVarFormError(err.message || 'Erro ao cadastrar variação.');
    } finally {
      setSavingNewVar(false);
    }
  };

  const handleLinkExistingAsVariation = async () => {
    if (!variationManageModalProduct || !linkExistingChildId) return;
    setLinkingProduct(true);
    setVarFormError(null);
    try {
      const updatedParent = await api.linkExistingProductAsVariation(
        variationManageModalProduct.id,
        linkExistingChildId,
        linkExistingVarName.trim() || undefined
      );
      setVariationManageModalProduct(updatedParent);
      setProducts((prev) => [
        ...prev.filter((p) => p.id !== linkExistingChildId && p.id !== updatedParent.id),
        updatedParent,
      ]);
      setLinkExistingChildId(null);
      setLinkExistingVarName('');
    } catch (err: any) {
      setVarFormError(err.message || 'Erro ao agrupar produto.');
    } finally {
      setLinkingProduct(false);
    }
  };

  const handleUnlinkVariation = async (varId: number) => {
    if (!variationManageModalProduct) return;
    if (!confirm('Deseja desvincular esta variação? Ela voltará a ser um produto avulso no catálogo.')) return;
    try {
      await api.unlinkVariation(variationManageModalProduct.id, varId);
      const updatedProd = await api.getProduct(variationManageModalProduct.id);
      setVariationManageModalProduct(updatedProd);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao desvincular variação.');
    }
  };

  const handleOpenPreviewModal = (prod: Product) => {
    setPreviewProductModal(prod);
    const activeVarId = selectedVariationMap[prod.id] || (prod.variations && prod.variations.length > 0 ? prod.variations[0].id : null);
    setPreviewModalActiveVarId(activeVarId);
  };

  const renderStockDisplay = (item: Product | ProductVariation, isCompact = false) => {
    const stockNum = Number(item.current_stock ?? 0);
    const unit = ('unit' in item && item.unit?.code) ? item.unit.code : 'UN';
    const formattedStock = stockNum.toFixed(2);
    const isOutOfStock = stockNum <= 0;
    const isLowStock = stockNum > 0 && stockNum <= 5;
    const hasVariations = 'variations' in item && Boolean(item.variations && item.variations.length > 0);

    if (isOutOfStock) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: isCompact ? '2px 8px' : '4px 10px',
            borderRadius: '12px',
            fontSize: isCompact ? '0.74rem' : '0.82rem',
            fontWeight: 700,
            backgroundColor: 'var(--status-danger-bg)',
            color: 'var(--status-danger-text)',
            border: '1px solid var(--status-danger-border)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
          title="Estoque esgotado (0.00 peças disponíveis)"
        >
          <span>🚨</span>
          <span>0.00 {unit} (Esgotado)</span>
        </span>
      );
    }

    if (isLowStock) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: isCompact ? '2px 8px' : '4px 10px',
            borderRadius: '12px',
            fontSize: isCompact ? '0.74rem' : '0.82rem',
            fontWeight: 700,
            backgroundColor: '#fffbeb',
            color: '#b45309',
            border: '1px solid #fde68a',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
          title="⚠️ Alerta: Estoque crítico com 5.00 peças ou menos!"
        >
          <span>⚠️</span>
          <span>{formattedStock} {unit}</span>
          {!isCompact && (
            <span style={{ fontSize: '0.7rem', fontWeight: 600, opacity: 0.9 }}>
              (Alerta: ≤ 5.00)
            </span>
          )}
          {hasVariations && isCompact && (
            <span style={{ fontSize: '0.65rem', opacity: 0.85, fontWeight: 600 }}>
              (total)
            </span>
          )}
        </span>
      );
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: isCompact ? '2px 8px' : '4px 10px',
          borderRadius: '12px',
          fontSize: isCompact ? '0.74rem' : '0.82rem',
          fontWeight: 600,
          backgroundColor: 'var(--bg-sand-light)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-subtle)',
        }}
        title={`Estoque disponível: ${formattedStock} ${unit}`}
      >
        <span>📦</span>
        <span>{formattedStock} {unit}</span>
        {hasVariations && isCompact && (
          <span style={{ fontSize: '0.65rem', opacity: 0.85, fontWeight: 600 }}>
            (total)
          </span>
        )}
      </span>
    );
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodsData, catsData, unitsData, itemTypesData, colorsData, materialsData, suppliesData] = await Promise.all([
        api.listProducts({ active_only: false }),
        api.listCategories(),
        api.listUnits(),
        api.listItemTypes(),
        api.listColors(),
        api.listMaterials(),
        api.listSupplies(),
      ]);

      setProducts(prodsData);
      setCategories(catsData);
      setUnits(unitsData);
      setItemTypes(itemTypesData);
      setColors(colorsData);
      setMaterials(materialsData);
      setSupplies(suppliesData);

      // Definir unidade padrão como Unidade (UN)
      const defaultUnit = unitsData.find(
        (u) => u.code.toUpperCase() === 'UN' || u.name.toLowerCase().includes('unidade')
      ) || (unitsData.length > 0 ? unitsData[0] : null);

      // Definir categoria padrão como Kit
      const defaultKitCategory = catsData.find(
        (c) => c.name.trim().toLowerCase() === 'kit'
      ) || (catsData.length > 0 ? catsData[0] : null);

      setFormData((prev) => ({
        ...prev,
        ...(defaultUnit ? { unit_id: defaultUnit.id } : {}),
        ...(defaultKitCategory ? { category_id: defaultKitCategory.id } : {}),
      }));
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar itens do ateliê.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtragem local dos produtos
  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.color && p.color.toLowerCase().includes(search.toLowerCase())) ||
      (p.material && p.material.toLowerCase().includes(search.toLowerCase()));

    const matchType = selectedType === 'TODOS' || p.item_type === selectedType;
    const matchCategory =
      selectedCategory === 'TODAS' ||
      (p.category_id && p.category_id.toString() === selectedCategory);

    return matchSearch && matchType && matchCategory;
  });

  // Auto-save da memória recente / rascunho de cadastro no localStorage
  useEffect(() => {
    if (!isFormModalOpen || editingProduct) return;

    const hasContent = !!(
      formData.sku?.trim() ||
      formData.name?.trim() ||
      formData.description?.trim() ||
      formData.color?.trim() ||
      formData.size?.trim() ||
      formData.material?.trim() ||
      (formData.sale_price && formData.sale_price !== '' && formData.sale_price !== '0,00') ||
      (formData.unit_cost && formData.unit_cost !== '' && formData.unit_cost !== '0,00' && formData.unit_cost !== '0') ||
      (formData.weight && formData.weight !== '') ||
      formData.category_id ||
      formData.is_kit ||
      hasVariations ||
      formVariations.length > 0 ||
      kitItems.length > 0 ||
      salesLinks.length > 0 ||
      costItems.length > 0
    );

    if (hasContent) {
      const now = new Date();
      const formattedTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const formattedDate = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const draftPayload = {
        savedAt: `${formattedDate} às ${formattedTime}`,
        formData,
        hasVariations,
        formVariations,
        salesLinks,
        costItems,
        kitItems,
      };
      try {
        localStorage.setItem(PRODUCT_CREATE_DRAFT_KEY, JSON.stringify(draftPayload));
      } catch (err) {
        console.warn('Erro ao salvar rascunho de produto no localStorage:', err);
      }
    }
  }, [
    isFormModalOpen,
    editingProduct,
    formData,
    hasVariations,
    formVariations,
    salesLinks,
    costItems,
    kitItems,
  ]);

  // Limpeza explícita do rascunho de novo produto
  const handleClearDraft = () => {
    try {
      localStorage.removeItem(PRODUCT_CREATE_DRAFT_KEY);
    } catch {}
    setDraftRestoredAt(null);

    const defaultUnit = units.find(
      (u) => u.code.toUpperCase() === 'UN' || u.name.toLowerCase().includes('unidade')
    ) || (units.length > 0 ? units[0] : null);

    setHasVariations(false);
    setFormVariations([]);
    setIsQuickGenOpen(false);
    setQuickGenSelectedColors([]);
    setQuickGenSelectedSizes([]);
    setQuickGenCustomColor('');
    setQuickGenCustomSize('');
    setCostItems([]);
    setSalesLinks([]);
    setNewLinkPlatform('Shopee');
    setNewLinkUrl('');
    setKitItems([]);
    setSelectedKitProductId('');
    setSelectedKitVariationId('');
    setSelectedKitQuantity('1');
    setFormData({
      sku: '',
      name: '',
      description: '',
      color: '',
      size: '',
      material: '',
      item_type: 'PRODUTO_ACABADO',
      category_id: null,
      unit_id: defaultUnit ? defaultUnit.id : 1,
      unit_cost: '0,00',
      cost_breakdown: '',
      sales_links: '',
      sale_price: '',
      weight: '',
      min_stock: '0',
      is_active: true,
      is_kit: false,
    });
  };

  // Abertura do formulário de criação/edição
  const handleOpenCreateModal = () => {
    pendingImages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPendingImages([]);
    setDeletedVariationIds([]);
    setFormError(null);
    setEditingProduct(null);

    // Tentar restaurar rascunho recente salvo no localStorage
    let restored = false;
    try {
      const savedDraftStr = localStorage.getItem(PRODUCT_CREATE_DRAFT_KEY);
      if (savedDraftStr) {
        const draft = JSON.parse(savedDraftStr);
        if (draft && draft.formData) {
          const dData = draft.formData;
          const dVars = draft.formVariations || [];
          const dKits = draft.kitItems || [];
          const dLinks = draft.salesLinks || [];
          const dCosts = draft.costItems || [];
          const hasContent = !!(
            dData.sku?.trim() ||
            dData.name?.trim() ||
            dData.description?.trim() ||
            dData.color?.trim() ||
            dData.size?.trim() ||
            dData.material?.trim() ||
            (dData.sale_price && dData.sale_price !== '' && dData.sale_price !== '0,00') ||
            (dData.unit_cost && dData.unit_cost !== '' && dData.unit_cost !== '0,00' && dData.unit_cost !== '0') ||
            (dData.weight && dData.weight !== '') ||
            dData.category_id ||
            dData.is_kit ||
            draft.hasVariations ||
            dVars.length > 0 ||
            dKits.length > 0 ||
            dLinks.length > 0 ||
            dCosts.length > 0
          );

          if (hasContent) {
            setFormData(dData);
            setHasVariations(!!draft.hasVariations);
            setFormVariations(dVars);
            setSalesLinks(dLinks);
            setCostItems(dCosts);
            setKitItems(dKits);
            setSelectedKitProductId('');
            setSelectedKitVariationId('');
            setSelectedKitQuantity('1');
            setIsQuickGenOpen(false);
            setQuickGenSelectedColors([]);
            setQuickGenSelectedSizes([]);
            setQuickGenCustomColor('');
            setQuickGenCustomSize('');
            setDraftRestoredAt(draft.savedAt || 'recentemente');
            restored = true;
          }
        }
      }
    } catch (err) {
      console.warn('Erro ao restaurar rascunho:', err);
    }

    if (!restored) {
      setDraftRestoredAt(null);
      const defaultUnit = units.find(
        (u) => u.code.toUpperCase() === 'UN' || u.name.toLowerCase().includes('unidade')
      ) || (units.length > 0 ? units[0] : null);

      setHasVariations(false);
      setFormVariations([]);
      setIsQuickGenOpen(false);
      setQuickGenSelectedColors([]);
      setQuickGenSelectedSizes([]);
      setQuickGenCustomColor('');
      setQuickGenCustomSize('');
      setCostItems([]);
      setSalesLinks([]);
      setNewLinkPlatform('Shopee');
      setNewLinkUrl('');
      setKitItems([]);
      setSelectedKitProductId('');
      setSelectedKitVariationId('');
      setSelectedKitQuantity('1');
      setFormData({
        sku: '',
        name: '',
        description: '',
        color: '',
        size: '',
        material: '',
        item_type: 'PRODUTO_ACABADO',
        category_id: null,
        unit_id: defaultUnit ? defaultUnit.id : 1,
        unit_cost: '0,00',
        cost_breakdown: '',
        sales_links: '',
        sale_price: '',
        weight: '',
        min_stock: '0',
        is_active: true,
        is_kit: false,
      });
    }

    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = async (prod: Product) => {
    setDraftRestoredAt(null);
    pendingImages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPendingImages([]);
    setDeletedVariationIds([]);
    setFormError(null);
    let parsedCostItems: CostComponentItem[] = [];
    if (prod.cost_breakdown) {
      try {
        parsedCostItems = JSON.parse(prod.cost_breakdown);
      } catch {}
    }
    setCostItems(parsedCostItems);

    let parsedLinks: SalesLinkItem[] = [];
    if (prod.sales_links) {
      try {
        parsedLinks = JSON.parse(prod.sales_links);
      } catch {}
    }
    setSalesLinks(parsedLinks);
    setNewLinkPlatform('Shopee');
    setNewLinkUrl('');

    // Itens do Kit
    let initialKitItems: ProductKitItem[] = prod.kit_items || [];
    if (prod.is_kit && (!prod.kit_items || prod.kit_items.length === 0)) {
      try {
        const fullProd = await api.getProduct(prod.id);
        if (fullProd.kit_items && fullProd.kit_items.length > 0) {
          initialKitItems = fullProd.kit_items;
        }
      } catch (err) {
        console.warn('Erro ao obter detalhes dos componentes do kit:', err);
      }
    }
    setKitItems(initialKitItems);
    setSelectedKitProductId('');
    setSelectedKitVariationId('');
    setSelectedKitQuantity('1');

    setIsQuickGenOpen(false);
    setQuickGenSelectedColors([]);
    setQuickGenSelectedSizes([]);
    setQuickGenCustomColor('');
    setQuickGenCustomSize('');

    if (prod.variations && prod.variations.length > 0) {
      setHasVariations(true);
      setFormVariations(
        prod.variations.map((v) => ({
          id: v.id,
          sku: v.sku,
          variation_name: v.variation_name || '',
          color: v.color || '',
          size: v.size || '',
          material: v.material || '',
          sale_price: v.sale_price != null && v.sale_price !== '' ? Number(v.sale_price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
          unit_cost: v.unit_cost != null && v.unit_cost !== '' ? Number(v.unit_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00',
          initial_stock: v.current_stock != null ? String(Number(v.current_stock)) : '0',
          current_stock: v.current_stock != null ? String(Number(v.current_stock)) : '0',
          min_stock: cleanStockValue(v.min_stock),
          weight: v.weight != null && v.weight !== '' ? String(v.weight) : '',
        }))
      );
    } else {
      setHasVariations(false);
      setFormVariations([]);
    }

    setEditingProduct(prod);
    setFormData({
      sku: prod.sku,
      name: prod.name,
      description: prod.description || '',
      color: prod.color || '',
      size: prod.size || '',
      material: prod.material || '',
      item_type: prod.item_type,
      category_id: prod.category_id || null,
      unit_id: prod.unit_id,
      unit_cost: prod.unit_cost != null ? Number(prod.unit_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00',
      cost_breakdown: prod.cost_breakdown || '',
      sales_links: prod.sales_links || '',
      sale_price: prod.sale_price != null && prod.sale_price !== '' ? Number(prod.sale_price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
      weight: prod.weight != null && prod.weight !== '' ? String(prod.weight) : '',
      min_stock: cleanStockValue(prod.min_stock),
      is_active: prod.is_active,
      is_kit: !!prod.is_kit,
    });
    setIsFormModalOpen(true);
  };

  // Criação rápida de cor
  const handleSaveQuickColor = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickColorName.trim()) return;
    setSavingQuickColor(true);
    setQuickColorError(null);
    try {
      const newColor = await api.createColor(quickColorName.trim(), quickColorHex);
      setColors((prev) => {
        const exists = prev.some((c) => c.name.toLowerCase() === newColor.name.toLowerCase());
        return exists ? prev : [...prev, newColor];
      });

      if (quickColorTargetVarIndex !== null && quickColorTargetVarIndex >= 0) {
        handleUpdateVariation(quickColorTargetVarIndex, 'color', newColor.name);
        setQuickColorTargetVarIndex(null);
      } else {
        setFormData((prev) => ({ ...prev, color: newColor.name }));
        if (hasVariations && formVariations.length === 1) {
          setFormVariations((prev) => {
            const first = prev[0];
            const cleanC = newColor.name.toUpperCase().replace(/\s+/g, '-');
            const cleanS = first.size ? first.size.toUpperCase().replace(/\s+/g, '-') : '';
            const skuBase = formData.sku || 'PROD';
            return [
              {
                ...first,
                color: newColor.name,
                variation_name: first.size ? `${newColor.name} - ${first.size}` : newColor.name,
                sku: `${skuBase}-${cleanC}${cleanS ? `-${cleanS}` : ''}`,
              },
            ];
          });
        }
      }

      setIsQuickColorModalOpen(false);
      setQuickColorName('');
    } catch (err: any) {
      setQuickColorError(err.message || 'Erro ao cadastrar cor.');
    } finally {
      setSavingQuickColor(false);
    }
  };


  // Criação rápida de material
  const handleSaveQuickMaterial = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickMaterialName.trim()) return;
    setSavingQuickMaterial(true);
    setQuickMaterialError(null);
    try {
      const newMat = await api.createMaterial(quickMaterialName.trim(), quickMaterialDesc.trim() || undefined);
      setMaterials((prev) => [...prev, newMat]);
      setFormData((prev) => ({ ...prev, material: newMat.name }));
      setIsQuickMaterialModalOpen(false);
      setQuickMaterialName('');
      setQuickMaterialDesc('');
    } catch (err: any) {
      setQuickMaterialError(err.message || 'Erro ao cadastrar material.');
    } finally {
      setSavingQuickMaterial(false);
    }
  };

  // Helpers para Estilização de Marketplaces
  const getMarketplaceStyle = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('mercado livre') || p.includes('mercadolivre') || p.includes('ml')) {
      return { bg: '#fff159', color: '#2d3277', border: '#e6d840' };
    }
    if (p.includes('shopee')) {
      return { bg: '#ee4d2d', color: '#ffffff', border: '#d73211' };
    }
    if (p.includes('amazon')) {
      return { bg: '#232f3e', color: '#ff9900', border: '#131921' };
    }
    if (p.includes('elo7')) {
      return { bg: '#f58220', color: '#ffffff', border: '#df6e10' };
    }
    if (p.includes('shein')) {
      return { bg: '#111111', color: '#ffffff', border: '#000000' };
    }
    if (p.includes('magalu') || p.includes('magazine')) {
      return { bg: '#0086ff', color: '#ffffff', border: '#006ed6' };
    }
    if (p.includes('instagram')) {
      return { bg: '#e1306c', color: '#ffffff', border: '#c1275b' };
    }
    return { bg: '#f4ede6', color: '#4a3b32', border: '#e1d5ca' };
  };

  const COLOR_PRESETS = [
    'Branco',
    'Natural / Off-White',
    'Baunilha',
    'Lavanda',
    'Rosa Claro',
    'Terracota',
    'Verde Oliva',
    'Azul Sereno',
    'Dourado',
    'Preto',
    'Caramelo',
    'Âmbar',
    'Cinza',
    'Vinho',
  ];

  const getColorHex = (colorName?: string | null): string => {
    if (!colorName) return '#ccc';
    const foundColor = colors.find((c) => c.name.toLowerCase() === colorName.toLowerCase().trim());
    if (foundColor && foundColor.hex_code) {
      return foundColor.hex_code;
    }
    const c = colorName.toLowerCase().trim();
    if (c.includes('branco')) return '#ffffff';
    if (c.includes('natural') || c.includes('cru') || c.includes('off-white')) return '#f7f4ea';
    if (c.includes('baunilha') || c.includes('marfim')) return '#fef3c7';
    if (c.includes('lavanda') || c.includes('lilás') || c.includes('lilas') || c.includes('roxa') || c.includes('roxo')) return '#d8b4fe';
    if (c.includes('rosa')) return '#fbcfe8';
    if (c.includes('terracota') || c.includes('marrom') || c.includes('cobre')) return '#c86d51';
    if (c.includes('verde') || c.includes('oliva') || c.includes('menta')) return '#86efac';
    if (c.includes('azul')) return '#93c5fd';
    if (c.includes('dourad') || c.includes('ouro') || c.includes('amarelo')) return '#fde047';
    if (c.includes('preto') || c.includes('grafite') || c.includes('cinza escuro')) return '#2c2824';
    if (c.includes('cinza') || c.includes('prata')) return '#d1d5db';
    if (c.includes('vermelh') || c.includes('vinho')) return '#f87171';
    if (c.includes('laranja') || c.includes('âmbar') || c.includes('ambar')) return '#fb923c';
    return '#e2d9cf';
  };

  const parseSalesLinks = (raw?: string | null): SalesLinkItem[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // Gestão de Links de Vendas em Marketplaces
  const handleAddSalesLink = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newLinkUrl.trim()) return;

    let formattedUrl = newLinkUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const platformName = newLinkPlatform.trim() || 'Shopee';

    const newLink: SalesLinkItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      platform: platformName,
      url: formattedUrl,
    };

    const updated = [...salesLinks, newLink];
    setSalesLinks(updated);
    setFormData((prev) => ({
      ...prev,
      sales_links: JSON.stringify(updated),
    }));

    setNewLinkUrl('');
  };

  const handleRemoveSalesLink = (id: string) => {
    const updated = salesLinks.filter((link) => link.id !== id);
    setSalesLinks(updated);
    setFormData((prev) => ({
      ...prev,
      sales_links: updated.length > 0 ? JSON.stringify(updated) : '',
    }));
  };

  // Encaminhamento via WhatsApp
  const generateWhatsAppMessage = (prod: Product, selectedLinkOption: string = 'all'): string => {
    const links = parseSalesLinks(prod.sales_links);
    const priceFormatted = prod.sale_price ? `R$ ${Number(prod.sale_price).toFixed(2)}` : null;

    let msg = `Olá! Conheça o produto *${prod.name}* do nosso ateliê ✨\n`;
    if (priceFormatted) {
      msg += `💰 *Valor:* ${priceFormatted}\n`;
    }
    if (prod.color) {
      msg += `🎨 *Cor:* ${prod.color}\n`;
    }
    if (prod.material) {
      msg += `🧱 *Material:* ${prod.material}\n`;
    }
    if (prod.description && prod.description.trim()) {
      const shortDesc =
        prod.description.trim().length > 120
          ? `${prod.description.trim().substring(0, 117)}...`
          : prod.description.trim();
      msg += `📝 ${shortDesc}\n`;
    }

    if (links.length > 0) {
      if (selectedLinkOption === 'all') {
        msg += `\n🛒 *Disponível em nossa(s) loja(s):*\n`;
        links.forEach((l) => {
          msg += `• ${l.platform}: ${l.url}\n`;
        });
      } else {
        const chosen = links.find((l) => l.id === selectedLinkOption);
        if (chosen) {
          msg += `\n🛒 *Acesse e compre pelo link oficial (${chosen.platform}):*\n${chosen.url}\n`;
        }
      }
    }

    msg += `\nQualquer dúvida ou pedido personalizado, estamos à disposição! 🌿`;
    return msg;
  };

  const handleOpenWhatsAppModal = (prod: Product, preferredLinkId?: string) => {
    setWhatsAppProduct(prod);
    const links = parseSalesLinks(prod.sales_links);
    const initialOption = preferredLinkId || (links.length > 0 ? 'all' : 'none');
    setWhatsAppSelectedLink(initialOption);
    setWhatsAppPhone('');
    setCopiedMessage(false);
    setWhatsAppMessage(generateWhatsAppMessage(prod, initialOption));
  };

  const handleWhatsAppLinkChange = (option: string) => {
    setWhatsAppSelectedLink(option);
    if (whatsAppProduct) {
      setWhatsAppMessage(generateWhatsAppMessage(whatsAppProduct, option));
    }
  };

  const handleCopyWhatsAppMessage = async () => {
    try {
      await navigator.clipboard.writeText(whatsAppMessage);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2500);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleSendWhatsApp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!whatsAppProduct) return;

    let cleanPhone = whatsAppPhone.replace(/\D/g, '');
    if (cleanPhone) {
      if ((cleanPhone.length === 10 || cleanPhone.length === 11) && !cleanPhone.startsWith('55')) {
        cleanPhone = `55${cleanPhone}`;
      }
    }

    const encodedText = encodeURIComponent(whatsAppMessage);
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Helper para calcular o subtotal de um item da composição de custo
  const calculateItemSubtotal = (
    qtyStr: string,
    unit: string,
    unitCostNum: number,
    baseCostNum: number,
    baseQtyNum: number
  ): number => {
    const qty = parseFloat(qtyStr.replace(',', '.')) || 0;
    if (qty <= 0) return 0;

    if (unit === '%') {
      const salePriceNum = parseOptionalCurrencyValue(formData.sale_price) || 0;
      return (salePriceNum * qty) / 100;
    }

    if (unit === 'fixo') {
      return baseCostNum || unitCostNum;
    }

    if (unitCostNum > 0) {
      return qty * unitCostNum;
    }

    const bQty = baseQtyNum > 0 ? baseQtyNum : 1;
    return (qty / bQty) * baseCostNum;
  };

  const handleCostItemQuantityChange = (val: string) => {
    setNewCostItemQuantity(val);
    const qty = parseFloat(val.replace(',', '.')) || 0;
    if (newCostItemUnit === 'gr') {
      setNewCostItemWeight(qty > 0 ? String(qty) : '');
    } else if (newCostItemUnit === 'kg') {
      setNewCostItemWeight(qty > 0 ? String(qty * 1000) : '');
    }
  };

  const handleCostItemUnitChange = (u: string) => {
    setNewCostItemUnit(u);
    const qty = parseFloat(newCostItemQuantity.replace(',', '.')) || 0;
    if (u === 'gr') {
      setNewCostItemWeight(qty > 0 ? String(qty) : '');
    } else if (u === 'kg') {
      setNewCostItemWeight(qty > 0 ? String(qty * 1000) : '');
    }
  };

  const handleSelectSupply = (supplyId: string) => {
    setSelectedSupplyId(supplyId);
    if (supplyId === 'new') {
      setQuickSupplyName('');
      setQuickSupplyCategory('Matéria-Prima');
      setQuickSupplyUnit('unid');
      setQuickSupplyBaseQty('1');
      setQuickSupplyBaseCost('');
      setQuickSupplyNotes('');
      setQuickSupplyError(null);
      setIsQuickSupplyModalOpen(true);
      return;
    }
    if (!supplyId || supplyId === 'custom') {
      setNewCostItemName('');
      setNewCostItemUnit('unid');
      setNewCostItemQuantity('1');
      setNewCostItemWeight('');
      setNewCostItemUnitCost('');
      setNewCostItemBaseCost(0);
      setNewCostItemBaseQuantity(1);
      return;
    }

    // Se selecionou um produto acabado já existente no ateliê (composição de Kits)
    if (supplyId.startsWith('prod-')) {
      const pId = Number(supplyId.replace('prod-', ''));
      const prod = products.find((p) => p.id === pId);
      if (prod) {
        setNewCostItemName(prod.name);
        setNewCostItemUnit('unid');
        const uCost = Number(prod.unit_cost) || 0;
        setNewCostItemUnitCost(uCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }));
        setNewCostItemBaseCost(uCost);
        setNewCostItemBaseQuantity(1);
        setNewCostItemQuantity('1');
        const prodW = prod.weight ? Number(prod.weight) : 0;
        setNewCostItemWeight(prodW > 0 ? String(prodW) : '');
      }
      return;
    }

    const sup = supplies.find((s) => s.id === Number(supplyId));
    if (sup) {
      setNewCostItemName(sup.name);
      setNewCostItemUnit(sup.unit || 'unid');
      const bQty = Number(sup.base_quantity) || 1;
      const bCost = Number(sup.base_cost) || 0;
      const uCost = Number(sup.unit_cost) || (bQty > 0 ? bCost / bQty : 0);
      setNewCostItemBaseQuantity(bQty);
      setNewCostItemBaseCost(bCost);
      const qVal = sup.unit === 'gr' ? String(bQty) : (sup.unit === '%' ? String(bQty) : '1');
      setNewCostItemQuantity(qVal);
      setNewCostItemUnitCost(uCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }));
      if (sup.unit === 'gr') {
        setNewCostItemWeight(String(bQty));
      } else if (sup.unit === 'kg') {
        setNewCostItemWeight(String(bQty * 1000));
      } else {
        setNewCostItemWeight('');
      }
    }
  };

  const handleSaveQuickSupply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickSupplyName.trim()) return;
    setSavingQuickSupply(true);
    setQuickSupplyError(null);
    try {
      const baseQtyNum = parseFloat(quickSupplyBaseQty.replace(',', '.')) || 1;
      const baseCostNum = parseFloat(quickSupplyBaseCost.replace(/\./g, '').replace(',', '.')) || 0;
      const unitCostNum = baseQtyNum > 0 ? baseCostNum / baseQtyNum : 0;
      const created = await api.createSupply({
        name: quickSupplyName.trim(),
        category: quickSupplyCategory.trim() || undefined,
        unit: quickSupplyUnit.trim() || 'unid',
        base_quantity: baseQtyNum,
        base_cost: baseCostNum,
        unit_cost: unitCostNum,
        notes: quickSupplyNotes.trim() || undefined,
      });
      setSupplies((prev) => [...prev, created]);
      setSelectedSupplyId(String(created.id));
      setNewCostItemName(created.name);
      setNewCostItemUnit(created.unit || 'unid');
      setNewCostItemBaseQuantity(baseQtyNum);
      setNewCostItemBaseCost(baseCostNum);
      setNewCostItemQuantity(created.unit === 'gr' ? String(baseQtyNum) : '1');
      setNewCostItemWeight(created.unit === 'gr' ? String(baseQtyNum) : (created.unit === 'kg' ? String(baseQtyNum * 1000) : ''));
      setNewCostItemUnitCost(unitCostNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }));
      setIsQuickSupplyModalOpen(false);
    } catch (err: any) {
      setQuickSupplyError(err.message || 'Erro ao cadastrar insumo.');
    } finally {
      setSavingQuickSupply(false);
    }
  };

  // Gestão de Itens de Custo Estimado Individual
  const handleAddCostItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCostItemName.trim()) return;
    const qty = parseFloat(newCostItemQuantity.replace(',', '.')) || 1;
    const unitPrice = parseCurrencyValue(newCostItemUnitCost);
    const itemWeight = parseFloat(newCostItemWeight.replace(',', '.')) || 0;
    const subtotal = calculateItemSubtotal(
      newCostItemQuantity,
      newCostItemUnit,
      unitPrice,
      newCostItemBaseCost,
      newCostItemBaseQuantity
    );

    const newItem: CostComponentItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newCostItemName.trim(),
      quantity: qty,
      unit: newCostItemUnit,
      unit_cost: unitPrice,
      total: Number(subtotal.toFixed(2)),
      weight: itemWeight > 0 ? itemWeight : undefined,
    };

    const updated = [...costItems, newItem];
    setCostItems(updated);
    setSelectedSupplyId('');
    setNewCostItemName('');
    setNewCostItemQuantity('1');
    setNewCostItemUnit('unid');
    setNewCostItemWeight('');
    setNewCostItemUnitCost('');
    setNewCostItemBaseCost(0);
    setNewCostItemBaseQuantity(1);

    // Atualiza automaticamente o custo estimado e peso com a soma de todos os itens
    const totalSum = updated.reduce((acc, item) => acc + item.total, 0);
    const totalWeight = updated.reduce((acc, item) => acc + (item.weight || 0), 0);
    setFormData((prev) => ({
      ...prev,
      unit_cost: totalSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      ...(totalWeight > 0 ? { weight: String(totalWeight) } : {}),
      cost_breakdown: JSON.stringify(updated),
    }));
  };

  const handleRemoveCostItem = (id: string) => {
    const updated = costItems.filter((item) => item.id !== id);
    setCostItems(updated);
    const totalSum = updated.reduce((acc, item) => acc + item.total, 0);
    const totalWeight = updated.reduce((acc, item) => acc + (item.weight || 0), 0);
    setFormData((prev) => ({
      ...prev,
      unit_cost: totalSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      ...(totalWeight > 0 ? { weight: String(totalWeight) } : (prev.weight ? { weight: prev.weight } : {})),
      cost_breakdown: JSON.stringify(updated),
    }));
  };

  const handleApplyCalculatedCost = () => {
    const totalSum = costItems.reduce((acc, item) => acc + item.total, 0);
    const totalWeight = costItems.reduce((acc, item) => acc + (item.weight || 0), 0);
    setFormData((prev) => ({
      ...prev,
      unit_cost: totalSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      ...(totalWeight > 0 ? { weight: String(totalWeight) } : {}),
      cost_breakdown: JSON.stringify(costItems),
    }));
    setIsCostCalculatorOpen(false);
  };

  // Gestão de Fotos para Upload no Formulário
  const handleSelectPendingImages = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setFormError(null);

    const existingCount = (editingProduct?.images?.length || 0) + pendingImages.length;
    const maxAllowed = 10;

    const validFiles: PendingImage[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file, index) => {
      if (existingCount + validFiles.length >= maxAllowed) {
        errors.push(`Limite de ${maxAllowed} fotos atingido.`);
        return;
      }

      const ext = file.name.split('.').pop()?.toLowerCase();
      const isValidType =
        ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type) ||
        ['jpg', 'jpeg', 'png', 'webp', 'jfif'].includes(ext || '');

      if (!isValidType) {
        errors.push(`"${file.name}": Formato inválido (use JPG, PNG ou WebP).`);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        errors.push(`"${file.name}": Excede o limite máximo de 10 MB.`);
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      const isFirst = existingCount === 0 && validFiles.length === 0;

      validFiles.push({
        id: `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl,
        isPrimary: isFirst,
      });
    });

    if (errors.length > 0) {
      setFormError(errors.join(' '));
    }

    if (validFiles.length > 0) {
      setPendingImages((prev) => [...prev, ...validFiles]);
    }
  };

  const handleRemovePendingImage = (id: string) => {
    setPendingImages((prev) => {
      const itemToRemove = prev.find((p) => p.id === id);
      if (itemToRemove) {
        URL.revokeObjectURL(itemToRemove.previewUrl);
      }
      const remaining = prev.filter((p) => p.id !== id);
      if (itemToRemove?.isPrimary && remaining.length > 0 && (!editingProduct || editingProduct.images.length === 0)) {
        remaining[0].isPrimary = true;
      }
      return remaining;
    });
  };

  const handleSetPendingPrimary = (id: string) => {
    setPendingImages((prev) =>
      prev.map((item) => ({
        ...item,
        isPrimary: item.id === id,
      }))
    );
  };

  const handleDeleteExistingImageInEdit = async (imageId: number) => {
    if (!editingProduct) return;
    if (!confirm('Deseja remover esta foto do produto?')) return;
    try {
      await api.deleteProductImage(editingProduct.id, imageId);
      const updated = await api.getProduct(editingProduct.id);
      setEditingProduct(updated);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao remover foto.');
    }
  };

  const handleSetExistingPrimaryInEdit = async (imageId: number) => {
    if (!editingProduct) return;
    try {
      await api.setPrimaryImage(editingProduct.id, imageId);
      const updated = await api.getProduct(editingProduct.id);
      setEditingProduct(updated);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao definir foto principal.');
    }
  };

  // Manipulação e cálculos de Kit de Produtos
  const handleAddKitItem = () => {
    if (!selectedKitProductId) return;
    const prodId = Number(selectedKitProductId);
    const parentProduct = products.find((p) => p.id === prodId);
    if (!parentProduct) return;

    // Se o produto pai possuir variações cadastradas, a variação/cor específica deve ser selecionada
    let targetComponentId = prodId;
    let targetComponentProduct: any = parentProduct;

    if (parentProduct.variations && parentProduct.variations.length > 0) {
      if (!selectedKitVariationId) {
        alert('Por favor, selecione a cor / variação específica da peça para adicionar ao kit.');
        return;
      }
      const varId = Number(selectedKitVariationId);
      const variation = parentProduct.variations.find((v) => v.id === varId);
      if (!variation) {
        alert('Variação de cor selecionada não encontrada.');
        return;
      }
      targetComponentId = varId;
      targetComponentProduct = {
        id: variation.id,
        sku: variation.sku,
        name: parentProduct.name,
        variation_name: variation.variation_name || variation.color,
        unit_cost: variation.unit_cost != null ? variation.unit_cost : parentProduct.unit_cost,
        sale_price: variation.sale_price != null ? variation.sale_price : parentProduct.sale_price,
        weight: variation.weight != null ? variation.weight : parentProduct.weight,
        color: variation.color || variation.variation_name || parentProduct.color,
        material: variation.material || parentProduct.material,
        is_active: variation.is_active,
        current_stock: variation.current_stock,
      };
    } else {
      targetComponentProduct = {
        id: parentProduct.id,
        sku: parentProduct.sku,
        name: parentProduct.name,
        variation_name: parentProduct.variation_name,
        unit_cost: parentProduct.unit_cost,
        sale_price: parentProduct.sale_price,
        weight: parentProduct.weight,
        color: parentProduct.color,
        material: parentProduct.material,
        is_active: parentProduct.is_active,
        current_stock: parentProduct.current_stock,
      };
    }

    const qty = Math.max(1, parseFloat(selectedKitQuantity.replace(',', '.')) || 1);

    setKitItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.component_product_id === targetComponentId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        const currentQty = typeof updated[existingIndex].quantity === 'string'
          ? parseFloat(updated[existingIndex].quantity as string) || 0
          : (updated[existingIndex].quantity as number) || 0;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: currentQty + qty,
        };
        return updated;
      }

      return [
        ...prev,
        {
          component_product_id: targetComponentId,
          quantity: qty,
          component_product: targetComponentProduct,
        },
      ];
    });

    setSelectedKitProductId('');
    setSelectedKitVariationId('');
    setSelectedKitQuantity('1');
  };

  const handleRemoveKitItem = (index: number) => {
    setKitItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateKitItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveKitItem(index);
      return;
    }
    setKitItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: newQty };
      return updated;
    });
  };

  const totalKitPieces = kitItems.reduce((acc, it) => acc + (parseFloat(String(it.quantity)) || 0), 0);

  const totalKitCost = kitItems.reduce((acc, it) => {
    const cost = typeof it.component_product?.unit_cost === 'number'
      ? it.component_product.unit_cost
      : parseFloat(String(it.component_product?.unit_cost || '0')) || 0;
    const qty = parseFloat(String(it.quantity)) || 0;
    return acc + (cost * qty);
  }, 0);

  const totalKitAvulsoPrice = kitItems.reduce((acc, it) => {
    const price = typeof it.component_product?.sale_price === 'number'
      ? it.component_product.sale_price
      : parseFloat(String(it.component_product?.sale_price || '0')) || 0;
    const qty = parseFloat(String(it.quantity)) || 0;
    return acc + (price * qty);
  }, 0);

  const totalKitWeight = kitItems.reduce((acc, it) => {
    const w = typeof it.component_product?.weight === 'number'
      ? it.component_product.weight
      : parseFloat(String(it.component_product?.weight || '0')) || 0;
    const qty = parseFloat(String(it.quantity)) || 0;
    return acc + (w * qty);
  }, 0);

  const kitSalePriceNum = parseOptionalCurrencyValue(formData.sale_price) || 0;
  const kitEconomyDiff = totalKitAvulsoPrice > 0 && kitSalePriceNum > 0 ? totalKitAvulsoPrice - kitSalePriceNum : 0;
  const kitDiscountPct = totalKitAvulsoPrice > 0 && kitSalePriceNum > 0 && kitEconomyDiff > 0
    ? (kitEconomyDiff / totalKitAvulsoPrice) * 100
    : 0;

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    setFormError(null);

    // Validação de Kit
    if (formData.is_kit && kitItems.length === 0) {
      setFormError('Por favor, adicione pelo menos um produto componente ao kit antes de salvar.');
      setSavingProduct(false);
      return;
    }

    try {
      // Auto-commit de link de marketplace digitado caso o usuário não tenha clicado no botão "+ Adicionar Canal"
      let currentSalesLinks = [...salesLinks];
      if (newLinkUrl.trim()) {
        let formattedUrl = newLinkUrl.trim();
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
          formattedUrl = `https://${formattedUrl}`;
        }
        const platformName = newLinkPlatform.trim() || 'Shopee';
        currentSalesLinks.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          platform: platformName,
          url: formattedUrl,
        });
        setSalesLinks(currentSalesLinks);
        setNewLinkUrl('');
      }

      const productPayload: ProductFormData = {
        ...formData,
        is_kit: !!formData.is_kit,
        kit_items: formData.is_kit
          ? kitItems.map((item) => ({
              component_product_id: item.component_product_id,
              quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity.replace(',', '.')) || 1 : item.quantity,
            }))
          : [],
        unit_cost: parseCurrencyValue(formData.unit_cost),
        sale_price: parseOptionalCurrencyValue(formData.sale_price),
        weight: formData.weight ? parseFloat(String(formData.weight).replace(',', '.')) : null,
        min_stock: parseStockValue(formData.min_stock),
        color: formData.color?.trim() || undefined,
        size: formData.size?.trim() || undefined,
        material: formData.material?.trim() || undefined,
        sales_links: currentSalesLinks.length > 0 ? JSON.stringify(currentSalesLinks) : '',
      };

      if (hasVariations) {
        if (formVariations.length === 0) {
          setFormError('Você marcou que o produto possui variações, mas nenhuma foi cadastrada. Adicione ao menos uma variação ou desmarque a opção.');
          setSavingProduct(false);
          return;
        }

        productPayload.variations = formVariations.map((v) => ({
          ...v,
          sku: v.sku.trim().toUpperCase(),
          variation_name: v.variation_name.trim(),
          color: v.color?.trim() || undefined,
          size: v.size?.trim() || undefined,
          material: v.material?.trim() || undefined,
          sale_price: parseOptionalCurrencyValue(v.sale_price) ?? (productPayload.sale_price ? Number(productPayload.sale_price) : null),
          unit_cost: parseOptionalCurrencyValue(v.unit_cost) ?? Number(productPayload.unit_cost || 0),
          initial_stock: parseStockValue(v.initial_stock),
          min_stock: parseStockValue(v.min_stock || 0),
          weight: v.weight ? parseFloat(String(v.weight).replace(',', '.')) : null,
        }));
      }

      if (editingProduct && deletedVariationIds.length > 0) {
        // Exclui diretamente variações removidas na interface
        await Promise.allSettled(deletedVariationIds.map((delId) => api.deleteProduct(delId)));
      }

      let savedProduct: Product;
      if (editingProduct) {
        savedProduct = await api.updateProduct(editingProduct.id, productPayload);
      } else {
        savedProduct = await api.createProduct(productPayload);
      }

      // Se há fotos selecionadas para upload
      if (pendingImages.length > 0) {
        const filesToUpload = pendingImages.map((p) => p.file);
        let anyUploaded = false;
        let lastUploadError: string | null = null;
        try {
          const uploadedImages = await api.uploadProductImagesBatch(savedProduct.id, filesToUpload);
          anyUploaded = true;
          const primaryIndex = pendingImages.findIndex((p) => p.isPrimary);
          if (primaryIndex > 0 && uploadedImages[primaryIndex]) {
            await api.setPrimaryImage(savedProduct.id, uploadedImages[primaryIndex].id);
          }
        } catch (batchErr: any) {
          console.warn('Upload em lote falhou, tentando upload individual resiliente:', batchErr);
          lastUploadError = batchErr.message || 'Falha no upload em lote';
          // Fallback individual
          for (let i = 0; i < pendingImages.length; i++) {
            try {
              const uploaded = await api.uploadProductImage(savedProduct.id, pendingImages[i].file);
              anyUploaded = true;
              if (pendingImages[i].isPrimary && i > 0) {
                await api.setPrimaryImage(savedProduct.id, uploaded.id);
              }
            } catch (singleErr: any) {
              console.error(`Erro no envio da foto ${pendingImages[i].file.name}:`, singleErr);
              lastUploadError = singleErr.message || lastUploadError;
            }
          }
        }

        if (!anyUploaded && pendingImages.length > 0) {
          alert(`Aviso: O produto foi salvo, mas as fotos não puderam ser enviadas. Motivo: ${lastUploadError || 'Erro de comunicação com o servidor'}`);
        }
      }

      pendingImages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPendingImages([]);
      setIsFormModalOpen(false);
      if (!editingProduct) {
        try {
          localStorage.removeItem(PRODUCT_CREATE_DRAFT_KEY);
        } catch {}
        setDraftRestoredAt(null);
      }
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar produto.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleToggleStatus = async (prod: Product) => {
    try {
      await api.toggleProductStatus(prod.id, !prod.is_active);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status.');
    }
  };

  const handleDeleteProduct = async (prod: Product) => {
    const confirmDelete = confirm(
      `Deseja realmente excluir permanentemente o item "${prod.name}" (SKU: ${prod.sku})?\n\nEsta ação removerá o produto, suas fotos e registros associados do catálogo.`
    );
    if (!confirmDelete) return;

    try {
      await api.deleteProduct(prod.id);
      if (editingProduct?.id === prod.id) {
        setIsFormModalOpen(false);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir produto.');
    }
  };

  // Gerenciamento de Fotos
  const handleOpenImageModal = (prod: Product) => {
    setImageModalProduct(prod);
    setImageError(null);
    setIsImageModalOpen(true);
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !imageModalProduct) return;

    setImageError(null);
    setUploadingImage(true);
    try {
      const fileList = Array.from(files);
      if (imageModalProduct.images.length + fileList.length > 10) {
        setImageError(`Limite de 10 fotos por produto atingido. O produto já possui ${imageModalProduct.images.length} fotos.`);
        return;
      }
      if (fileList.length === 1) {
        await api.uploadProductImage(imageModalProduct.id, fileList[0]);
      } else {
        try {
          await api.uploadProductImagesBatch(imageModalProduct.id, fileList);
        } catch {
          for (const f of fileList) {
            await api.uploadProductImage(imageModalProduct.id, f);
          }
        }
      }
      const updatedProduct = await api.getProduct(imageModalProduct.id);
      setImageModalProduct(updatedProduct);
      await loadData();
    } catch (err: any) {
      console.error('Erro no upload de foto(s):', err);
      setImageError(err.message || 'Erro ao enviar imagem(ns).');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSetPrimary = async (imageId: number) => {
    if (!imageModalProduct) return;
    try {
      await api.setPrimaryImage(imageModalProduct.id, imageId);
      const updatedProduct = await api.getProduct(imageModalProduct.id);
      setImageModalProduct(updatedProduct);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao definir imagem principal.');
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!imageModalProduct) return;
    if (!confirm('Deseja realmente remover esta foto?')) return;
    try {
      await api.deleteProductImage(imageModalProduct.id, imageId);
      const updatedProduct = await api.getProduct(imageModalProduct.id);
      setImageModalProduct(updatedProduct);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir imagem.');
    }
  };

  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Barra de Estatísticas Rápidas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            TOTAL DE ITENS
          </span>
          <h3 style={{ fontSize: '1.8rem', marginTop: '4px', color: 'var(--brand-primary)' }}>
            {products.length}
          </h3>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            PRODUTOS ACABADOS (VENDA)
          </span>
          <h3 style={{ fontSize: '1.8rem', marginTop: '4px', color: 'var(--brand-accent)' }}>
            {products.filter((p) => p.item_type === 'PRODUTO_ACABADO').length}
          </h3>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            MATÉRIAS-PRIMAS & INSUMOS
          </span>
          <h3 style={{ fontSize: '1.8rem', marginTop: '4px', color: 'var(--brand-primary)' }}>
            {products.filter((p) => p.item_type === 'MATERIA_PRIMA').length}
          </h3>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            EMBALAGENS & AUXILIARES
          </span>
          <h3 style={{ fontSize: '1.8rem', marginTop: '4px', color: 'var(--text-primary)' }}>
            {products.filter((p) => p.item_type === 'EMBALAGEM' || p.item_type === 'MATERIAL_AUXILIAR').length}
          </h3>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div style={{ position: 'relative', minWidth: '260px', flex: 1 }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)',
              }}
            />
            <input
              type="text"
              placeholder="Buscar por nome ou SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{ width: 'auto', minWidth: '180px' }}
          >
            <option value="TODOS">Todos os Tipos</option>
            {itemTypes.length > 0 ? (
              itemTypes.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name}
                </option>
              ))
            ) : (
              <>
                <option value="PRODUTO_ACABADO">Produtos Acabados</option>
                <option value="MATERIA_PRIMA">Matérias-Primas</option>
                <option value="EMBALAGEM">Embalagens</option>
                <option value="MATERIAL_AUXILIAR">Materiais Auxiliares</option>
              </>
            )}
          </select>

          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ width: 'auto', minWidth: '170px' }}
            >
              <option value="TODAS">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id.toString()}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Seletor de Modo de Exibição: Tabela ou Grade */}
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: 'var(--bg-sand-light)',
              borderRadius: 'var(--radius-sm)',
              padding: '3px',
              border: '1px solid var(--border-subtle)',
              marginRight: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 11px',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                backgroundColor: viewMode === 'table' ? '#fff' : 'transparent',
                color: viewMode === 'table' ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Visualizar em Tabela detalhada"
            >
              <List size={15} />
              <span>Tabela</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 11px',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                backgroundColor: viewMode === 'grid' ? '#fff' : 'transparent',
                color: viewMode === 'grid' ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Visualizar em Grade de Cards com Fotos"
            >
              <LayoutGrid size={15} />
              <span>Grade</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsCatalogModalOpen(true)}
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#fff',
              borderColor: 'var(--brand-accent)',
              color: 'var(--brand-accent)',
              fontWeight: 600,
            }}
            title="Gerar e exportar catálogo de produtos em PDF elegante para compartilhar"
          >
            <FileText size={17} />
            <span>Gerar Catálogo PDF</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setQuickColorTargetVarIndex(null);
              setQuickColorName('');
              setQuickColorHex('#d1d5db');
              setQuickColorError(null);
              setIsQuickColorModalOpen(true);
            }}
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#fff',
              fontWeight: 600,
            }}
            title="Cadastrar nova cor para uso em produtos e variações"
          >
            <Palette size={17} color="var(--brand-accent)" />
            <span>Cadastrar Cor</span>
          </button>

          <button onClick={handleOpenCreateModal} className="btn-primary">
            <Plus size={18} />
            <span>Novo Produto</span>

          </button>
        </div>
      </div>

      {/* Conteúdo Principal: Tabela ou Grade de Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Loader2 size={32} className="spin-animation" color="var(--brand-accent)" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Carregando catálogo do ateliê...</p>
        </div>
      ) : error ? (
        <div
          style={{
            padding: '24px',
            backgroundColor: 'var(--status-danger-bg)',
            border: '1px solid var(--status-danger-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--status-danger-text)',
            textAlign: 'center',
          }}
        >
          <AlertCircle size={28} style={{ margin: '0 auto 8px' }} />
          <p style={{ fontWeight: 600 }}>{error}</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'var(--text-secondary)',
          }}
        >
          <Package size={42} color="var(--text-tertiary)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.3rem', color: 'var(--brand-primary)', marginBottom: '4px' }}>
            Nenhum item encontrado
          </h3>
          <p style={{ fontSize: '0.9rem', marginBottom: '18px' }}>
            Tente ajustar os filtros ou cadastre um novo produto/insumo para começar.
          </p>
          <button onClick={handleOpenCreateModal} className="btn-secondary">
            <Plus size={16} />
            <span>Cadastrar Primeiro Produto</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Visualização em Grade de Cards (Vitrine com Fotos em Destaque) */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: '20px',
          }}
        >
          {filteredProducts.map((prod) => {
            const selectedVarId = selectedVariationMap[prod.id];
            const activeVar = prod.variations?.find((v) => v.id === selectedVarId) || null;

            // Imagem ativa (da variação selecionada ou capa do produto pai)
            const rawPrimary =
              activeVar?.primary_image_url ||
              (activeVar?.images && activeVar.images.length > 0
                ? activeVar.images.find((i) => i.is_primary)?.url || activeVar.images[0].url || activeVar.images[0].file_path
                : null) ||
              prod.primary_image_url ||
              (prod.images && prod.images.length > 0
                ? prod.images.find((i) => i.is_primary)?.url || prod.images[0].url || prod.images[0].file_path
                : null);
            const hasImage = !!rawPrimary;
            const primaryImageUrl = getProductImageUrl(rawPrimary);

            // Dados dinâmicos da variação ou do produto principal
            const displaySku = activeVar ? activeVar.sku : prod.sku;
            const displayCost = activeVar?.unit_cost !== null && activeVar?.unit_cost !== undefined ? activeVar.unit_cost : prod.unit_cost;
            const displayPrice = activeVar?.sale_price !== null && activeVar?.sale_price !== undefined ? activeVar.sale_price : prod.sale_price;
            const displayColor = activeVar ? (activeVar.color || activeVar.variation_name) : prod.color;
            const displayStockItem = activeVar || prod;

            return (
              <div
                key={prod.id}
                className="card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                }}
                onClick={() => handleOpenPreviewModal(prod)}
                title="Clique para visualizar detalhes do produto"
              >
                {/* Imagem de Capa do Produto */}
                <div
                  style={{
                    position: 'relative',
                    height: '210px',
                    backgroundColor: 'var(--bg-sand-light)',
                    cursor: 'pointer',
                    overflow: 'hidden',
                  }}
                  onClick={() => handleOpenPreviewModal(prod)}
                >
                  {hasImage ? (
                    <img
                      src={primaryImageUrl}
                      alt={prod.name}
                      loading="lazy"
                      onError={handleImageError}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        transition: 'transform 0.3s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      <ImageIcon size={38} opacity={0.5} />
                      <span style={{ fontSize: '0.8rem' }}>Sem foto cadastrada</span>
                    </div>
                  )}

                  {/* Badges superiores na foto */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      zIndex: 2,
                    }}
                  >
                    <Badge type={prod.item_type} />
                    {prod.is_kit && (
                      <span
                        style={{
                          backgroundColor: '#f59e0b',
                          color: '#ffffff',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-xs)',
                          boxShadow: '0 1px 3px rgba(245, 158, 11, 0.35)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        🎁 KIT {prod.kit_items && prod.kit_items.length > 0 ? `(${prod.kit_items.length})` : ''}
                      </span>
                    )}
                    {prod.category && (
                      <span
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.94)',
                          color: 'var(--brand-primary)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-xs)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                        }}
                      >
                        {prod.category.name}
                      </span>
                    )}
                    {prod.variations && prod.variations.length > 0 && (
                      <span
                        style={{
                          backgroundColor: '#fff5f0',
                          color: '#ee4d2d',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid #ffdcd4',
                          boxShadow: '0 1px 3px rgba(238,77,45,0.15)',
                        }}
                      >
                        🛍️ {prod.variations.length} variações
                      </span>
                    )}
                  </div>

                  {/* Badge inferior com contador de fotos */}
                  {prod.images.length > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        backgroundColor: 'rgba(0, 0, 0, 0.72)',
                        color: '#fff',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-xs)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        backdropFilter: 'blur(2px)',
                        zIndex: 2,
                      }}
                    >
                      <ImageIcon size={12} />
                      {prod.images.length} {prod.images.length === 1 ? 'foto' : 'fotos'}
                    </span>
                  )}
                </div>

                {/* Carrossel de Miniaturas extras se tiver mais de 1 foto */}
                {prod.images.length > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '6px',
                      padding: '8px 14px',
                      backgroundColor: 'var(--bg-sand-light)',
                      borderBottom: '1px solid var(--border-subtle)',
                      overflowX: 'auto',
                    }}
                  >
                    {prod.images.map((img, idx) => (
                      <div
                        key={img.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxProduct(prod);
                          setLightboxIndex(idx);
                        }}
                        style={{
                          position: 'relative',
                          width: '38px',
                          height: '38px',
                          borderRadius: 'var(--radius-xs)',
                          overflow: 'hidden',
                          flexShrink: 0,
                          cursor: 'pointer',
                          border: img.is_primary ? '2px solid var(--brand-accent)' : '1px solid var(--border-subtle)',
                        }}
                        title={img.is_primary ? 'Foto de Capa (Principal)' : `Foto ${idx + 1}`}
                      >
                        <img
                          src={getProductImageUrl(img.url || img.file_path)}
                          alt={img.original_filename}
                          loading="lazy"
                          onError={handleImageError}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        {img.is_primary && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '1px',
                              right: '1px',
                              backgroundColor: 'var(--brand-accent)',
                              borderRadius: '50%',
                              width: '10px',
                              height: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Star size={6} fill="#fff" color="#fff" />
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Dados do Produto no Card */}
                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                    <h4
                      style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'var(--brand-primary)',
                        margin: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      {prod.name}
                    </h4>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.72rem',
                        color: 'var(--text-tertiary)',
                        backgroundColor: 'var(--bg-sand-light)',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-xs)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {displaySku}
                    </span>
                  </div>

                  {/* Categoria, Material e Cor do Produto na Vitrine */}
                  {(prod.category || prod.material || displayColor) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {prod.category && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '1px 7px',
                            borderRadius: '10px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            backgroundColor: 'var(--bg-sand-light)',
                            color: 'var(--brand-primary)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {prod.category.name}
                        </span>
                      )}
                      {prod.material && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '1px 7px',
                            borderRadius: '10px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            backgroundColor: 'var(--bg-tertiary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-subtle)',
                          }}
                          title={`Material: ${prod.material}`}
                        >
                          🧱 {prod.material}
                        </span>
                      )}
                      {displayColor && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '1px 7px',
                            borderRadius: '10px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            backgroundColor: '#ffffff',
                            color: 'var(--brand-primary)',
                            border: '1px solid var(--border-subtle)',
                          }}
                          title={`Cor: ${displayColor}`}
                        >
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: getColorHex(displayColor),
                              border: '1px solid rgba(0,0,0,0.2)',
                              display: 'inline-block',
                            }}
                          />
                          <span>{displayColor}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Seletor de Variações estilo Shopee no Card */}
                  {prod.variations && prod.variations.length > 0 && (
                    <div style={{ marginTop: '4px', marginBottom: '10px' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Variações ({prod.variations.length}):
                        </span>
                        {selectedVarId ? (
                          <button
                            type="button"
                            onClick={() => setSelectedVariationMap((prev) => ({ ...prev, [prod.id]: null }))}
                            style={{
                              fontSize: '0.68rem',
                              color: 'var(--brand-accent)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              fontWeight: 600,
                              textDecoration: 'underline',
                            }}
                          >
                            Ver estoque total
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.66rem', color: 'var(--text-tertiary)' }}>
                            Toque para ver cor/foto
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {prod.variations.map((v) => {
                          const isSelected = selectedVarId === v.id;
                          const vStock = Number(v.current_stock || 0);
                          const isOutOfStock = vStock <= 0;
                          const colorHex = getColorHex(v.color || v.variation_name);

                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => {
                                setSelectedVariationMap((prev) => ({
                                  ...prev,
                                  [prod.id]: isSelected ? null : v.id,
                                }));
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: isSelected ? 700 : 500,
                                backgroundColor: isSelected ? '#fff5f0' : '#ffffff',
                                color: isSelected ? '#ee4d2d' : isOutOfStock ? 'var(--text-tertiary)' : 'var(--text-primary)',
                                border: isSelected ? '1.5px solid #ee4d2d' : '1px solid var(--border-subtle)',
                                boxShadow: isSelected ? '0 1px 4px rgba(238, 77, 45, 0.25)' : 'none',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              title={`${v.variation_name || v.color} - Estoque: ${vStock.toFixed(2)} UN (SKU: ${v.sku})`}
                            >
                              {colorHex && (
                                <span
                                  style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: colorHex,
                                    border: '1px solid rgba(0,0,0,0.2)',
                                    display: 'inline-block',
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                              <span>{v.variation_name || v.color || v.sku}</span>
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 600,
                                  color: isSelected ? '#ee4d2d' : isOutOfStock ? '#dc2626' : 'var(--text-secondary)',
                                  paddingLeft: '2px',
                                }}
                              >
                                ({vStock.toFixed(2)} un)
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {prod.description && (
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        margin: '0 0 12px',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {prod.description}
                    </p>
                  )}

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: displayStockItem.weight && Number(displayStockItem.weight) > 0 ? '1fr 1fr 1fr' : '1fr 1fr',
                      gap: '8px',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-sand-light)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '14px',
                      marginTop: 'auto',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                        Custo Estimado
                      </span>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        R$ {Number(displayCost).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                        Preço Venda
                      </span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--brand-accent)' }}>
                        {displayPrice ? `R$ ${Number(displayPrice).toFixed(2)}` : '—'}
                      </span>
                    </div>
                    {displayStockItem.weight && Number(displayStockItem.weight) > 0 && (
                      <div>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                          Peso
                        </span>
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0d9488' }}>
                          {formatWeight(displayStockItem.weight)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Badges de Links de Vendas nos Marketplaces no Card */}
                  {(() => {
                    const links = parseSalesLinks(prod.sales_links);
                    if (links.length === 0) return null;
                    return (
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '5px', marginBottom: '12px' }}>
                        {links.map((link) => {
                          const style = getMarketplaceStyle(link.platform);
                          return (
                            <a
                              key={link.id}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 7px',
                                borderRadius: '3px',
                                backgroundColor: style.bg,
                                color: style.color,
                                border: `1px solid ${style.border}`,
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                textDecoration: 'none',
                              }}
                              title={`Abrir anúncio: ${link.platform}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span>{link.platform}</span>
                              <ExternalLink size={10} />
                            </a>
                          );
                        })}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenWhatsAppModal(prod);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 7px',
                            borderRadius: '3px',
                            backgroundColor: '#e8f9ee',
                            color: '#128c7e',
                            border: '1px solid #a3e9b9',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          title="Encaminhar link(s) da loja via WhatsApp"
                        >
                          <WhatsAppIcon size={12} color="#25D366" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    );
                  })()}

                  <div
                    style={{
                      paddingTop: '10px',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {/* Linha 1: Estoque e Status do Produto perfeitamente alinhados */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          Estoque:
                        </span>
                        {renderStockDisplay(displayStockItem, true)}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(prod);
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        title="Alternar status (Ativo / Inativo)"
                      >
                        <Badge status={prod.is_active ? 'active' : 'inactive'} />
                      </button>
                    </div>

                    {/* Linha 2: Barra de Ações em Grid de 6 colunas, sem corte ou overflow */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, 1fr)',
                        gap: '6px',
                        width: '100%',
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPreviewModal(prod);
                        }}
                        className="btn-icon"
                        style={{ width: '100%', height: '34px' }}
                        title="Visualizar Informações Rápidas"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVariationManageModalProduct(prod);
                        }}
                        className="btn-icon"
                        title="Variações e Subprodutos estilo Shopee (Cores, Modelos)"
                        style={{
                          width: '100%',
                          height: '34px',
                          position: 'relative',
                          color: prod.variations && prod.variations.length > 0 ? '#ee4d2d' : undefined,
                          backgroundColor: prod.variations && prod.variations.length > 0 ? '#fff5f0' : undefined,
                          borderColor: prod.variations && prod.variations.length > 0 ? '#ffdcd4' : undefined,
                        }}
                      >
                        <Layers size={15} />
                        {prod.variations && prod.variations.length > 0 && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '-3px',
                              right: '-3px',
                              backgroundColor: '#ee4d2d',
                              color: '#fff',
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              width: '14px',
                              height: '14px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {prod.variations.length}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenWhatsAppModal(prod);
                        }}
                        className="btn-icon"
                        title="Encaminhar produto / link de loja via WhatsApp"
                        style={{
                          width: '100%',
                          height: '34px',
                          color: '#15803d',
                          backgroundColor: '#e8f9ee',
                          borderColor: '#a3e9b9',
                        }}
                      >
                        <WhatsAppIcon size={15} color="#25D366" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenImageModal(prod);
                        }}
                        className="btn-icon"
                        title="Gerenciar Fotos"
                        style={{ width: '100%', height: '34px', position: 'relative' }}
                      >
                        <ImageIcon size={15} />
                        {prod.images.length > 0 && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '-3px',
                              right: '-3px',
                              backgroundColor: 'var(--brand-accent)',
                              color: '#fff',
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              width: '14px',
                              height: '14px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {prod.images.length}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(prod);
                        }}
                        className="btn-icon"
                        style={{ width: '100%', height: '34px' }}
                        title="Editar Item"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProduct(prod);
                        }}
                        className="btn-icon"
                        title="Excluir Item"
                        style={{ width: '100%', height: '34px', color: 'var(--status-danger-text)' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Visualização em Tabela Detalhada com Coluna de Fotos Aprimorada */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-sand-light)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>FOTOS</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>ITEM / SKU</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>TIPO</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>CATEGORIA</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>CUSTO ESTIMADO</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>PREÇO VENDA</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>ESTOQUE TOTAL</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>STATUS</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((prod) => {
                  const rawPrimary =
                    prod.primary_image_url ||
                    (prod.images && prod.images.length > 0
                      ? prod.images.find((i) => i.is_primary)?.url || prod.images[0].url || prod.images[0].file_path
                      : null);
                  const hasImage = !!rawPrimary;
                  const tableImageUrl = getProductImageUrl(rawPrimary);
                  return (
                    <React.Fragment key={prod.id}>
                      <tr
                        style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Miniatura e Grupo de Fotos */}
                      <td style={{ padding: '12px 20px' }}>
                        {hasImage ? (
                          <div
                            onClick={() => {
                              setLightboxProduct(prod);
                              setLightboxIndex(0);
                            }}
                            style={{
                              position: 'relative',
                              width: '50px',
                              height: '50px',
                              borderRadius: 'var(--radius-sm)',
                              overflow: 'hidden',
                              border: '1px solid var(--border-subtle)',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                              cursor: 'pointer',
                            }}
                            title="Clique para ver fotos em tamanho real"
                          >
                            <img
                              src={tableImageUrl}
                              alt={prod.name}
                              loading="lazy"
                              onError={handleImageError}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                              }}
                            />
                            {prod.images.length > 1 && (
                              <span
                                style={{
                                  position: 'absolute',
                                  bottom: '2px',
                                  right: '2px',
                                  backgroundColor: 'rgba(0, 0, 0, 0.74)',
                                  color: '#fff',
                                  fontSize: '0.62rem',
                                  fontWeight: 700,
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                  lineHeight: 1.1,
                                }}
                              >
                                +{prod.images.length - 1}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div
                            onClick={() => handleOpenImageModal(prod)}
                            style={{
                              width: '50px',
                              height: '50px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'var(--bg-sand-light)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-tertiary)',
                              border: '1px dashed var(--border-medium)',
                              cursor: 'pointer',
                            }}
                            title="Adicionar fotos a este produto"
                          >
                            <ImageIcon size={20} />
                          </div>
                        )}
                      </td>

                      {/* Nome, SKU e Links de Marketplaces */}
                      <td style={{ padding: '12px 20px' }}>
                        <div
                          style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: '0.95rem', cursor: 'pointer' }}
                          onClick={() => handleOpenPreviewModal(prod)}
                          title="Clique para visualizar detalhes do produto"
                        >
                          {prod.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '3px' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                            {prod.sku}
                          </span>
                          {prod.material && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.7rem',
                                color: 'var(--text-secondary)',
                                fontWeight: 600,
                                backgroundColor: 'var(--bg-sand-light)',
                                padding: '1px 6px',
                                borderRadius: '10px',
                                border: '1px solid var(--border-subtle)',
                              }}
                              title={`Material: ${prod.material}`}
                            >
                              🧱 {prod.material}
                            </span>
                          )}
                          {prod.color && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.7rem',
                                color: 'var(--text-secondary)',
                                fontWeight: 600,
                                backgroundColor: 'var(--bg-sand-light)',
                                padding: '1px 6px',
                                borderRadius: '10px',
                                border: '1px solid var(--border-subtle)',
                              }}
                              title={`Cor: ${prod.color}`}
                            >
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: '7px',
                                  height: '7px',
                                  borderRadius: '50%',
                                  backgroundColor: getColorHex(prod.color),
                                  border: '1px solid rgba(0,0,0,0.2)',
                                }}
                              />
                              {prod.color}
                            </span>
                          )}
                          {(() => {
                            const links = parseSalesLinks(prod.sales_links);
                            if (links.length === 0) return null;
                            return (
                              <div style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                                {links.map((link) => {
                                  const style = getMarketplaceStyle(link.platform);
                                  return (
                                    <a
                                      key={link.id}
                                      href={link.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '2px',
                                        padding: '1px 5px',
                                        borderRadius: '3px',
                                        backgroundColor: style.bg,
                                        color: style.color,
                                        border: `1px solid ${style.border}`,
                                        fontSize: '0.66rem',
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                      }}
                                      title={`Abrir anúncio: ${link.platform}`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <span>{link.platform}</span>
                                      <ExternalLink size={9} />
                                    </a>
                                  );
                                })}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenWhatsAppModal(prod);
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '1px 6px',
                                    borderRadius: '3px',
                                    backgroundColor: '#e8f9ee',
                                    color: '#128c7e',
                                    border: '1px solid #a3e9b9',
                                    fontSize: '0.66rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                  title="Encaminhar link(s) via WhatsApp"
                                >
                                  <WhatsAppIcon size={10} color="#25D366" />
                                  <span>WhatsApp</span>
                                </button>
                              </div>
                            );
                          })()}

                          {prod.variations && prod.variations.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedTableVariations((prev) => ({ ...prev, [prod.id]: !prev[prod.id] }));
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.7rem',
                                color: '#ee4d2d',
                                fontWeight: 700,
                                backgroundColor: '#fff5f0',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                border: '1px solid #ffdcd4',
                                cursor: 'pointer',
                                marginTop: '4px',
                              }}
                              title="Clique para ver ou ocultar variações estilo Shopee"
                            >
                              <span>🛍️ {prod.variations.length} variações</span>
                              <span style={{ fontSize: '0.65rem' }}>{expandedTableVariations[prod.id] ? '▲' : '▼'}</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Tipo */}
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <Badge type={prod.item_type} />
                          {prod.is_kit && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                backgroundColor: '#fef3c7',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                                padding: '1px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              🎁 KIT {prod.kit_items && prod.kit_items.length > 0 ? `(${prod.kit_items.length})` : ''}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Categoria */}
                      <td style={{ padding: '12px 20px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        {prod.category?.name || '—'}
                      </td>

                      {/* Custo e Peso */}
                      <td style={{ padding: '12px 20px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        <div>R$ {Number(prod.unit_cost).toFixed(2)}</div>
                        {prod.weight && Number(prod.weight) > 0 && (
                          <div style={{ fontSize: '0.74rem', color: '#0d9488', fontWeight: 600, marginTop: '2px' }}>
                            ⚖️ {formatWeight(prod.weight)}
                          </div>
                        )}
                      </td>

                      {/* Preço de Venda */}
                      <td style={{ padding: '12px 20px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--brand-accent)' }}>
                        {prod.sale_price ? `R$ ${Number(prod.sale_price).toFixed(2)}` : '—'}
                      </td>

                      {/* Estoque Total */}
                      <td style={{ padding: '12px 20px' }}>
                        {renderStockDisplay(prod)}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 20px' }}>
                        <button
                          onClick={() => handleToggleStatus(prod)}
                          title="Clique para alternar o status"
                          style={{ cursor: 'pointer' }}
                        >
                          <Badge status={prod.is_active ? 'active' : 'inactive'} />
                        </button>
                      </td>

                      {/* Ações */}
                      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenPreviewModal(prod)}
                            className="btn-icon"
                            title="Visualizar Informações Rápidas"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setVariationManageModalProduct(prod);
                            }}
                            className="btn-icon"
                            title="Variações e Subprodutos estilo Shopee (Cores, Modelos)"
                            style={{
                              position: 'relative',
                              color: prod.variations && prod.variations.length > 0 ? '#ee4d2d' : undefined,
                              backgroundColor: prod.variations && prod.variations.length > 0 ? '#fff5f0' : undefined,
                              borderColor: prod.variations && prod.variations.length > 0 ? '#ffdcd4' : undefined,
                            }}
                          >
                            <Layers size={16} />
                            {prod.variations && prod.variations.length > 0 && (
                              <span
                                style={{
                                  position: 'absolute',
                                  top: '-4px',
                                  right: '-4px',
                                  backgroundColor: '#ee4d2d',
                                  color: '#fff',
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  width: '15px',
                                  height: '15px',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {prod.variations.length}
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsAppModal(prod)}
                            className="btn-icon"
                            title="Encaminhar produto / link de loja via WhatsApp"
                            style={{
                              color: '#15803d',
                              backgroundColor: '#e8f9ee',
                              borderColor: '#a3e9b9',
                            }}
                          >
                            <WhatsAppIcon size={16} color="#25D366" />
                          </button>
                          <button
                            onClick={() => handleOpenImageModal(prod)}
                            className="btn-icon"
                            title="Gerenciar Fotos"
                            style={{ position: 'relative' }}
                          >
                            <ImageIcon size={16} />
                            {prod.images.length > 0 && (
                              <span
                                style={{
                                  position: 'absolute',
                                  top: '-4px',
                                  right: '-4px',
                                  backgroundColor: 'var(--brand-accent)',
                                  color: '#fff',
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {prod.images.length}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(prod)}
                            className="btn-icon"
                            title="Editar Dados"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod)}
                            className="btn-icon"
                            title="Excluir Item"
                            style={{ color: 'var(--status-danger-text)' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedTableVariations[prod.id] && prod.variations && prod.variations.length > 0 && (
                      <tr key={`vars-row-${prod.id}`} style={{ backgroundColor: '#faf8f5', borderBottom: '2px solid var(--border-medium)' }}>
                        <td colSpan={9} style={{ padding: '12px 24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase' }}>
                                Subprodutos / Variações deste Item ({prod.variations.length}):
                              </span>
                              <button
                                type="button"
                                onClick={() => setVariationManageModalProduct(prod)}
                                className="btn-secondary"
                                style={{ padding: '3px 10px', fontSize: '0.74rem', color: '#ee4d2d' }}
                              >
                                + Gerenciar Variações
                              </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                              {prod.variations.map((v) => {
                                const colorHex = getColorHex(v.color || v.variation_name);
                                const vStock = Number(v.current_stock || 0);
                                const vImg = v.primary_image_url || v.images?.[0]?.url || prod.primary_image_url;
                                return (
                                  <div
                                    key={v.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '10px',
                                      padding: '8px 12px',
                                      borderRadius: '6px',
                                      backgroundColor: '#fff',
                                      border: '1px solid var(--border-subtle)',
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '4px',
                                        overflow: 'hidden',
                                        backgroundColor: 'var(--bg-sand-light)',
                                        flexShrink: 0,
                                      }}
                                    >
                                      {vImg ? (
                                        <img src={getProductImageUrl(vImg)} alt={v.variation_name || v.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={handleImageError} />
                                      ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}><ImageIcon size={14} /></div>
                                      )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        {colorHex && (
                                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colorHex, border: '1px solid rgba(0,0,0,0.2)' }} />
                                        )}
                                        <strong style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {v.variation_name || v.color}
                                        </strong>
                                        <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>
                                          {v.sku}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginTop: '2px' }}>
                                        <span style={{ fontWeight: 600, color: 'var(--brand-accent)' }}>R$ {Number(v.sale_price || prod.sale_price || 0).toFixed(2)}</span>
                                        <span style={{ fontWeight: 700, color: vStock <= 0 ? '#dc2626' : vStock <= 5 ? '#b45309' : '#15803d' }}>{vStock.toFixed(2)} UN</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Cadastro / Edição de Produto */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => {
          pendingImages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
          setPendingImages([]);
          setIsFormModalOpen(false);
        }}
        title={editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
        subtitle="Informe os dados cadastrais, variações (cores e tamanhos), links nos marketplaces e fotos"
        maxWidth={hasVariations ? '960px' : '720px'}
      >
        <form onSubmit={handleSaveProduct}>
          {/* Banner de Rascunho / Memória Recente Restaurada */}
          {!editingProduct && draftRestoredAt && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                marginBottom: '16px',
                borderRadius: '8px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                color: '#92400e',
                fontSize: '0.82rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={16} color="#d97706" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Memória recente recuperada:</strong> Restauramos os dados que você estava preenchendo ({draftRestoredAt}).
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearDraft}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#b45309',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textDecoration: 'underline',
                  padding: '2px 6px',
                  whiteSpace: 'nowrap',
                }}
                title="Descartar rascunho e limpar todos os campos"
              >
                Limpar rascunho
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label htmlFor="prod-sku">Código / SKU *</label>
              <input
                id="prod-sku"
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Ex.: VELA-LAV-180"
              />
            </div>
            <div>
              <label htmlFor="prod-type">Tipo de Item *</label>
              <select
                id="prod-type"
                value={formData.item_type}
                onChange={(e) => setFormData({ ...formData, item_type: e.target.value as ItemType })}
              >
                {itemTypes.length > 0 ? (
                  itemTypes.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="PRODUTO_ACABADO">Produto Acabado</option>
                    <option value="MATERIA_PRIMA">Matéria-Prima</option>
                    <option value="EMBALAGEM">Embalagem</option>
                    <option value="MATERIAL_AUXILIAR">Material Auxiliar</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="prod-name">Nome do Produto *</label>
            <input
              id="prod-name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex.: Vela Aromática Lavanda Francesa 180g"
            />
          </div>

          {/* Campo É Kit? e Painel de Composição */}
          <div
            style={{
              marginBottom: '18px',
              padding: '14px 16px',
              backgroundColor: formData.is_kit ? 'rgba(217, 119, 6, 0.05)' : 'var(--bg-sand-light, #fbf9f6)',
              border: formData.is_kit ? '1.5px solid #d97706' : '1px solid var(--border-color, #e5e7eb)',
              borderRadius: '10px',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '7px', color: 'var(--text-primary)' }}>
                <Package size={17} color={formData.is_kit ? '#d97706' : 'var(--brand-accent)'} />
                É Kit?
              </label>
              {formData.is_kit && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    backgroundColor: '#fef3c7',
                    color: '#b45309',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    border: '1px solid #fde68a',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  🎁 Kit Ativado ({kitItems.length} {kitItems.length === 1 ? 'item' : 'itens'})
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  fontWeight: !formData.is_kit ? 700 : 500,
                  color: !formData.is_kit ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                <input
                  type="radio"
                  name="product_is_kit"
                  value="nao"
                  checked={!formData.is_kit}
                  onChange={() => {
                    setFormData((prev) => ({ ...prev, is_kit: false }));
                  }}
                  style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--brand-primary, #6b4c35)' }}
                />
                <span>Não <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>(Produto Individual)</span></span>
              </label>

              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  fontWeight: formData.is_kit ? 700 : 500,
                  color: formData.is_kit ? '#b45309' : 'var(--text-secondary)',
                }}
              >
                <input
                  type="radio"
                  name="product_is_kit"
                  value="sim"
                  checked={!!formData.is_kit}
                  onChange={() => {
                    const kitCat = categories.find((c) => c.name.trim().toLowerCase() === 'kit');
                    setFormData((prev) => ({
                      ...prev,
                      is_kit: true,
                      ...(kitCat && !prev.category_id ? { category_id: kitCat.id } : {}),
                    }));
                  }}
                  style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#d97706' }}
                />
                <span>Sim <span style={{ fontSize: '0.78rem', color: formData.is_kit ? '#b45309' : 'var(--text-secondary)' }}>(Kit / Conjunto de Produtos)</span></span>
              </label>
            </div>

            {/* Painel de seleção de produtos individuais para formar o kit */}
            {formData.is_kit && (
              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px dashed #fcd34d',
                }}
              >
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#92400e', display: 'block' }}>
                    📦 Selecione os produtos individuais que compõem este Kit
                  </span>
                  <span style={{ fontSize: '0.76rem', color: '#78350f' }}>
                    Ao vender este kit, o estoque de cada produto individual abaixo será reduzido automaticamente.
                  </span>
                </div>

                {/* Linha de Seleção e Quantidade */}
                {(() => {
                  const selectedParent = selectedKitProductId
                    ? products.find((p) => p.id === Number(selectedKitProductId))
                    : null;
                  const hasVariations = Boolean(selectedParent?.variations && selectedParent.variations.length > 0);
                  const isAddDisabled = !selectedParent || (hasVariations && !selectedKitVariationId);

                  return (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '16px' }}>
                      <div style={{ flex: '1 1 260px' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                          PRODUTO DO ATELIÊ:
                        </label>
                        <select
                          value={selectedKitProductId}
                          onChange={(e) => {
                            setSelectedKitProductId(e.target.value);
                            setSelectedKitVariationId('');
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '0.85rem',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            backgroundColor: '#fff',
                          }}
                        >
                          <option value="">- Selecione um produto para o kit -</option>
                          {products
                            .filter((p) => (!editingProduct || p.id !== editingProduct.id) && p.is_active && !p.is_kit)
                            .map((p) => {
                              const varCount = p.variations ? p.variations.length : 0;
                              const varLabel = varCount > 0 ? ` (${varCount} cores/variações)` : (p.color ? ` (Cor: ${p.color})` : '');
                              return (
                                <option key={p.id} value={p.id}>
                                  [{p.sku}] {p.name}{varLabel}
                                </option>
                              );
                            })}
                        </select>
                      </div>

                      {/* Se o produto selecionado possuir variações (cores), exibe seletor da cor específica */}
                      {hasVariations && selectedParent && (
                        <div style={{ flex: '1 1 240px' }}>
                          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#92400e', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>🎨</span>
                            <span>COR / VARIAÇÃO ESPECÍFICA *:</span>
                          </label>
                          <select
                            value={selectedKitVariationId}
                            onChange={(e) => setSelectedKitVariationId(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              fontSize: '0.85rem',
                              borderRadius: '6px',
                              border: selectedKitVariationId ? '1.5px solid #10b981' : '1.5px solid #f59e0b',
                              backgroundColor: selectedKitVariationId ? '#f0fdf4' : '#fffbeb',
                              color: selectedKitVariationId ? '#166534' : '#78350f',
                              fontWeight: 600,
                            }}
                          >
                            <option value="">-- Selecione a Cor da Peça --</option>
                            {selectedParent.variations?.map((v) => {
                              const stockNum = parseFloat(String(v.current_stock || '0')) || 0;
                              const priceNum = v.sale_price ? Number(v.sale_price).toFixed(2) : null;
                              return (
                                <option key={v.id} value={v.id}>
                                  {v.variation_name || v.color || 'Variação'} [{v.sku}] — Est: {stockNum.toFixed(0)} un {priceNum ? `| R$ ${priceNum}` : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}

                      {/* Se o produto selecionado NÃO tiver variações, exibe tag de cor única */}
                      {!hasVariations && selectedParent && (
                        <div style={{ flex: '1 1 180px' }}>
                          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                            COR DA PEÇA:
                          </label>
                          <div
                            style={{
                              padding: '8px 12px',
                              fontSize: '0.85rem',
                              borderRadius: '6px',
                              border: '1px solid #e5e7eb',
                              backgroundColor: '#f9fafb',
                              color: '#374151',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              height: '38px',
                              boxSizing: 'border-box',
                            }}
                          >
                            <span
                              style={{
                                width: '9px',
                                height: '9px',
                                borderRadius: '50%',
                                backgroundColor: getColorHex(selectedParent.color),
                                border: '1px solid rgba(0,0,0,0.2)',
                                display: 'inline-block',
                              }}
                            />
                            <span style={{ fontWeight: 600 }}>{selectedParent.color || 'Cor Única / Padrão'}</span>
                          </div>
                        </div>
                      )}

                      <div style={{ width: '90px' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                          QTD NO KIT:
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={selectedKitQuantity}
                          onChange={(e) => setSelectedKitQuantity(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '0.85rem',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            textAlign: 'center',
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAddKitItem}
                        disabled={isAddDisabled}
                        className="btn btn-primary"
                        style={{
                          padding: '8px 16px',
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          backgroundColor: isAddDisabled ? '#d1d5db' : '#d97706',
                          borderColor: isAddDisabled ? '#d1d5db' : '#d97706',
                          color: '#fff',
                          cursor: isAddDisabled ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          height: '38px',
                        }}
                      >
                        <Plus size={15} /> Adicionar ao Kit
                      </button>
                    </div>
                  );
                })()}

                {/* Tabela de Produtos Adicionados ao Kit */}
                {kitItems.length === 0 ? (
                  <div
                    style={{
                      padding: '24px 16px',
                      textAlign: 'center',
                      border: '1.5px dashed #fde68a',
                      borderRadius: '8px',
                      backgroundColor: '#fffdfa',
                      color: '#92400e',
                      fontSize: '0.84rem',
                    }}
                  >
                    <Package size={28} style={{ margin: '0 auto 8px', color: '#d97706', opacity: 0.6, display: 'block' }} />
                    Nenhum produto individual adicionado ao kit ainda.
                    <div style={{ fontSize: '0.76rem', color: '#b45309', marginTop: '4px' }}>
                      Selecione um produto e a cor desejada acima e clique em <b>"+ Adicionar ao Kit"</b>.
                    </div>
                  </div>
                ) : (
                  <div style={{ border: '1px solid #fde68a', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#fef3c7', color: '#92400e', textAlign: 'left', borderBottom: '1px solid #fde68a' }}>
                          <th style={{ padding: '8px 12px', fontWeight: 700 }}>Produto Componente</th>
                          <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'center', width: '120px' }}>Qtd no Kit</th>
                          <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right' }}>Preço Avulso</th>
                          <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right' }}>Custo Un.</th>
                          <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right' }}>Subtotal Avulso</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', width: '50px' }}>Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kitItems.map((item, idx) => {
                          const prod = item.component_product;
                          const qty = typeof item.quantity === 'string' ? parseFloat(item.quantity) || 1 : (item.quantity as number) || 1;
                          const salePrice = typeof prod?.sale_price === 'number' ? prod.sale_price : parseFloat(String(prod?.sale_price || '0')) || 0;
                          const unitCost = typeof prod?.unit_cost === 'number' ? prod.unit_cost : parseFloat(String(prod?.unit_cost || '0')) || 0;
                          const subtotal = salePrice * qty;

                          return (
                            <tr key={idx} style={{ borderBottom: idx < kitItems.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                              <td style={{ padding: '8px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {prod?.name || `Produto #${item.component_product_id}`}
                                  </span>

                                  {/* Tag destacada de Cor / Variação */}
                                  {(prod?.color || prod?.variation_name) ? (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        fontSize: '0.74rem',
                                        fontWeight: 600,
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        backgroundColor: '#fef3c7',
                                        color: '#92400e',
                                        border: '1px solid #fde68a',
                                      }}
                                      title={`Cor da peça: ${prod.color || prod.variation_name}`}
                                    >
                                      <span
                                        style={{
                                          width: '8px',
                                          height: '8px',
                                          borderRadius: '50%',
                                          backgroundColor: getColorHex(prod.color || prod.variation_name),
                                          border: '1px solid rgba(0,0,0,0.2)',
                                          display: 'inline-block',
                                        }}
                                      />
                                      Cor: {prod.color || prod.variation_name}
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.70rem',
                                        fontWeight: 600,
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        backgroundColor: '#fee2e2',
                                        color: '#991b1b',
                                        border: '1px solid #fecaca',
                                      }}
                                      title="Peça sem cor específica vinculada. Recomenda-se remover e adicionar a cor desejada para baixar o estoque específico."
                                    >
                                      ⚠️ Sem cor definida
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>SKU: {prod?.sku || '—'}</span>
                                  {prod?.material && <span>• Mat.: {prod.material}</span>}
                                  {prod?.weight && <span>• Peso: {prod.weight}g</span>}
                                  {prod?.current_stock !== undefined && prod?.current_stock !== null && (
                                    <span style={{ color: '#047857', fontWeight: 600 }}>
                                      • Est: {parseFloat(String(prod.current_stock)).toFixed(0)} un
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '2px 4px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateKitItemQuantity(idx, qty - 1)}
                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700, padding: '0 4px', color: '#6b7280' }}
                                  >
                                    -
                                  </button>
                                  <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                                    {qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateKitItemQuantity(idx, qty + 1)}
                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700, padding: '0 4px', color: '#6b7280' }}
                                  >
                                    +
                                  </button>
                                </div>
                              </td>

                              <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                {salePrice > 0 ? `R$ ${salePrice.toFixed(2)}` : '—'}
                              </td>

                              <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                R$ {unitCost.toFixed(2)}
                              </td>

                              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#b45309' }}>
                                {subtotal > 0 ? `R$ ${subtotal.toFixed(2)}` : '—'}
                              </td>

                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveKitItem(idx)}
                                  title="Remover produto do kit"
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Resumo Inteligente do Kit com Ações Rápidas */}
                    <div
                      style={{
                        backgroundColor: '#fffdfa',
                        borderTop: '1px solid #fde68a',
                        padding: '12px 14px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '12px',
                        fontSize: '0.78rem',
                      }}
                    >
                      {/* Total de Peças */}
                      <div>
                        <span style={{ color: '#92400e', fontWeight: 600, display: 'block' }}>Total de Peças no Kit:</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#78350f' }}>
                          {totalKitPieces} {totalKitPieces === 1 ? 'peça' : 'peças'}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#92400e', display: 'block' }}>
                          ({kitItems.length} {kitItems.length === 1 ? 'produto diferente' : 'produtos diferentes'})
                        </span>
                      </div>

                      {/* Soma dos Custos */}
                      <div>
                        <span style={{ color: '#92400e', fontWeight: 600, display: 'block' }}>Custo Total Componentes:</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#78350f' }}>
                          R$ {totalKitCost.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              unit_cost: (totalKitCost).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                            }));
                          }}
                          style={{
                            marginTop: '2px',
                            border: '1px solid #fcd34d',
                            backgroundColor: '#fff',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#b45309',
                            cursor: 'pointer',
                            display: 'block',
                          }}
                        >
                          ⚡ Aplicar Custo ao Kit
                        </button>
                      </div>

                      {/* Soma Preços Avulsos vs Preço Kit */}
                      <div>
                        <span style={{ color: '#92400e', fontWeight: 600, display: 'block' }}>Soma dos Preços Avulsos:</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#78350f' }}>
                          R$ {totalKitAvulsoPrice.toFixed(2)}
                        </span>
                        {kitDiscountPct > 0 && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              display: 'inline-block',
                              marginTop: '2px',
                            }}
                          >
                            Economia: -{kitDiscountPct.toFixed(0)}% (R$ {kitEconomyDiff.toFixed(2)})
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              sale_price: (totalKitAvulsoPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                            }));
                          }}
                          style={{
                            marginTop: '2px',
                            border: '1px solid #fcd34d',
                            backgroundColor: '#fff',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#b45309',
                            cursor: 'pointer',
                            display: 'block',
                          }}
                        >
                          ⚡ Usar Preço Avulso
                        </button>
                      </div>

                      {/* Peso Total dos Componentes */}
                      <div>
                        <span style={{ color: '#92400e', fontWeight: 600, display: 'block' }}>Peso Total Componentes:</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#78350f' }}>
                          {totalKitWeight > 0 ? (totalKitWeight >= 1000 ? `${(totalKitWeight / 1000).toFixed(2)} kg` : `${totalKitWeight} g`) : '0 g'}
                        </span>
                        {totalKitWeight > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                weight: String(totalKitWeight),
                              }));
                            }}
                            style={{
                              marginTop: '2px',
                              border: '1px solid #fcd34d',
                              backgroundColor: '#fff',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: '#b45309',
                              cursor: 'pointer',
                              display: 'block',
                            }}
                          >
                            ⚡ Aplicar Peso ao Kit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 1.2fr', gap: '14px', marginBottom: '16px' }}>
            {/* Cor do Produto */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="prod-color" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Palette size={14} color="var(--brand-accent)" />
                  Cor do Produto
                </label>
                {formData.color && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.72rem',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: getColorHex(formData.color),
                        border: '1px solid rgba(0,0,0,0.2)',
                        display: 'inline-block',
                      }}
                    />
                    {formData.color}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <select
                  id="prod-color"
                  value={formData.color || ''}
                  onChange={(e) => {
                    if (e.target.value === '__NEW_COLOR__') {
                      setQuickColorTargetVarIndex(null);
                      setQuickColorName('');
                      setQuickColorHex('#d1d5db');
                      setQuickColorError(null);
                      setIsQuickColorModalOpen(true);
                    } else {
                      const newColor = e.target.value || undefined;
                      setFormData({ ...formData, color: newColor });
                      if (hasVariations && formVariations.length === 1 && newColor) {
                        setFormVariations((prev) => {
                          const first = prev[0];
                          if (!first.color || first.color === formData.color) {
                            const cleanC = newColor.toUpperCase().replace(/\s+/g, '-');
                            const cleanS = first.size ? first.size.toUpperCase().replace(/\s+/g, '-') : '';
                            const skuBase = formData.sku || 'PROD';
                            const newSku = `${skuBase}-${cleanC}${cleanS ? `-${cleanS}` : ''}`;
                            return [
                              {
                                ...first,
                                color: newColor,
                                variation_name: first.size ? `${newColor} - ${first.size}` : newColor,
                                sku: newSku,
                              },
                            ];
                          }
                          return prev;
                        });
                      }
                    }
                  }}
                  style={{ flex: 1 }}
                >
                  <option value="">Sem cor especificada</option>
                  <option value="__NEW_COLOR__" style={{ fontWeight: 700, color: 'var(--brand-accent)' }}>
                    ➕ Cadastrar nova cor...
                  </option>
                  <optgroup label="Cores Cadastradas">
                    {colors.length > 0
                      ? colors.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))
                      : COLOR_PRESETS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                    {formData.color &&
                      !colors.some((c) => c.name.toLowerCase() === formData.color?.toLowerCase()) &&
                      !COLOR_PRESETS.includes(formData.color) && (
                        <option value={formData.color}>{formData.color}</option>
                      )}
                  </optgroup>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setQuickColorTargetVarIndex(null);
                    setQuickColorName('');
                    setQuickColorHex('#d1d5db');
                    setQuickColorError(null);
                    setIsQuickColorModalOpen(true);
                  }}
                  title="Cadastrar nova cor"

                  style={{
                    padding: '0 12px',
                    height: '38px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--brand-accent)',
                    fontWeight: 700,
                    fontSize: '1.2rem',
                    lineHeight: 1,
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Tamanho / Dimensão do Produto */}
            <div>
              <label htmlFor="prod-size" style={{ marginBottom: '6px', display: 'block' }}>
                Tamanho / Volume
              </label>
              <input
                id="prod-size"
                type="text"
                value={formData.size || ''}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                placeholder="Ex.: 180g / M"
              />
            </div>

            {/* Material do Produto */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="prod-material" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Layers size={14} color="var(--brand-accent)" />
                  Material
                </label>
                {formData.material && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                    }}
                  >
                    🧱 {formData.material}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <select
                  id="prod-material"
                  value={formData.material || ''}
                  onChange={(e) => {
                    if (e.target.value === '__NEW_MATERIAL__') {
                      setQuickMaterialName('');
                      setQuickMaterialDesc('');
                      setQuickMaterialError(null);
                      setIsQuickMaterialModalOpen(true);
                    } else {
                      setFormData({ ...formData, material: e.target.value || undefined });
                    }
                  }}
                  style={{ flex: 1 }}
                >
                  <option value="">Sem material especificado</option>
                  <option value="__NEW_MATERIAL__" style={{ fontWeight: 700, color: 'var(--brand-accent)' }}>
                    ➕ Cadastrar novo material...
                  </option>
                  <optgroup label="Materiais Cadastrados">
                    {materials.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                    {formData.material &&
                      !materials.some((m) => m.name.toLowerCase() === formData.material?.toLowerCase()) && (
                        <option value={formData.material}>{formData.material}</option>
                      )}
                  </optgroup>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setQuickMaterialName('');
                    setQuickMaterialDesc('');
                    setQuickMaterialError(null);
                    setIsQuickMaterialModalOpen(true);
                  }}
                  title="Cadastrar novo material"
                  style={{
                    padding: '0 12px',
                    height: '38px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--brand-accent)',
                    fontWeight: 700,
                    fontSize: '1.2rem',
                    lineHeight: 1,
                  }}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label htmlFor="prod-cat">Categoria</label>
              <select
                id="prod-cat"
                value={formData.category_id || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category_id: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">Sem categoria</option>
                {[...categories]
                  .sort((a, b) => {
                    const isAKit = a.name.toLowerCase() === 'kit';
                    const isBKit = b.name.toLowerCase() === 'kit';
                    if (isAKit && !isBKit) return -1;
                    if (!isAKit && isBKit) return 1;
                    return a.name.localeCompare(b.name);
                  })
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label htmlFor="prod-unit">Unidade de Medida *</label>
              <select
                id="prod-unit"
                required
                value={formData.unit_id}
                onChange={(e) => setFormData({ ...formData, unit_id: Number(e.target.value) })}
              >
                {units.length > 0 ? (
                  units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.code} - {u.name}
                    </option>
                  ))
                ) : (
                  <option value="">Nenhuma unidade cadastrada</option>
                )}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.9fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label htmlFor="prod-price" style={{ marginBottom: '6px', display: 'block' }}>Preço Venda (R$)</label>
              <input
                id="prod-price"
                type="text"
                inputMode="numeric"
                value={formData.sale_price || ''}
                onChange={(e) => {
                  const formatted = formatCurrencyInputRTL(e.target.value, true);
                  setFormData({ ...formData, sale_price: formatted });
                }}
                onFocus={(e) => e.target.select()}
                placeholder="0,00"
                style={{ textAlign: 'right' }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="prod-cost" style={{ margin: 0 }}>Custo Estimado (R$)</label>
                <button
                  type="button"
                  onClick={() => setIsCostCalculatorOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--brand-accent)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 4px',
                    borderRadius: 'var(--radius-sm)',
                  }}
                  title="Calcular e somar custos de matérias-primas e insumos individuais"
                >
                  <Calculator size={14} /> Somar Itens
                </button>
              </div>
              <input
                id="prod-cost"
                type="text"
                inputMode="numeric"
                value={formData.unit_cost}
                onChange={(e) => {
                  const formatted = formatCurrencyInputRTL(e.target.value);
                  setFormData({ ...formData, unit_cost: formatted });
                }}
                onFocus={(e) => e.target.select()}
                placeholder="0,00"
                style={{ textAlign: 'right' }}
              />
              {costItems.length > 0 && (
                <div style={{ marginTop: '4px' }}>
                  <span
                    onClick={() => setIsCostCalculatorOpen(true)}
                    style={{
                      fontSize: '0.73rem',
                      color: 'var(--brand-accent)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Clique para ver ou editar a composição de custos"
                  >
                    Σ {costItems.length} {costItems.length === 1 ? 'item somado' : 'itens somados'} (editar)
                  </span>
                </div>
              )}
            </div>

            {/* Campo Peso Total do Produto / Kit */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="prod-weight" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Scale size={14} color="var(--brand-accent)" />
                  Peso (g)
                </label>
                {costItems.reduce((acc, item) => acc + (item.weight || 0), 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const totalW = costItems.reduce((acc, item) => acc + (item.weight || 0), 0);
                      setFormData((prev) => ({ ...prev, weight: String(totalW) }));
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--brand-accent)',
                      fontSize: '0.73rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '2px 4px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                    title="Copiar a soma do peso dos insumos calculados na composição"
                  >
                    Σ {costItems.reduce((acc, item) => acc + (item.weight || 0), 0)}g
                  </button>
                )}
              </div>
              <input
                id="prod-weight"
                type="text"
                value={formData.weight || ''}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value.replace(/\D/g, '') })}
                placeholder="0"
                style={{ textAlign: 'right' }}
                title="Peso estimado em gramas para cálculo de frete e kits"
              />
              {formData.weight && Number(formData.weight) > 0 && (
                <div style={{ marginTop: '4px', textAlign: 'right' }}>
                  <span style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    {Number(formData.weight) >= 1000
                      ? `${(Number(formData.weight) / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 })} kg`
                      : `${formData.weight} g`}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="prod-desc">Descrição / Observações</label>
            <textarea
              id="prod-desc"
              rows={2}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Notas aromáticas, insumos chaves ou fornecedor..."
            />
          </div>

          {/* Seção de Variações do Produto (Cor, Tamanho, Preço e Estoque por Variação) */}
          <div
            style={{
              marginBottom: '22px',
              padding: '16px 18px',
              backgroundColor: hasVariations ? '#fffaf5' : '#faf9f8',
              borderRadius: 'var(--radius-md)',
              border: hasVariations ? '1.5px solid var(--brand-accent)' : '1px solid var(--border-medium)',
              boxShadow: hasVariations ? '0 2px 8px rgba(184, 115, 51, 0.08)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    backgroundColor: hasVariations ? 'rgba(184, 115, 51, 0.15)' : 'var(--bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: hasVariations ? 'var(--brand-accent)' : 'var(--text-tertiary)',
                  }}
                >
                  <Layers size={20} />
                </div>
                <div>
                  <label
                    htmlFor="toggle-has-variations"
                    style={{
                      margin: 0,
                      fontWeight: 700,
                      fontSize: '0.94rem',
                      color: 'var(--brand-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    Este produto possui variações (cores, tamanhos, modelos)?
                    {hasVariations && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: 'var(--brand-accent)',
                          color: '#fff',
                        }}
                      >
                        {formVariations.length} {formVariations.length === 1 ? 'variação' : 'variações'}
                      </span>
                    )}
                  </label>
                  <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    Permite definir cor, tamanho, preço de venda e estoque individual para cada variação do item.
                  </p>
                </div>
              </div>
              <div>
                <input
                  id="toggle-has-variations"
                  type="checkbox"
                  checked={hasVariations}
                  onChange={(e) => handleToggleHasVariations(e.target.checked)}
                  style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: 'var(--brand-accent)' }}
                />
              </div>
            </div>

            {hasVariations && (
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                {/* Barra de Ações Rápidas */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setIsQuickGenOpen(!isQuickGenOpen)}
                      className="btn-secondary"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.8rem',
                        padding: '6px 12px',
                        color: 'var(--brand-accent)',
                        borderColor: 'var(--brand-accent)',
                        backgroundColor: isQuickGenOpen ? '#fdf2ea' : '#fff',
                        fontWeight: 600,
                      }}
                      title="Gerar combinações de cores e tamanhos em lote"
                    >
                      <Sparkles size={14} />
                      {isQuickGenOpen ? 'Fechar Gerador de Grade' : '✨ Gerar Grade Rápida'}
                    </button>

                    <button
                      type="button"
                      onClick={handleAddEmptyVariation}
                      className="btn-secondary"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.8rem',
                        padding: '6px 12px',
                        fontWeight: 600,
                      }}
                      title="Adicionar uma linha de variação personalizada"
                    >
                      <Plus size={14} />
                      + Adicionar Variação
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setQuickColorTargetVarIndex(null);
                        setQuickColorName('');
                        setQuickColorHex('#d1d5db');
                        setQuickColorError(null);
                        setIsQuickColorModalOpen(true);
                      }}
                      className="btn-secondary"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.8rem',
                        padding: '6px 12px',
                        fontWeight: 600,
                      }}
                      title="Cadastrar uma nova cor para usar nas variações"
                    >
                      <Palette size={14} color="var(--brand-accent)" />
                      + Cadastrar Cor
                    </button>
                  </div>


                  {formVariations.length > 0 && (
                    <button
                      type="button"
                      onClick={handleApplyBasePriceAndCostToAll}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--brand-accent)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Copiar o preço de venda e custo unitário acima para todas as variações"
                    >
                      <Copy size={12} />
                      Copiar Preço/Custo Base para Todas
                    </button>
                  )}
                </div>

                {/* Painel Retrátil de Geração Rápida de Grade */}
                {isQuickGenOpen && (
                  <div
                    style={{
                      marginBottom: '16px',
                      padding: '14px 16px',
                      backgroundColor: '#fff',
                      borderRadius: 'var(--radius-sm)',
                      border: '1.5px solid #ebd3c2',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                        1. Selecione as Cores da Grade:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        {colors.map((c) => {
                          const isSelected = quickGenSelectedColors.includes(c.name);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setQuickGenSelectedColors((prev) =>
                                  isSelected ? prev.filter((x) => x !== c.name) : [...prev, c.name]
                                );
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '16px',
                                fontSize: '0.76rem',
                                fontWeight: isSelected ? 700 : 500,
                                backgroundColor: isSelected ? '#feece2' : '#f9f9f9',
                                border: isSelected ? '1.5px solid var(--brand-accent)' : '1px solid var(--border-medium)',
                                color: isSelected ? 'var(--brand-accent)' : 'var(--text-primary)',
                                cursor: 'pointer',
                              }}
                            >
                              <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: c.hex_code || '#ccc', border: '1px solid rgba(0,0,0,0.2)' }} />
                              {c.name}
                            </button>
                          );
                        })}
                        <input
                          type="text"
                          placeholder="+ Outra cor..."
                          value={quickGenCustomColor}
                          onChange={(e) => setQuickGenCustomColor(e.target.value)}
                          style={{ width: '110px', padding: '4px 8px', fontSize: '0.76rem', borderRadius: '16px' }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                        2. Selecione os Tamanhos / Pesos / Volumes:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        {['100g', '150g', '180g', '200g', '250g', 'P', 'M', 'G', 'GG', 'Único'].map((s) => {
                          const isSelected = quickGenSelectedSizes.includes(s);
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                setQuickGenSelectedSizes((prev) =>
                                  isSelected ? prev.filter((x) => x !== s) : [...prev, s]
                                );
                              }}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '16px',
                                fontSize: '0.76rem',
                                fontWeight: isSelected ? 700 : 500,
                                backgroundColor: isSelected ? '#feece2' : '#f9f9f9',
                                border: isSelected ? '1.5px solid var(--brand-accent)' : '1px solid var(--border-medium)',
                                color: isSelected ? 'var(--brand-accent)' : 'var(--text-primary)',
                                cursor: 'pointer',
                              }}
                            >
                              {s}
                            </button>
                          );
                        })}
                        <input
                          type="text"
                          placeholder="+ Outro tamanho..."
                          value={quickGenCustomSize}
                          onChange={(e) => setQuickGenCustomSize(e.target.value)}
                          style={{ width: '130px', padding: '4px 8px', fontSize: '0.76rem', borderRadius: '16px' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickGenSelectedColors([]);
                          setQuickGenSelectedSizes([]);
                          setIsQuickGenOpen(false);
                        }}
                        className="btn-secondary"
                        style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateQuickCombinations}
                        className="btn-primary"
                        style={{ fontSize: '0.78rem', padding: '6px 14px' }}
                      >
                        Gerar Grade de Combinações
                      </button>
                    </div>
                  </div>
                )}

                {/* Tabela Interativa de Variações */}
                {formVariations.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#fff', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-medium)' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Nenhuma variação adicionada ainda. Clique em <strong>✨ Gerar Grade Rápida</strong> para combinar cores e tamanhos ou <strong>+ Adicionar Variação</strong>.
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-medium)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f9f6f2', borderBottom: '1.5px solid #ebd3c2', textAlign: 'left' }}>
                          <th style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--brand-primary)', width: '22%' }}>Variação (Nome) *</th>
                          <th style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--brand-primary)', width: '14%' }}>Cor</th>
                          <th style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--brand-primary)', width: '12%' }}>Tamanho</th>
                          <th style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--brand-primary)', width: '16%' }}>SKU *</th>
                          <th style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--brand-primary)', textAlign: 'right', width: '12%' }}>Preço (R$)</th>
                          <th style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--brand-primary)', textAlign: 'right', width: '10%' }}>Custo (R$)</th>
                          <th style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--brand-primary)', textAlign: 'center', width: '10%' }}>Estoque {editingProduct ? 'Atual' : 'Inicial'}</th>
                          <th style={{ padding: '8px 6px', textAlign: 'center', width: '4%' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formVariations.map((v, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: idx % 2 === 0 ? '#fff' : '#fcfbfa' }}>
                            <td style={{ padding: '6px 8px' }}>
                              <input
                                type="text"
                                required
                                value={v.variation_name}
                                onChange={(e) => handleUpdateVariation(idx, 'variation_name', e.target.value)}
                                placeholder="Ex: Branco 180g"
                                style={{ width: '100%', padding: '4px 6px', fontSize: '0.8rem' }}
                              />
                            </td>
                            <td style={{ padding: '6px 8px' }}>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <select
                                  value={v.color || ''}
                                  onChange={(e) => {
                                    if (e.target.value === '__NEW_COLOR__') {
                                      setQuickColorTargetVarIndex(idx);
                                      const candidate = v.variation_name?.trim();
                                      setQuickColorName(candidate || '');
                                      setQuickColorHex('#d1d5db');
                                      setQuickColorError(null);
                                      setIsQuickColorModalOpen(true);
                                    } else {
                                      handleUpdateVariation(idx, 'color', e.target.value);
                                    }
                                  }}
                                  style={{ flex: 1, padding: '4px 6px', fontSize: '0.8rem' }}
                                >
                                  <option value="">(Sem cor)</option>
                                  <option value="__NEW_COLOR__" style={{ fontWeight: 700, color: 'var(--brand-accent)' }}>
                                    ➕ Cadastrar nova cor...
                                  </option>
                                  <optgroup label="Cores Cadastradas">
                                    {colors.map((c) => (
                                      <option key={c.id} value={c.name}>{c.name}</option>
                                    ))}
                                    {v.color && !colors.some((c) => c.name.toLowerCase() === v.color?.toLowerCase()) && (
                                      <option value={v.color}>{v.color}</option>
                                    )}
                                  </optgroup>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickColorTargetVarIndex(idx);
                                    const candidate = v.variation_name?.trim();
                                    setQuickColorName(candidate || '');
                                    setQuickColorHex('#d1d5db');
                                    setQuickColorError(null);
                                    setIsQuickColorModalOpen(true);
                                  }}
                                  title="Cadastrar nova cor"
                                  style={{
                                    padding: '0 6px',
                                    height: '28px',
                                    backgroundColor: 'var(--bg-sand-light)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <Plus size={13} color="var(--brand-accent)" />
                                </button>
                              </div>
                            </td>

                            <td style={{ padding: '6px 8px' }}>
                              <input
                                type="text"
                                value={v.size || ''}
                                onChange={(e) => handleUpdateVariation(idx, 'size', e.target.value)}
                                placeholder="Ex: 180g / M"
                                style={{ width: '100%', padding: '4px 6px', fontSize: '0.8rem' }}
                              />
                            </td>
                            <td style={{ padding: '6px 8px' }}>
                              <input
                                type="text"
                                required
                                value={v.sku}
                                onChange={(e) => handleUpdateVariation(idx, 'sku', e.target.value.toUpperCase())}
                                placeholder="SKU-VAR"
                                style={{ width: '100%', padding: '4px 6px', fontSize: '0.78rem', fontFamily: 'monospace' }}
                              />
                            </td>
                            <td style={{ padding: '6px 8px' }}>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={v.sale_price || ''}
                                onChange={(e) => handleUpdateVariation(idx, 'sale_price', formatCurrencyInputRTL(e.target.value, true))}
                                placeholder="0,00"
                                style={{ width: '100%', padding: '4px 6px', fontSize: '0.8rem', textAlign: 'right' }}
                              />
                            </td>
                            <td style={{ padding: '6px 8px' }}>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={v.unit_cost || ''}
                                onChange={(e) => handleUpdateVariation(idx, 'unit_cost', formatCurrencyInputRTL(e.target.value))}
                                placeholder="0,00"
                                style={{ width: '100%', padding: '4px 6px', fontSize: '0.8rem', textAlign: 'right' }}
                              />
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={v.initial_stock ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9.,]/g, '');
                                  handleUpdateVariation(idx, 'initial_stock', val);
                                }}
                                placeholder="0"
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  fontSize: '0.82rem',
                                  fontWeight: 600,
                                  textAlign: 'center',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-color)',
                                  backgroundColor: '#fff',
                                  color: Number(String(v.initial_stock || '0').replace(',', '.')) <= 0 ? 'var(--status-danger-text)' : 'var(--brand-primary)',
                                }}
                                title={editingProduct ? "Editar saldo em estoque desta variação" : "Estoque inicial desta variação"}
                              />
                            </td>
                            <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateVariation(idx)}
                                  style={{ background: 'none', border: 'none', color: 'var(--brand-accent)', cursor: 'pointer', padding: '2px' }}
                                  title="Duplicar esta variação"
                                >
                                  <Copy size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVariation(idx)}
                                  style={{ background: 'none', border: 'none', color: 'var(--status-danger-text)', cursor: 'pointer', padding: '2px' }}
                                  title="Remover variação"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Resumo consolidado */}
                    <div style={{
                      padding: '8px 12px',
                      backgroundColor: '#f5efe9',
                      borderTop: '1px solid #ebd3c2',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                    }}>
                      <span>Total: <strong>{formVariations.length}</strong> {formVariations.length === 1 ? 'variação' : 'variações'}</span>
                      {!editingProduct && (
                        <span>Estoque Inicial Somado: <strong style={{ color: 'var(--brand-primary)' }}>{formVariations.reduce((acc, v) => acc + (parseFloat(String(v.initial_stock || '0')) || 0), 0).toFixed(2)} UN</strong></span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Seção de Links de Vendas em Marketplaces */}
          <div
            style={{
              marginBottom: '22px',
              padding: '16px 18px',
              backgroundColor: '#faf7f3',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--border-subtle)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-primary)', fontSize: '0.92rem' }}>
                <Store size={18} color="var(--brand-accent)" />
                Links de Vendas nos Marketplaces (Opcional)
              </label>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: salesLinks.length > 0 ? 'var(--brand-accent)' : 'var(--bg-sand-medium)',
                  color: salesLinks.length > 0 ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {salesLinks.length} {salesLinks.length === 1 ? 'canal vinculado' : 'canais vinculados'}
              </span>
            </div>

            <p style={{ margin: '0 0 10px', fontSize: '0.79rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Cadastre os links diretos dos anúncios deste produto nos marketplaces para divulgação e acompanhamento das vendas.
            </p>

            {/* Inputs para adicionar novo link com Combobox */}
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr auto', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
              <div>
                <select
                  id="marketplace-platform-input"
                  value={newLinkPlatform || 'Shopee'}
                  onChange={(e) => setNewLinkPlatform(e.target.value)}
                  style={{ fontSize: '0.85rem', padding: '8px 10px', width: '100%' }}
                >
                  <option value="Shopee">Shopee</option>
                  <option value="Mercado Livre">Mercado Livre</option>
                  <option value="Amazon">Amazon</option>
                  <option value="Elo7">Elo7</option>
                  <option value="Shein">Shein</option>
                  <option value="Magalu">Magalu</option>
                  <option value="Site Oficial">Site Oficial</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Outro Canal">Outro Canal</option>
                </select>
              </div>

              <div>
                <input
                  type="text"
                  id="marketplace-url-input"
                  placeholder="Cole aqui o link do anúncio (Ex.: https://shopee.com.br/...)"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  style={{ fontSize: '0.85rem', padding: '8px 10px', width: '100%' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSalesLink();
                    }
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => handleAddSalesLink()}
                className="btn-primary"
                style={{
                  height: '38px',
                  padding: '0 14px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                  fontWeight: 600,
                }}
                title="Adicionar link de venda do marketplace"
              >
                <Plus size={16} />
                <span>Adicionar</span>
              </button>
            </div>

            <div style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
              💡 Cole o link e clique em <b>Adicionar</b> (ou salve direto o produto que o link digitado será gravado automaticamente).
            </div>

            {/* Lista dos links de marketplaces cadastrados */}
            {salesLinks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {salesLinks.map((link) => {
                  const style = getMarketplaceStyle(link.platform);
                  return (
                    <div
                      key={link.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: '#ffffff',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        fontSize: '0.83rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1, marginRight: '10px' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '4px',
                            backgroundColor: style.bg,
                            color: style.color,
                            fontWeight: 700,
                            fontSize: '0.74rem',
                            whiteSpace: 'nowrap',
                            border: `1px solid ${style.border}`,
                            flexShrink: 0,
                          }}
                        >
                          {link.platform}
                        </span>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: 'var(--brand-accent)',
                            textDecoration: 'none',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontWeight: 500,
                          }}
                          title={`Abrir link em nova aba: ${link.url}`}
                        >
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>{link.url}</span>
                          <ExternalLink size={13} style={{ flexShrink: 0 }} />
                        </a>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSalesLink(link.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--status-danger-text)',
                          cursor: 'pointer',
                          padding: '4px 6px',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '4px',
                          transition: 'background 0.15s ease',
                        }}
                        title="Remover este canal"
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--status-danger-bg)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {formError && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--status-danger-bg)',
                color: 'var(--status-danger-text)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '18px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={18} />
              <span>{formError}</span>
            </div>
          )}

          {/* Seção de Upload de Fotos do Produto */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ImageIcon size={16} color="var(--brand-accent)" />
                Fotos do Produto (Upload Único ou Múltiplo)
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                {((editingProduct?.images?.length || 0) + pendingImages.length)}/10 fotos selecionadas
              </span>
            </div>

            {/* Dropzone de Seleção de Arquivos */}
            <div
              style={{
                border: '2px dashed var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                padding: '18px 14px',
                textAlign: 'center',
                backgroundColor: 'var(--bg-sand-light)',
                position: 'relative',
                cursor: ((editingProduct?.images?.length || 0) + pendingImages.length >= 10) ? 'not-allowed' : 'pointer',
                transition: 'border-color 0.2s ease, background 0.2s ease',
              }}
            >
              <input
                type="file"
                multiple
                accept="image/png, image/jpeg, image/webp"
                disabled={((editingProduct?.images?.length || 0) + pendingImages.length >= 10) || savingProduct}
                onChange={(e) => {
                  handleSelectPendingImages(e.target.files);
                  e.target.value = '';
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: ((editingProduct?.images?.length || 0) + pendingImages.length >= 10) ? 'not-allowed' : 'pointer',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <Upload size={22} color="var(--brand-accent)" />
                <p style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: '0.88rem', margin: 0 }}>
                  {((editingProduct?.images?.length || 0) + pendingImages.length >= 10)
                    ? 'Limite máximo de 10 fotos atingido'
                    : 'Clique ou arraste uma ou várias fotos do produto'}
                </p>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
                  Selecione 1 ou mais imagens (PNG, JPG ou WebP até 10 MB cada - até 10 fotos)
                </span>
              </div>
            </div>

            {/* Galeria de Fotos no Formulário (Existentes e Pendentes) */}
            {((editingProduct?.images && editingProduct.images.length > 0) || pendingImages.length > 0) && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))',
                  gap: '12px',
                  marginTop: '14px',
                }}
              >
                {/* Fotos já salvas no banco (se estiver editando) */}
                {editingProduct?.images?.map((img) => (
                  <div
                    key={img.id}
                    style={{
                      position: 'relative',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      border: img.is_primary ? '2px solid var(--brand-accent)' : '1px solid var(--border-subtle)',
                      backgroundColor: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  >
                    <img
                      src={getProductImageUrl(img.url || img.file_path)}
                      alt={img.original_filename}
                      loading="lazy"
                      onError={handleImageError}
                      style={{ width: '100%', height: '88px', objectFit: 'cover', display: 'block' }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        top: '4px',
                        left: '4px',
                        backgroundColor: img.is_primary ? 'var(--brand-accent)' : 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        padding: '2px 5px',
                        borderRadius: '3px',
                      }}
                    >
                      {img.is_primary ? '★ Capa' : 'Salva'}
                    </span>
                    <div
                      style={{
                        padding: '4px 6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'var(--bg-sand-light)',
                        borderTop: '1px solid var(--border-subtle)',
                      }}
                    >
                      {!img.is_primary ? (
                        <button
                          type="button"
                          onClick={() => handleSetExistingPrimaryInEdit(img.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '0.68rem',
                            color: 'var(--brand-accent)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: 0,
                          }}
                          title="Definir como foto de capa"
                        >
                          Virar Capa
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Principal</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingImageInEdit(img.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--status-danger-text)',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                        title="Excluir esta foto"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Fotos Novas Pendentes para Upload */}
                {pendingImages.map((pImg) => (
                  <div
                    key={pImg.id}
                    style={{
                      position: 'relative',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      border: pImg.isPrimary ? '2px solid var(--brand-accent)' : '1px dashed var(--brand-accent)',
                      backgroundColor: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  >
                    <img
                      src={pImg.previewUrl}
                      alt={pImg.file.name}
                      style={{ width: '100%', height: '88px', objectFit: 'cover', display: 'block' }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        top: '4px',
                        left: '4px',
                        backgroundColor: pImg.isPrimary ? 'var(--brand-accent)' : 'var(--brand-primary)',
                        color: '#fff',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        padding: '2px 5px',
                        borderRadius: '3px',
                      }}
                    >
                      {pImg.isPrimary ? '★ Capa' : '+ Nova'}
                    </span>
                    <div
                      style={{
                        padding: '4px 6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'var(--bg-sand-light)',
                        borderTop: '1px solid var(--border-subtle)',
                      }}
                    >
                      {!pImg.isPrimary ? (
                        <button
                          type="button"
                          onClick={() => handleSetPendingPrimary(pImg.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '0.68rem',
                            color: 'var(--brand-accent)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: 0,
                          }}
                          title="Definir esta nova foto como capa"
                        >
                          Virar Capa
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Capa</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemovePendingImage(pImg.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--status-danger-text)',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                        title="Remover foto da seleção"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            {editingProduct ? (
              <button
                type="button"
                onClick={() => handleDeleteProduct(editingProduct)}
                className="btn-secondary"
                disabled={savingProduct}
                style={{
                  color: 'var(--status-danger-text)',
                  borderColor: 'var(--status-danger-border, #f5c2c7)',
                  backgroundColor: 'var(--status-danger-bg, #f8d7da)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                title="Excluir este item permanentemente"
              >
                <Trash2 size={15} />
                <span>Excluir Item</span>
              </button>
            ) : !editingProduct ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-tertiary, #9ca3af)' }}>
                <Save size={14} color="#10b981" />
                <span>Rascunho salvo automaticamente</span>
              </div>
            ) : <div />}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  pendingImages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
                  setPendingImages([]);
                  setIsFormModalOpen(false);
                }}
                className="btn-secondary"
                disabled={savingProduct}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={savingProduct}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {savingProduct ? (
                  <>
                    <Loader2 size={16} className="spin-animation" />
                    <span>{pendingImages.length > 0 ? 'Salvando Item e Fotos...' : 'Salvando...'}</span>
                  </>
                ) : (
                  <span>
                    {editingProduct
                      ? 'Salvar Alterações'
                      : pendingImages.length > 0
                      ? `Criar Produto (${pendingImages.length} fotos)`
                      : 'Criar Produto'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal Lightbox / Galeria de Fotos em Alta Resolução */}
      <Modal
        isOpen={!!lightboxProduct}
        onClose={() => setLightboxProduct(null)}
        title={lightboxProduct ? `Galeria: ${lightboxProduct.name}` : 'Visualizador de Fotos'}
        subtitle={lightboxProduct ? `SKU: ${lightboxProduct.sku} • Foto ${lightboxIndex + 1} de ${lightboxProduct.images.length || 1}` : ''}
        maxWidth="720px"
      >
        {lightboxProduct && (
          <div>
            {lightboxProduct.images && lightboxProduct.images.length > 0 ? (
              <div>
                {/* Visualizador da Foto Principal */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '420px',
                    backgroundColor: '#1a1816',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <img
                    src={getProductImageUrl(
                      lightboxProduct.images[lightboxIndex]?.url ||
                      lightboxProduct.images[lightboxIndex]?.file_path
                    )}
                    alt={lightboxProduct.name}
                    onError={handleImageError}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                    }}
                  />

                  {/* Badge de Capa */}
                  {lightboxProduct.images[lightboxIndex]?.is_primary && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        backgroundColor: 'var(--brand-accent)',
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-xs)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      }}
                    >
                      <Star size={12} fill="#fff" />
                      Foto de Capa Principal
                    </span>
                  )}

                  {/* Botões de Navegação Anterior / Próximo */}
                  {lightboxProduct.images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxIndex((prev) =>
                            prev === 0 ? lightboxProduct.images.length - 1 : prev - 1
                          )
                        }
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '38px',
                          height: '38px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease',
                        }}
                        title="Foto anterior"
                      >
                        <ChevronLeft size={22} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxIndex((prev) =>
                            prev === lightboxProduct.images.length - 1 ? 0 : prev + 1
                          )
                        }
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '38px',
                          height: '38px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease',
                        }}
                        title="Próxima foto"
                      >
                        <ChevronRight size={22} />
                      </button>
                    </>
                  )}
                </div>

                {/* Tira de Miniaturas inferior */}
                {lightboxProduct.images.length > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '10px',
                      overflowX: 'auto',
                      paddingBottom: '12px',
                      marginBottom: '16px',
                    }}
                  >
                    {lightboxProduct.images.map((img, idx) => (
                      <div
                        key={img.id}
                        onClick={() => setLightboxIndex(idx)}
                        style={{
                          position: 'relative',
                          width: '64px',
                          height: '64px',
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          flexShrink: 0,
                          cursor: 'pointer',
                          border: idx === lightboxIndex ? '3px solid var(--brand-accent)' : '1px solid var(--border-medium)',
                          opacity: idx === lightboxIndex ? 1 : 0.65,
                          transition: 'opacity 0.2s ease, border 0.2s ease',
                        }}
                      >
                        <img
                          src={getProductImageUrl(img.url || img.file_path)}
                          alt={img.original_filename}
                          loading="lazy"
                          onError={handleImageError}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--text-tertiary)',
                  backgroundColor: 'var(--bg-sand-light)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                }}
              >
                <ImageIcon size={40} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                <p style={{ margin: 0, fontWeight: 500 }}>Nenhuma foto cadastrada para este produto.</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => {
                  const prod = lightboxProduct;
                  setLightboxProduct(null);
                  handleOpenImageModal(prod);
                }}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Upload size={15} />
                <span>Gerenciar / Enviar Novas Fotos</span>
              </button>

              <button
                type="button"
                onClick={() => setLightboxProduct(null)}
                className="btn-primary"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Gestão de Fotos */}
      <Modal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        title={`Fotos: ${imageModalProduct?.name}`}
        subtitle="Adicione e organize as imagens deste produto para exibição e venda"
        maxWidth="680px"
      >
        {imageError && (
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--status-danger-bg)',
              color: 'var(--status-danger-text)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
              fontSize: '0.85rem',
            }}
          >
            {imageError}
          </div>
        )}

        {/* Área de Upload */}
        <div
          style={{
            border: '2px dashed var(--border-medium)',
            borderRadius: 'var(--radius-md)',
            padding: '28px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-sand-light)',
            marginBottom: '24px',
            position: 'relative',
          }}
        >
          <input
            type="file"
            multiple
            accept="image/png, image/jpeg, image/webp"
            disabled={uploadingImage}
            onChange={handleUploadImage}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: uploadingImage ? 'not-allowed' : 'pointer',
            }}
          />
          {uploadingImage ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Loader2 size={24} className="spin-animation" color="var(--brand-accent)" />
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Validando e enviando imagem(ns)...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <Upload size={28} color="var(--brand-accent)" />
              <p style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: '0.95rem' }}>
                Clique ou arraste uma ou várias fotos para enviar
              </p>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                PNG, JPG ou WebP até 10 MB cada (máximo 10 fotos por produto)
              </span>
            </div>
          )}
        </div>

        {/* Galeria de Fotos */}
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--brand-primary)', marginBottom: '12px' }}>
            Fotos Cadastradas ({imageModalProduct?.images.length || 0}/10)
          </h4>

          {(!imageModalProduct?.images || imageModalProduct.images.length === 0) ? (
            <p style={{ fontSize: '0.88rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              Nenhuma foto anexada a este produto ainda.
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '14px',
              }}
            >
              {imageModalProduct.images.map((img) => (
                <div
                  key={img.id}
                  style={{
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    border: img.is_primary ? '2px solid var(--brand-accent)' : '1px solid var(--border-subtle)',
                    position: 'relative',
                    backgroundColor: 'var(--bg-surface)',
                  }}
                >
                  <img
                    src={getProductImageUrl(img.url || img.file_path)}
                    alt={img.original_filename}
                    loading="lazy"
                    onError={handleImageError}
                    style={{
                      width: '100%',
                      height: '110px',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />

                  {img.is_primary && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '6px',
                        left: '6px',
                        backgroundColor: 'var(--brand-accent)',
                        color: '#fff',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-xs)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <Star size={10} fill="#fff" />
                      Capa
                    </span>
                  )}

                  <div
                    style={{
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'var(--bg-sand-light)',
                    }}
                  >
                    {!img.is_primary ? (
                      <button
                        onClick={() => handleSetPrimary(img.id)}
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--brand-accent)',
                          fontWeight: 600,
                        }}
                      >
                        Definir Capa
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Principal</span>
                    )}
                    <button
                      onClick={() => handleDeleteImage(img.id)}
                      title="Excluir Foto"
                      style={{ color: 'var(--status-danger-text)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Modal de Composição e Soma de Custos Estimados */}
      <Modal
        isOpen={isCostCalculatorOpen}
        onClose={() => setIsCostCalculatorOpen(false)}
        title="Composição de Custo Estimado"
        subtitle={`Calcule o custo estimado selecionando matérias-primas, insumos de produção e taxas de '${formData.name || 'Novo Item'}'`}
        maxWidth="680px"
      >
        <div>
          {/* Informação e ajuste do Preço de Venda Base */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              backgroundColor: 'var(--bg-sand-light)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-medium)',
              marginBottom: '16px',
            }}
          >
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Preço de Venda do Produto:
              </span>{' '}
              <strong style={{ fontSize: '0.9rem', color: formData.sale_price ? 'var(--brand-primary)' : 'var(--status-danger-text)' }}>
                {formData.sale_price ? `R$ ${formData.sale_price}` : 'Não informado'}
              </strong>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginLeft: '8px' }}>
                (usado no cálculo de taxas em %, como Shopee)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="calc-sale-price-quick" style={{ fontSize: '0.78rem', margin: 0, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Ajustar Preço:
              </label>
              <input
                id="calc-sale-price-quick"
                type="text"
                inputMode="numeric"
                value={formData.sale_price || ''}
                onChange={(e) => {
                  const formatted = formatCurrencyInputRTL(e.target.value, true);
                  setFormData({ ...formData, sale_price: formatted });
                }}
                placeholder="0,00"
                style={{ width: '90px', padding: '4px 8px', fontSize: '0.82rem', textAlign: 'right' }}
              />
            </div>
          </div>

          {/* Formulário de Adição de Item de Custo */}
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-sand-light)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-medium)',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                + Selecionar Matéria-Prima ou Insumo
              </span>
              <button
                type="button"
                onClick={() => {
                  setQuickSupplyName('');
                  setQuickSupplyCategory('Matéria-Prima');
                  setQuickSupplyUnit('unid');
                  setQuickSupplyBaseQty('1');
                  setQuickSupplyBaseCost('');
                  setQuickSupplyNotes('');
                  setQuickSupplyError(null);
                  setIsQuickSupplyModalOpen(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--brand-accent)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 4px',
                }}
                title="Cadastrar novo insumo para ficar disponível na lista"
              >
                <Plus size={14} /> Cadastrar Novo Insumo
              </button>
            </div>

            {/* Linha 1: Combo Box de Insumos Pré-Cadastrados */}
            <div style={{ marginBottom: '12px' }}>
              <label htmlFor="cost-item-supply-select" style={{ fontSize: '0.75rem', marginBottom: '4px', fontWeight: 600 }}>
                Insumo / Matéria-Prima Pré-Cadastrada *
              </label>
              <select
                id="cost-item-supply-select"
                value={selectedSupplyId}
                onChange={(e) => handleSelectSupply(e.target.value)}
                style={{ width: '100%', fontSize: '0.86rem', padding: '8px 10px' }}
              >
                <option value="">-- Selecione um insumo ou produto para kit --</option>
                {/* Produtos Acabados do Ateliê para Composição de Kits */}
                {products.filter((p) => !p.parent_id && p.id !== editingProduct?.id).length > 0 && (
                  <optgroup label="🎁 Produtos do Ateliê (para Kits e Conjuntos)">
                    {products
                      .filter((p) => !p.parent_id && p.id !== editingProduct?.id)
                      .map((p) => {
                        const cost = Number(p.unit_cost) || 0;
                        const weightInfo = p.weight ? ` | ⚖️ ${formatWeight(p.weight)}` : '';
                        return (
                          <option key={`prod-${p.id}`} value={`prod-${p.id}`}>
                            {p.name} (R$ {cost.toFixed(2)} custo{weightInfo})
                          </option>
                        );
                      })}
                  </optgroup>
                )}
                {['Matéria-Prima', 'Embalagem', 'Material Auxiliar', 'Taxas e Marketplaces', 'Outros'].map((cat) => {
                  const groupSupplies = supplies.filter((s) => (s.category || 'Outros') === cat);
                  if (groupSupplies.length === 0) return null;
                  return (
                    <optgroup key={cat} label={`📦 ${cat}`}>
                      {groupSupplies.map((s) => {
                        const bQty = Number(s.base_quantity) || 1;
                        const bCost = Number(s.base_cost) || 0;
                        const info = s.unit === '%'
                          ? `${s.name} (${bQty}% sobre valor de venda)`
                          : s.unit === 'fixo'
                          ? `${s.name} (R$ ${bCost.toFixed(2)} fixo)`
                          : `${s.name} (R$ ${bCost.toFixed(2)} a cada ${bQty} ${s.unit})`;
                        return (
                          <option key={s.id} value={s.id}>
                            {info}
                          </option>
                        );
                      })}
                    </optgroup>
                  );
                })}
                <option value="custom">✏️ Insumo Avulso / Digitar manualmente...</option>
                <option value="new">➕ Cadastrar novo insumo permanente...</option>
              </select>
            </div>

            {/* Linha 2 (se avulso): Nome do Insumo personalizado */}
            {(selectedSupplyId === 'custom' || (!selectedSupplyId && newCostItemName)) && (
              <div style={{ marginBottom: '12px' }}>
                <label htmlFor="cost-item-custom-name" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>
                  Descrição do Insumo Avulso *
                </label>
                <input
                  id="cost-item-custom-name"
                  type="text"
                  placeholder="Ex.: Embalagem especial personalizada, Fita de cetim..."
                  value={newCostItemName}
                  onChange={(e) => setNewCostItemName(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {/* Linha 3: Quantidade gasta, Unidade, Peso, Custo Unitário e Botão Adicionar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr 1.1fr auto', gap: '10px', alignItems: 'flex-end' }}>
              <div>
                <label htmlFor="cost-item-qty" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>
                  {newCostItemUnit === '%' ? 'Porcentagem (%)' : newCostItemUnit === 'fixo' ? 'Qtd Fixa' : `Qtd Gasta (${newCostItemUnit})`}
                </label>
                <input
                  id="cost-item-qty"
                  type="text"
                  placeholder="1"
                  value={newCostItemQuantity}
                  onChange={(e) => handleCostItemQuantityChange(e.target.value)}
                  style={{ textAlign: 'right' }}
                />
              </div>

              <div>
                <label htmlFor="cost-item-unit" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>
                  Unidade
                </label>
                <select
                  id="cost-item-unit"
                  value={newCostItemUnit}
                  onChange={(e) => handleCostItemUnitChange(e.target.value)}
                  style={{ fontSize: '0.85rem', padding: '8px 6px', width: '100%' }}
                >
                  <option value="unid">unid (Unidade / Cada)</option>
                  <option value="mt">mt (Metros)</option>
                  <option value="gr">gr (Gramas)</option>
                  <option value="kg">kg (Quilogramas)</option>
                  <option value="ml">ml (Mililitros)</option>
                  <option value="l">l (Litros)</option>
                  <option value="%">% (s/ Preço Venda)</option>
                  <option value="fixo">fixo (Taxa Fixa R$)</option>
                </select>
              </div>

              <div>
                <label htmlFor="cost-item-weight" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span>Peso (g)</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>(opcional)</span>
                </label>
                <input
                  id="cost-item-weight"
                  type="text"
                  placeholder="0"
                  value={newCostItemWeight}
                  onChange={(e) => setNewCostItemWeight(e.target.value.replace(/\D/g, ''))}
                  style={{ textAlign: 'right' }}
                  title="Peso deste componente em gramas para soma do produto/kit"
                />
              </div>

              <div>
                <label htmlFor="cost-item-cost" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>
                  {newCostItemUnit === '%' ? 'Valor %' : newCostItemUnit === 'fixo' ? 'Taxa (R$)' : `Custo / ${newCostItemUnit} (R$)`}
                </label>
                <input
                  id="cost-item-cost"
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={newCostItemUnitCost}
                  onChange={(e) => setNewCostItemUnitCost(formatCurrencyInputRTL(e.target.value, true))}
                  onFocus={(e) => e.target.select()}
                  style={{ textAlign: 'right' }}
                />
              </div>

              <button
                type="button"
                onClick={handleAddCostItem}
                className="btn-primary"
                style={{ height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Adicionar à soma de custos do produto"
              >
                <Plus size={16} />
                <span>Adicionar</span>
              </button>
            </div>

            {/* Prévia ao vivo do cálculo do subtotal e peso */}
            {(() => {
              const qtyNum = parseFloat(newCostItemQuantity.replace(',', '.')) || 0;
              const unitCostNum = parseCurrencyValue(newCostItemUnitCost);
              const weightVal = parseFloat(newCostItemWeight.replace(',', '.')) || 0;
              const subtotal = calculateItemSubtotal(
                newCostItemQuantity,
                newCostItemUnit,
                unitCostNum,
                newCostItemBaseCost,
                newCostItemBaseQuantity
              );
              return (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    backgroundColor: '#fff',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {newCostItemUnit === '%' ? (
                      formData.sale_price && parseOptionalCurrencyValue(formData.sale_price) ? (
                        <>Cálculo: {qtyNum}% sobre o Preço de Venda (R$ {Number(parseOptionalCurrencyValue(formData.sale_price) || 0).toFixed(2)})</>
                      ) : (
                        <span style={{ color: '#b45309' }}>⚠️ Preço de Venda do produto ainda não informado (digite o preço para calcular o %)</span>
                      )
                    ) : newCostItemUnit === 'gr' && newCostItemBaseQuantity === 100 ? (
                      <>Cálculo: {qtyNum} gr (proporcional a R$ {newCostItemBaseCost.toFixed(2)} por 100 gr = R$ {unitCostNum.toFixed(4)}/gr)</>
                    ) : (
                      <>Cálculo: {qtyNum} {newCostItemUnit} × R$ {unitCostNum.toFixed(2)}/{newCostItemUnit}</>
                    )}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {weightVal > 0 && (
                      <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#0d9488' }}>
                        ⚖️ {formatWeight(weightVal)}
                      </span>
                    )}
                    <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                      Subtotal: R$ {subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Lista de Itens Cadastrados */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Itens Somados na Composição ({costItems.length})
              </span>
              {costItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCostItems([]);
                    setFormData((prev) => ({ ...prev, unit_cost: '0,00', cost_breakdown: '' }));
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--status-danger-text)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  Limpar todos
                </button>
              )}
            </div>

            {costItems.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-white)',
                  border: '1px dashed var(--border-medium)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-tertiary)',
                  fontSize: '0.85rem',
                }}
              >
                <Calculator size={28} color="var(--brand-accent)" style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                <p style={{ margin: 0, fontWeight: 500 }}>Nenhum insumo ou matéria-prima adicionada ainda.</p>
                <span style={{ fontSize: '0.78rem' }}>
                  Selecione um insumo no combo box acima e informe a quantidade para calcular o custo e peso estimado do produto / kit.
                </span>
              </div>
            ) : (
              <div
                style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-white)',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-sand-light)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Item</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>Qtd / Medida</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>Peso (g)</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Unit. (R$)</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Total (R$)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {costItems.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {item.name}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {item.quantity} {item.unit || ''}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#0d9488', fontWeight: 600 }}>
                          {item.weight ? `${item.weight} g` : '—'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {item.unit === '%' ? `${item.quantity}%` : `R$ ${item.unit_cost.toFixed(4)}`}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--brand-primary)' }}>
                          R$ {item.total.toFixed(2)}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveCostItem(item.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--status-danger-text)',
                              cursor: 'pointer',
                              padding: '2px',
                            }}
                            title="Remover este item do custo"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Card Resumo do Custo Total e Peso Total Somado */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#fbf3ea',
              border: '1px solid #ecd6c5',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}
          >
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--brand-accent)', textTransform: 'uppercase' }}>
                Resumo da Composição
              </span>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Soma de todos os {costItems.length} insumos e componentes do produto / kit
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ textAlign: 'right', borderRight: '1px solid #ecd6c5', paddingRight: '20px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>
                  Peso Somado
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0d9488' }}>
                  {costItems.reduce((acc, item) => acc + (item.weight || 0), 0)} g
                  {costItems.reduce((acc, item) => acc + (item.weight || 0), 0) >= 1000 && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', marginLeft: '4px' }}>
                      ({(costItems.reduce((acc, item) => acc + (item.weight || 0), 0) / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 })} kg)
                    </span>
                  )}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>
                  Custo Total
                </span>
                <span style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
                  R$ {costItems.reduce((acc, item) => acc + item.total, 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setIsCostCalculatorOpen(false)}
              className="btn-secondary"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleApplyCalculatedCost}
              className="btn-primary"
            >
              Aplicar Custo e Peso ao Produto
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Rápido de Cadastro de Insumo Permanente */}
      <Modal
        isOpen={isQuickSupplyModalOpen}
        onClose={() => setIsQuickSupplyModalOpen(false)}
        title="Cadastrar Novo Insumo de Produção"
        subtitle="Adicione matérias-primas ou embalagens que ficarão salvas para outros produtos"
        maxWidth="500px"
      >
        <form onSubmit={handleSaveQuickSupply}>
          {quickSupplyError && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--status-danger-bg)',
                color: 'var(--status-danger-text)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '16px',
                fontSize: '0.85rem',
              }}
            >
              {quickSupplyError}
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label htmlFor="quick-sup-name">Nome do Insumo / Matéria-Prima *</label>
            <input
              id="quick-sup-name"
              type="text"
              required
              placeholder="Ex.: Cimento, Batente Silicone, Essência Lavanda..."
              value={quickSupplyName}
              onChange={(e) => setQuickSupplyName(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label htmlFor="quick-sup-cat">Categoria</label>
              <select
                id="quick-sup-cat"
                value={quickSupplyCategory}
                onChange={(e) => setQuickSupplyCategory(e.target.value)}
              >
                <option value="Matéria-Prima">Matéria-Prima</option>
                <option value="Embalagem">Embalagem</option>
                <option value="Material Auxiliar">Material Auxiliar</option>
                <option value="Taxas e Marketplaces">Taxas e Marketplaces</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div>
              <label htmlFor="quick-sup-unit">Unidade *</label>
              <select
                id="quick-sup-unit"
                value={quickSupplyUnit}
                onChange={(e) => setQuickSupplyUnit(e.target.value)}
              >
                <option value="unid">unid (Unidade / Cada)</option>
                <option value="mt">mt (Metros)</option>
                <option value="gr">gr (Gramas)</option>
                <option value="kg">kg (Quilogramas)</option>
                <option value="ml">ml (Mililitros)</option>
                <option value="l">l (Litros)</option>
                <option value="%">% (% sobre Venda)</option>
                <option value="fixo">fixo (Taxa Fixa R$)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label htmlFor="quick-sup-base-qty">
                {quickSupplyUnit === '%' ? 'Porcentagem (%)' : quickSupplyUnit === 'fixo' ? 'Quantidade' : `Qtd Base (${quickSupplyUnit})`}
              </label>
              <input
                id="quick-sup-base-qty"
                type="text"
                placeholder={quickSupplyUnit === 'gr' ? '100' : '1'}
                value={quickSupplyBaseQty}
                onChange={(e) => setQuickSupplyBaseQty(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="quick-sup-base-cost">
                {quickSupplyUnit === '%' ? 'Valor %' : 'Custo Total Base (R$) *'}
              </label>
              <input
                id="quick-sup-base-cost"
                type="text"
                placeholder="0,00"
                value={quickSupplyBaseCost}
                onChange={(e) => setQuickSupplyBaseCost(formatCurrencyInputRTL(e.target.value, true))}
                onFocus={(e) => e.target.select()}
                style={{ textAlign: 'right' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="quick-sup-notes">Observações / Detalhes (Opcional)</label>
            <input
              id="quick-sup-notes"
              type="text"
              placeholder="Ex.: R$ 3,44 a cada 100g..."
              value={quickSupplyNotes}
              onChange={(e) => setQuickSupplyNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setIsQuickSupplyModalOpen(false)}
              className="btn-secondary"
              disabled={savingQuickSupply}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingQuickSupply}>
              {savingQuickSupply ? 'Salvando...' : 'Salvar Insumo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Encaminhar via WhatsApp */}
      <Modal
        isOpen={!!whatsAppProduct}
        onClose={() => setWhatsAppProduct(null)}
        title="Encaminhar Produto via WhatsApp"
        subtitle="Compartilhe links das lojas e detalhes do produto com seus clientes em um clique"
        maxWidth="540px"
      >
        {whatsAppProduct && (() => {
          const links = parseSalesLinks(whatsAppProduct.sales_links);
          const primaryImg =
            whatsAppProduct.images.find((img) => img.is_primary) || whatsAppProduct.images[0];

          return (
            <form onSubmit={handleSendWhatsApp}>
              {/* Card Resumo do Produto */}
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-sand-light)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-xs)',
                    overflow: 'hidden',
                    backgroundColor: '#fff',
                    border: '1px solid var(--border-medium)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {primaryImg ? (
                    <img
                      src={getProductImageUrl(primaryImg.file_path)}
                      alt={whatsAppProduct.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={handleImageError}
                    />
                  ) : (
                    <Package size={22} color="var(--brand-accent)" opacity={0.6} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: '0.94rem',
                      fontWeight: 700,
                      color: 'var(--brand-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {whatsAppProduct.name}
                  </h4>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '3px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontFamily: 'monospace',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {whatsAppProduct.sku}
                    </span>
                    {whatsAppProduct.material && (
                      <span
                        style={{
                          fontSize: '0.74rem',
                          color: 'var(--text-secondary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        🧱 {whatsAppProduct.material}
                      </span>
                    )}
                    {whatsAppProduct.color && (
                      <span
                        style={{
                          fontSize: '0.74rem',
                          color: 'var(--text-secondary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: getColorHex(whatsAppProduct.color),
                            border: '1px solid rgba(0,0,0,0.2)',
                          }}
                        />
                        {whatsAppProduct.color}
                      </span>
                    )}
                    {whatsAppProduct.sale_price && (
                      <span
                        style={{
                          fontSize: '0.86rem',
                          fontWeight: 700,
                          color: 'var(--brand-accent)',
                        }}
                      >
                        R$ {Number(whatsAppProduct.sale_price).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Seleção de Links de Lojas */}
              {links.length > 0 ? (
                <div style={{ marginBottom: '16px' }}>
                  <label
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'var(--brand-primary)',
                      display: 'block',
                      marginBottom: '8px',
                    }}
                  >
                    Qual link da loja deseja incluir?
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleWhatsAppLinkChange('all')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border:
                          whatsAppSelectedLink === 'all'
                            ? '2px solid var(--brand-accent)'
                            : '1px solid var(--border-medium)',
                        backgroundColor: whatsAppSelectedLink === 'all' ? '#fbf3ea' : '#fff',
                        color:
                          whatsAppSelectedLink === 'all'
                            ? 'var(--brand-primary)'
                            : 'var(--text-secondary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Store size={14} color="var(--brand-accent)" />
                      <span>Todos os canais ({links.length})</span>
                    </button>
                    {links.map((link) => {
                      const isSelected = whatsAppSelectedLink === link.id;
                      const mStyle = getMarketplaceStyle(link.platform);
                      return (
                        <button
                          key={link.id}
                          type="button"
                          onClick={() => handleWhatsAppLinkChange(link.id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: isSelected
                              ? `2px solid ${mStyle.border || '#25D366'}`
                              : '1px solid var(--border-medium)',
                            backgroundColor: isSelected ? mStyle.bg : '#fff',
                            color: isSelected ? mStyle.color : 'var(--text-primary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span>{link.platform}</span>
                          <ExternalLink size={11} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#fffbeb',
                    color: '#b45309',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #fde68a',
                    marginBottom: '16px',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Sem links de lojas vinculados:</strong> Este produto ainda não tem URLs
                    de marketplaces cadastradas. A mensagem abaixo contém os dados principais (nome,
                    preço, cor). Se quiser adicionar links de anúncios, edite o produto.
                  </div>
                </div>
              )}

              {/* Telefone do Destinatário (Opcional) */}
              <div style={{ marginBottom: '14px' }}>
                <label
                  htmlFor="wa-phone"
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--brand-primary)',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  Número do WhatsApp do Cliente (Opcional)
                </label>
                <input
                  id="wa-phone"
                  type="text"
                  placeholder="Ex.: 11999998888 (deixe vazio para escolher o contato no WhatsApp)"
                  value={whatsAppPhone}
                  onChange={(e) => setWhatsAppPhone(e.target.value)}
                  style={{ width: '100%' }}
                />
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-tertiary)',
                    display: 'block',
                    marginTop: '3px',
                  }}
                >
                  Se vazio, o WhatsApp abrirá sua lista de conversas para você escolher o contato ou
                  grupo.
                </span>
              </div>

              {/* Texto da Mensagem */}
              <div style={{ marginBottom: '20px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px',
                  }}
                >
                  <label
                    htmlFor="wa-message"
                    style={{
                      margin: 0,
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'var(--brand-primary)',
                    }}
                  >
                    Texto da Mensagem (Editável)
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyWhatsAppMessage}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: copiedMessage ? '#16a34a' : 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 6px',
                    }}
                  >
                    {copiedMessage ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedMessage ? 'Copiado!' : 'Copiar texto'}</span>
                  </button>
                </div>
                <textarea
                  id="wa-message"
                  rows={6}
                  value={whatsAppMessage}
                  onChange={(e) => setWhatsAppMessage(e.target.value)}
                  style={{
                    width: '100%',
                    fontFamily: 'inherit',
                    fontSize: '0.86rem',
                    lineHeight: 1.45,
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Rodapé de Ações */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setWhatsAppProduct(null)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#25D366',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: '9px 18px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(37, 211, 102, 0.35)',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1ebe5d')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#25D366')}
                >
                  <WhatsAppIcon size={18} color="#fff" />
                  <span>Abrir no WhatsApp</span>
                </button>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* Modal Rápido: Cadastrar Nova Cor */}
      <Modal
        isOpen={isQuickColorModalOpen}
        onClose={() => setIsQuickColorModalOpen(false)}
        title="Cadastrar Nova Cor de Produto"
        maxWidth="460px"
      >
        <form onSubmit={handleSaveQuickColor}>
          {quickColorError && (
            <div className="alert alert-danger" style={{ marginBottom: '14px', fontSize: '0.85rem' }}>
              <AlertCircle size={15} /> {quickColorError}
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label htmlFor="quick-color-name" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
              Nome da Cor / Acabamento *
            </label>
            <input
              id="quick-color-name"
              type="text"
              required
              autoFocus
              placeholder="Ex.: Marmorizado Branco e Cinza, Terracota Rústico..."
              value={quickColorName}
              onChange={(e) => setQuickColorName(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label htmlFor="quick-color-hex" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
              Cor Visual / Amostra (Opcional)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                id="quick-color-hex"
                type="color"
                value={quickColorHex}
                onChange={(e) => setQuickColorHex(e.target.value)}
                style={{
                  width: '44px',
                  height: '38px',
                  padding: '2px',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  backgroundColor: 'transparent',
                }}
              />
              <input
                type="text"
                placeholder="#d1d5db"
                value={quickColorHex}
                onChange={(e) => setQuickColorHex(e.target.value)}
                style={{ flex: 1, fontFamily: 'monospace' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
              {['#ffffff', '#f7f4ea', '#fef3c7', '#d8b4fe', '#fbcfe8', '#c86d51', '#86efac', '#93c5fd', '#2c2824', '#d1d5db'].map((pal) => (
                <button
                  key={pal}
                  type="button"
                  onClick={() => setQuickColorHex(pal)}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: pal,
                    border: quickColorHex === pal ? '2px solid var(--brand-accent)' : '1px solid rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                  }}
                  title={pal}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsQuickColorModalOpen(false)}
              disabled={savingQuickColor}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingQuickColor || !quickColorName.trim()}
            >
              {savingQuickColor ? (
                <>
                  <Loader2 size={15} className="spinner" /> Salvando...
                </>
              ) : (
                'Salvar Cor'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Rápido: Cadastrar Novo Material */}
      <Modal
        isOpen={isQuickMaterialModalOpen}
        onClose={() => setIsQuickMaterialModalOpen(false)}
        title="Cadastrar Novo Material"
        maxWidth="460px"
      >
        <form onSubmit={handleSaveQuickMaterial}>
          {quickMaterialError && (
            <div className="alert alert-danger" style={{ marginBottom: '14px', fontSize: '0.85rem' }}>
              <AlertCircle size={15} /> {quickMaterialError}
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label htmlFor="quick-material-name" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
              Nome do Material *
            </label>
            <input
              id="quick-material-name"
              type="text"
              required
              autoFocus
              placeholder="Ex.: Cimento Estrutural, Granilite, Cera de Coco..."
              value={quickMaterialName}
              onChange={(e) => setQuickMaterialName(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label htmlFor="quick-material-desc" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
              Descrição / Observações (Opcional)
            </label>
            <textarea
              id="quick-material-desc"
              rows={2}
              placeholder="Ex.: Traço especial de argamassa ACIII, cera ecológica pura..."
              value={quickMaterialDesc}
              onChange={(e) => setQuickMaterialDesc(e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsQuickMaterialModalOpen(false)}
              disabled={savingQuickMaterial}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingQuickMaterial || !quickMaterialName.trim()}
            >
              {savingQuickMaterial ? (
                <>
                  <Loader2 size={15} className="spinner" /> Salvando...
                </>
              ) : (
                'Salvar Material'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Detalhes Completos do Produto (Visualização Pura / Sem Editar) */}
      <Modal
        isOpen={!!previewProductModal}
        onClose={() => {
          setPreviewProductModal(null);
          setPreviewModalActiveVarId(null);
        }}
        title={previewProductModal ? previewProductModal.name : 'Detalhes do Produto'}
        subtitle={previewProductModal ? (() => {
          const activeVar = (previewProductModal.variations && previewProductModal.variations.length > 0)
            ? (previewProductModal.variations.find((v) => v.id === previewModalActiveVarId) || null)
            : null;
          return activeVar
            ? `SKU: ${activeVar.sku} • Variação: ${activeVar.variation_name || activeVar.color || ''}`
            : `SKU: ${previewProductModal.sku}${previewProductModal.variations && previewProductModal.variations.length > 0 ? ` • ${previewProductModal.variations.length} variações vinculadas` : ''}`;
        })() : ''}
        maxWidth="660px"
      >
        {previewProductModal && (() => {
          const activeVar = (previewProductModal.variations && previewProductModal.variations.length > 0)
            ? (previewProductModal.variations.find((v) => v.id === previewModalActiveVarId) || null)
            : null;

          const rawPrimary =
            (activeVar && activeVar.primary_image_url) ||
            previewProductModal.primary_image_url ||
            (previewProductModal.images && previewProductModal.images.length > 0
              ? previewProductModal.images.find((i) => i.is_primary)?.url ||
                previewProductModal.images[0].url ||
                previewProductModal.images[0].file_path
              : null);
          const hasImage = !!rawPrimary;
          const imgUrl = getProductImageUrl(rawPrimary);
          const unitCode = previewProductModal.unit?.code || 'UN';
          const currentStockNum = activeVar
            ? Number(activeVar.current_stock ?? 0)
            : Number(previewProductModal.current_stock ?? 0);
          const isLowStock = currentStockNum <= 5;

          const costVal = activeVar && activeVar.unit_cost !== null && activeVar.unit_cost !== undefined
            ? Number(activeVar.unit_cost)
            : (Number(previewProductModal.unit_cost) || 0);

          const saleVal = activeVar && activeVar.sale_price !== null && activeVar.sale_price !== undefined
            ? Number(activeVar.sale_price)
            : (Number(previewProductModal.sale_price) || 0);

          const profitVal = saleVal > 0 ? saleVal - costVal : 0;
          const marginPct = saleVal > 0 ? ((profitVal / saleVal) * 100).toFixed(1) : '0.0';
          const links = parseSalesLinks(previewProductModal.sales_links);
          let costItemsParsed: CostComponentItem[] = [];
          if (previewProductModal.cost_breakdown) {
            try {
              costItemsParsed = JSON.parse(previewProductModal.cost_breakdown);
            } catch {}
          }

          const currentColor = activeVar
            ? (activeVar.color || activeVar.variation_name)
            : previewProductModal.color;

          return (
            <div>
              {/* Galeria de Fotos */}
              {hasImage ? (
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ height: '230px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', backgroundColor: 'var(--bg-sand-light)', border: '1px solid var(--border-subtle)', position: 'relative' }}>
                    <img src={imgUrl} alt={previewProductModal.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={handleImageError} />
                    {activeVar && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          left: '8px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          color: '#fff',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                        }}
                      >
                        Exibindo foto da variação: {activeVar.variation_name || activeVar.color}
                      </span>
                    )}
                  </div>
                  {previewProductModal.images && previewProductModal.images.length > 1 && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                      {previewProductModal.images.map((im, idx) => (
                        <div
                          key={im.id}
                          onClick={() => {
                            setLightboxProduct(previewProductModal);
                            setLightboxIndex(idx);
                          }}
                          style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-xs)', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--border-medium)', flexShrink: 0 }}
                          title="Ver foto em tela cheia"
                        >
                          <img src={getProductImageUrl(im.url || im.file_path)} alt={im.original_filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={handleImageError} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Informações Principais */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }}>
                <Badge type={previewProductModal.item_type} />
                <Badge status={previewProductModal.is_active ? 'active' : 'inactive'} />
                {previewProductModal.is_kit && (
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b45309', backgroundColor: '#fef3c7', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '10px' }}>
                    🎁 Kit de Produtos
                  </span>
                )}
                {previewProductModal.category && (
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-primary)', backgroundColor: 'var(--bg-sand-light)', padding: '2px 8px', borderRadius: '10px' }}>
                    📁 {previewProductModal.category.name}
                  </span>
                )}
                {previewProductModal.material && (
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'var(--bg-sand-light)', padding: '2px 8px', borderRadius: '10px' }}>
                    🧱 {previewProductModal.material}
                  </span>
                )}
                {currentColor && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-primary)', backgroundColor: '#fff', border: '1px solid var(--border-subtle)', padding: '2px 8px', borderRadius: '10px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getColorHex(currentColor), border: '1px solid rgba(0,0,0,0.2)' }} />
                    {currentColor}
                  </span>
                )}
              </div>

              {/* Seletor de Variações Estilo Shopee */}
              {previewProductModal.variations && previewProductModal.variations.length > 0 && (
                <div
                  style={{
                    marginBottom: '16px',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-sand-light)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      🛍️ Variações Disponíveis ({previewProductModal.variations.length}):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const p = previewProductModal;
                        setPreviewProductModal(null);
                        setVariationManageModalProduct(p);
                      }}
                      className="btn-link"
                      style={{ fontSize: '0.76rem', color: 'var(--brand-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      <Layers size={13} /> Gerenciar Variações
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setPreviewModalActiveVarId(null)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: previewModalActiveVarId === null ? '2px solid var(--brand-primary)' : '1px solid var(--border-medium)',
                        backgroundColor: previewModalActiveVarId === null ? 'rgba(163, 116, 87, 0.12)' : '#fff',
                        color: previewModalActiveVarId === null ? 'var(--brand-primary)' : 'var(--text-primary)',
                        boxShadow: previewModalActiveVarId === null ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      <span>Geral (Total)</span>
                    </button>
                    {previewProductModal.variations.map((v) => {
                      const isSelected = previewModalActiveVarId === v.id;
                      const vStock = Number(v.current_stock ?? 0);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setPreviewModalActiveVarId(v.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: isSelected ? '2px solid var(--brand-primary)' : '1px solid var(--border-medium)',
                            backgroundColor: isSelected ? 'rgba(163, 116, 87, 0.12)' : '#fff',
                            color: isSelected ? 'var(--brand-primary)' : 'var(--text-primary)',
                            opacity: vStock <= 0 ? 0.75 : 1,
                            boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                          }}
                        >
                          {v.color && (
                            <span
                              style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                backgroundColor: getColorHex(v.color),
                                border: '1px solid rgba(0,0,0,0.25)',
                              }}
                            />
                          )}
                          <span>{v.variation_name || v.color}</span>
                          <span
                            style={{
                              fontSize: '0.74rem',
                              padding: '1px 5px',
                              borderRadius: '6px',
                              backgroundColor: vStock <= 0 ? 'var(--status-danger-bg)' : '#fff',
                              color: vStock <= 0 ? 'var(--status-danger-text)' : 'var(--text-secondary)',
                              fontWeight: 700,
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            {vStock <= 0 ? '0.00 un (Esgotado)' : `${vStock.toFixed(2)} un`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bloco de Estoque Total com Alerta */}
              <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', backgroundColor: isLowStock ? '#fffbeb' : 'var(--bg-sand-light)', border: isLowStock ? '1px solid #fde68a' : '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, color: isLowStock ? '#92400e' : 'var(--text-secondary)', display: 'block' }}>
                      {activeVar ? `Estoque da Variação (${activeVar.variation_name || activeVar.color})` : 'Estoque Total Disponível'}
                    </span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: isLowStock ? '#b45309' : 'var(--brand-primary)' }}>
                      {currentStockNum.toFixed(2)} {unitCode}
                    </span>
                  </div>
                  {activeVar ? renderStockDisplay(activeVar) : renderStockDisplay(previewProductModal)}
                </div>
                {isLowStock && (
                  <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: '#b45309', fontWeight: 600 }}>
                    ⚠️ {currentStockNum <= 0 ? 'Item esgotado no depósito!' : `Atenção: Apenas ${currentStockNum.toFixed(2)} ${unitCode} no estoque (alerta configurado para ≤ 5.00 peças).`}
                  </p>
                )}
              </div>

              {/* Bloco Financeiro */}
              <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-hover)', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: saleVal > 0 ? '12px' : 0 }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700, display: 'block' }}>
                      Custo Estimado
                    </span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                      R$ {costVal.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700, display: 'block' }}>
                      Preço de Venda
                    </span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-accent)' }}>
                      {saleVal > 0 ? `R$ ${saleVal.toFixed(2)}` : 'Não definido'}
                    </span>
                  </div>
                </div>

                {saleVal > 0 && (
                  <div style={{ paddingTop: '8px', borderTop: '1px dashed var(--border-medium)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Lucro Bruto Estimado:</span>
                    <span style={{ fontWeight: 700, color: profitVal >= 0 ? '#15803d' : 'var(--status-danger-text)' }}>
                      R$ {profitVal.toFixed(2)} ({marginPct}%)
                    </span>
                  </div>
                )}

                {/* Lista de Insumos da Composição */}
                {costItemsParsed.length > 0 && (
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase' }}>
                        Composição ({costItemsParsed.length} itens):
                      </span>
                      {costItemsParsed.some((it) => it.weight) && (
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0d9488' }}>
                          ⚖️ {formatWeight(costItemsParsed.reduce((acc, it) => acc + (it.weight || 0), 0))}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {costItemsParsed.map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <span>
                            • {it.name} ({Number(it.quantity || 0).toFixed(2)}{it.unit ? ` ${it.unit}` : ''}
                            {it.weight ? ` | ${it.weight}g` : ''})
                          </span>
                          <span style={{ fontWeight: 600 }}>R$ {Number(it.total).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Composição de Itens do Kit no Modal de Detalhes */}
              {previewProductModal.is_kit && previewProductModal.kit_items && previewProductModal.kit_items.length > 0 && (
                <div
                  style={{
                    marginBottom: '16px',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                  }}
                >
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                    🎁 Produtos Componentes deste Kit ({previewProductModal.kit_items.length}):
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {previewProductModal.kit_items.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.82rem',
                          backgroundColor: '#fff',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #fef3c7',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, color: '#b45309', minWidth: '24px' }}>
                            {Number(item.quantity)}x
                          </span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {item.component_product?.name || `Produto #${item.component_product_id}`}
                          </span>
                          {item.component_product?.sku && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                              ({item.component_product.sku})
                            </span>
                          )}
                        </div>
                        {item.component_product?.sale_price && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            R$ {(Number(item.component_product.sale_price) * Number(item.quantity)).toFixed(2)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Links de Venda em Marketplaces */}
              {links.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Anúncios nos Marketplaces
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {links.map((link) => {
                      const style = getMarketplaceStyle(link.platform);
                      return (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            backgroundColor: style.bg,
                            color: style.color,
                            border: `1px solid ${style.border}`,
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          <span>{link.platform}</span>
                          <ExternalLink size={12} />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Descrição / Observações */}
              {previewProductModal.description && (
                <div style={{ marginBottom: '20px', padding: '10px 14px', backgroundColor: 'var(--bg-sand-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>Descrição / Observações:</strong>
                  {previewProductModal.description}
                </div>
              )}

              {/* Ações */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const p = previewProductModal;
                    setPreviewProductModal(null);
                    setVariationManageModalProduct(p);
                  }}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Layers size={16} /> Gerenciar Variações
                </button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const p = previewProductModal;
                      setPreviewProductModal(null);
                      handleOpenWhatsAppModal(p);
                    }}
                    className="btn-secondary"
                    style={{ color: '#15803d', backgroundColor: '#e8f9ee', borderColor: '#a3e9b9', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <WhatsAppIcon size={16} color="#25D366" /> WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const p = previewProductModal;
                      setPreviewProductModal(null);
                      handleOpenImageModal(p);
                    }}
                    className="btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ImageIcon size={16} /> Fotos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const p = previewProductModal;
                      setPreviewProductModal(null);
                      handleOpenEditModal(p);
                    }}
                    className="btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Edit2 size={16} /> Editar Produto
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Modal de Gestão de Variações e Subprodutos (Estilo Shopee) */}
      <Modal
        isOpen={!!variationManageModalProduct}
        onClose={() => {
          setVariationManageModalProduct(null);
          setVarFormError(null);
          setNewVarName('');
          setNewVarColor('');
          setNewVarSku('');
          setNewVarSalePrice('');
          setNewVarUnitCost('');
          setNewVarStock('0');
          setLinkExistingChildId(null);
          setLinkExistingVarName('');
        }}
        title="Gerenciar Variações (Cores e Modelos Estilo Shopee)"
        subtitle={variationManageModalProduct ? `${variationManageModalProduct.name} • SKU Principal: ${variationManageModalProduct.sku}` : ''}
        maxWidth="840px"
      >
        {variationManageModalProduct && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Banner explicativo */}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(163, 116, 87, 0.08)',
                border: '1px solid rgba(163, 116, 87, 0.25)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '1.4rem', lineHeight: 1 }}>🛍️</div>
              <div style={{ fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                <strong>Agrupamento estilo Shopee / Marketplaces:</strong> Ao agrupar variações (cores, tamanhos, modelos), seu catálogo exibe apenas <strong>um único produto principal</strong> com botões para alternar as opções, evitando poluir e alongar a grade de produtos.
              </div>
            </div>

            {varFormError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--status-danger-bg)',
                  border: '1px solid var(--status-danger-border)',
                  color: 'var(--status-danger-text)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertTriangle size={16} />
                <span>{varFormError}</span>
              </div>
            )}

            {/* Lista de Variações Atuais */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={16} />
                  Variações Cadastradas ({(variationManageModalProduct.variations || []).length})
                </h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Total em estoque somado: <strong>{Number(variationManageModalProduct.current_stock ?? 0).toFixed(2)} {variationManageModalProduct.unit?.code || 'UN'}</strong>
                </span>
              </div>

              {(!variationManageModalProduct.variations || variationManageModalProduct.variations.length === 0) ? (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-sand-light)',
                    border: '1px dashed var(--border-medium)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.88rem',
                  }}
                >
                  <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>Nenhuma variação vinculada ainda.</p>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                    Use as opções abaixo para <strong>agrupar um produto já existente</strong> (ex: outra cor já cadastrada) ou <strong>cadastrar uma nova variação</strong>.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {variationManageModalProduct.variations.map((v) => {
                    const vImg = v.primary_image_url ? getProductImageUrl(v.primary_image_url) : null;
                    return (
                      <div
                        key={v.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: '#fff',
                          border: '1px solid var(--border-subtle)',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '6px',
                              backgroundColor: 'var(--bg-sand-light)',
                              border: '1px solid var(--border-subtle)',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {vImg ? (
                              <img src={vImg} alt={v.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={handleImageError} />
                            ) : (
                              <ImageIcon size={18} color="var(--text-tertiary)" />
                            )}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                {v.variation_name || v.name}
                              </span>
                              {v.color && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '1px 8px',
                                    borderRadius: '10px',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    backgroundColor: 'var(--bg-sand-light)',
                                    border: '1px solid var(--border-subtle)',
                                  }}
                                >
                                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getColorHex(v.color), border: '1px solid rgba(0,0,0,0.2)' }} />
                                  {v.color}
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              <span>SKU: <code style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v.sku}</code></span>
                              {v.sale_price !== null && v.sale_price !== undefined && (
                                <span>Venda: <strong style={{ color: 'var(--brand-accent)' }}>R$ {Number(v.sale_price).toFixed(2)}</strong></span>
                              )}
                              {v.unit_cost !== null && v.unit_cost !== undefined && (
                                <span>Custo: R$ {Number(v.unit_cost).toFixed(2)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div>
                            {renderStockDisplay(v, true)}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUnlinkVariation(v.id)}
                            className="btn-secondary"
                            style={{
                              padding: '5px 10px',
                              fontSize: '0.76rem',
                              color: 'var(--status-danger-text)',
                              borderColor: 'var(--status-danger-border)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Desvincular do produto principal (volta a ser produto avulso no catálogo)"
                          >
                            <Trash2 size={13} />
                            Desvincular
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SEÇÃO 1: Agrupar Produto Existente (Solução rápida para produtos duplicados já existentes) */}
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-sand-light)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', fontWeight: 700, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Link2 size={16} />
                Agrupar Produto Já Existente no Catálogo
              </h4>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Se você já tinha cadastrado outra cor ou variação como produto separado (ex: Trio Budas Cinza), selecione-o abaixo para transformá-lo em variação deste produto num clique, mantendo fotos e estoque!
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px auto', gap: '10px', alignItems: 'flex-end' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                    Selecionar Produto Avulso para Agrupar
                  </label>
                  <select
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                    value={linkExistingChildId ?? ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      setLinkExistingChildId(val);
                      if (val) {
                        const target = products.find((p) => p.id === val);
                        if (target) {
                          setLinkExistingVarName(target.color || target.name);
                        }
                      }
                    }}
                  >
                    <option value="">-- Selecione um produto para agrupar --</option>
                    {products
                      .filter((p) => p.id !== variationManageModalProduct.id && (!p.variations || p.variations.length === 0))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.color ? `(${p.color})` : ''} - SKU: {p.sku} (Estoque: {Number(p.current_stock ?? 0).toFixed(2)} {p.unit?.code || 'UN'})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                    Nome do Subproduto / Cor
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                    placeholder="Ex: Cinza, Branco"
                    value={linkExistingVarName}
                    onChange={(e) => setLinkExistingVarName(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  disabled={!linkExistingChildId || linkingProduct}
                  onClick={handleLinkExistingAsVariation}
                  style={{
                    height: '38px',
                    padding: '0 16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                  }}
                >
                  {linkingProduct ? (
                    <>
                      <Loader2 size={14} className="spinner" /> Agrupando...
                    </>
                  ) : (
                    <>
                      <Link2 size={14} /> Agrupar como Variação
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* SEÇÃO 2: Cadastrar Nova Variação do Zero */}
            <form onSubmit={handleCreateVariation} style={{ padding: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: '#fff', border: '1px solid var(--border-medium)' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', fontWeight: 700, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={16} />
                Cadastrar Nova Variação / Subproduto
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>
                    Nome da Variação *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Terracota, Mármore"
                    value={newVarName}
                    onChange={(e) => {
                      setNewVarName(e.target.value);
                      if (!newVarColor) setNewVarColor(e.target.value);
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>
                    Cor (para bolinha visual)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Cinza, Branco, Rosa"
                    value={newVarColor}
                    onChange={(e) => setNewVarColor(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>
                    SKU da Variação
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={`${variationManageModalProduct.sku}-VAR`}
                    value={newVarSku}
                    onChange={(e) => setNewVarSku(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>
                    Preço de Venda (R$)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={variationManageModalProduct.sale_price ? `R$ ${Number(variationManageModalProduct.sale_price).toFixed(2)}` : 'R$ 0,00'}
                    value={newVarSalePrice}
                    onChange={(e) => setNewVarSalePrice(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>
                    Custo Estimado (R$)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={variationManageModalProduct.unit_cost ? `R$ ${Number(variationManageModalProduct.unit_cost).toFixed(2)}` : 'R$ 0,00'}
                    value={newVarUnitCost}
                    onChange={(e) => setNewVarUnitCost(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>
                    Estoque Inicial
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    step="1"
                    value={newVarStock}
                    onChange={(e) => setNewVarStock(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={savingNewVar || !newVarName.trim()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {savingNewVar ? (
                    <>
                      <Loader2 size={14} className="spinner" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Plus size={14} /> Salvar Nova Variação
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* Modal de Catálogo em PDF */}
      <ProductCatalogModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        products={products}
        categories={categories}
        itemTypes={itemTypes}
        colors={colors}
      />
    </div>
  );
};
