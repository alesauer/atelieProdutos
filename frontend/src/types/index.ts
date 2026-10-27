export type ItemType =
  | 'PRODUTO_ACABADO'
  | 'MATERIA_PRIMA'
  | 'EMBALAGEM'
  | 'MATERIAL_AUXILIAR'
  | (string & {});

export interface ItemTypeDefinition {
  id: number;
  code: string;
  name: string;
  description?: string;
  is_system: boolean;
  is_active: boolean;
  created_at?: string;
}

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

export interface ProductColor {
  id: number;
  name: string;
  hex_code?: string;
  is_active: boolean;
  created_at: string;
}

export interface ProductMaterial {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface ProductSupply {
  id: number;
  name: string;
  category?: string | null;
  unit: string;
  base_quantity: number | string;
  base_cost: number | string;
  unit_cost: number | string;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

export interface CostComponentItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  unit_cost: number;
  total: number;
}

export interface SalesLinkItem {
  id: string;
  platform: string;
  url: string;
}

export interface ProductVariation {
  id: number;
  sku: string;
  name: string;
  description?: string;
  color?: string | null;
  material?: string | null;
  item_type: ItemType;
  category_id?: number | null;
  unit_id: number;
  unit_cost: string | number;
  cost_breakdown?: string | null;
  sales_links?: string | null;
  sale_price?: string | number | null;
  min_stock: string | number;
  is_active: boolean;
  parent_id?: number | null;
  variation_name?: string | null;
  created_at: string;
  updated_at: string;
  images: ProductImage[];
  primary_image_url?: string | null;
  current_stock?: string | number;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string;
  color?: string | null;
  material?: string | null;
  item_type: ItemType;
  category_id?: number | null;
  unit_id: number;
  unit_cost: string | number;
  cost_breakdown?: string | null;
  sales_links?: string | null;
  sale_price?: string | number | null;
  min_stock: string | number;
  is_active: boolean;
  parent_id?: number | null;
  variation_name?: string | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  unit?: UnitOfMeasure | null;
  images: ProductImage[];
  primary_image_url?: string | null;
  current_stock?: string | number;
  variations?: ProductVariation[];
}

export interface ProductFormData {
  sku: string;
  name: string;
  description?: string;
  color?: string;
  material?: string;
  item_type: ItemType;
  category_id?: number | null;
  unit_id: number;
  unit_cost: number | string;
  cost_breakdown?: string | null;
  sales_links?: string | null;
  sale_price?: number | string | null;
  min_stock: number | string;
  is_active: boolean;
  parent_id?: number | null;
  variation_name?: string | null;
}

export interface VariationFormData {
  sku: string;
  variation_name: string;
  color?: string;
  material?: string;
  sale_price?: number | string | null;
  unit_cost?: number | string | null;
  min_stock?: number | string;
  initial_stock?: number | string;
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
  color?: string | null;
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
  payment_method?: string | null;
  status: SaleStatus;
  total_amount: string | number;
  notes?: string | null;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  items: SaleItem[];
}

// --- Dashboard & Relatórios (Fase 6) ---
export interface CriticalStockItem {
  id: number;
  sku: string;
  name: string;
  item_type: ItemType;
  unit: string;
  current_stock: number;
  min_stock: number;
  status: 'ZERO' | 'LOW';
}

export interface DashboardMetrics {
  catalog: {
    total_active_items: number;
    items_low_stock: number;
    items_zero_stock: number;
    total_valuation: number;
  };
  critical_items: CriticalStockItem[];
  recent_movements: {
    id: number;
    product_id: number;
    product_name: string;
    product_sku: string;
    movement_type: MovementType;
    quantity: number;
    unit: string;
    created_at: string;
    justification?: string | null;
  }[];
  sales_summary: {
    confirmed_count_30d: number;
    revenue_30d: number;
    draft_pending_count: number;
  };
  production_summary: {
    completed_count_30d: number;
    units_produced_30d: number;
    draft_pending_count: number;
  };
}

export interface StockReportItem {
  product_id: number;
  sku: string;
  name: string;
  category: string;
  item_type: ItemType;
  unit: string;
  current_stock: number;
  min_stock: number;
  unit_cost: number;
  valuation: number;
  status: 'NORMAL' | 'BAIXO' | 'ZERADO';
}

export interface MovementReportItem {
  id: number;
  created_at: string;
  sku: string;
  product_name: string;
  movement_type: MovementType;
  quantity: number;
  unit: string;
  unit_cost: number;
  user: string;
  reference: string;
  justification: string;
}

export interface SalesReportSummary {
  total_sales_count: number;
  confirmed_count: number;
  total_revenue: number;
  average_ticket: number;
}

export interface SalesReportSaleItem {
  id: number;
  sale_code: string;
  created_at: string;
  status: string;
  customer_name: string;
  total_items: number;
  total_amount: number;
}

export interface SalesReportTopProduct {
  sku: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface SalesReportResponse {
  summary: SalesReportSummary;
  sales: SalesReportSaleItem[];
  top_products: SalesReportTopProduct[];
}

export interface ProductionReportSummary {
  total_orders: number;
  completed_orders: number;
  total_finished_units: number;
}

export interface ProductionReportOrderItem {
  id: number;
  order_number: string;
  created_at: string;
  status: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit: string;
  notes: string;
}

export interface ProductionReportConsumedMaterial {
  sku: string;
  name: string;
  unit: string;
  quantity: number;
}

export interface ProductionReportResponse {
  summary: ProductionReportSummary;
  orders: ProductionReportOrderItem[];
  raw_materials_consumed: ProductionReportConsumedMaterial[];
}

export interface NotificationLogItem {
  id: number;
  event_type: string;
  deduplication_key?: string | null;
  recipient: string;
  subject: string;
  status: 'SENT' | 'FAILED' | 'SKIPPED' | 'MOCK';
  error_message?: string | null;
  sent_at: string;
}

// --- Módulo Financeiro ---
export type FinancialType = 'RECEITA' | 'DESPESA';
export type FinancialStatus = 'PENDENTE' | 'PAGO' | 'CANCELADO';

export interface FinancialCategory {
  id: number;
  name: string;
  type: FinancialType;
  color?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FinancialTransaction {
  id: number;
  description: string;
  type: FinancialType;
  category_id?: number | null;
  category_name?: string | null;
  category_color?: string | null;
  amount: number | string;
  due_date: string;
  payment_date?: string | null;
  status: FinancialStatus;
  payment_method?: string | null;
  reference_type?: string | null;
  reference_id?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialPaymentMethodStat {
  method: string;
  amount: number | string;
  count: number;
  percentage: number;
}

export interface FinancialCategoryStat {
  category_name: string;
  color?: string | null;
  amount: number | string;
  percentage: number;
}

export interface FinancialCashFlowPoint {
  date: string;
  income: number | string;
  expense: number | string;
  net: number | string;
}

export interface FinancialDREItem {
  code: string;
  label: string;
  amount: number | string;
  percentage: number;
  is_total?: boolean;
  is_negative?: boolean;
}

export interface FinancialSummary {
  start_date: string;
  end_date: string;
  sales_revenue: number | string;
  manual_revenue: number | string;
  total_revenue: number | string;
  total_cpv: number | string;
  gross_profit: number | string;
  gross_margin_pct: number;
  paid_expenses: number | string;
  pending_expenses: number | string;
  overdue_expenses: number | string;
  net_profit: number | string;
  net_margin_pct: number;
  sales_count: number;
  expenses_count: number;
  by_payment_method: FinancialPaymentMethodStat[];
  top_expense_categories: FinancialCategoryStat[];
  daily_cash_flow: FinancialCashFlowPoint[];
  dre_items: FinancialDREItem[];
}
