import type {
  AuthResponse,
  Category,
  Customer,
  DashboardMetrics,
  MovementReportItem,
  NotificationLogItem,
  Product,
  ProductFormData,
  ProductImage,
  ProductionOrder,
  ProductionReportResponse,
  Recipe,
  Sale,
  SalesReportResponse,
  StockBalanceItem,
  StockMovementItem,
  StockReportItem,
  UnitOfMeasure,
  User,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

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
        // Fallback
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

  // --- Estoque & Movimentações ---
  async getStockBalances(): Promise<StockBalanceItem[]> {
    return this.request<StockBalanceItem[]>('/stock/balance');
  }

  async listStockMovements(productId?: number): Promise<StockMovementItem[]> {
    const qs = productId ? `?product_id=${productId}` : '';
    return this.request<StockMovementItem[]>(`/stock/movements${qs}`);
  }

  async createStockAdjustment(
    productId: number,
    quantityDelta: number | string,
    justification: string
  ): Promise<StockMovementItem> {
    return this.request<StockMovementItem>('/stock/adjustments', {
      method: 'POST',
      body: JSON.stringify({
        product_id: productId,
        quantity_delta: quantityDelta,
        justification,
      }),
    });
  }

  async createStockEntry(
    productId: number,
    quantity: number | string,
    unitCost?: number | string,
    justification?: string
  ): Promise<StockMovementItem> {
    return this.request<StockMovementItem>('/stock/entries', {
      method: 'POST',
      body: JSON.stringify({
        product_id: productId,
        quantity,
        unit_cost: unitCost,
        justification,
      }),
    });
  }

  // --- Produção Artesanal ---
  async listRecipes(): Promise<Recipe[]> {
    return this.request<Recipe[]>('/production/recipes');
  }

  async createRecipe(data: {
    product_id: number;
    name: string;
    yield_quantity: number | string;
    instructions?: string;
    items: { component_product_id: number; standard_quantity: number | string }[];
  }): Promise<Recipe> {
    return this.request<Recipe>('/production/recipes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listProductionOrders(): Promise<ProductionOrder[]> {
    return this.request<ProductionOrder[]>('/production/orders');
  }

  async createDraftOrder(data: {
    product_id: number;
    recipe_id?: number | null;
    planned_quantity: number | string;
    notes?: string;
  }): Promise<ProductionOrder> {
    return this.request<ProductionOrder>('/production/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async confirmOrder(orderId: number): Promise<ProductionOrder> {
    return this.request<ProductionOrder>(`/production/orders/${orderId}/confirm`, {
      method: 'POST',
    });
  }

  async cancelOrder(orderId: number): Promise<ProductionOrder> {
    return this.request<ProductionOrder>(`/production/orders/${orderId}/cancel`, {
      method: 'POST',
    });
  }

  // --- Vendas & Clientes ---
  async listCustomers(search?: string): Promise<Customer[]> {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<Customer[]>(`/sales/customers${qs}`);
  }

  async createCustomer(data: {
    name: string;
    email?: string;
    phone?: string;
    document?: string;
    notes?: string;
  }): Promise<Customer> {
    return this.request<Customer>('/sales/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listSales(): Promise<Sale[]> {
    return this.request<Sale[]>('/sales');
  }

  async createDraftSale(data: {
    customer_id?: number | null;
    notes?: string;
    items: { product_id: number; quantity: number | string; unit_price: number | string }[];
  }): Promise<Sale> {
    return this.request<Sale>('/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async confirmSale(saleId: number): Promise<Sale> {
    return this.request<Sale>(`/sales/${saleId}/confirm`, {
      method: 'POST',
    });
  }

  async cancelSale(saleId: number): Promise<Sale> {
    return this.request<Sale>(`/sales/${saleId}/cancel`, {
      method: 'POST',
    });
  }

  // --- Dashboard & Relatórios (Fase 6) ---
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return this.request<DashboardMetrics>('/dashboard/metrics');
  }

  async getReportsStock(params?: {
    item_type?: string;
    category_id?: number;
    low_stock_only?: boolean;
  }): Promise<StockReportItem[]> {
    const query = new URLSearchParams();
    if (params?.item_type) query.set('item_type', params.item_type);
    if (params?.category_id) query.set('category_id', String(params.category_id));
    if (params?.low_stock_only) query.set('low_stock_only', 'true');
    query.set('format', 'json');
    return this.request<StockReportItem[]>(`/reports/stock?${query.toString()}`);
  }

  async getReportsMovements(params?: {
    start_date?: string;
    end_date?: string;
    product_id?: number;
    movement_type?: string;
  }): Promise<MovementReportItem[]> {
    const query = new URLSearchParams();
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    if (params?.product_id) query.set('product_id', String(params.product_id));
    if (params?.movement_type) query.set('movement_type', params.movement_type);
    query.set('format', 'json');
    return this.request<MovementReportItem[]>(`/reports/movements?${query.toString()}`);
  }

  async getReportsSales(params?: {
    start_date?: string;
    end_date?: string;
    status?: string;
  }): Promise<SalesReportResponse> {
    const query = new URLSearchParams();
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    if (params?.status) query.set('status', params.status);
    query.set('format', 'json');
    return this.request<SalesReportResponse>(`/reports/sales?${query.toString()}`);
  }

  async getReportsProduction(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ProductionReportResponse> {
    const query = new URLSearchParams();
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    query.set('format', 'json');
    return this.request<ProductionReportResponse>(`/reports/production?${query.toString()}`);
  }

  async downloadReportCsv(
    reportType: 'stock' | 'movements' | 'sales' | 'production',
    params?: Record<string, string | number | boolean | undefined>,
    defaultFilename: string = 'relatorio.csv'
  ): Promise<void> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.set(key, String(val));
        }
      });
    }
    query.set('format', 'csv');

    const url = `${API_BASE_URL}/reports/${reportType}?${query.toString()}`;
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error('Falha ao exportar relatório CSV.');
    }

    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;

    const disposition = res.headers.get('content-disposition');
    let filename = defaultFilename;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }

  async triggerStockAlertCheck(): Promise<{
    status: string;
    processed_count: number;
    results: any[];
  }> {
    return this.request<{
      status: string;
      processed_count: number;
      results: any[];
    }>('/reports/check-alerts', {
      method: 'POST',
    });
  }

  async getNotificationLogs(limit: number = 50): Promise<NotificationLogItem[]> {
    return this.request<NotificationLogItem[]>(`/reports/notifications-log?limit=${limit}`);
  }
}

export const api = new ApiClient();
