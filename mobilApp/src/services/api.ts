import { Product, Category, Customer, Order } from '../types';

const BASE_URL = 'https://klarrion.com/wp-json/wc/v3';
const CONSUMER_KEY = 'ck_dfe0100c9d01f160659ad10ce926673b08030068';
const CONSUMER_SECRET = 'cs_39958925e281230d5078b21e722451225056d4ea';

const auth = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);

// ---- Konnect configuration ----
// ⚠️  For production move these to server-side env vars!
export const KONNECT_API_KEY   = '67330b734846127416a9420d:k4pEgWFVWjP39GHw4dXBaO';
export const KONNECT_WALLET_ID = '67330b734846127416a94223';

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
  // ---------- WooCommerce ----------
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

  async getPaymentMethods(): Promise<any[]> {
    return apiRequest('/payment_gateways');
  },

  async getShippingMethods(): Promise<any[]> {
    return apiRequest('/shipping_methods');
  },

  // ---------- Konnect ----------
  /**
   * Create a Konnect payment session and return { payUrl, paymentRef }.
   * amountTnd = total amount in TND (not millimes).
   */
  async initKonnectPayment(
    orderId: number,
    amountTnd: number,
    customer: { firstName: string; lastName: string; email: string; phone: string }
  ): Promise<{ payUrl: string; paymentRef: string }> {
    const amountMilli = Math.round(amountTnd * 1000); // Konnect uses millimes

    const body = {
      receiverWalletId: KONNECT_WALLET_ID,
      token: 'TND',
      amount: amountMilli,
      type: 'immediate',
      description: `Order #${orderId}`,
      acceptedPaymentMethods: ['wallet', 'bank_card', 'e-DINAR'],
      lifespan: 30,
      checkoutForm: true,
      addPaymentFeesToAmount: false,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phoneNumber: customer.phone,
      email: customer.email,
      orderId: String(orderId),
      webhook: 'http://localhost:5173/api/notification_payment',
      theme: 'light',
    };

    const res = await fetch('https://api.konnect.network/payments/init-payment', {
      method: 'POST',
      headers: {
        'x-api-key': KONNECT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Konnect init-payment failed: ${res.status}`);
    }
    return res.json();
  },
};
