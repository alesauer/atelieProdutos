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
} from 'lucide-react';
import { api } from '../api/client';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { getProductImageUrl, handleImageError } from '../utils/imageUrl';
import type { Category, CostComponentItem, ItemType, ItemTypeDefinition, Product, ProductFormData, SalesLinkItem, UnitOfMeasure } from '../types';

interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
  isPrimary: boolean;
}

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemTypeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('TODOS');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');

  // Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    sku: '',
    name: '',
    description: '',
    color: '',
    item_type: 'PRODUTO_ACABADO',
    category_id: null,
    unit_id: 1,
    unit_cost: '0.0000',
    cost_breakdown: '',
    sales_links: '',
    sale_price: '0.00',
    min_stock: '5.000',
    is_active: true,
  });

  // Links de Vendas em Marketplaces
  const [salesLinks, setSalesLinks] = useState<SalesLinkItem[]>([]);
  const [newLinkPlatform, setNewLinkPlatform] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  // Calculadora de Composição de Custo Manual
  const [isCostCalculatorOpen, setIsCostCalculatorOpen] = useState(false);
  const [costItems, setCostItems] = useState<CostComponentItem[]>([]);
  const [newCostItemName, setNewCostItemName] = useState('');
  const [newCostItemQuantity, setNewCostItemQuantity] = useState('1');
  const [newCostItemUnitCost, setNewCostItemUnitCost] = useState('');

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

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodsData, catsData, unitsData, itemTypesData] = await Promise.all([
        api.listProducts({ active_only: false }),
        api.listCategories(),
        api.listUnits(),
        api.listItemTypes(),
      ]);

      setProducts(prodsData);
      setCategories(catsData);
      setUnits(unitsData);
      setItemTypes(itemTypesData);

      // Se não houver unidades no banco, sugerir as padrões
      if (unitsData.length > 0 && !formData.unit_id) {
        setFormData((prev) => ({ ...prev, unit_id: unitsData[0].id }));
      }
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
      (p.color && p.color.toLowerCase().includes(search.toLowerCase()));

    const matchType = selectedType === 'TODOS' || p.item_type === selectedType;
    const matchCategory =
      selectedCategory === 'TODAS' ||
      (p.category_id && p.category_id.toString() === selectedCategory);

    return matchSearch && matchType && matchCategory;
  });

  // Abertura do formulário de criação/edição
  const handleOpenCreateModal = () => {
    pendingImages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPendingImages([]);
    setFormError(null);
    setCostItems([]);
    setSalesLinks([]);
    setNewLinkPlatform('Mercado Livre');
    setNewLinkUrl('');
    setEditingProduct(null);
    setFormData({
      sku: '',
      name: '',
      description: '',
      color: '',
      item_type: 'PRODUTO_ACABADO',
      category_id: categories.length > 0 ? categories[0].id : null,
      unit_id: units.length > 0 ? units[0].id : 1,
      unit_cost: '0.0000',
      cost_breakdown: '',
      sales_links: '',
      sale_price: '0.00',
      min_stock: '5.000',
      is_active: true,
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (prod: Product) => {
    pendingImages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPendingImages([]);
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
    setNewLinkPlatform('Mercado Livre');
    setNewLinkUrl('');

    setEditingProduct(prod);
    setFormData({
      sku: prod.sku,
      name: prod.name,
      description: prod.description || '',
      color: prod.color || '',
      item_type: prod.item_type,
      category_id: prod.category_id || null,
      unit_id: prod.unit_id,
      unit_cost: prod.unit_cost,
      cost_breakdown: prod.cost_breakdown || '',
      sales_links: prod.sales_links || '',
      sale_price: prod.sale_price || '',
      min_stock: prod.min_stock,
      is_active: prod.is_active,
    });
    setIsFormModalOpen(true);
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

  const getColorHex = (colorName?: string | null): string => {
    if (!colorName) return '#ccc';
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

    const platformName = newLinkPlatform.trim() || 'Mercado Livre';

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

  // Gestão de Itens de Custo Individual
  const handleAddCostItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCostItemName.trim()) return;
    const qty = parseFloat(newCostItemQuantity.replace(',', '.')) || 1;
    const unitPrice = parseFloat(newCostItemUnitCost.replace(',', '.')) || 0;
    const total = qty * unitPrice;

    const newItem: CostComponentItem = {
      id: Date.now().toString(),
      name: newCostItemName.trim(),
      quantity: qty,
      unit_cost: unitPrice,
      total: total,
    };

    const updated = [...costItems, newItem];
    setCostItems(updated);
    setNewCostItemName('');
    setNewCostItemQuantity('1');
    setNewCostItemUnitCost('');

    // Atualiza automaticamente o custo manual com a soma de todos os itens
    const totalSum = updated.reduce((acc, item) => acc + item.total, 0);
    setFormData((prev) => ({
      ...prev,
      unit_cost: totalSum.toFixed(4),
      cost_breakdown: JSON.stringify(updated),
    }));
  };

  const handleRemoveCostItem = (id: string) => {
    const updated = costItems.filter((item) => item.id !== id);
    setCostItems(updated);
    const totalSum = updated.reduce((acc, item) => acc + item.total, 0);
    setFormData((prev) => ({
      ...prev,
      unit_cost: totalSum.toFixed(4),
      cost_breakdown: JSON.stringify(updated),
    }));
  };

  const handleApplyCalculatedCost = () => {
    const totalSum = costItems.reduce((acc, item) => acc + item.total, 0);
    setFormData((prev) => ({
      ...prev,
      unit_cost: totalSum.toFixed(4),
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

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    setFormError(null);

    try {
      // Auto-commit de link de marketplace digitado caso o usuário não tenha clicado no botão "+ Adicionar Canal"
      let currentSalesLinks = [...salesLinks];
      if (newLinkUrl.trim()) {
        let formattedUrl = newLinkUrl.trim();
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
          formattedUrl = `https://${formattedUrl}`;
        }
        const platformName = newLinkPlatform.trim() || 'Mercado Livre';
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
        color: formData.color?.trim() || undefined,
        sales_links: currentSalesLinks.length > 0 ? JSON.stringify(currentSalesLinks) : '',
      };

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
            const rawPrimary =
              prod.primary_image_url ||
              (prod.images && prod.images.length > 0
                ? prod.images.find((i) => i.is_primary)?.url || prod.images[0].url || prod.images[0].file_path
                : null);
            const hasImage = !!rawPrimary;
            const primaryImageUrl = getProductImageUrl(rawPrimary);
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
                }}
              >
                {/* Imagem de Capa do Produto */}
                <div
                  style={{
                    position: 'relative',
                    height: '210px',
                    backgroundColor: 'var(--bg-sand-light)',
                    cursor: hasImage ? 'pointer' : 'default',
                    overflow: 'hidden',
                  }}
                  onClick={() => {
                    if (hasImage) {
                      setLightboxProduct(prod);
                      setLightboxIndex(0);
                    }
                  }}
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
                      {prod.sku}
                    </span>
                  </div>

                  {/* Categoria e Cor do Produto na Vitrine */}
                  {(prod.category || prod.color) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {prod.category && (
                        <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {prod.category.name}
                        </span>
                      )}
                      {prod.color && (
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
                          title={`Cor: ${prod.color}`}
                        >
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: getColorHex(prod.color),
                              border: '1px solid rgba(0,0,0,0.2)',
                              display: 'inline-block',
                            }}
                          />
                          <span>{prod.color}</span>
                        </span>
                      )}
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
                      gridTemplateColumns: '1fr 1fr',
                      gap: '10px',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-sand-light)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '14px',
                      marginTop: 'auto',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                        Custo Manual
                      </span>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        R$ {Number(prod.unit_cost).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                        Preço Venda
                      </span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--brand-accent)' }}>
                        {prod.sale_price ? `R$ ${Number(prod.sale_price).toFixed(2)}` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Badges de Links de Vendas nos Marketplaces no Card */}
                  {(() => {
                    const links = parseSalesLinks(prod.sales_links);
                    if (links.length === 0) return null;
                    return (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
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
                      </div>
                    );
                  })()}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '10px',
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Estoque: <strong>{Number(prod.min_stock)} {prod.unit?.code}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(prod)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        title="Alternar status"
                      >
                        <Badge status={prod.is_active ? 'active' : 'inactive'} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenImageModal(prod)}
                        className="btn-icon"
                        title="Gerenciar Fotos"
                        style={{ position: 'relative' }}
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
                        onClick={() => handleOpenEditModal(prod)}
                        className="btn-icon"
                        title="Editar Item"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(prod)}
                        className="btn-icon"
                        title="Excluir Item"
                        style={{ color: 'var(--status-danger-text)' }}
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
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>CUSTO UNIT.</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>PREÇO VENDA</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>ESTOQUE MÍN.</th>
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
                    <tr
                      key={prod.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
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
                        <div style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: '0.95rem' }}>
                          {prod.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '3px' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                            {prod.sku}
                          </span>
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
                              <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '4px' }}>
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
                              </div>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Tipo */}
                      <td style={{ padding: '12px 20px' }}>
                        <Badge type={prod.item_type} />
                      </td>

                      {/* Categoria */}
                      <td style={{ padding: '12px 20px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        {prod.category?.name || '—'}
                      </td>

                      {/* Custo */}
                      <td style={{ padding: '12px 20px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        R$ {Number(prod.unit_cost).toFixed(2)}
                      </td>

                      {/* Preço de Venda */}
                      <td style={{ padding: '12px 20px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--brand-accent)' }}>
                        {prod.sale_price ? `R$ ${Number(prod.sale_price).toFixed(2)}` : '—'}
                      </td>

                      {/* Estoque Mínimo */}
                      <td style={{ padding: '12px 20px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        {Number(prod.min_stock)} {prod.unit?.code}
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
        subtitle="Informe os dados cadastrais, links de vendas nos marketplaces e fotos"
        maxWidth="680px"
      >
        <form onSubmit={handleSaveProduct}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr', gap: '16px', marginBottom: '16px' }}>
            <div>
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
              <input
                id="prod-color"
                type="text"
                list="color-preset-list"
                value={formData.color || ''}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="Ex.: Lavanda, Branco..."
              />
              <datalist id="color-preset-list">
                <option value="Branco" />
                <option value="Natural / Off-White" />
                <option value="Baunilha" />
                <option value="Lavanda" />
                <option value="Rosa Claro" />
                <option value="Terracota" />
                <option value="Verde Oliva" />
                <option value="Azul Sereno" />
                <option value="Dourado" />
                <option value="Preto" />
                <option value="Caramelo" />
                <option value="Âmbar" />
              </datalist>

              {/* Sugestões rápidas de cores em 1 clique */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                {[
                  { name: 'Branco', hex: '#ffffff', border: '#ccc' },
                  { name: 'Natural', hex: '#f7f4ea', border: '#e0d8c3' },
                  { name: 'Lavanda', hex: '#d8b4fe', border: '#c084fc' },
                  { name: 'Rosa', hex: '#fbcfe8', border: '#f472b6' },
                  { name: 'Terracota', hex: '#c86d51', border: '#9c4227' },
                  { name: 'Verde', hex: '#86efac', border: '#4ade80' },
                  { name: 'Dourado', hex: '#fde047', border: '#eab308' },
                  { name: 'Preto', hex: '#2c2824', border: '#111' },
                ].map((c) => {
                  const isSelected = formData.color?.toLowerCase() === c.name.toLowerCase();
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c.name })}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '1px 6px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        borderRadius: '10px',
                        border: isSelected ? '2px solid var(--brand-accent)' : `1px solid ${c.border}`,
                        backgroundColor: isSelected ? 'var(--brand-accent-light, #fbf2ec)' : '#ffffff',
                        color: 'var(--brand-primary)',
                        cursor: 'pointer',
                      }}
                      title={`Selecionar cor: ${c.name}`}
                    >
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          backgroundColor: c.hex,
                          border: '1px solid rgba(0,0,0,0.2)',
                          display: 'inline-block',
                        }}
                      />
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
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
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ margin: '0 0 8px', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)', display: 'block' }}>
              Unidade de Medida *
            </label>

            {/* Radio Buttons para seleção da Unidade de Medida */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '8px',
              }}
              role="radiogroup"
              aria-label="Selecione a unidade de medida do produto"
            >
              {units.map((u) => {
                const isSelected = formData.unit_id === u.id;
                return (
                  <label
                    key={u.id}
                    htmlFor={`unit-radio-${u.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '2px solid var(--brand-accent)' : '1px solid var(--border-medium)',
                      backgroundColor: isSelected ? 'var(--brand-accent-light, #fbf2ec)' : '#ffffff',
                      boxShadow: isSelected ? '0 1px 4px rgba(184, 115, 51, 0.12)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="radio"
                      id={`unit-radio-${u.id}`}
                      name="product_unit_id"
                      value={u.id}
                      checked={isSelected}
                      onChange={() => setFormData({ ...formData, unit_id: u.id })}
                      style={{
                        accentColor: 'var(--brand-accent)',
                        cursor: 'pointer',
                        width: '15px',
                        height: '15px',
                        margin: 0,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: isSelected ? 700 : 600,
                          color: isSelected ? 'var(--brand-primary)' : 'var(--text-primary)',
                          lineHeight: 1.2,
                        }}
                      >
                        {u.code}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: isSelected ? 'var(--brand-accent)' : 'var(--text-tertiary)',
                          lineHeight: 1.2,
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                        }}
                        title={u.name}
                      >
                        {u.name}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
            {units.length === 0 && (
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                Nenhuma unidade cadastrada. Clique em "+ Nova Unidade" para adicionar.
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="prod-cost" style={{ margin: 0 }}>Custo Manual (R$)</label>
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
                  title="Calcular e somar custos de insumos individuais"
                >
                  <Calculator size={14} /> Somar Itens
                </button>
              </div>
              <input
                id="prod-cost"
                type="number"
                step="0.0001"
                min="0"
                value={formData.unit_cost}
                onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
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
            <div>
              <label htmlFor="prod-price">Preço Venda (R$)</label>
              <input
                id="prod-price"
                type="number"
                step="0.01"
                min="0"
                value={formData.sale_price || ''}
                onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                placeholder="Opcional"
              />
            </div>
            <div>
              <label htmlFor="prod-min">Estoque Mínimo</label>
              <input
                id="prod-min"
                type="number"
                step="0.001"
                min="0"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
              />
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

            {/* Sugestões rápidas de Marketplaces (1 clique para selecionar) */}
            <div style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Selecione o canal ou digite outro:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {['Mercado Livre', 'Shopee', 'Amazon', 'Elo7', 'Shein', 'Magalu', 'Site Oficial', 'Instagram'].map((name) => {
                  const style = getMarketplaceStyle(name);
                  const isSelected = newLinkPlatform.toLowerCase() === name.toLowerCase();
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setNewLinkPlatform(name);
                        const inputUrl = document.getElementById('marketplace-url-input');
                        if (inputUrl) inputUrl.focus();
                      }}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        borderRadius: '14px',
                        border: isSelected ? '2px solid var(--brand-accent)' : `1px solid ${style.border}`,
                        backgroundColor: isSelected ? '#ffffff' : style.bg,
                        color: isSelected ? 'var(--brand-primary)' : style.color,
                        boxShadow: isSelected ? '0 0 0 2px var(--brand-accent)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>{isSelected ? '✓ ' : '+ '}{name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inputs para adicionar novo link */}
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
              <div>
                <input
                  type="text"
                  id="marketplace-platform-input"
                  list="marketplace-suggestions"
                  placeholder="Marketplace..."
                  value={newLinkPlatform}
                  onChange={(e) => setNewLinkPlatform(e.target.value)}
                  style={{ fontSize: '0.85rem', padding: '8px 10px', width: '100%' }}
                />
                <datalist id="marketplace-suggestions">
                  <option value="Mercado Livre" />
                  <option value="Shopee" />
                  <option value="Amazon" />
                  <option value="Elo7" />
                  <option value="Shein" />
                  <option value="Magalu" />
                  <option value="Site Oficial" />
                  <option value="Instagram" />
                </datalist>
              </div>

              <div>
                <input
                  type="text"
                  id="marketplace-url-input"
                  placeholder="Cole aqui o link do anúncio (Ex.: https://produto.mercadolivre.com.br/...)"
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
            ) : (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#ffffff',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px dashed var(--border-medium)',
                  fontSize: '0.78rem',
                  color: 'var(--text-tertiary)',
                  textAlign: 'center',
                }}
              >
                Nenhum marketplace vinculado ainda. Selecione um canal acima e cole o link do seu anúncio para conectar.
              </div>
            )}
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

      {/* Modal de Composição e Soma de Custos Individuais */}
      <Modal
        isOpen={isCostCalculatorOpen}
        onClose={() => setIsCostCalculatorOpen(false)}
        title="Composição de Custo Manual"
        subtitle={`Calcule o custo total somando cada insumo e etapa de '${formData.name || 'Novo Item'}'`}
        maxWidth="620px"
      >
        <div>
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
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-primary)', display: 'block', marginBottom: '10px' }}>
              + Adicionar Componente ou Insumo
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'flex-end' }}>
              <div>
                <label htmlFor="cost-item-name" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>
                  Insumo / Descrição *
                </label>
                <input
                  id="cost-item-name"
                  type="text"
                  list="suggested-insumos"
                  placeholder="Ex.: Cera de Soja, Pavio, Pote..."
                  value={newCostItemName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewCostItemName(val);
                    const found = products.find((p) => p.name.toLowerCase() === val.toLowerCase());
                    if (found && found.unit_cost && !newCostItemUnitCost) {
                      setNewCostItemUnitCost(found.unit_cost.toString());
                    }
                  }}
                  autoFocus
                />
                <datalist id="suggested-insumos">
                  {products
                    .filter((p) => p.item_type !== 'PRODUTO_ACABADO')
                    .map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} (R$ {Number(p.unit_cost).toFixed(2)})
                      </option>
                    ))}
                </datalist>
              </div>

              <div>
                <label htmlFor="cost-item-qty" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>
                  Qtd
                </label>
                <input
                  id="cost-item-qty"
                  type="text"
                  placeholder="1"
                  value={newCostItemQuantity}
                  onChange={(e) => setNewCostItemQuantity(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="cost-item-cost" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>
                  Custo (R$) *
                </label>
                <input
                  id="cost-item-cost"
                  type="text"
                  placeholder="0.00"
                  value={newCostItemUnitCost}
                  onChange={(e) => setNewCostItemUnitCost(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCostItem();
                    }
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleAddCostItem}
                className="btn-primary"
                style={{ height: '38px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Adicionar à soma de custos"
              >
                <Plus size={16} />
                <span>Adicionar</span>
              </button>
            </div>
          </div>

          {/* Lista de Itens Cadastrados */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Itens Somados ({costItems.length})
              </span>
              {costItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCostItems([]);
                    setFormData((prev) => ({ ...prev, unit_cost: '0.0000', cost_breakdown: '' }));
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
                <p style={{ margin: 0, fontWeight: 500 }}>Nenhum insumo adicionado ainda.</p>
                <span style={{ fontSize: '0.78rem' }}>
                  Preencha o insumo, quantidade e valor acima para calcular o custo manual total.
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
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>Qtd</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Unit. (R$)</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Total (R$)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {costItems.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 500, color: 'var(--text-primary)' }}>{item.name}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>{item.quantity}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          R$ {item.unit_cost.toFixed(2)}
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

          {/* Card Resumo do Custo Total Somado */}
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
                Custo Manual Total Calculado
              </span>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Soma de todos os {costItems.length} componentes individuais
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
                R$ {costItems.reduce((acc, item) => acc + item.total, 0).toFixed(2)}
              </span>
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
              Aplicar Custo ao Produto
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
