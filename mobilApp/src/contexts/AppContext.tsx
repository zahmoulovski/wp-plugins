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
    }}
  | { type: 'REMOVE_FROM_CART'; payload: number }
  | { type: 'UPDATE_CART_ITEM'; payload: { id: number; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_CUSTOMER'; payload: Customer | null }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: AppState = {
  cart: JSON.parse(localStorage.getItem('cart') || '[]'),
  customer: JSON.parse(localStorage.getItem('customer') || 'null'),
  darkMode: localStorage.getItem('darkMode') === 'true',
  isLoading: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const existingItem = state.cart.find(item => item.id === action.payload.id);
      let newCart;
      
      if (existingItem) {
        newCart = state.cart.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
      } else {
        newCart = [...state.cart, {
          id: action.payload.id,
          product: action.payload.product,
          quantity: action.payload.quantity,
          attributes: action.payload.attributes
        }];
      }
      
      localStorage.setItem('cart', JSON.stringify(newCart));
      return { ...state, cart: newCart };
    }
    
    case 'REMOVE_FROM_CART': {
      const newCart = state.cart.filter(item => item.id !== action.payload);
      localStorage.setItem('cart', JSON.stringify(newCart));
      return { ...state, cart: newCart };
    }
    
    case 'UPDATE_CART_ITEM': {
      const newCart = state.cart.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      ).filter(item => item.quantity > 0);
      
      localStorage.setItem('cart', JSON.stringify(newCart));
      return { ...state, cart: newCart };
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
    
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

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