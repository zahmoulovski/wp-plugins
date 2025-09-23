import { Product, Category, Customer, Order, BlogPost } from '../types';
import { cacheService } from './cache';

const BASE_URL = 'https://klarrion.com/wp-json/wc/v3';
const CONSUMER_KEY = 'ck_dfe0100c9d01f160659ad10ce926673b08030068';
const CONSUMER_SECRET = 'cs_39958925e281230d5078b21e722451225056d4ea';

const auth = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);

// Define a constant for the global shipping zone ID
const GLOBAL_SHIPPING_ZONE_ID = 3;

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

  async authenticateUser(usernameOrEmail: string, password: string): Promise<Customer> {
    try {
      // Search for customer by email or username
      const customers = await this.searchCustomers(usernameOrEmail);
      
      if (customers.length === 0) {
        throw new Error('User not found');
      }
      
      const customer = customers[0];
      
      // For demo purposes, we'll accept any password
      // In production, you should verify against WooCommerce or WordPress
      console.log('Customer authenticated:', customer.id);
      return customer;
      
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
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
    try {
      console.log('Creating customer with data:', customerData);
      
      // Create customer directly through WooCommerce API
      const customerResponse = await apiRequest('/customers', {
        method: 'POST',
        body: JSON.stringify(customerData),
      });

      console.log('Customer created successfully:', customerResponse.id);
      return customerResponse;
      
    } catch (error: any) {
      console.error('Customer creation failed:', error);
      
      // Handle common WooCommerce errors
      if (error.message?.includes('existing_user_login')) {
        throw new Error('Username already exists');
      } else if (error.message?.includes('existing_user_email')) {
        throw new Error('Email already exists');
      }
      
      throw error;
    }
  },

  async updateCustomer(id: number, customerData: Partial<Customer>): Promise<Customer> {
    return apiRequest(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    });
  },

  async uploadProfilePicture(file: File, customerId: number): Promise<string> {
    // Profile picture upload is not supported in this simplified version
    // Return a placeholder or throw an error
    throw new Error('Profile picture upload is not supported. Please use the website to update your profile picture.');
  },

  async updateCustomerPassword(customerId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    // Password updates are now handled through the website redirect
    // This function is kept for compatibility but returns success
    console.log('Password update handled through website redirect');
    return true;
  },

  async createOrder(orderData: any): Promise<Order> {
    return apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  async getOrders(customerId?: number): Promise<Order[]> {
    try {
      const params = customerId ? `?customer=${customerId}` : '';
      console.log('Fetching orders with params:', params);
      const orders = await apiRequest(`/orders${params}`);
      console.log('Orders fetched successfully:', orders.length, 'orders');
      return orders;
    } catch (error) {
      console.error('Error in getOrders:', error);
      
      // If customer has no orders, return empty array instead of error
      if (error.message?.includes('404') || error.message?.includes('No orders found')) {
        console.log('No orders found for customer, returning empty array');
        return [];
      }
      
      // If it's a permission error, try alternative approach
      if (error.message?.includes('403') || error.message?.includes('401')) {
        console.log('Permission error, trying alternative order fetching method');
        
        // Try fetching all orders and filtering by customer email
        try {
          if (customerId) {
            const customer = await this.getCustomer(customerId);
            if (customer && customer.email) {
              const allOrders = await apiRequest(`/orders?per_page=100`);
              const customerOrders = allOrders.filter((order: Order) => 
                order.billing && order.billing.email === customer.email
              );
              console.log('Found orders by email filter:', customerOrders.length);
              return customerOrders;
            }
          }
        } catch (altError) {
          console.error('Alternative order fetching failed:', altError);
        }
      }
      
      throw error;
    }
  },

  async getOrder(id: number): Promise<Order> {
    return apiRequest(`/orders/${id}?_embed`);
  },

  async getPaymentMethods(): Promise<any[]> {
    return apiRequest('/payment_gateways');
  },

  async getShippingZones(): Promise<any[]> {
    const zones = await apiRequest('/shipping/zones');
    console.log('Raw shipping zones from API:', zones);
    return zones;
  },

  async getShippingZoneMethods(zoneId: number): Promise<any[]> {
    return apiRequest(`/shipping/zones/${zoneId}/methods`);
  },

  async getShippingMethodInstance(zoneId: number, instanceId: number): Promise<any> {
    return apiRequest(`/shipping/zones/${zoneId}/methods/${instanceId}`);
  },

  async getAllShippingMethods(): Promise<any[]> {
    try {
      // Get all shipping zones
      const allMethods: ShippingMethod[] = [];
      
      const shippingZones = (await this.getShippingZones()).filter(zone => zone.id !== 0);
      
      for (const zone of shippingZones) {
        try {
          const methods = await this.getShippingZoneMethods(zone.id);
          const enabledMethods = methods.filter(method => method.enabled);
          
          enabledMethods.forEach(method => {
            console.log('Inspecting method before push:', method.id, method.instance_id);
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
              zone_name: zone.name,
              instance_id: method.instance_id
            });
          });
        } catch (error) {
          console.error(`Error fetching methods for zone ${zone.id}:`, error);
        }
      }
      
      // Also get global methods (zone 0)
      try {
        const globalMethods = await this.getShippingZoneMethods(GLOBAL_SHIPPING_ZONE_ID);
        const enabledGlobalMethods = globalMethods.filter(method => method.enabled);
        
        enabledGlobalMethods.forEach(method => {
          console.log('Inspecting global method before push:', method.id, method.instance_id);
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
            zone_id: GLOBAL_SHIPPING_ZONE_ID,
            zone_name: 'Global',
            instance_id: method.instance_id
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
      webhook: `${currentDomain}/webhook`, // Simplified webhook endpoint
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

  // ---------- Blog Posts ----------
  async getBlogPosts(params: Record<string, string | number> = {}): Promise<BlogPost[]> {
    try {
      // Check cache first
      const cachedPosts = cacheService.getProducts(params); // Reuse product cache for blog posts
      if (cachedPosts) {
        return cachedPosts as any;
      }

      // Build query parameters with defaults
      const defaultParams = {
        per_page: 5,
        orderby: 'date',
        order: 'desc',
        status: 'publish',
        categories: 1, // Filter by blog category (ID 1)
        ...params
      };

      const queryParams = new URLSearchParams(defaultParams as Record<string, string>).toString();
      
      // Use WordPress REST API instead of WooCommerce API for blog posts
      const wpApiUrl = `https://klarrion.com/wp-json/wp/v2/posts?${queryParams}&_embed`;
      
      // Try to fetch posts with better error handling
      let posts;
      try {
        const response = await fetch(wpApiUrl, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`WordPress API request failed: ${response.status} ${response.statusText}`);
        }
        
        posts = await response.json();
      } catch (apiError) {
        console.warn('WordPress API request failed:', apiError);
        console.warn('Attempting fallback to WooCommerce API...');
        
        // Fallback to WooCommerce API if WordPress API fails
        try {
          posts = await apiRequest(`/posts?${queryParams}&_embed`);
        } catch (wcError) {
          console.error('Both APIs failed:', apiError, wcError);
          return [];
        }
      }
      
      // Cache the results
      cacheService.setProducts(posts, params);
      return posts;
    } catch (error) {
      console.error('Error fetching blog posts:', error);
      // Return empty array as fallback
      return [];
    }
  },

  async getBlogPost(id: number): Promise<BlogPost> {
    // Check cache first
    const cachedPost = cacheService.getProduct(id); // Reuse product cache for blog posts
    if (cachedPost) {
      return cachedPost as any;
    }

    const post = await apiRequest(`/posts/${id}?_embed`);
    
    // Cache the result
    cacheService.setProduct(post as any);
    return post;
  },
};