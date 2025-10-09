export interface ProductAttribute {
  id: number;
  name: string;
  slug: string;
  position: number;
  visible: boolean;
  options: string[];
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  sku?: string;
  price: string;
  regular_price: string;
  sale_price: string;
  description: string;
  short_description: string;
  images: Array<{
    id: number;
    src: string;
    alt: string;
  }>;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  shipping_class: string;
  shipping_class_id: number;
  stock_status: string;
  stock_quantity: number;
  on_sale: boolean;
  featured: boolean;
  attributes?: ProductAttribute[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image?: {
    src: string;
    alt: string;
  };
  count: number;
  parent: number;
}

export interface CartItem {
  id: number;
  product: Product;
  quantity: number;
  attributes?: Record&lt;string, string&gt;;
  name: string;
  price: string;
  image: string;
  sku?: string;
  variationId?: number | null;
}

export interface Customer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  billing: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  avatar_url?: string;
  is_wp_user?: boolean;
}

export interface Order {
  id: number;
  status: string;
  currency: string;
  total: string;
  date_created: string;
  billing: any;
  shipping: any;
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    quantity: number;
    total: string;
  }>;
}

export interface BlogPost {
  id: number;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
  date: string;
  modified: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  featured_media: number;
  author: number;
  categories: number[];
  tags: number[];
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
      alt_text: string;
    }>;
    author?: Array<{
      name: string;
      avatar_urls?: {
        '48': string;
      };
    }>;
  };
}


export interface ShippingMethod {
  id: string;
  title: string;
  cost: string;
  method_id: string;
  zone_id: number;
  zone_name: string;
  instance_id: number;
}

export interface ShippingMethodSettings {
  cost?: {
    value: string;
  };
  class_costs?: {
    [key: string]: string; // e.g., "class_0", "class_1", "class_2"
  };
  min_amount?: {
    value: string;
  };
  type?: {
    value: string;
  };
  [key: string]: any;
}

export interface ShippingMethodInstance {
  id: string;
  method_id: string;
  instance_id: number;
  title: string;
  enabled: boolean;
  settings: ShippingMethodSettings;
  zone_id: number;
}

export interface ShippingZone {
  id: number;
  name: string;
  order: number;
  enabled: boolean;
}

export interface ProductShippingInfo {
  product_id: number;
  shipping_class_id: number;
  quantity: number;
  calculated_cost: number;
  matched_instance_id: number;
  shipping_method_title: string;
  shipping_class_slug?: string;
}

export interface PortfolioCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
  link: string;
  image?: string;
  category_data?: {
    id: number;
    name: string;
    slug: string;
    description: string;
    count: number;
    link: string;
    image?: string;
  };
}

export interface PortfolioItem {
  id: number;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
  date: string;
  modified: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  permalink?: string;
  featured_media: number;
  author: number;
  portfolio_categories?: PortfolioCategory[];
  project_categories?: PortfolioCategory[]; // Add project categories
  featured_image_url?: {
    full?: string;
    large?: string;
    medium?: string;
    thumbnail?: string;
  };
  custom_fields?: {
    project_url?: string;
    client_name?: string;
    project_date?: string;
    skills?: string;
  };
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
      alt_text: string;
    }>;
    author?: Array<{
      name: string;
      avatar_urls?: {
        '48': string;
      };
    }>;
  };
}

export interface Variation {
  id: number;
  parent_id: number;
  price: string;
  regular_price: string;
  sale_price: string;
  attributes: { id: number; name: string; option: string }[];
  stock_quantity: number | null;
  stock_status: string;
  sku: string;
  image: { src: string };
  description: string;
}


// API Interface definition
export interface APIInterface {
  // WooCommerce functions
  getProducts(params?: Record<string, string | number>): Promise<Product[]>;
  getProduct(id: number): Promise<Product | null>;
  getBestSellers(params?: Record<string, string | number>): Promise<Product[]>;
  searchProducts(query: string): Promise<Product[]>;
  searchCustomers(query: string): Promise<Customer[]>;
  authenticateUser(username: string, password: string): Promise<{ user: Customer; token: string } | null>;
  getCategories(): Promise<Category[]>;
  getShippingMethods(): Promise<ShippingMethod[]>;
  getShippingZones(): Promise<ShippingZone[]>;
  getShippingMethodInstances(zoneId: number): Promise<ShippingMethodInstance[]>;
  calculateShipping(products: { product_id: number; quantity: number }[], postalCode: string): Promise<any>;
  createOrder(orderData: any): Promise<Order | null>;
  getOrders(customerId: number): Promise<Order[]>;
  getOrder(id: number): Promise<Order | null>;
  getBlogPosts(params?: Record<string, string | number>): Promise<BlogPost[]>;
  getBlogPost(id: number): Promise<BlogPost | null>;
  searchBlogPosts(query: string): Promise<BlogPost[]>;
  getBlogCategories(): Promise<Category[]>;
  filterAndSortProductsByStock(products: Product[]): Product[];
  getProductVariations(productId: number): Promise<Variation[]>;
  
  // Portfolio functions
  getPortfolioItems(params?: Record<string, string | number>): Promise<PortfolioItem[]>;
  getProjectCategories(): Promise<PortfolioCategory[]>;
  getPortfolioCategories(): Promise<PortfolioCategory[]>;
  getPortfolioItem(id: number): Promise<PortfolioItem | null>;
}