import { Product, Category, Customer, Order, BlogPost, PortfolioItem, PortfolioCategory, APIInterface } from '../types'
import { cacheService } from './cache';
import { initKonnectPayment, verifyKonnectPayment } from './konnectGateway';

// Use relative paths for development (proxy) and full URLs for production
const isDevelopment = import.meta.env.DEV;
const BASE_URL = isDevelopment ? '/wp-json/wc/v3' : `${import.meta.env.VITE_WORDPRESS_URL || 'https://klarrion.com'}/wp-json/wc/v3`;
const STORE_API_URL = isDevelopment ? '/wp-json/wc/store' : `${import.meta.env.VITE_WORDPRESS_URL || 'https://klarrion.com'}/wp-json/wc/store`;
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

export const api: APIInterface = {
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

  async getBestSellers(params: Record<string, string | number> = {}): Promise<Product[]> {
    // Check cache first
    const cacheKey = { ...params, best_sellers: true };
    const cachedProducts = cacheService.getProducts(cacheKey);
    if (cachedProducts) {
      return cachedProducts;
    }

    // Set up parameters for best sellers (ordered by popularity/sales)
    const enhancedParams = {
      ...params,
      orderby: 'popularity',
      order: 'desc',
      per_page: params.per_page || 8,
      status: 'publish'
    };

    const queryParams = new URLSearchParams(enhancedParams as Record<string, string>).toString();
    const products = await apiRequest(`/products?${queryParams}`);
    
    // Cache the results
    cacheService.setProducts(products, cacheKey);
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

  async authenticateUser(email: string, password: string): Promise<Customer> {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }

      // Try to use the custom WordPress authentication endpoint first
      try {
        const wpBaseUrl = isDevelopment ? '' : (import.meta.env.VITE_WORDPRESS_URL || 'https://klarrion.com');
        const response = await fetch(`${wpBaseUrl}/wp-json/mobile-app/v1/authenticate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            password: password
          })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          if (response.status === 401) {
            throw new Error('Invalid password');
          } else if (response.status === 404) {
            throw new Error('User not found');
          } else {
            throw new Error(data.message || 'Authentication failed');
          }
        }

        // Ensure avatar_url is included in the customer data
        if (data.customer && !data.customer.avatar_url) {
          try {
            const wpBaseUrl = import.meta.env.VITE_WORDPRESS_URL || 'https://klarrion.com';
            const avatarResponse = await fetch(`${wpBaseUrl}/wp-json/wp/v2/users/${data.customer.id}?_fields=avatar_urls`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (avatarResponse.ok) {
              const avatarData = await avatarResponse.json();
              if (avatarData.avatar_urls && avatarData.avatar_urls['96']) {
                data.customer.avatar_url = avatarData.avatar_urls['96'];
              }
            }
          } catch (avatarError) {
          }
        }

        // Convert the WordPress customer data to WooCommerce format
        const customer: Customer = {
          id: data.customer.id,
          email: data.customer.email,
          first_name: data.customer.first_name,
          last_name: data.customer.last_name,
          username: data.customer.username,
          billing: data.customer.billing,
          shipping: data.customer.shipping,
          is_paying_customer: data.customer.is_paying_customer,
          avatar_url: data.customer.avatar_url || '',
          date_created: '', // Will be populated by WooCommerce if needed
          date_modified: '', // Will be populated by WooCommerce if needed
        };

        return customer;
      } catch (endpointError) {
        // If the WordPress endpoint is not available, provide a helpful error message
        console.error('WordPress authentication endpoint not available:', endpointError);
        throw new Error('Authentication service unavailable. Please contact support to enable secure login.');
      }
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

  async getAttributeTerms(attributeSlug: string): Promise<Array<{id: number; name: string; slug: string; count: number}>> {
    try {
      let attributeId: number;
      
      // Hardcode known attribute IDs for better performance
      if (attributeSlug === 'pa_marques') {
        attributeId = 22; // Known ID for pa_marques
      } else {
        // For other attributes, find the ID dynamically
        const attributes = await apiRequest('/products/attributes?per_page=100');
        const attribute = attributes.find((attr: any) => attr.slug === attributeSlug);
        
        if (!attribute) {
          console.error(`Attribute ${attributeSlug} not found`);
          return [];
        }
        attributeId = attribute.id;
      }

      // Now get the terms for this attribute using its ID
      const terms = await apiRequest(`/products/attributes/${attributeId}/terms?per_page=100`);
      console.log(`Found ${terms.length} terms for attribute ${attributeSlug} (ID: ${attributeId})`);
      return terms;
    } catch (error) {
      console.error(`Failed to get attribute terms for ${attributeSlug}:`, error);
      return [];
    }
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
    try {
      // Try our custom endpoint first that includes avatar data
      const wpBaseUrl = isDevelopment ? '' : (import.meta.env.VITE_WORDPRESS_URL || 'https://klarrion.com');
      const response = await fetch(`${wpBaseUrl}/wp-json/mobile-app/v1/customer/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.customer) {
        return data.customer;
      } else {
        // Fallback to standard WooCommerce API if custom endpoint fails
      }
    } catch (error) {
      // Custom endpoint error, falling back to WooCommerce API
    }

    // Fallback to standard WooCommerce API and try to enhance with avatar data
    try {
      const customer = await apiRequest(`/customers/${id}`);
      
      // Try to get avatar from WordPress API
      try {
        const avatarResponse = await fetch(`${BASE_URL}/wp-json/wp/v2/users/${id}?_fields=avatar_urls`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (avatarResponse.ok) {
          const avatarData = await avatarResponse.json();
          if (avatarData.avatar_urls && avatarData.avatar_urls['96']) {
            customer.avatar_url = avatarData.avatar_urls['96'];
          }
        }
      } catch (avatarError) {
      }
      
      return customer;
    } catch (error) {
      console.error('Failed to fetch customer:', error);
      throw error;
    }
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

  async updatePassword(passwordData: { current_password: string; new_password: string; user_email?: string }): Promise<void> {
    try {
      // Get user email from localStorage if not provided
      let userEmail = passwordData.user_email;
      if (!userEmail) {
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsed = JSON.parse(userData);
          userEmail = parsed?.customer?.email || parsed?.email;
        }
      }
      
      if (!userEmail) {
        throw new Error('User email is required for password update');
      }
      
      // Validate password strength
      if (passwordData.new_password.length < 8) {
        throw new Error('New password must be at least 8 characters long');
      }
      
      // Check for password complexity
      if (!/[A-Za-z]/.test(passwordData.new_password) || !/[0-9]/.test(passwordData.new_password)) {
        throw new Error('New password must contain both letters and numbers');
      }
      
      // Use the custom WordPress password update endpoint
      const wpBaseUrl = isDevelopment ? '' : (import.meta.env.VITE_WORDPRESS_URL || 'https://klarrion.com');
      const response = await fetch(`${wpBaseUrl}/wp-json/mobile-app/v1/update-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
          user_email: userEmail
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Password update failed');
      }

      if (!data.success) {
        throw new Error(data.message || data.error || 'Password update failed');
      }
      
    } catch (error: any) {
      
      // Provide more detailed error messages
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error: Unable to connect to the server. Please check your internet connection.');
      } else if (error.message.includes('404')) {
        throw new Error('The password update endpoint is not available. Please contact support.');
      } else if (error.message.includes('403')) {
        throw new Error('Access denied. Please verify your current password.');
      } else {
        throw new Error(`Password update failed: ${error.message}`);
      }
    }
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

  // Test endpoint to verify WordPress plugin is working
  async testWordPressEndpoint(): Promise<boolean> {
    try {
      const wpBaseUrl = isDevelopment ? '' : (import.meta.env.VITE_WORDPRESS_URL || 'https://klarrion.com');
      const response = await fetch(`${wpBaseUrl}/wp-json/mobile-app/v1/test`);
      const data = await response.json();
      
      return data.success === true;
    } catch (error) {
      return false;
    }
  },

  // ---------- Konnect ----------
  initKonnectPayment,
  verifyKonnectPayment,

  // ---------- Blog Posts ----------
  async getBlogPosts(params: Record<string, string | number> = {}): Promise<BlogPost[]> {
    try {
      // Check cache first
      const cachedPosts = cacheService.getProducts(params); 
      if (cachedPosts) {
        return cachedPosts as any;
      }

      const defaultParams = {
        per_page: 5,
        orderby: 'date',
        order: 'desc',
        status: 'publish',
        categories: 1, 
        ...params
      };

      const queryParams = new URLSearchParams(defaultParams as Record<string, string>).toString();
      
      // Use WordPress REST API instead of WooCommerce API for blog posts
      const wpBaseUrl = import.meta.env.VITE_WORDPRESS_URL || 'https://klarrion.com';
      const wpApiUrl = `${wpBaseUrl}/wp-json/wp/v2/posts?${queryParams}&_embed`;
      
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
        try {
          posts = await apiRequest(`/posts?${queryParams}&_embed`);
        } catch (wcError) {
          return [];
        }
      }
      
      // Cache the results
      cacheService.setProducts(posts, params);
      return posts;
    } catch (error) {
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

  // Helper function to filter and sort products by stock status
  filterAndSortProductsByStock(products: Product[], options: {
    hideOutOfStock?: boolean;
    sortByStock?: boolean;
  } = {}): Product[] {
    let filteredProducts = [...products];

    // Hide out of stock products if requested
    if (options.hideOutOfStock) {
      filteredProducts = filteredProducts.filter(product => product.stock_status !== 'outofstock');
    }

    // Sort by stock status if requested (instock/backorder first, then outofstock)
    if (options.sortByStock) {
      filteredProducts.sort((a, b) => {
        // Priority: instock and onbackorder come first, then outofstock
        const aInStock = a.stock_status === 'instock' || a.stock_status === 'onbackorder';
        const bInStock = b.stock_status === 'instock' || b.stock_status === 'onbackorder';
        
        if (aInStock && !bInStock) return -1; // a comes first
        if (!aInStock && bInStock) return 1;  // b comes first
        
        // If both are in the same stock category, sort alphabetically by name
        return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
      });
    }

    return filteredProducts;
  },

  // ---------- Portfolio ----------
  getPortfolioItems: async (params: Record<string, string | number> = {}): Promise<PortfolioItem[]> => {
    try {
      const wpBaseUrl = import.meta.env.VITE_WORDPRESS_URL || 'https://klarrion.com';
      const queryParams = new URLSearchParams({
        per_page: params.per_page ? String(params.per_page) : '12',
        page: params.page ? String(params.page) : '1',
        orderby: params.orderby ? String(params.orderby) : 'date',
        order: params.order ? String(params.order) : 'desc',
        status: params.status ? String(params.status) : 'publish',
        ...params
      }).toString();
      
      // Add _embed parameter to get embedded categories
      const wpApiUrl = `${wpBaseUrl}/wp-json/wp/v2/portfolio?${queryParams}&_embed`;
      
      const response = await fetch(wpApiUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Portfolio API request failed: ${response.status} ${response.statusText}`);
      }
      
      const items = await response.json();
      
      // Transform the data to match our interface
      return items.map((item: any) => {
        // Extract categories from embedded data or fallback to direct fields
        const portfolioCategories = item._embedded?.['wp:term']?.[0] || item.portfolio_categories || [];
        const projectCategories = item._embedded?.['wp:term']?.[1] || item['project-cat'] || [];
        
        
        return {
          id: item.id,
          title: item.title,
          content: item.content,
          excerpt: item.excerpt,
          date: item.date,
          modified: item.modified,
          slug: item.slug,
          status: item.status,
          type: item.type,
          link: item.link,
          permalink: item.permalink,
          featured_media: item.featured_media,
          author: item.author,
          portfolio_categories: portfolioCategories,
          project_categories: projectCategories,
          featured_image_url: item.featured_image_url,
          custom_fields: item.custom_fields,
          _embedded: item._embedded
        };
      });
    } catch (error) {
      console.error('Error fetching portfolio items:', error);
      throw error; // Re-throw the error so the component can handle it
    }
  },

  getProjectCategories: async (): Promise<PortfolioCategory[]> => {
    try {
      const wpBaseUrl = import.meta.env.VITE_WORDPRESS_URL || 'https://klarrion.com';
      const wpApiUrl = `${wpBaseUrl}/wp-json/wp/v2/project-cat?per_page=100`;
      
      // Fetching project categories from API
      const response = await fetch(wpApiUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Project categories API request failed: ${response.status} ${response.statusText}`);
      }
      
      const categories = await response.json();
      
      // Transform the data to match our interface
      return categories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        count: cat.count,
        link: cat.link,
        image: cat.image,
        category_data: cat.category_data
      }));
    } catch (error) {
      console.error('Error fetching project categories:', error);
      throw error; // Re-throw the error so the component can handle it
    }
  },

  getPortfolioCategories: async (): Promise<PortfolioCategory[]> => {
    try {
      const wpBaseUrl = import.meta.env.VITE_WORDPRESS_URL || 'https://klarrion.com';
      const wpApiUrl = `${wpBaseUrl}/wp-json/wp/v2/portfolio_category?per_page=100`;
      
      // Fetching portfolio categories from API
      const response = await fetch(wpApiUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Portfolio categories API request failed: ${response.status} ${response.statusText}`);
      }
      
      const categories = await response.json();
      
      // Transform the data to match our interface
      return categories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        count: cat.count,
        link: cat.link,
        image: cat.image,
        category_data: cat.category_data
      }));
    } catch (error) {
      // Error fetching portfolio categories
      return [];
    }
  },

  getPortfolioItem: async (id: number): Promise<PortfolioItem | null> => {
    try {
      const wpBaseUrl = import.meta.env.VITE_WORDPRESS_URL || 'https://klarrion.com';
      const wpApiUrl = `${wpBaseUrl}/wp-json/wp/v2/portfolio/${id}?_embed`;
      
      // Fetching portfolio item from API
      const response = await fetch(wpApiUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Portfolio item API request failed: ${response.status} ${response.statusText}`);
      }
      
      const item = await response.json();
      
      // Transform the data to match our interface
      const portfolioCategories = item._embedded?.['wp:term']?.[0] || item.portfolio_categories || [];
      const projectCategories = item._embedded?.['wp:term']?.[1] || item['project-cat'] || [];
      
      return {
        id: item.id,
        title: item.title,
        content: item.content,
        excerpt: item.excerpt,
        date: item.date,
        modified: item.modified,
        slug: item.slug,
        status: item.status,
        type: item.type,
        link: item.link,
        permalink: item.permalink,
        featured_media: item.featured_media,
        author: item.author,
        portfolio_categories: portfolioCategories,
        project_categories: projectCategories,
        featured_image_url: item.featured_image_url,
        custom_fields: item.custom_fields,
        _embedded: item._embedded
      };
    } catch (error) {
      // Error fetching portfolio item
      return null;
    }
  },
  async getProductVariations(productId: number): Promise<Variation[]> {
    return apiRequest(`/products/${productId}/variations?per_page=100`);
  },

  // Custom endpoint for brand products (more reliable than WooCommerce's attribute filtering)
  async getBrandProducts(brandSlug: string, params: { per_page?: number; page?: number } = {}): Promise<{
    success: boolean;
    brand: { name: string; slug: string; id: number };
    found_products: number;
    current_page: number;
    per_page: number;
    products: Product[];
  }> {
    const wpBaseUrl = import.meta.env.VITE_WORDPRESS_URL || 'https://klarrion.com';
    const queryParams = new URLSearchParams({
      per_page: params.per_page ? String(params.per_page) : '100',
      page: params.page ? String(params.page) : '1',
    }).toString();
    
    // Try the direct endpoint first (bypasses WordPress authentication)
    try {
      console.log(`Trying direct endpoint for brand: ${brandSlug}`);
      const directResponse = await fetch(`${wpBaseUrl}/wp-content/plugins/brand-products-endpoint/direct-brand-products.php?brand=${brandSlug}&${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });
      
      if (directResponse.ok) {
        const data = await directResponse.json();
        if (data.success) {
          console.log(`Direct endpoint succeeded for brand: ${brandSlug}`);
          
          // Transform the products to match our Product interface
          const transformedProducts: Product[] = data.products.map((product: any) => ({
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: product.price,
            regular_price: product.regular_price,
            sale_price: product.sale_price,
            description: product.description,
            short_description: product.short_description,
            sku: product.sku,
            stock_quantity: product.stock_quantity,
            stock_status: product.stock_status,
            images: product.images || [],
            categories: product.categories || [],
            attributes: product.attributes || [],
            permalink: product.permalink || `https://klarrion.com/product/${product.slug}/`,
            average_rating: '0',
            rating_count: 0,
            total_sales: 0,
            tags: [],
            type: 'simple',
            status: 'publish',
            catalog_visibility: 'visible',
            date_created: new Date().toISOString(),
            date_modified: new Date().toISOString(),
            date_on_sale_from: null,
            date_on_sale_to: null,
            on_sale: false,
            purchasable: true,
            virtual: false,
            downloadable: false,
            downloads: [],
            download_limit: -1,
            download_expiry: -1,
            external_url: '',
            button_text: '',
            tax_status: 'taxable',
            tax_class: '',
            manage_stock: product.stock_quantity !== null,
            backorders: 'no',
            backorders_allowed: false,
            backordered: false,
            sold_individually: false,
            weight: '',
            dimensions: { length: '', width: '', height: '' },
            shipping_required: true,
            shipping_taxable: true,
            shipping_class: '',
            shipping_class_id: 0,
            reviews_allowed: true,
            parent_id: 0,
            purchase_note: '',
            menu_order: 0,
            meta_data: [],
            _links: {}
          }));
          
          return {
            success: data.success,
            brand: data.brand,
            found_products: data.found_products,
            current_page: data.current_page,
            per_page: data.per_page,
            products: transformedProducts
          };
        }
      }
      console.log(`Direct endpoint failed, trying REST API for brand: ${brandSlug}`);
    } catch (error) {
      console.log(`Direct endpoint error for brand ${brandSlug}:`, error);
    }
    
    // Fallback to REST API endpoint
    try {
      const response = await fetch(`${wpBaseUrl}/wp-json/mobile-app/v1/brand-products/${brandSlug}?${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Brand products API request failed: ${response.status} ${response.statusText} - ${errorData.message}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to get brand products');
      }
      
      console.log(`REST API succeeded for brand: ${brandSlug}`);
      
      // Transform the products to match our Product interface
      const transformedProducts: Product[] = data.products.map((product: any) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        regular_price: product.regular_price,
        sale_price: product.sale_price,
        description: product.description,
        short_description: product.short_description,
        sku: product.sku,
        stock_quantity: product.stock_quantity,
        stock_status: product.stock_status,
        images: product.images || [],
        categories: product.categories || [],
        attributes: product.attributes || [],
        permalink: product.permalink || `https://klarrion.com/product/${product.slug}/`,
        average_rating: '0',
        rating_count: 0,
        total_sales: 0,
        tags: [],
        type: 'simple',
        status: 'publish',
        catalog_visibility: 'visible',
        date_created: new Date().toISOString(),
        date_modified: new Date().toISOString(),
        date_on_sale_from: null,
        date_on_sale_to: null,
        on_sale: false,
        purchasable: true,
        virtual: false,
        downloadable: false,
        downloads: [],
        download_limit: -1,
        download_expiry: -1,
        external_url: '',
        button_text: '',
        tax_status: 'taxable',
        tax_class: '',
        manage_stock: product.stock_quantity !== null,
        backorders: 'no',
        backorders_allowed: false,
        backordered: false,
        sold_individually: false,
        weight: '',
        dimensions: { length: '', width: '', height: '' },
        shipping_required: true,
        shipping_taxable: true,
        shipping_class: '',
        shipping_class_id: 0,
        reviews_allowed: true,
        parent_id: 0,
        purchase_note: '',
        menu_order: 0,
        meta_data: [],
        _links: {}
      }));
      
      return {
        success: data.success,
        brand: data.brand,
        found_products: data.found_products,
        current_page: data.current_page,
        per_page: data.per_page,
        products: transformedProducts
      };
      
    } catch (error) {
      console.error('Error in getBrandProducts:', error);
      throw error;
    }
  },
};