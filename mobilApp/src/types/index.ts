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
  attributes?: Record<string, string>;
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