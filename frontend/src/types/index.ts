export type ItemType =
  | 'PRODUTO_ACABADO'
  | 'MATERIA_PRIMA'
  | 'EMBALAGEM'
  | 'MATERIAL_AUXILIAR';

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
