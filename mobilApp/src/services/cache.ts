import { Category, Product } from '../types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_EXPIRY = 5 * 60 * 1000; // 5 minutes
  private readonly CATEGORIES_EXPIRY = 15 * 60 * 1000; // 15 minutes
  private readonly PRODUCTS_EXPIRY = 10 * 60 * 1000; // 10 minutes

  private generateKey(type: string, params?: any): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${type}:${paramString}`;
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.expiresIn;
  }

  set<T>(type: string, data: T, params?: any, customExpiry?: number): void {
    const key = this.generateKey(type, params);
    const expiresIn = customExpiry || this.DEFAULT_EXPIRY;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn
    });
  }

  get<T>(type: string, params?: any): T | null {
    const key = this.generateKey(type, params);
    const entry = this.cache.get(key);

    if (!entry || this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(type?: string): void {
    if (type) {
      // Clear specific type
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(type));
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  // Specific cache methods
  setCategories(categories: Category[]): void {
    this.set('categories', categories, undefined, this.CATEGORIES_EXPIRY);
  }

  getCategories(): Category[] | null {
    return this.get('categories');
  }

  setProducts(products: Product[], params: Record<string, any> = {}, customExpiry?: number): void {
    this.set('products', products, params, customExpiry || this.PRODUCTS_EXPIRY);
  }

  getProducts(params?: any): Product[] | null {
    return this.get('products', params);
  }

  setProduct(product: Product): void {
    this.set(`product:${product.id}`, product, undefined, this.PRODUCTS_EXPIRY);
  }

  getProduct(id: number): Product | null {
    return this.get(`product:${id}`);
  }

  setSubcategories(categoryId: number, subcategories: Category[]): void {
    this.set(`subcategories:${categoryId}`, subcategories, undefined, this.CATEGORIES_EXPIRY);
  }

  getSubcategories(categoryId: number): Category[] | null {
    return this.get(`subcategories:${categoryId}`);
  }

  // Check if cache is still fresh (within 50% of expiry time)
  isFresh(type: string, params?: any): boolean {
    const key = this.generateKey(type, params);
    const entry = this.cache.get(key);

    if (!entry) return false;
    if (this.isExpired(entry)) return false;

    const timeRemaining = entry.expiresIn - (Date.now() - entry.timestamp);
    return timeRemaining > entry.expiresIn * 0.5;
  }

  // Get cache statistics
  getStats(): { size: number; types: Record<string, number> } {
    const stats = { size: this.cache.size, types: {} as Record<string, number> };

    this.cache.forEach((_, key) => {
      const type = key.split(':')[0];
      stats.types[type] = (stats.types[type] || 0) + 1;
    });

    return stats;
  }
}

export const cacheService = new CacheService();

// Auto-clear expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  cacheService.clear(); // This will only clear expired entries due to isExpired check
}, 5 * 60 * 1000);