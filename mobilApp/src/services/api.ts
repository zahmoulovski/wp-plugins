import { Product, Category, Customer, Order } from '../types';
import { cacheService } from './cache';

const BASE_URL = 'https://klarrion.com/wp-json/wc/v3';
const CONSUMER_KEY = 'ck_dfe0100c9d01f160659ad10ce926673b08030068';
const CONSUMER_SECRET = 'cs_39958925e281230d5078b21e722451225056d4ea';

const auth = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);

// ---- Flouci configuration ----
// ⚠️ For production move these to server-side env vars!
export const FLOUCI_PUBLIC_KEY = '40f9dd4f-d834-4742-800d-4db524a24836'; // Replace with your actual key
export const FLOUCI_PRIVATE_KEY = 'b9390a7a-fc0c-4004-a4fe-7e6be0044a83'; // Replace with your actual key
const FLOUCI_BASE_URL = 'https://developers.flouci.com/api/v2';

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
    let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch (e) {
      // If we can't parse the error response, use the default message
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

export const api = {
  // ---------- WooCommerce ----------
  async getProducts(params: Record<string, string | number> = {}): Promise<Product[]> {
    // Check cache first
    const cachedProducts = cacheService.getProducts(params);
    if (cachedProducts) {
      return cachedProducts;
    }

    // Increase limit for better randomization (WooCommerce doesn't support orderby=rand by default)
    const enhancedParams = {
      ...params,
      per_page: params.per_page || 500,   // Increase from 20 to 50 for more variety
      order: params.order || 'desc'
    };

    const queryParams = new URLSearchParams(enhancedParams as Record<string, string>).toString();
    const products = await apiRequest(`/products?${queryParams}`);
    
    // Cache the results
    cacheService.setProducts(products, params);
    return products;
  },

  async getProduct(id: number): Promise<Product> {
    // Check cache first
    const cachedProduct = cacheService.getProduct(id);
    if (cachedProduct) {
      return cachedProduct;
    }

    const product = await apiRequest(`/products/${id}`);
    
    // Cache the result
    cacheService.setProduct(product);
    return product;
  },

  async searchProducts(query: string): Promise<Product[]> {
    const searchResults = await apiRequest(`/products?search=${encodeURIComponent(query)}`);
    if (searchResults.length === 0) {
      return apiRequest(`/products?sku=${encodeURIComponent(query)}`);
    }
    return searchResults;
  },

  async searchCustomers(query: string): Promise<Customer[]> {
    // First, try the standard WooCommerce customer search
    const searchResults = await apiRequest(`/customers?search=${encodeURIComponent(query)}`);
    if (searchResults.length > 0) {
      return searchResults;
    }

    // If no results, try searching by email specifically
    try {
      const emailResults = await apiRequest(`/customers?email=${encodeURIComponent(query)}`);
      if (emailResults.length > 0) {
        return emailResults;
      }
    } catch (error) {
      console.error('Error searching customers by email:', error);
    }

    // If still no results, try searching by username specifically
    try {
      // Get all customers and filter by username
      const allCustomers = await apiRequest(`/customers?per_page=100`);
      const usernameMatches = allCustomers.filter((customer: Customer) => 
        customer.username?.toLowerCase() === query.toLowerCase()
      );
      if (usernameMatches.length > 0) {
        return usernameMatches;
      }
    } catch (error) {
      console.error('Error searching customers by username:', error);
    }

    // If still no results, check if the query might be "admin" and try common admin patterns
    if (query.toLowerCase() === 'admin' || query.toLowerCase().includes('admin')) {
      try {
        // Try to get customer with ID 1 (often the admin)
        const adminCustomer = await apiRequest(`/customers/1`);
        if (adminCustomer && (
          adminCustomer.username?.toLowerCase().includes('admin') ||
          adminCustomer.email?.toLowerCase().includes('admin') ||
          adminCustomer.first_name?.toLowerCase().includes('admin') ||
          adminCustomer.last_name?.toLowerCase().includes('admin')
        )) {
          return [adminCustomer];
        }
      } catch (error) {
        console.error('Error checking admin customer:', error);
      }
    }

    return [];
  },

  async getCategories(): Promise<Category[]> {
    // Check cache first
    const cachedCategories = cacheService.getCategories();
    if (cachedCategories) {
      return cachedCategories;
    }

    // Increase per_page to get more categories and handle pagination
    let allCategories: Category[] = [];
    let page = 1;
    const perPage = 100;
    
    while (true) {
      const categories = await apiRequest(`/products/categories?per_page=${perPage}&page=${page}`);
      allCategories = allCategories.concat(categories);
      
      // If we got fewer than perPage items, we've reached the end
      if (categories.length < perPage) {
        break;
      }
      
      page++;
      
      // Safety check to prevent infinite loops
      if (page > 10) {
        break;
      }
    }
    
    // Cache the results
    cacheService.setCategories(allCategories);
    return allCategories;
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

  async uploadProfilePicture(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', 'Profile Picture');
    
    // Upload to WordPress media endpoint
    const response = await fetch('https://klarrion.com/wp-json/wp/v2/media', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        // WordPress expects the file in FormData format, not JSON
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Profile picture upload failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.source_url; // Return the URL of the uploaded image
  },

  async updateCustomerPassword(customerId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      // WordPress/WooCommerce password update typically requires the current password
      const response = await fetch(`https://klarrion.com/wp-json/wp/v2/users/${customerId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: newPassword,
          current_password: currentPassword // Some WordPress setups require this
        }),
      });

      if (!response.ok) {
        throw new Error(`Password update failed: ${response.status} ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Password update error:', error);
      throw error;
    }
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
    return apiRequest(`/orders/${id}?_embed`);
  },

  async getPaymentMethods(): Promise<any[]> {
    return apiRequest('/payment_gateways');
  },

  async getShippingZones(): Promise<any[]> {
    return apiRequest('/shipping/zones');
  },

  async getShippingZoneMethods(zoneId: number): Promise<any[]> {
    return apiRequest(`/shipping/zones/${zoneId}/methods`);
  },

  async getAllShippingMethods(): Promise<any[]> {
    try {
      // Get all shipping zones
      const zones = await this.getShippingZones();
      const allMethods: any[] = [];
      
      // Get methods for each zone
      for (const zone of zones) {
        try {
          const methods = await this.getShippingZoneMethods(zone.id);
          const enabledMethods = methods.filter(method => method.enabled);
          
          // Format methods for frontend use
          enabledMethods.forEach(method => {
            let cost = '0.00';
            if (method.settings && method.settings.cost) {
              cost = method.settings.cost.value || '0.00';
            } else if (method.settings && method.settings.min_amount) {
              cost = '0.00'; // Free shipping
            }
            
            allMethods.push({
              id: `${method.method_id}:${method.instance_id}`,
              title: method.title,
              cost: cost,
              method_id: method.method_id,
              zone_id: zone.id,
              zone_name: zone.name
            });
          });
        } catch (error) {
          console.error(`Error fetching methods for zone ${zone.id}:`, error);
        }
      }
      
      // Also get global methods (zone 0)
      try {
        const globalMethods = await this.getShippingZoneMethods(0);
        const enabledGlobalMethods = globalMethods.filter(method => method.enabled);
        
        enabledGlobalMethods.forEach(method => {
          let cost = '0.00';
          if (method.settings && method.settings.cost) {
            cost = method.settings.cost.value || '0.00';
          } else if (method.settings && method.settings.min_amount) {
            cost = '0.00'; // Free shipping
          }
          
          allMethods.push({
            id: `${method.method_id}:${method.instance_id}`,
            title: method.title,
            cost: cost,
            method_id: method.method_id,
            zone_id: 0,
            zone_name: 'Global'
          });
        });
      } catch (error) {
        console.error('Error fetching global shipping methods:', error);
      }
      
      return allMethods;
    } catch (error) {
      console.error('Error fetching all shipping methods:', error);
      throw error;
    }
  },

  async calculateShipping(cartItems: any[], shippingAddress: any): Promise<any> {
    const body = {
      line_items: cartItems.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
      })),
      shipping: shippingAddress,
    };
    
    return apiRequest('/shipping/calculate', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // Update order meta data (for storing payment information)
  async updateOrderMeta(orderId: number, metaData: Record<string, any>): Promise<Order> {
    const metaArray = Object.entries(metaData).map(([key, value]) => ({
      key,
      value: String(value)
    }));

    return apiRequest(`/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({
        meta_data: metaArray
      }),
    });
  },

  // ---------- Flouci ----------
  /**
   * Create a Flouci payment session and return { payUrl, payment_id }.
   * amountTnd = total amount in TND, will be converted to millimes internally.
   */
  async initFlouciPayment(
    orderId: number,
    amountInMillimes: number, // Already converted to millimes in CheckoutPage
    customer: { firstName: string; lastName: string; email: string; phone: string }
  ): Promise<{ payUrl: string; payment_id: string }> {
    
    const currentDomain = window.location.origin;
    
    const body = {
      amount: amountInMillimes, // Amount in millimes (already converted)
      success_link: `${currentDomain}/payment-success?order_id=${orderId}`,
      fail_link: `${currentDomain}/payment-failed?order_id=${orderId}`,
      webhook: `https://klarrion.com/wp-json/flouci/v1/webhook`, // Your WordPress webhook endpoint
      developer_tracking_id: `order_${orderId}`
    };

    const response = await fetch(`${FLOUCI_BASE_URL}/generate_payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FLOUCI_PUBLIC_KEY}:${FLOUCI_PRIVATE_KEY}`
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`Flouci payment initialization failed: ${response.status} ${errorData?.result?.message || response.statusText}`);
    }

    const data = await response.json();
    
    return {
      payUrl: data.result.link,
      payment_id: data.result.payment_id
    };
  },

  /**
   * Verify Flouci payment status (optional - for manual verification)
   */
  async verifyFlouciPayment(paymentId: string): Promise<any> {
    const response = await fetch(`${FLOUCI_BASE_URL}/verify/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FLOUCI_PUBLIC_KEY}:${FLOUCI_PRIVATE_KEY}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`Flouci payment verification failed: ${response.status} ${errorData?.result?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.result;
  },
};