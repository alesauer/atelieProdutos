import type { AuthResponse, Category, Product, ProductFormData, ProductImage, UnitOfMeasure, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('casaluma_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('casaluma_token', token);
    } else {
      localStorage.removeItem('casaluma_token');
      localStorage.removeItem('casaluma_user');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.setToken(null);
      window.dispatchEvent(new Event('casaluma:unauthorized'));
    }

    if (!response.ok) {
      let errorMessage = `Erro HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        }
      } catch {
        // Fallback para texto simples
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // --- Autenticação ---
  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    localStorage.setItem('casaluma_user', JSON.stringify(data.user));
    return data;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // --- Categorias & Unidades ---
  async listCategories(): Promise<Category[]> {
    return this.request<Category[]>('/categories');
  }

  async createCategory(name: string, description?: string): Promise<Category> {
    return this.request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async listUnits(): Promise<UnitOfMeasure[]> {
    return this.request<UnitOfMeasure[]>('/units');
  }

  async createUnit(code: string, name: string, allows_decimals = true): Promise<UnitOfMeasure> {
    return this.request<UnitOfMeasure>('/units', {
      method: 'POST',
      body: JSON.stringify({ code, name, allows_decimals }),
    });
  }

  // --- Produtos ---
  async listProducts(params?: {
    item_type?: string;
    category_id?: number;
    search?: string;
    active_only?: boolean;
  }): Promise<Product[]> {
    const query = new URLSearchParams();
    if (params?.item_type) query.append('item_type', params.item_type);
    if (params?.category_id) query.append('category_id', params.category_id.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.active_only !== undefined) query.append('active_only', params.active_only.toString());

    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<Product[]>(`/products${qs}`);
  }

  async getProduct(id: number): Promise<Product> {
    return this.request<Product>(`/products/${id}`);
  }

  async createProduct(data: ProductFormData): Promise<Product> {
    return this.request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: number, data: Partial<ProductFormData>): Promise<Product> {
    return this.request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async toggleProductStatus(id: number, isActive: boolean): Promise<Product> {
    return this.request<Product>(`/products/${id}/status?is_active=${isActive}`, {
      method: 'PUT',
    });
  }

  // --- Gestão de Imagens ---
  async uploadProductImage(productId: number, file: File): Promise<ProductImage> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<ProductImage>(`/products/${productId}/images`, {
      method: 'POST',
      body: formData,
    });
  }

  async setPrimaryImage(productId: number, imageId: number): Promise<ProductImage> {
    return this.request<ProductImage>(`/products/${productId}/images/${imageId}/primary`, {
      method: 'PUT',
    });
  }

  async deleteProductImage(productId: number, imageId: number): Promise<void> {
    return this.request<void>(`/products/${productId}/images/${imageId}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
