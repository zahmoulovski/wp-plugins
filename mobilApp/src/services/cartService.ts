import { CartItem } from '../types';
import { api } from './api';

export const cartService = {
  // Get current cart from WooCommerce session
  async getCartFromSession(): Promise<CartItem[]> {
    try {
      const wooCart = await api.getCartFromSession();
      return api.convertWooCommerceCartToAppCart(wooCart);
    } catch (error) {
      return [];
    }
  },

  // Add item to WooCommerce cart
  async addToCart(productId: number, quantity: number = 1, variationId?: number): Promise<any> {
    try {
      return await api.addItemToCart(productId, quantity, variationId);
    } catch (error) {
      throw error;
    }
  },

  // Remove item from WooCommerce cart
  async removeFromCart(cartItemKey: string): Promise<any> {
    try {
      return await api.removeItemFromCart(cartItemKey);
    } catch (error) {
      throw error;
    }
  },

  // Update item quantity in WooCommerce cart
  async updateCartItem(cartItemKey: string, quantity: number): Promise<any> {
    try {
      return await api.updateCartItem(cartItemKey, quantity);
    } catch (error) {
      throw error;
    }
  },

  // Clear WooCommerce cart
  async clearCart(): Promise<any> {
    try {
      return await api.clearCart();
    } catch (error) {
      throw error;
    }
  },

  // Sync local cart with WooCommerce session
  async syncLocalCartWithSession(localCart: CartItem[]): Promise<CartItem[]> {
    try {
      // Clear existing cart first
      await this.clearCart();
      
      // Add each item from local cart
      for (const item of localCart) {
        const variationId = item.attributes?.find(attr => attr.id === 'variation_id')?.option;
        await this.addToCart(item.product.id, item.quantity, variationId);
      }
      
      // Return the updated cart from session
      return await this.getCartFromSession();
    } catch (error) {
      return localCart;
    }
  },

  // ---------- Legacy methods (deprecated) ----------
  async syncCart(customerId: number, localCart: CartItem[]): Promise<CartItem[]> {
    return localCart;
  },

  async getRemoteCart(customerId: number): Promise<CartItem[]> {
    return this.getCartFromSession();
  },

  async saveRemoteCart(customerId: number, cartItems: CartItem[]): Promise<boolean> {
    try {
      await this.syncLocalCartWithSession(cartItems);
      return true;
    } catch (error) {
      return false;
    }
  }
};