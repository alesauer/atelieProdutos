import type {
  AuthResponse,
  Category,
  Customer,
  CustomerDetail,
  CustomerFormData,
  CustomerStats,
  DashboardMetrics,
  ItemTypeDefinition,
  MovementReportItem,
  NotificationLogItem,
  Product,
  ProductVariation,
  ProductColor,
  ProductMaterial,
  ProductSupply,
  ProductFormData,
  VariationFormData,
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
  FinancialCategory,
  FinancialTransaction,
  FinancialSummary,
  FinancialType,
  FinancialStatus,
  SystemSettings,
  SystemStatus,
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
        if (response.status === 413) {
          errorMessage = 'Arquivo muito grande (HTTP 413). O limite do servidor foi excedido.';
        } else if (response.status === 401) {
          errorMessage = 'Sessão expirada ou não autenticado (HTTP 401). Faça login novamente.';
        } else if (response.status === 502 || response.status === 504) {
          errorMessage = `Servidor backend indisponível (HTTP ${response.status}). Verifique se o container está ativo.`;
        } else if (response.status === 404) {
          errorMessage = 'Recurso ou rota não encontrada (HTTP 404).';
        }
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

  async updateCategory(categoryId: number, data: { name?: string; description?: string | null; is_active?: boolean }): Promise<Category> {
    return this.request<Category>(`/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(categoryId: number): Promise<void> {
    return this.request<void>(`/categories/${categoryId}`, {
      method: 'DELETE',
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

  async updateUnit(unitId: number, data: { code?: string; name?: string; allows_decimals?: boolean }): Promise<UnitOfMeasure> {
    return this.request<UnitOfMeasure>(`/units/${unitId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUnit(unitId: number): Promise<void> {
    return this.request<void>(`/units/${unitId}`, {
      method: 'DELETE',
    });
  }

  // --- Cores dos Produtos ---
  async listColors(): Promise<ProductColor[]> {
    return this.request<ProductColor[]>('/colors');
  }

  async createColor(name: string, hex_code?: string): Promise<ProductColor> {
    return this.request<ProductColor>('/colors', {
      method: 'POST',
      body: JSON.stringify({ name, hex_code }),
    });
  }

  async updateColor(colorId: number, data: { name?: string; hex_code?: string | null; is_active?: boolean }): Promise<ProductColor> {
    return this.request<ProductColor>(`/colors/${colorId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteColor(colorId: number): Promise<void> {
    return this.request<void>(`/colors/${colorId}`, {
      method: 'DELETE',
    });
  }

  // --- Materiais dos Produtos ---
  async listMaterials(): Promise<ProductMaterial[]> {
    return this.request<ProductMaterial[]>('/materials');
  }

  async createMaterial(name: string, description?: string): Promise<ProductMaterial> {
    return this.request<ProductMaterial>('/materials', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async updateMaterial(materialId: number, data: { name?: string; description?: string | null; is_active?: boolean }): Promise<ProductMaterial> {
    return this.request<ProductMaterial>(`/materials/${materialId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMaterial(materialId: number): Promise<void> {
    return this.request<void>(`/materials/${materialId}`, {
      method: 'DELETE',
    });
  }

  // --- Insumos / Matérias-Primas de Produção ---
  async listSupplies(): Promise<ProductSupply[]> {
    return this.request<ProductSupply[]>('/supplies');
  }

  async createSupply(data: {
    name: string;
    category?: string;
    unit?: string;
    base_quantity?: number;
    base_cost?: number;
    unit_cost?: number;
    notes?: string;
    is_active?: boolean;
  }): Promise<ProductSupply> {
    return this.request<ProductSupply>('/supplies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSupply(supplyId: number, data: {
    name?: string;
    category?: string | null;
    unit?: string;
    base_quantity?: number;
    base_cost?: number;
    unit_cost?: number;
    notes?: string | null;
    is_active?: boolean;
  }): Promise<ProductSupply> {
    return this.request<ProductSupply>(`/supplies/${supplyId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSupply(supplyId: number): Promise<void> {
    return this.request<void>(`/supplies/${supplyId}`, {
      method: 'DELETE',
    });
  }

  // --- Tipos de Itens ---
  async listItemTypes(): Promise<ItemTypeDefinition[]> {
    return this.request<ItemTypeDefinition[]>('/item-types');
  }

  async createItemType(name: string, code?: string, description?: string): Promise<ItemTypeDefinition> {
    return this.request<ItemTypeDefinition>('/item-types', {
      method: 'POST',
      body: JSON.stringify({ name, code, description }),
    });
  }

  async deleteItemType(itemTypeId: number): Promise<void> {
    return this.request<void>(`/item-types/${itemTypeId}`, {
      method: 'DELETE',
    });
  }

  // --- Produtos ---
  async listProducts(params?: {
    item_type?: string;
    category_id?: number;
    search?: string;
    active_only?: boolean;
    catalog_only?: boolean;
  }): Promise<Product[]> {
    const query = new URLSearchParams();
    if (params?.item_type) query.append('item_type', params.item_type);
    if (params?.category_id) query.append('category_id', params.category_id.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.active_only !== undefined) query.append('active_only', params.active_only.toString());
    if (params?.catalog_only !== undefined) query.append('catalog_only', params.catalog_only.toString());

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

  async deleteProduct(id: number): Promise<void> {
    return this.request<void>(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Variações / Subprodutos (Estilo Shopee) ---
  async createVariation(productId: number, data: VariationFormData): Promise<ProductVariation> {
    return this.request<ProductVariation>(`/products/${productId}/variations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async linkExistingProductAsVariation(productId: number, childId: number, variationName?: string): Promise<Product> {
    return this.request<Product>(`/products/${productId}/link-variation`, {
      method: 'POST',
      body: JSON.stringify({ child_id: childId, variation_name: variationName }),
    });
  }

  async unlinkVariation(productId: number, variationId: number): Promise<void> {
    return this.request<void>(`/products/${productId}/variations/${variationId}`, {
      method: 'DELETE',
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

  async uploadProductImagesBatch(productId: number, files: File[]): Promise<ProductImage[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    return this.request<ProductImage[]>(`/products/${productId}/images/batch`, {
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
    color?: string | null;
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

  async deleteRecipe(recipeId: number): Promise<void> {
    return this.request<void>(`/production/recipes/${recipeId}`, {
      method: 'DELETE',
    });
  }

  async deleteProductionOrder(orderId: number): Promise<void> {
    return this.request<void>(`/production/orders/${orderId}`, {
      method: 'DELETE',
    });
  }

  // --- Clientes & CRM ---
  async listCustomers(params?: {
    search?: string;
    origin_channel?: string;
    tag?: string;
    active_only?: boolean;
    order_by?: string;
  } | string): Promise<Customer[]> {
    const qp = new URLSearchParams();
    if (typeof params === 'string') {
      if (params) qp.append('search', params);
    } else if (params) {
      if (params.search) qp.append('search', params.search);
      if (params.origin_channel) qp.append('origin_channel', params.origin_channel);
      if (params.tag) qp.append('tag', params.tag);
      if (params.active_only) qp.append('active_only', 'true');
      if (params.order_by) qp.append('order_by', params.order_by);
    }
    const qs = qp.toString();
    return this.request<Customer[]>(`/customers${qs ? `?${qs}` : ''}`);
  }

  async getCustomerStats(): Promise<CustomerStats> {
    return this.request<CustomerStats>('/customers/stats');
  }

  async getCustomer(customerId: number): Promise<CustomerDetail> {
    return this.request<CustomerDetail>(`/customers/${customerId}`);
  }

  async createCustomer(data: CustomerFormData): Promise<Customer> {
    return this.request<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(customerId: number, data: Partial<CustomerFormData>): Promise<Customer> {
    return this.request<Customer>(`/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // --- Vendas ---

  async listSales(params?: {
    start_date?: string;
    end_date?: string;
    status?: string;
    customer_id?: number;
    search?: string;
    skip?: number;
    limit?: number;
  }): Promise<Sale[]> {
    const qp = new URLSearchParams();
    if (params?.start_date) qp.append('start_date', params.start_date);
    if (params?.end_date) qp.append('end_date', params.end_date);
    if (params?.status) qp.append('status', params.status);
    if (params?.customer_id) qp.append('customer_id', String(params.customer_id));
    if (params?.search) qp.append('search', params.search);
    if (params?.skip !== undefined) qp.append('skip', String(params.skip));
    if (params?.limit !== undefined) qp.append('limit', String(params.limit));
    const qs = qp.toString();
    return this.request<Sale[]>(`/sales${qs ? `?${qs}` : ''}`);
  }

  async createDraftSale(data: {
    customer_id?: number | null;
    payment_method?: string | null;
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

  async deleteSale(saleId: number): Promise<void> {
    return this.request<void>(`/sales/${saleId}`, {
      method: 'DELETE',
    });
  }

  async deleteCustomer(customerId: number): Promise<void> {
    return this.request<void>(`/customers/${customerId}`, {
      method: 'DELETE',
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

  // --- Módulo Financeiro & DRE ---
  async getFinancialSummary(params?: { start_date?: string; end_date?: string }): Promise<FinancialSummary> {
    const query = new URLSearchParams();
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<FinancialSummary>(`/financial/summary${qs}`);
  }

  async getFinancialCategories(type?: FinancialType): Promise<FinancialCategory[]> {
    const qs = type ? `?type=${type}` : '';
    return this.request<FinancialCategory[]>(`/financial/categories${qs}`);
  }

  async createFinancialCategory(data: Partial<FinancialCategory>): Promise<FinancialCategory> {
    return this.request<FinancialCategory>('/financial/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFinancialCategory(id: number, data: Partial<FinancialCategory>): Promise<FinancialCategory> {
    return this.request<FinancialCategory>(`/financial/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getFinancialTransactions(params?: {
    type?: FinancialType;
    status?: FinancialStatus;
    category_id?: number;
    start_date?: string;
    end_date?: string;
    search?: string;
    skip?: number;
    limit?: number;
  }): Promise<FinancialTransaction[]> {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.status) query.append('status', params.status);
    if (params?.category_id) query.append('category_id', String(params.category_id));
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);
    if (params?.search) query.append('search', params.search);
    if (params?.skip !== undefined) query.append('skip', String(params.skip));
    if (params?.limit !== undefined) query.append('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<FinancialTransaction[]>(`/financial/transactions${qs}`);
  }

  async createFinancialTransaction(data: Partial<FinancialTransaction>): Promise<FinancialTransaction> {
    return this.request<FinancialTransaction>('/financial/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFinancialTransaction(id: number, data: Partial<FinancialTransaction>): Promise<FinancialTransaction> {
    return this.request<FinancialTransaction>(`/financial/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async toggleFinancialTransactionStatus(
    id: number,
    status: FinancialStatus,
    paymentDate?: string
  ): Promise<FinancialTransaction> {
    const query = new URLSearchParams();
    query.append('status', status);
    if (paymentDate) query.append('payment_date', paymentDate);
    return this.request<FinancialTransaction>(`/financial/transactions/${id}/status?${query.toString()}`, {
      method: 'PATCH',
    });
  }

  async deleteFinancialTransaction(id: number): Promise<void> {
    return this.request<void>(`/financial/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Sistema, Configurações, Backup, Import/Export e Manutenção ---
  private async downloadFile(endpoint: string, fallbackFilename: string): Promise<void> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      let errorMessage = `Erro ao baixar arquivo (HTTP ${response.status})`;
      try {
        const errorJson = await response.json();
        if (errorJson.detail) errorMessage = errorJson.detail;
      } catch {}
      throw new Error(errorMessage);
    }

    let filename = fallbackFilename;
    const contentDisposition = response.headers.get('Content-Disposition') || '';
    const match = contentDisposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  async getSettings(): Promise<SystemSettings> {
    return this.request<SystemSettings>('/system/settings');
  }

  async updateSetting(key: string, value: any, description?: string): Promise<{ key: string; updated_at: string }> {
    return this.request<{ key: string; updated_at: string }>(`/system/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value, description }),
    });
  }

  async uploadLogo(file: File): Promise<{ logo_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<{ logo_url: string }>('/system/settings/logo', {
      method: 'POST',
      body: formData,
    });
  }

  async exportBackup(): Promise<void> {
    return this.downloadFile('/system/backup', 'backup_casaluma.zip');
  }

  async restoreBackup(file: File, confirmationKeyword: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('confirmation_keyword', confirmationKeyword);
    return this.request<any>('/system/restore', {
      method: 'POST',
      body: formData,
    });
  }

  async exportResource(
    resource: 'products' | 'customers' | 'sales' | 'stock',
    format: 'xlsx' | 'csv' = 'xlsx'
  ): Promise<void> {
    return this.downloadFile(
      `/system/export/${resource}?format=${format}`,
      `export_${resource}.${format}`
    );
  }

  async downloadTemplate(
    resource: 'products' | 'customers',
    format: 'xlsx' | 'csv' = 'xlsx'
  ): Promise<void> {
    return this.downloadFile(
      `/system/templates/${resource}?format=${format}`,
      `modelo_${resource}.${format}`
    );
  }

  async importResource(
    resource: 'products' | 'customers',
    file: File
  ): Promise<{ success: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<{ success: number; errors: string[] }>(`/system/import/${resource}`, {
      method: 'POST',
      body: formData,
    });
  }

  async cleanOrphanedImages(): Promise<{
    success: boolean;
    removed_count: number;
    freed_bytes: number;
    freed_formatted: string;
  }> {
    return this.request<any>('/system/maintenance/clean-orphaned-images', {
      method: 'POST',
    });
  }

  async optimizeDatabase(): Promise<{
    success: boolean;
    details: Array<{ table: string; status: string }>;
  }> {
    return this.request<any>('/system/maintenance/optimize-database', {
      method: 'POST',
    });
  }

  async resetDemoData(password: string): Promise<{ success: boolean; message: string }> {
    return this.request<any>('/system/maintenance/reset-demo-data', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  async getSystemStatus(): Promise<SystemStatus> {
    return this.request<SystemStatus>('/system/status');
  }
}


export const api = new ApiClient();
