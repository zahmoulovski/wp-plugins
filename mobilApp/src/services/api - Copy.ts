import { Product, Category, Customer, Order } from '../types';

const BASE_URL = 'https://klarrion.com/wp-json/wc/v3';
const CONSUMER_KEY = 'ck_dfe0100c9d01f160659ad10ce926673b08030068';
const CONSUMER_SECRET = 'cs_39958925e281230d5078b21e722451225056d4ea';

const auth = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  // Products
  async getProducts(params: Record<string, string | number> = {}): Promise<Product[]> {
    const queryParams = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest(`/products?${queryParams}`);
  },

  async getProduct(id: number): Promise<Product> {
    return apiRequest(`/products/${id}`);
  },

  async searchProducts(query: string): Promise<Product[]> {
    const searchResults = await apiRequest(`/products?search=${encodeURIComponent(query)}`);
    if (searchResults.length === 0) {
      return apiRequest(`/products?sku=${encodeURIComponent(query)}`);
    }
    return searchResults;
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    return apiRequest('/products/categories?per_page=100');
  },

  async getCategory(id: number): Promise<Category> {
    return apiRequest(`/products/categories/${id}`);
  },

  async getProductsByCategory(
    categoryId: number,
    params: Record<string, string | number> = {}
  ): Promise<Product[]> {
    const queryParams = new URLSearchParams({
      category: categoryId.toString(),
      ...params,
    } as Record<string, string>).toString();
    return apiRequest(`/products?${queryParams}`);
  },

  // Customers
  async getCustomer(id: number): Promise<Customer> {
    return apiRequest(`/customers/${id}`);
  },

  async createCustomer(customerData: Partial<Customer>): Promise<Customer> {
    return apiRequest('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  },

  async updateCustomer(id: number, customerData: Partial<Customer>): Promise<Customer> {
    return apiRequest(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    });
  },

  // Orders
  async createOrder(orderData: any): Promise<Order> {
    return apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  async getOrders(customerId?: number): Promise<Order[]> {
    const params = customerId ? `?customer=${customerId}` : '';
    return apiRequest(`/orders${params}`);
  },

  async getOrder(id: number): Promise<Order> {
    return apiRequest(`/orders/${id}`);
  },

  // Payment methods
  async getPaymentMethods(): Promise<any[]> {
    return apiRequest('/payment_gateways');
  },

  // Shipping methods
  async getShippingMethods(): Promise<any[]> {
    return apiRequest('/shipping_methods');
  },
};
