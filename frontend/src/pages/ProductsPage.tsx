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
} from 'lucide-react';
import { api } from '../api/client';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import type { Category, CostComponentItem, ItemType, ItemTypeDefinition, Product, ProductFormData, UnitOfMeasure } from '../types';


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
    item_type: 'PRODUTO_ACABADO',
    category_id: null,
    unit_id: 1,
    unit_cost: '0.0000',
    cost_breakdown: '',
    sale_price: '0.00',
    min_stock: '5.000',
    is_active: true,
  });

  // Calculadora de Composição de Custo Manual
  const [isCostCalculatorOpen, setIsCostCalculatorOpen] = useState(false);
  const [costItems, setCostItems] = useState<CostComponentItem[]>([]);
  const [newCostItemName, setNewCostItemName] = useState('');
  const [newCostItemQuantity, setNewCostItemQuantity] = useState('1');
  const [newCostItemUnitCost, setNewCostItemUnitCost] = useState('');

  // Modal Novo Tipo de Item
  const [isNewTypeModalOpen, setIsNewTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeCode, setNewTypeCode] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');
  const [savingNewType, setSavingNewType] = useState(false);
  const [newTypeError, setNewTypeError] = useState<string | null>(null);

  // Modal Nova Categoria
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [savingNewCategory, setSavingNewCategory] = useState(false);
  const [newCategoryError, setNewCategoryError] = useState<string | null>(null);

  // Modal Nova Unidade de Medida
  const [isNewUnitModalOpen, setIsNewUnitModalOpen] = useState(false);
  const [newUnitCode, setNewUnitCode] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitAllowsDecimals, setNewUnitAllowsDecimals] = useState(true);
  const [savingNewUnit, setSavingNewUnit] = useState(false);
  const [newUnitError, setNewUnitError] = useState<string | null>(null);

  // Modal de Fotos
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageModalProduct, setImageModalProduct] = useState<Product | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

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
      p.sku.toLowerCase().includes(search.toLowerCase());

    const matchType = selectedType === 'TODOS' || p.item_type === selectedType;
    const matchCategory =
      selectedCategory === 'TODAS' ||
      (p.category_id && p.category_id.toString() === selectedCategory);

    return matchSearch && matchType && matchCategory;
  });

  // Abertura do formulário de criação/edição
  const handleOpenCreateModal = () => {
    setCostItems([]);
    setEditingProduct(null);
    setFormData({
      sku: '',
      name: '',
      description: '',
      item_type: 'PRODUTO_ACABADO',
      category_id: categories.length > 0 ? categories[0].id : null,
      unit_id: units.length > 0 ? units[0].id : 1,
      unit_cost: '0.0000',
      cost_breakdown: '',
      sale_price: '0.00',
      min_stock: '5.000',
      is_active: true,
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (prod: Product) => {
    let parsedCostItems: CostComponentItem[] = [];
    if (prod.cost_breakdown) {
      try {
        parsedCostItems = JSON.parse(prod.cost_breakdown);
      } catch {}
    }
    setCostItems(parsedCostItems);
    setEditingProduct(prod);
    setFormData({
      sku: prod.sku,
      name: prod.name,
      description: prod.description || '',
      item_type: prod.item_type,
      category_id: prod.category_id || null,
      unit_id: prod.unit_id,
      unit_cost: prod.unit_cost,
      cost_breakdown: prod.cost_breakdown || '',
      sale_price: prod.sale_price || '',
      min_stock: prod.min_stock,
      is_active: prod.is_active,
    });
    setIsFormModalOpen(true);
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

  const handleCreateItemType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    setSavingNewType(true);
    setNewTypeError(null);
    try {
      const created = await api.createItemType(
        newTypeName.trim(),
        newTypeCode.trim() ? newTypeCode.trim().toUpperCase() : undefined,
        newTypeDescription.trim() || undefined
      );
      setItemTypes((prev) => [...prev, created]);
      setFormData((prev) => ({ ...prev, item_type: created.code }));
      setIsNewTypeModalOpen(false);
      setNewTypeName('');
      setNewTypeCode('');
      setNewTypeDescription('');
    } catch (err: any) {
      setNewTypeError(err.message || 'Erro ao cadastrar tipo de item.');
    } finally {
      setSavingNewType(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setSavingNewCategory(true);
    setNewCategoryError(null);
    try {
      const created = await api.createCategory(
        newCategoryName.trim(),
        newCategoryDescription.trim() || undefined
      );
      setCategories((prev) => [...prev, created]);
      setFormData((prev) => ({ ...prev, category_id: created.id }));
      setIsNewCategoryModalOpen(false);
      setNewCategoryName('');
      setNewCategoryDescription('');
    } catch (err: any) {
      setNewCategoryError(err.message || 'Erro ao cadastrar categoria.');
    } finally {
      setSavingNewCategory(false);
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitCode.trim() || !newUnitName.trim()) return;
    setSavingNewUnit(true);
    setNewUnitError(null);
    try {
      const created = await api.createUnit(
        newUnitCode.trim().toUpperCase(),
        newUnitName.trim(),
        newUnitAllowsDecimals
      );
      setUnits((prev) => [...prev, created]);
      setFormData((prev) => ({ ...prev, unit_id: created.id }));
      setIsNewUnitModalOpen(false);
      setNewUnitCode('');
      setNewUnitName('');
      setNewUnitAllowsDecimals(true);
    } catch (err: any) {
      setNewUnitError(err.message || 'Erro ao cadastrar unidade de medida.');
    } finally {
      setSavingNewUnit(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, formData);
      } else {
        await api.createProduct(formData);
      }
      setIsFormModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar produto.');
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

  // Gerenciamento de Fotos
  const handleOpenImageModal = (prod: Product) => {
    setImageModalProduct(prod);
    setImageError(null);
    setIsImageModalOpen(true);
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !imageModalProduct) return;

    setImageError(null);
    setUploadingImage(true);
    try {
      await api.uploadProductImage(imageModalProduct.id, file);
      const updatedProduct = await api.getProduct(imageModalProduct.id);
      setImageModalProduct(updatedProduct);
      await loadData();
    } catch (err: any) {
      setImageError(err.message || 'Erro ao enviar imagem.');
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
          <button
            type="button"
            onClick={() => {
              setNewCategoryName('');
              setNewCategoryDescription('');
              setNewCategoryError(null);
              setIsNewCategoryModalOpen(true);
            }}
            className="btn-secondary"
            title="Cadastrar nova categoria de produtos"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            <span>Nova Categoria</span>
          </button>

          <button onClick={handleOpenCreateModal} className="btn-primary">
            <Plus size={18} />
            <span>Novo Item</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Principal: Tabela / Cartões Responsivos */}
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
            <span>Cadastrar Primeiro Item</span>
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-sand-light)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>FOTO</th>
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
                  const hasImage = prod.primary_image_url;
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
                      {/* Miniatura da Foto */}
                      <td style={{ padding: '12px 20px' }}>
                        {hasImage ? (
                          <img
                            src={prod.primary_image_url!}
                            alt={prod.name}
                            style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: 'var(--radius-sm)',
                              objectFit: 'cover',
                              border: '1px solid var(--border-subtle)',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'var(--bg-sand-light)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-tertiary)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            <ImageIcon size={20} />
                          </div>
                        )}
                      </td>

                      {/* Nome e SKU */}
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: '0.95rem' }}>
                          {prod.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                          {prod.sku}
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
        onClose={() => setIsFormModalOpen(false)}
        title={editingProduct ? 'Editar Item' : 'Novo Item do Ateliê'}
        subtitle="Informe os dados cadastrais, tipo e especificações"
        maxWidth="620px"
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="prod-type" style={{ margin: 0 }}>Tipo de Item *</label>
                <button
                  type="button"
                  onClick={() => {
                    setNewTypeName('');
                    setNewTypeCode('');
                    setNewTypeDescription('');
                    setNewTypeError(null);
                    setIsNewTypeModalOpen(true);
                  }}
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
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                  }}
                  title="Cadastrar novo tipo de item"
                >
                  <Plus size={14} /> Novo Tipo
                </button>
              </div>
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
            <label htmlFor="prod-name">Nome do Item *</label>
            <input
              id="prod-name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex.: Vela Aromática Lavanda Francesa 180g"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="prod-cat" style={{ margin: 0 }}>Categoria</label>
                <button
                  type="button"
                  onClick={() => {
                    setNewCategoryName('');
                    setNewCategoryDescription('');
                    setNewCategoryError(null);
                    setIsNewCategoryModalOpen(true);
                  }}
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
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                  }}
                  title="Cadastrar nova categoria"
                >
                  <Plus size={14} /> Nova Categoria
                </button>
              </div>
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
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="prod-unit" style={{ margin: 0 }}>Unidade de Medida *</label>
                <button
                  type="button"
                  onClick={() => {
                    setNewUnitCode('');
                    setNewUnitName('');
                    setNewUnitAllowsDecimals(true);
                    setNewUnitError(null);
                    setIsNewUnitModalOpen(true);
                  }}
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
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                  }}
                  title="Cadastrar nova unidade de medida"
                >
                  <Plus size={14} /> Nova Unidade
                </button>
              </div>
              <select
                id="prod-unit"
                value={formData.unit_id}
                onChange={(e) => setFormData({ ...formData, unit_id: Number(e.target.value) })}
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>
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

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="prod-desc">Descrição / Observações</label>
            <textarea
              id="prod-desc"
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Notas aromáticas, insumos chaves ou fornecedor..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setIsFormModalOpen(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              {editingProduct ? 'Salvar Alterações' : 'Criar Item'}
            </button>
          </div>
        </form>
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
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Validando e enviando imagem...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <Upload size={28} color="var(--brand-accent)" />
              <p style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: '0.95rem' }}>
                Clique ou arraste uma foto para enviar
              </p>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                PNG, JPG ou WebP até 3 MB (máximo 5 fotos por produto)
              </span>
            </div>
          )}
        </div>

        {/* Galeria de Fotos */}
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--brand-primary)', marginBottom: '12px' }}>
            Fotos Cadastradas ({imageModalProduct?.images.length || 0}/5)
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
                    src={img.url || `${import.meta.env.VITE_API_URL || '/api/v1'}/media/${img.file_path}`}
                    alt={img.original_filename}
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

      {/* Modal de Cadastro de Novo Tipo de Item */}
      <Modal
        isOpen={isNewTypeModalOpen}
        onClose={() => setIsNewTypeModalOpen(false)}
        title="Novo Tipo de Item"
        subtitle="Adicione uma nova classificação para os itens do catálogo"
        maxWidth="480px"
      >
        <form onSubmit={handleCreateItemType}>
          {newTypeError && (
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
              {newTypeError}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="new-type-name">Nome do Tipo *</label>
            <input
              id="new-type-name"
              type="text"
              required
              placeholder="Ex.: Acessório, Brinde, Rótulo & Tag..."
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="new-type-code">Código Identificador (Opcional)</label>
            <input
              id="new-type-code"
              type="text"
              placeholder="Ex.: ACESSORIO (gerado automaticamente se vazio)"
              value={newTypeCode}
              onChange={(e) => setNewTypeCode(e.target.value.toUpperCase())}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block', marginTop: '4px' }}>
              Identificador único sem espaços. Se deixar em branco, geramos automaticamente.
            </span>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="new-type-desc">Descrição (Opcional)</label>
            <textarea
              id="new-type-desc"
              rows={2}
              placeholder="Finalidade ou detalhes deste tipo de item..."
              value={newTypeDescription}
              onChange={(e) => setNewTypeDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setIsNewTypeModalOpen(false)}
              className="btn-secondary"
              disabled={savingNewType}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingNewType}>
              {savingNewType ? 'Salvando...' : 'Salvar Tipo de Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Cadastro de Nova Categoria */}
      <Modal
        isOpen={isNewCategoryModalOpen}
        onClose={() => setIsNewCategoryModalOpen(false)}
        title="Nova Categoria"
        subtitle="Organize seus produtos por coleções, kits ou especificações"
        maxWidth="480px"
      >
        <form onSubmit={handleCreateCategory}>
          {newCategoryError && (
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
              {newCategoryError}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="new-cat-name">Nome da Categoria *</label>
            <input
              id="new-cat-name"
              type="text"
              required
              placeholder="Ex.: Kit, Peças Individuais, Peças Únicas..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="new-cat-desc">Descrição (Opcional)</label>
            <textarea
              id="new-cat-desc"
              rows={2}
              placeholder="Ex.: Linha exclusiva para presentes e edições limitadas..."
              value={newCategoryDescription}
              onChange={(e) => setNewCategoryDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setIsNewCategoryModalOpen(false)}
              className="btn-secondary"
              disabled={savingNewCategory}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingNewCategory}>
              {savingNewCategory ? 'Salvando...' : 'Salvar Categoria'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Cadastro de Nova Unidade de Medida */}
      <Modal
        isOpen={isNewUnitModalOpen}
        onClose={() => setIsNewUnitModalOpen(false)}
        title="Nova Unidade de Medida"
        subtitle="Cadastre uma nova métrica para estoque e receitas do ateliê"
        maxWidth="480px"
      >
        <form onSubmit={handleCreateUnit}>
          {newUnitError && (
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
              {newUnitError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label htmlFor="new-unit-code">Código / Sigla *</label>
              <input
                id="new-unit-code"
                type="text"
                required
                placeholder="Ex.: KG, CM, L..."
                value={newUnitCode}
                onChange={(e) => setNewUnitCode(e.target.value.toUpperCase())}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="new-unit-name">Nome da Unidade *</label>
              <input
                id="new-unit-name"
                type="text"
                required
                placeholder="Ex.: Quilograma, Centímetro..."
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
              <input
                type="checkbox"
                checked={newUnitAllowsDecimals}
                onChange={(e) => setNewUnitAllowsDecimals(e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
              <span>Permite quantidades fracionadas / decimais (ex.: 1.500 kg, 0.250 l)</span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setIsNewUnitModalOpen(false)}
              className="btn-secondary"
              disabled={savingNewUnit}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingNewUnit}>
              {savingNewUnit ? 'Salvando...' : 'Salvar Unidade'}
            </button>
          </div>
        </form>
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
