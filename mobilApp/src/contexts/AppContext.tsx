import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { CartItem, Product, Customer } from '../types';

interface AppState {
  cart: CartItem[];
  customer: Customer | null;
  darkMode: boolean;
  isLoading: boolean;
}

type AppAction = 
  | { type: 'ADD_TO_CART'; payload: { 
      id: number; 
      name: string; 
      price: string; 
      quantity: number; 
      image: string; 
      sku?: string; 
      attributes?: Record<string, string>;
      product: Product;
      variationId?: number | null;
      tax_status?: string;
      tax_class?: string;
    }}
  | { type: 'REMOVE_FROM_CART'; payload: { id: number; variationId?: number | null } }
  | { type: 'UPDATE_CART_ITEM'; payload: { id: number; variationId?: number | null; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_CUSTOMER'; payload: Customer | null }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CART'; payload: CartItem[] };

const initialState: AppState = {
  cart: JSON.parse(localStorage.getItem('cart') || '[]'),
  customer: JSON.parse(localStorage.getItem('customer') || 'null'),
  darkMode: localStorage.getItem('darkMode') === 'true',
  isLoading: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const newItem = {
        ...action.payload,
        quantity: action.payload.quantity || 1,
        tax_status: action.payload.tax_status || action.payload.product?.tax_status,
        tax_class: action.payload.tax_class || action.payload.product?.tax_class
      };
  
      const existingItemIndex = state.cart.findIndex(item => {
        // First check basic identifiers
        if (item.id !== newItem.id || item.variationId !== newItem.variationId) {
          return false;
        }
        
        // For variable products, also check if attributes match
        if (newItem.attributes && item.attributes) {
          const newAttributes = newItem.attributes;
          const existingAttributes = item.attributes;
          
          // Check if all attributes match
          const newKeys = Object.keys(newAttributes);
          const existingKeys = Object.keys(existingAttributes);
          
          if (newKeys.length !== existingKeys.length) {
            return false;
          }
          
          for (const key of newKeys) {
            if (newAttributes[key] !== existingAttributes[key]) {
              return false;
            }
          }
          
          return true;
        }
        
        // If no attributes, just check id and variationId
        return true;
      });
  
      if (existingItemIndex >= 0) {
        const updatedCart = [...state.cart];
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: updatedCart[existingItemIndex].quantity + newItem.quantity
        };
        return { ...state, cart: updatedCart };
      }
  
      return { ...state, cart: [...state.cart, newItem] };
    }

    case 'REMOVE_FROM_CART': {
      return {
        ...state,
        cart: state.cart.filter(item => {
          // First check basic identifiers
          if (item.id !== action.payload.id || item.variationId !== action.payload.variationId) {
            return true; // Keep this item (it's different)
          }
          
          // For items with the same id and variationId, we need to check if they have the same attributes
          // Since we don't have the selectedAttributes in the payload, we'll need to handle this differently
          // For now, we'll remove the first matching item (this is a limitation of the current design)
          return false; // Remove this item
        })
      };
    }

    case 'UPDATE_CART_ITEM': {
      return {
        ...state,
        cart: state.cart.map(item => {
          // First check basic identifiers
          if (item.id !== action.payload.id || item.variationId !== action.payload.variationId) {
            return item; // Keep this item unchanged (it's different)
          }
          
          // For items with the same id and variationId, we need to check if they have the same attributes
          // Since we don't have the selectedAttributes in the payload, we'll update the first matching item
          // (this is a limitation of the current design)
          return { ...item, quantity: action.payload.quantity };
        })
      };
    }
    
    case 'CLEAR_CART':
      localStorage.removeItem('cart');
      return { ...state, cart: [] };
    
    case 'SET_CUSTOMER':
      localStorage.setItem('customer', JSON.stringify(action.payload));
      return { ...state, customer: action.payload };
    
    case 'TOGGLE_DARK_MODE':
      const newDarkMode = !state.darkMode;
      localStorage.setItem('darkMode', newDarkMode.toString());
      return { ...state, darkMode: newDarkMode };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_CART':
      localStorage.setItem('cart', JSON.stringify(action.payload));
      return { ...state, cart: action.payload };
    
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export type { AppContextValue };
export interface CartItem {
  id: number;
  name: string;
  price: string;
  quantity: number;
  image: string;
  sku?: string;
  attributes?: Record<string, string>;
  product: Product;
  variationId?: number | null;
  tax_status?: string;
  tax_class?: string;
}