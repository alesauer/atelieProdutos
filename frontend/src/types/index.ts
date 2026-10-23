export type ItemType =
  | 'PRODUTO_ACABADO'
  | 'MATERIA_PRIMA'
  | 'EMBALAGEM'
  | 'MATERIAL_AUXILIAR';

export type MovementType =
  | 'ENTRADA_INICIAL'
  | 'COMPRA'
  | 'SAIDA_MANUAL'
  | 'CONSUMO_PRODUCAO'
  | 'ENTRADA_PRODUCAO'
  | 'VENDA'
  | 'PERDA'
  | 'DEVOLUCAO'
  | 'AJUSTE_INVENTARIO'
  | 'REVERSAO_CANCELAMENTO';

export type OrderStatus = 'RASCUNHO' | 'CONFIRMADA' | 'CANCELADA';
export type SaleStatus = 'RASCUNHO' | 'CONFIRMADA' | 'CANCELADA';

export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface UnitOfMeasure {
  id: number;
  code: string;
  name: string;
  allows_decimals: boolean;
  created_at: string;
}

export interface ProductImage {
  id: number;
  product_id: number;
  file_path: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  is_primary: boolean;
  display_order: number;
  created_at: string;
  url?: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string;
  item_type: ItemType;
  category_id?: number | null;
  unit_id: number;
  unit_cost: string | number;
  sale_price?: string | number | null;
  min_stock: string | number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  unit?: UnitOfMeasure | null;
  images: ProductImage[];
  primary_image_url?: string | null;
  current_stock?: string | number;
}

export interface ProductFormData {
  sku: string;
  name: string;
  description?: string;
  item_type: ItemType;
  category_id?: number | null;
  unit_id: number;
  unit_cost: number | string;
  sale_price?: number | string | null;
  min_stock: number | string;
  is_active: boolean;
}

// --- Estoque ---
export interface StockBalanceItem {
  product_id: number;
  sku: string;
  name: string;
  item_type: ItemType;
  category_name?: string | null;
  unit_code: string;
  current_stock: string | number;
  min_stock: string | number;
  is_low_stock: boolean;
  is_zero_stock: boolean;
  unit_cost: string | number;
  estimated_total_value: string | number;
}

export interface StockMovementItem {
  id: number;
  product_id: number;
  product_name?: string | null;
  product_sku?: string | null;
  movement_type: MovementType;
  quantity: string | number;
  unit_cost_at_moment: string | number;
  justification?: string | null;
  reference_type?: string | null;
  reference_id?: number | null;
  user_name?: string | null;
  created_at: string;
}

// --- Produção ---
export interface RecipeItem {
  id: number;
  component_product_id: number;
  component_name?: string | null;
  component_sku?: string | null;
  component_unit?: string | null;
  standard_quantity: string | number;
}

export interface Recipe {
  id: number;
  product_id: number;
  product_name?: string | null;
  name: string;
  yield_quantity: string | number;
  instructions?: string | null;
  is_active: boolean;
  items: RecipeItem[];
}

export interface ProductionOrderItem {
  id: number;
  component_product_id: number;
  component_name?: string | null;
  component_unit?: string | null;
  planned_quantity: string | number;
  actual_quantity?: string | number | null;
  loss_quantity: string | number;
}

export interface ProductionOrder {
  id: number;
  order_number: string;
  product_id: number;
  product_name?: string | null;
  recipe_id?: number | null;
  planned_quantity: string | number;
  produced_quantity?: string | number | null;
  status: OrderStatus;
  notes?: string | null;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  items: ProductionOrderItem[];
}

// --- Vendas ---
export interface Customer {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SaleItem {
  id: number;
  product_id: number;
  product_name?: string | null;
  product_sku?: string | null;
  quantity: string | number;
  unit_price: string | number;
  total_price: string | number;
  unit_cost_snapshot: string | number;
}

export interface Sale {
  id: number;
  sale_number: string;
  customer_id?: number | null;
  customer_name?: string | null;
  status: SaleStatus;
  total_amount: string | number;
  notes?: string | null;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  items: SaleItem[];
}
