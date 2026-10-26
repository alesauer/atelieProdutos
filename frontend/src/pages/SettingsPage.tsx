import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Scale,
  Layers,
  Palette,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../api/client';
import { Modal } from '../components/Modal';
import type { Category, UnitOfMeasure, ItemTypeDefinition, ProductColor, ProductMaterial } from '../types';

export const SettingsPage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'categorias' | 'unidades' | 'tipos' | 'cores' | 'materiais'>('categorias');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dados
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemTypeDefinition[]>([]);
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [materials, setMaterials] = useState<ProductMaterial[]>([]);
  const [search, setSearch] = useState('');

  // Modais de Categoria
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null);

  // Modais de Unidade
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitOfMeasure | null>(null);
  const [unitCode, setUnitCode] = useState('');
  const [unitName, setUnitName] = useState('');
  const [unitAllowsDecimals, setUnitAllowsDecimals] = useState(true);
  const [savingUnit, setSavingUnit] = useState(false);
  const [unitFormError, setUnitFormError] = useState<string | null>(null);

  // Modais de Tipo de Item
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [typeName, setTypeName] = useState('');
  const [typeCode, setTypeCode] = useState('');
  const [typeDesc, setTypeDesc] = useState('');
  const [savingType, setSavingType] = useState(false);
  const [typeFormError, setTypeFormError] = useState<string | null>(null);

  // Modais de Cor
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<ProductColor | null>(null);
  const [colorName, setColorName] = useState('');
  const [colorHex, setColorHex] = useState('#d8b4fe');
  const [savingColor, setSavingColor] = useState(false);
  const [colorFormError, setColorFormError] = useState<string | null>(null);

  // Modais de Material
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<ProductMaterial | null>(null);
  const [materialName, setMaterialName] = useState('');
  const [materialDesc, setMaterialDesc] = useState('');
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [materialFormError, setMaterialFormError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, unities, types, productColors, productMaterials] = await Promise.all([
        api.listCategories(),
        api.listUnits(),
        api.listItemTypes(),
        api.listColors(),
        api.listMaterials(),
      ]);
      setCategories(cats);
      setUnits(unities);
      setItemTypes(types);
      setColors(productColors);
      setMaterials(productMaterials);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar configurações do ateliê.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Handlers de Categoria ---
  const handleOpenNewCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDesc('');
    setCategoryFormError(null);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryDesc(cat.description || '');
    setCategoryFormError(null);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setSavingCategory(true);
    setCategoryFormError(null);

    try {
      if (editingCategory) {
        const updated = await api.updateCategory(editingCategory.id, {
          name: categoryName.trim(),
          description: categoryDesc.trim() || undefined,
        });
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await api.createCategory(categoryName.trim(), categoryDesc.trim() || undefined);
        setCategories((prev) => [...prev, created]);
      }
      setIsCategoryModalOpen(false);
    } catch (err: any) {
      setCategoryFormError(err.message || 'Erro ao salvar categoria.');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!confirm(`Deseja realmente excluir a categoria "${cat.name}"?`)) return;
    try {
      await api.deleteCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir categoria.');
    }
  };

  // --- Handlers de Unidade ---
  const handleOpenNewUnit = () => {
    setEditingUnit(null);
    setUnitCode('');
    setUnitName('');
    setUnitAllowsDecimals(true);
    setUnitFormError(null);
    setIsUnitModalOpen(true);
  };

  const handleOpenEditUnit = (unit: UnitOfMeasure) => {
    setEditingUnit(unit);
    setUnitCode(unit.code);
    setUnitName(unit.name);
    setUnitAllowsDecimals(unit.allows_decimals);
    setUnitFormError(null);
    setIsUnitModalOpen(true);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitCode.trim() || !unitName.trim()) return;
    setSavingUnit(true);
    setUnitFormError(null);

    try {
      if (editingUnit) {
        const updated = await api.updateUnit(editingUnit.id, {
          code: unitCode.trim().toUpperCase(),
          name: unitName.trim(),
          allows_decimals: unitAllowsDecimals,
        });
        setUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      } else {
        const created = await api.createUnit(
          unitCode.trim().toUpperCase(),
          unitName.trim(),
          unitAllowsDecimals
        );
        setUnits((prev) => [...prev, created]);
      }
      setIsUnitModalOpen(false);
    } catch (err: any) {
      setUnitFormError(err.message || 'Erro ao salvar unidade de medida.');
    } finally {
      setSavingUnit(false);
    }
  };

  const handleDeleteUnit = async (u: UnitOfMeasure) => {
    if (!confirm(`Deseja realmente excluir a unidade de medida "${u.name}" (${u.code})?`)) return;
    try {
      await api.deleteUnit(u.id);
      setUnits((prev) => prev.filter((item) => item.id !== u.id));
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir unidade de medida.');
    }
  };

  // --- Handlers de Tipo de Item ---
  const handleOpenNewType = () => {
    setTypeName('');
    setTypeCode('');
    setTypeDesc('');
    setTypeFormError(null);
    setIsTypeModalOpen(true);
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim()) return;
    setSavingType(true);
    setTypeFormError(null);

    try {
      const created = await api.createItemType(
        typeName.trim(),
        typeCode.trim() ? typeCode.trim().toUpperCase() : undefined,
        typeDesc.trim() || undefined
      );
      setItemTypes((prev) => [...prev, created]);
      setIsTypeModalOpen(false);
    } catch (err: any) {
      setTypeFormError(err.message || 'Erro ao salvar tipo de item.');
    } finally {
      setSavingType(false);
    }
  };

  const handleDeleteType = async (t: ItemTypeDefinition) => {
    if (t.is_system) {
      alert('Tipos de item nativos do sistema não podem ser removidos.');
      return;
    }
    if (!confirm(`Deseja realmente excluir o tipo personalizado "${t.name}" (${t.code})?`)) return;
    try {
      await api.deleteItemType(t.id);
      setItemTypes((prev) => prev.filter((item) => item.id !== t.id));
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir tipo de item.');
    }
  };

  // --- Handlers de Cor ---
  const handleOpenNewColor = () => {
    setEditingColor(null);
    setColorName('');
    setColorHex('#d8b4fe');
    setColorFormError(null);
    setIsColorModalOpen(true);
  };

  const handleOpenEditColor = (c: ProductColor) => {
    setEditingColor(c);
    setColorName(c.name);
    setColorHex(c.hex_code || '#d8b4fe');
    setColorFormError(null);
    setIsColorModalOpen(true);
  };

  const handleSaveColor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colorName.trim()) return;
    setSavingColor(true);
    setColorFormError(null);

    try {
      if (editingColor) {
        const updated = await api.updateColor(editingColor.id, {
          name: colorName.trim(),
          hex_code: colorHex.trim() || undefined,
        });
        setColors((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await api.createColor(
          colorName.trim(),
          colorHex.trim() || undefined
        );
        setColors((prev) => [...prev, created]);
      }
      setIsColorModalOpen(false);
    } catch (err: any) {
      setColorFormError(err.message || 'Erro ao salvar cor.');
    } finally {
      setSavingColor(false);
    }
  };

  const handleDeleteColor = async (c: ProductColor) => {
    if (!confirm(`Deseja realmente excluir a cor "${c.name}"?`)) return;
    try {
      await api.deleteColor(c.id);
      setColors((prev) => prev.filter((item) => item.id !== c.id));
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir cor.');
    }
  };

  // --- Handlers de Material ---
  const handleOpenNewMaterial = () => {
    setEditingMaterial(null);
    setMaterialName('');
    setMaterialDesc('');
    setMaterialFormError(null);
    setIsMaterialModalOpen(true);
  };

  const handleOpenEditMaterial = (m: ProductMaterial) => {
    setEditingMaterial(m);
    setMaterialName(m.name);
    setMaterialDesc(m.description || '');
    setMaterialFormError(null);
    setIsMaterialModalOpen(true);
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialName.trim()) return;
    setSavingMaterial(true);
    setMaterialFormError(null);
    try {
      if (editingMaterial) {
        const updated = await api.updateMaterial(editingMaterial.id, {
          name: materialName.trim(),
          description: materialDesc.trim() || undefined,
        });
        setMaterials((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await api.createMaterial(materialName.trim(), materialDesc.trim() || undefined);
        setMaterials((prev) => [...prev, created]);
      }
      setIsMaterialModalOpen(false);
    } catch (err: any) {
      setMaterialFormError(err.message || 'Erro ao salvar material.');
    } finally {
      setSavingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (m: ProductMaterial) => {
    if (!confirm(`Deseja realmente excluir o material "${m.name}"?`)) return;
    try {
      await api.deleteMaterial(m.id);
      setMaterials((prev) => prev.filter((item) => item.id !== m.id));
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir material.');
    }
  };

  // Filtros de busca locais
  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredUnits = units.filter(
    (u) =>
      u.code.toLowerCase().includes(search.toLowerCase()) ||
      u.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTypes = itemTypes.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase())
  );

  const filteredColors = colors.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.hex_code && c.hex_code.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredMaterials = materials.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="container" style={{ paddingBottom: '60px' }}>
      {/* Abas Superiores de Submódulos */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: '1px solid var(--border-medium)',
          paddingBottom: '12px',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('categorias');
            setSearch('');
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: 'var(--radius-sm)',
            border: activeSubTab === 'categorias' ? '1px solid var(--border-medium)' : '1px solid transparent',
            backgroundColor: activeSubTab === 'categorias' ? 'var(--bg-sand)' : 'transparent',
            color: activeSubTab === 'categorias' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            fontWeight: activeSubTab === 'categorias' ? 700 : 500,
            fontSize: '0.92rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <FolderTree size={18} color={activeSubTab === 'categorias' ? 'var(--brand-accent)' : 'currentColor'} />
          <span>Categorias</span>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: '10px',
              fontSize: '0.72rem',
              fontWeight: 700,
              backgroundColor: activeSubTab === 'categorias' ? 'var(--brand-accent)' : 'var(--border-subtle)',
              color: activeSubTab === 'categorias' ? '#fff' : 'var(--text-tertiary)',
            }}
          >
            {categories.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('unidades');
            setSearch('');
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: 'var(--radius-sm)',
            border: activeSubTab === 'unidades' ? '1px solid var(--border-medium)' : '1px solid transparent',
            backgroundColor: activeSubTab === 'unidades' ? 'var(--bg-sand)' : 'transparent',
            color: activeSubTab === 'unidades' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            fontWeight: activeSubTab === 'unidades' ? 700 : 500,
            fontSize: '0.92rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Scale size={18} color={activeSubTab === 'unidades' ? 'var(--brand-accent)' : 'currentColor'} />
          <span>Unidades de Medida</span>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: '10px',
              fontSize: '0.72rem',
              fontWeight: 700,
              backgroundColor: activeSubTab === 'unidades' ? 'var(--brand-accent)' : 'var(--border-subtle)',
              color: activeSubTab === 'unidades' ? '#fff' : 'var(--text-tertiary)',
            }}
          >
            {units.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('tipos');
            setSearch('');
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: 'var(--radius-sm)',
            border: activeSubTab === 'tipos' ? '1px solid var(--border-medium)' : '1px solid transparent',
            backgroundColor: activeSubTab === 'tipos' ? 'var(--bg-sand)' : 'transparent',
            color: activeSubTab === 'tipos' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            fontWeight: activeSubTab === 'tipos' ? 700 : 500,
            fontSize: '0.92rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Layers size={18} color={activeSubTab === 'tipos' ? 'var(--brand-accent)' : 'currentColor'} />
          <span>Tipos de Item</span>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: '10px',
              fontSize: '0.72rem',
              fontWeight: 700,
              backgroundColor: activeSubTab === 'tipos' ? 'var(--brand-accent)' : 'var(--border-subtle)',
              color: activeSubTab === 'tipos' ? '#fff' : 'var(--text-tertiary)',
            }}
          >
            {itemTypes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('cores');
            setSearch('');
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: 'var(--radius-sm)',
            border: activeSubTab === 'cores' ? '1px solid var(--border-medium)' : '1px solid transparent',
            backgroundColor: activeSubTab === 'cores' ? 'var(--bg-sand)' : 'transparent',
            color: activeSubTab === 'cores' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            fontWeight: activeSubTab === 'cores' ? 700 : 500,
            fontSize: '0.92rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Palette size={18} color={activeSubTab === 'cores' ? 'var(--brand-accent)' : 'currentColor'} />
          <span>Cores dos Produtos</span>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: '10px',
              fontSize: '0.72rem',
              fontWeight: 700,
              backgroundColor: activeSubTab === 'cores' ? 'var(--brand-accent)' : 'var(--border-subtle)',
              color: activeSubTab === 'cores' ? '#fff' : 'var(--text-tertiary)',
            }}
          >
            {colors.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('materiais');
            setSearch('');
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: 'var(--radius-sm)',
            border: activeSubTab === 'materiais' ? '1px solid var(--border-medium)' : '1px solid transparent',
            backgroundColor: activeSubTab === 'materiais' ? 'var(--bg-sand)' : 'transparent',
            color: activeSubTab === 'materiais' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            fontWeight: activeSubTab === 'materiais' ? 700 : 500,
            fontSize: '0.92rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Layers size={18} color={activeSubTab === 'materiais' ? 'var(--brand-accent)' : 'currentColor'} />
          <span>Materiais</span>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: '10px',
              fontSize: '0.72rem',
              fontWeight: 700,
              backgroundColor: activeSubTab === 'materiais' ? 'var(--brand-accent)' : 'var(--border-subtle)',
              color: activeSubTab === 'materiais' ? '#fff' : 'var(--text-tertiary)',
            }}
          >
            {materials.length}
          </span>
        </button>
      </div>

      {/* Barra de Ações: Busca e Botão de Adição */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', minWidth: '280px', flex: 1 }}>
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
            placeholder={
              activeSubTab === 'categorias'
                ? 'Buscar por nome ou descrição da categoria...'
                : activeSubTab === 'unidades'
                ? 'Buscar por código ou nome da unidade...'
                : activeSubTab === 'cores'
                ? 'Buscar por nome ou código hexadecimal da cor...'
                : activeSubTab === 'materiais'
                ? 'Buscar por nome ou descrição do material...'
                : 'Buscar por nome ou código do tipo...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '38px', width: '100%' }}
          />
        </div>

        {activeSubTab === 'categorias' && (
          <button onClick={handleOpenNewCategory} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} />
            <span>Nova Categoria</span>
          </button>
        )}

        {activeSubTab === 'unidades' && (
          <button onClick={handleOpenNewUnit} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} />
            <span>Nova Unidade</span>
          </button>
        )}

        {activeSubTab === 'tipos' && (
          <button onClick={handleOpenNewType} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} />
            <span>Novo Tipo</span>
          </button>
        )}

        {activeSubTab === 'cores' && (
          <button onClick={handleOpenNewColor} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} />
            <span>Nova Cor</span>
          </button>
        )}

        {activeSubTab === 'materiais' && (
          <button onClick={handleOpenNewMaterial} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} />
            <span>Novo Material</span>
          </button>
        )}
      </div>

      {/* Conteúdo Principal */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Loader2 size={32} className="spin-animation" color="var(--brand-accent)" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Carregando dados de configuração...</p>
        </div>
      ) : error ? (
        <div
          style={{
            padding: '24px',
            backgroundColor: 'var(--status-danger-bg)',
            color: 'var(--status-danger-text)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <AlertCircle size={24} />
          <div>
            <h4 style={{ margin: 0, fontWeight: 600 }}>Falha de Comunicação</h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.88rem' }}>{error}</p>
          </div>
        </div>
      ) : (
        <>
          {/* TAB 1: CATEGORIAS */}
          {activeSubTab === 'categorias' && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-sand-light)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                  Categorias de Produtos Cadastradas ({filteredCategories.length})
                </span>
              </div>
              {filteredCategories.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <FolderTree size={36} color="var(--brand-accent)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontWeight: 500 }}>Nenhuma categoria encontrada.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-sand-light)' }}>
                        <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Nome da Categoria</th>
                        <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Descrição</th>
                        <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCategories.map((cat) => (
                        <tr key={cat.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {cat.name}
                          </td>
                          <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                            {cat.description || <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Sem descrição</span>}
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditCategory(cat)}
                                className="btn-icon"
                                title="Editar Categoria"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat)}
                                className="btn-icon"
                                title="Excluir Categoria"
                                style={{ color: 'var(--status-danger-text)' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UNIDADES DE MEDIDA */}
          {activeSubTab === 'unidades' && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-sand-light)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                  Unidades de Medida Cadastradas ({filteredUnits.length})
                </span>
              </div>
              {filteredUnits.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <Scale size={36} color="var(--brand-accent)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontWeight: 500 }}>Nenhuma unidade de medida encontrada.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-sand-light)' }}>
                        <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)', width: '120px' }}>Sigla / Código</th>
                        <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Nome por Extenso</th>
                        <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Permite Fracionado / Decimal</th>
                        <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUnits.map((u) => (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--brand-primary)' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-xs)',
                                backgroundColor: 'var(--bg-sand)',
                                border: '1px solid var(--border-medium)',
                              }}
                            >
                              {u.code}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', fontWeight: 500, color: 'var(--text-primary)' }}>
                            {u.name}
                          </td>
                          <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                            {u.allows_decimals ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#15803d', fontSize: '0.82rem', fontWeight: 600 }}>
                                <CheckCircle2 size={14} /> Sim (ex.: 0.250 {u.code})
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>
                                Apenas inteiros (ex.: 1 {u.code})
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditUnit(u)}
                                className="btn-icon"
                                title="Editar Unidade"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUnit(u)}
                                className="btn-icon"
                                title="Excluir Unidade"
                                style={{ color: 'var(--status-danger-text)' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TIPOS DE ITEM */}
          {activeSubTab === 'tipos' && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-sand-light)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                  Tipos de Item ({filteredTypes.length})
                </span>
              </div>
              {filteredTypes.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <Layers size={36} color="var(--brand-accent)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontWeight: 500 }}>Nenhum tipo de item encontrado.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-sand-light)' }}>
                        <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Nome do Tipo</th>
                        <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Código</th>
                        <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Origem</th>
                        <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTypes.map((t) => (
                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {t.name}
                          </td>
                          <td style={{ padding: '14px 18px', color: 'var(--brand-accent)', fontWeight: 600 }}>
                            <code>{t.code}</code>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            {t.is_system ? (
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand-accent)', backgroundColor: 'var(--bg-sand)', padding: '3px 8px', borderRadius: '4px' }}>
                                Padrão do Sistema
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16a34a', backgroundColor: '#dcfce7', padding: '3px 8px', borderRadius: '4px' }}>
                                Personalizado
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            {!t.is_system ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteType(t)}
                                className="btn-icon"
                                title="Excluir Tipo Personalizado"
                                style={{ color: 'var(--status-danger-text)' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Protegido</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {/* TAB 4: CORES DOS PRODUTOS */}
          {activeSubTab === 'cores' && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-sand-light)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                  Paleta de Cores de Produtos Cadastradas ({filteredColors.length})
                </span>
              </div>
              {filteredColors.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <Palette size={36} color="var(--brand-accent)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontWeight: 500 }}>Nenhuma cor cadastrada encontrada.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-sand-light)' }}>
                        <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)', width: '90px' }}>Amostra</th>
                        <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Nome da Cor</th>
                        <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Código Hexadecimal</th>
                        <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredColors.map((c) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '50%',
                                  backgroundColor: c.hex_code || '#cccccc',
                                  border: '2px solid rgba(0,0,0,0.15)',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                                  display: 'inline-block',
                                  flexShrink: 0,
                                }}
                              />
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {c.name}
                          </td>
                          <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                            {c.hex_code ? (
                              <code
                                style={{
                                  fontFamily: 'monospace',
                                  fontSize: '0.84rem',
                                  backgroundColor: 'var(--bg-sand)',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-medium)',
                                }}
                              >
                                {c.hex_code.toUpperCase()}
                              </code>
                            ) : (
                              <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Não definido</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditColor(c)}
                                className="btn-icon"
                                title="Editar Cor"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteColor(c)}
                                className="btn-icon"
                                title="Excluir Cor"
                                style={{ color: 'var(--status-danger-text)' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Subaba: Materiais */}
          {activeSubTab === 'materiais' && (
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', margin: '0 0 4px', color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>
                    Materiais de Fabricação e Composição ({filteredMaterials.length})
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    Cimento estrutural, argamassa, ceras ecológicas, resinas e demais insumos-base
                  </p>
                </div>
              </div>

              {filteredMaterials.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                  <p style={{ fontSize: '0.95rem', margin: '0 0 12px' }}>Nenhum material encontrado.</p>
                  <button onClick={handleOpenNewMaterial} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={16} /> Cadastrar Primeiro Material
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-medium)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px 18px' }}>Nome do Material</th>
                        <th style={{ padding: '12px 18px' }}>Descrição / Observações</th>
                        <th style={{ padding: '12px 18px', textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMaterials.map((m) => (
                        <tr
                          key={m.id}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-sand-light)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              🧱 {m.name}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                            {m.description || <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Sem descrição</span>}
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditMaterial(m)}
                                className="btn-icon"
                                title="Editar Material"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMaterial(m)}
                                className="btn-icon"
                                title="Excluir Material"
                                style={{ color: 'var(--status-danger-text)' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal Criar/Editar Categoria */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
        subtitle="Organize seus produtos por linhas, coleções ou grupos"
        maxWidth="480px"
      >
        <form onSubmit={handleSaveCategory}>
          {categoryFormError && (
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
              {categoryFormError}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="cat-name">Nome da Categoria *</label>
            <input
              id="cat-name"
              type="text"
              required
              placeholder="Ex.: Velas Aromáticas, Home Spray, Saboaria..."
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="cat-desc">Descrição (Opcional)</label>
            <textarea
              id="cat-desc"
              rows={3}
              placeholder="Ex.: Produtos feitos artesanalmente com cera vegetal..."
              value={categoryDesc}
              onChange={(e) => setCategoryDesc(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="btn-secondary"
              disabled={savingCategory}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingCategory}>
              {savingCategory ? 'Salvando...' : editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Criar/Editar Unidade de Medida */}
      <Modal
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        title={editingUnit ? 'Editar Unidade de Medida' : 'Nova Unidade de Medida'}
        subtitle="Métrica de quantificação para produtos, insumos e receitas"
        maxWidth="480px"
      >
        <form onSubmit={handleSaveUnit}>
          {unitFormError && (
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
              {unitFormError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label htmlFor="unit-code">Código / Sigla *</label>
              <input
                id="unit-code"
                type="text"
                required
                placeholder="Ex.: KG, UN, L..."
                value={unitCode}
                onChange={(e) => setUnitCode(e.target.value.toUpperCase())}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="unit-name">Nome da Unidade *</label>
              <input
                id="unit-name"
                type="text"
                required
                placeholder="Ex.: Quilograma, Unidade..."
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
              <input
                type="checkbox"
                checked={unitAllowsDecimals}
                onChange={(e) => setUnitAllowsDecimals(e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
              <span>Permite quantidades fracionadas / decimais (ex.: 1.500 kg, 0.250 l)</span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setIsUnitModalOpen(false)}
              className="btn-secondary"
              disabled={savingUnit}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingUnit}>
              {savingUnit ? 'Salvando...' : editingUnit ? 'Salvar Alterações' : 'Criar Unidade'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Criar Tipo de Item */}
      <Modal
        isOpen={isTypeModalOpen}
        onClose={() => setIsTypeModalOpen(false)}
        title="Novo Tipo de Item"
        subtitle="Crie classificações personalizadas para os materiais do ateliê"
        maxWidth="480px"
      >
        <form onSubmit={handleSaveType}>
          {typeFormError && (
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
              {typeFormError}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="type-name">Nome do Tipo *</label>
            <input
              id="type-name"
              type="text"
              required
              placeholder="Ex.: Acessórios, Embalagens Secundárias..."
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="type-code">Código Identificador (Opcional)</label>
            <input
              id="type-code"
              type="text"
              placeholder="Ex.: ACESSORIO (gerado automaticamente se vazio)"
              value={typeCode}
              onChange={(e) => setTypeCode(e.target.value.toUpperCase())}
            />
            <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', display: 'block', marginTop: '4px' }}>
              Identificador único sem espaços. Se vazio, geramos a partir do nome.
            </span>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="type-desc">Descrição (Opcional)</label>
            <textarea
              id="type-desc"
              rows={2}
              placeholder="Finalidade ou detalhes deste tipo de item..."
              value={typeDesc}
              onChange={(e) => setTypeDesc(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setIsTypeModalOpen(false)}
              className="btn-secondary"
              disabled={savingType}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingType}>
              {savingType ? 'Salvando...' : 'Salvar Tipo de Item'}
            </button>
          </div>
        </form>
      </Modal>
      {/* Modal Criar/Editar Cor de Produto */}
      <Modal
        isOpen={isColorModalOpen}
        onClose={() => setIsColorModalOpen(false)}
        title={editingColor ? 'Editar Cor de Produto' : 'Nova Cor de Produto'}
        subtitle="Cadastre tons e paletas para personalizar o catálogo e as variações"
        maxWidth="480px"
      >
        <form onSubmit={handleSaveColor}>
          {colorFormError && (
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
              {colorFormError}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="color-name">Nome da Cor *</label>
            <input
              id="color-name"
              type="text"
              required
              placeholder="Ex.: Lavanda Real, Âmbar Dourado, Baunilha..."
              value={colorName}
              onChange={(e) => setColorName(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="color-hex">Código Hexadecimal / Amostra Visual</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="color"
                id="color-picker"
                value={colorHex.startsWith('#') && colorHex.length === 7 ? colorHex : '#d8b4fe'}
                onChange={(e) => setColorHex(e.target.value)}
                style={{
                  width: '46px',
                  height: '42px',
                  padding: '2px',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-medium)',
                  backgroundColor: '#fff',
                }}
                title="Clique para escolher a cor visualmente"
              />
              <input
                id="color-hex"
                type="text"
                placeholder="#RRGGBB (ex.: #D8B4FE)"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                style={{ flex: 1, textTransform: 'uppercase' }}
              />
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', display: 'block', marginTop: '6px' }}>
              Você pode clicar no seletor de cor ou digitar o código hexadecimal (ex: #C86D51).
            </span>
          </div>

          {/* Visualização de Prévia */}
          <div
            style={{
              marginBottom: '24px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-sand-light)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: colorHex || '#cccccc',
                border: '2px solid rgba(0,0,0,0.15)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                flexShrink: 0,
              }}
            />
            <div>
              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                {colorName.trim() || 'Nome da Cor'}
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Prévia: {colorHex || 'Sem código'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setIsColorModalOpen(false)}
              className="btn-secondary"
              disabled={savingColor}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingColor}>
              {savingColor ? 'Salvando...' : editingColor ? 'Salvar Alterações' : 'Criar Cor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Criar/Editar Material */}
      <Modal
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
        title={editingMaterial ? 'Editar Material' : 'Novo Material'}
        subtitle="Gerencie matérias-primas e bases (cimento, granilite, cera, resina, etc.)"
        maxWidth="480px"
      >
        <form onSubmit={handleSaveMaterial}>
          {materialFormError && (
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
              {materialFormError}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="mat-name">Nome do Material *</label>
            <input
              id="mat-name"
              type="text"
              required
              placeholder="Ex.: Cimento Estrutural, Granilite, Cera de Coco..."
              value={materialName}
              onChange={(e) => setMaterialName(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="mat-desc">Descrição / Composição (Opcional)</label>
            <textarea
              id="mat-desc"
              rows={3}
              placeholder="Ex.: Traço especial para peças com acabamento acetinado..."
              value={materialDesc}
              onChange={(e) => setMaterialDesc(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setIsMaterialModalOpen(false)}
              className="btn-secondary"
              disabled={savingMaterial}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingMaterial}>
              {savingMaterial ? 'Salvando...' : editingMaterial ? 'Salvar Alterações' : 'Criar Material'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
