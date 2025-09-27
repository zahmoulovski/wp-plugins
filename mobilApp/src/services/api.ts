import { Product, Category, Customer, Order, BlogPost } from '../types'
import { cacheService } from './cache';
import { initKonnectPayment, verifyKonnectPayment } from './konnectGateway';

const BASE_URL = 'https://klarrion.com/wp-json/wc/v3';
const STORE_API_URL = 'https://klarrion.com/wp-json/wc/store';
const auth = btoa(`${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY}:${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET}`);

// Define a constant for the global shipping zone ID
const GLOBAL_SHIPPING_ZONE_ID = 3;

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

async function storeApiRequest(endpoint: string, options: RequestInit = {}, cartToken?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (cartToken) {
    headers['X-WC-Store-API-Nonce'] = cartToken;
  }

  const response = await fetch(`${STORE_API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Important for session handling
  });

  if (!response.ok) {
    let errorMessage = `Store API request failed: ${response.status} ${response.statusText}`;
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
      per_page: params.per_page || 500,
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
      
      // Create customer directly through WooCommerce API
      const customerResponse = await apiRequest('/customers', {
        method: 'POST',
        body: JSON.stringify(customerData),
      });

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
    return true;
  },

  async createOrder(orderData: any): Promise<Order> {
    return apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  async updateOrder(id: number, data: any): Promise<Order> {
    return apiRequest(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  async getAllOrdersForCustomer(customerId: number): Promise<Order[]> {
    try {
      let allOrders: Order[] = [];
      let page = 1;
      const perPage = 100; // Fetch 100 orders per page for efficiency
      
      // Keep fetching until we get all orders
      while (true) {
        const params = new URLSearchParams();
        params.append('customer', customerId.toString());
        params.append('page', page.toString());
        params.append('per_page', perPage.toString());
        const query = params.toString() ? `?${params.toString()}` : '';
        
        const orders = await apiRequest(`/orders${query}`);
        
        if (orders.length === 0) {
          break; // No more orders
        }
        
        allOrders = [...allOrders, ...orders];
        
        if (orders.length < perPage) {
          break; // Last page with fewer items
        }
        
        page++;
      }
      
      // Sort orders by date (newest first)
      return allOrders.sort((a, b) => 
        new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
      );
    } catch (error) {
      console.error('Error in getAllOrdersForCustomer:', error);
      
      // Fallback to email-based filtering if customer ID fails
      if (error.message?.includes('403') || error.message?.includes('401')) {
        try {
          const customer = await this.getCustomer(customerId);
          if (customer && customer.email) {
            let allOrders: Order[] = [];
            let page = 1;
            const perPage = 100;
            
            while (true) {
              const params = new URLSearchParams();
              params.append('per_page', perPage.toString());
              params.append('page', page.toString());
              const query = params.toString() ? `?${params.toString()}` : '';
              
              const orders = await apiRequest(`/orders${query}`);
              const customerOrders = orders.filter((order: Order) => 
                order.billing && order.billing.email === customer.email
              );
              
              if (customerOrders.length === 0 && page > 1) {
                break; // No more orders for this customer
              }
              
              allOrders = [...allOrders, ...customerOrders];
              
              if (orders.length < perPage) {
                break; // Last page
              }
              
              page++;
            }
            
            return allOrders.sort((a, b) => 
              new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
            );
          }
        } catch (altError) {
          console.error('Alternative order fetching failed:', altError);
        }
      }
      
      throw error;
    }
  },

  async getOrders(customerId?: number, page: number = 1, per_page: number = 15): Promise<Order[]> {
    try {
      const params = new URLSearchParams();
      if (customerId) params.append('customer', customerId.toString());
      params.append('page', page.toString());
      params.append('per_page', per_page.toString());
      const query = params.toString() ? `?${params.toString()}` : '';
      const orders = await apiRequest(`/orders${query}`);
      return orders;
    } catch (error) {
      console.error('Error in getOrders:', error);
      
      if (error.message?.includes('404') || error.message?.includes('No orders found')) {
        return [];
      }
      
      if (error.message?.includes('403') || error.message?.includes('401')) {
        try {
          if (customerId) {
            const customer = await this.getCustomer(customerId);
            if (customer && customer.email) {
              const params = new URLSearchParams();
              params.append('per_page', per_page.toString());
              params.append('page', page.toString());
              const query = params.toString() ? `?${params.toString()}` : '';
              const allOrders = await apiRequest(`/orders${query}`);
              const customerOrders = allOrders.filter((order: Order) => 
                order.billing && order.billing.email === customer.email
              );
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
    return zones;
  },

  async getShippingZoneMethods(zoneId: number): Promise<any[]> {
    return apiRequest(`/shipping/zones/${zoneId}/methods`);
  },

  async getShippingMethodInstance(zoneId: number, instanceId: number): Promise<any> {
    return apiRequest(`/shipping/zones/${zoneId}/methods/${instanceId}`);
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

  // ---------- Konnect ----------
  initKonnectPayment,
  verifyKonnectPayment,

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