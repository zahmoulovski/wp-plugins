import { CartItem, ProductShippingInfo } from '../types';

// shippingByClassId 
export const SHIPPING_BY_CLASS_ID = { 
  /* ---------- 1819  big-safe -------------------------------------- */ 
  1819: [ 
    { method: 'Retrait en Showroom',  price: 0, type:'fixed',  string:'0 DT' }, 
    { method: 'FIRST DELIVERY',  price: 40000, type:'quantity',string:'40 000 DT × qty' }, 
    { method: 'TPS', price: 40000, type:'quantity',string:'40 000 DT × qty' }, 
    { method: 'DJERBA TRANS.', price: 40000, type:'quantity',string:'40 000 DT × qty' }, 
    // transporteur does NOT allow big-safe → not listed 
  ],
  
  0: [ 
    { method: 'Retrait en Showroom',  price: 0, type:'fixed',  string:'0 DT' }, 
    { method: 'FIRST DELIVERY',  price: 8000, type:'fixed',string:'8 000 DT × qty' }, 
    { method: 'TPS', price: 15000, type:'fixed',string:'15 000 DT' }, 
    { method: 'DJERBA TRANS.', price: 15000, type:'fixed',string:'15 000 DT' }, 
    // transporteur does NOT allow big-safe → not listed 
  ],

  /* ---------- 1750  coffres --------------------------------------- */ 
  1750: [ 
    { method: 'Retrait en Showroom', price: 0, type:'fixed',  string:'0 DT' }, 
    { method: 'FIRST DELIVERY', price: 15000, type:'quantity',string:'15 000 DT × qty' }, 
    { method: 'TPS', price: 15000, type:'quantity',string:'15 000 DT × qty' }, 
    { method: 'DJERBA TRANS.', price: 15000, type:'quantity',string:'15 000 DT × qty' }, 
  ], 

  /* ---------- 1749  heavy ----------------------------------------- */ 
  1749: [ 
    { method: 'Retrait en Showroom',  price: 0, type:'fixed',  string:'0 DT' }, 
    // FIRST DELIVERY forbids heavy → not listed 
    { method: 'TPS', price: 90000, type:'fixed',  string:'90 000 DT' }, 
    { method: 'DJERBA TRANS.', price: 90000, type:'fixed',  string:'90 000 DT' }, 
    // transporteur forbids heavy → not listed 
  ], 

  /* ---------- 1843  pharmacy -------------------------------------- */ 
  1843: [ 
    { method: 'Retrait en Showroom',  price: 0, type:'fixed',  string:'0 DT' }, 
    { method: 'FIRST DELIVERY', price: 0, type:'custom', string:'15 000 DT par paire (1-2 items), etc.' }, 
    { method: 'TPS', price: 0, type:'custom', string:'15 000 DT par paire (1-2 items), etc.' }, 
    { method: 'DJERBA TRANS.', price: 0, type:'custom', string:'15 000 DT par paire (1-2 items), etc.' }, 
  ], 

  /* ---------- 1741  chemical -------------------------------------- */ 
  1741: [ 
    { method: 'Retrait en Showroom',  price: 0, type:'fixed',  string:'0 DT' }, 
    // every other method forbids chemical → only showroom stays 
  ], 

  /* ---------- 1748  super-heavy ----------------------------------- */ 
  1748: [ 
    // only transporteur allows super-heavy 
    { method: 'Livraison via transporteur', price: 0, type:'message', string:'Les frais seront définis après validation' }, 
  ], 
}; 

/* optional helper if you only have the class key string instead of the id */ 
export const CLASS_KEY_TO_ID = { 
  'big-safe'   : 1819, 
  'coffres'      : 1750, 
  'heavy'        : 1749, 
  'pharmacy'     : 1843, 
  'chemical'     : 1741, 
  'super-heavy': 1748, 
}; 

export const SHIPPING_CLASS_MAPPING = {
  1748: 'super-heavy',
  1749: 'heavy',
  1750: 'coffres',
  1741: 'chemical',
  1819: 'big-safe',
  1843: 'pharmacy',
};

export const SHIPPING_CLASS_ID_MAPPING = {
  1748: 'super-heavy',
  1749: 'heavy', 
  1750: 'coffres',
  1741: 'chemical',
  1819: 'big-safe',
  1843: 'pharmacy',
};

interface ShippingCostCalculation {
  totalCost: number;
  productShippingInfo: ProductShippingInfo[];
  matchedInstanceId: number;
  shippingMethodTitle: string;
  availableMethods?: string[];
  selectedMethod?: string;
  allAvailableMethods?: Array<{
    methodId: string;
    methodName: string;
    cost: number;
  }>;
}

function getShippingClassSlug(shippingClassId: number): string {
  return SHIPPING_CLASS_MAPPING[shippingClassId] || 'none';
}

function calculateProductShippingCost(
  shippingClassId: number | undefined,
  quantity: number,
  shippingMethod: string
): number {
  
  // Get shipping options for this class ID
  const shippingOptions = SHIPPING_BY_CLASS_ID[shippingClassId || 0];
  if (!shippingOptions) {
    return 0;
  }
  
  // Find the selected method
  const selectedOption = shippingOptions.find(option => option.method === shippingMethod);
  if (!selectedOption) {
    return 0;
  }
  
  // Handle different pricing types
  const { type, price } = selectedOption;
  
  if (type === 'hide') {
    return 0;
  }
  
  if (type === 'message') {
    return 0; // Frontend will show message
  }
  
  if (type === 'custom') {
    // For pharmacy custom pricing: 15.000 DT par paire (1-2 items), etc.
    if (shippingClassId === 1843) {
      return Math.ceil(quantity / 2) * 15000;
    }
    return 0;
  }
  
  if (type === 'quantity') {
    return price * quantity;
  }
  
  if (type === 'fixed') {
    return price;
  }
  
  return 0;
}

function getAvailableShippingMethods(cartItems: CartItem[]): string[] {
  const cartShippingClasses = new Set<number>();
  
  cartItems.forEach(item => {
    if (item.product?.shipping_class_id) {
      cartShippingClasses.add(item.product.shipping_class_id);
    }
  });
  
  
  if (cartShippingClasses.size === 0) {
    // Default methods for products without shipping class
    return ['Retrait en Showroom', 'FIRST DELIVERY', 'TPS', 'DJERBA TRANS.'];
  }
  
  // Get available methods for all classes in cart
  const allAvailableMethods = new Set<string>();
  let firstClassMethods: string[] | null = null;
  
  cartShippingClasses.forEach(classId => {
    const shippingOptions = SHIPPING_BY_CLASS_ID[classId] || [];
    const methodNames = shippingOptions.map(option => option.method);
    
    if (!firstClassMethods) {
      firstClassMethods = methodNames;
    } else {
      // Intersect with existing methods (only keep methods available for ALL classes)
      const intersection = firstClassMethods.filter(method => methodNames.includes(method));
      firstClassMethods = intersection;
    }
  });
  
  const availableMethods = firstClassMethods || [];
  return availableMethods;
}

function calculateTotalCostForMethod(
  cartItems: CartItem[],
  shippingMethod: string
): number {
  let totalCost = 0;
  let hasClassZero = false;
  let classZeroCost = 0;
  
  cartItems.forEach(item => {
    const shippingClassId = item.product?.shipping_class_id || 0;
    
    // Special handling for shipping class 0 (no shipping class)
    if (shippingClassId === 0) {
      if (!hasClassZero) {
        // Apply cost only once for all class 0 products
        const itemCost = calculateProductShippingCost(shippingClassId, 1, shippingMethod);
        classZeroCost = itemCost;
        hasClassZero = true;
      } else {
      }
    } else {
      // Normal calculation for other classes
      const itemCost = calculateProductShippingCost(shippingClassId, item.quantity, shippingMethod);
      totalCost += itemCost;
    }
  });
  
  // Add the class 0 cost (applied once)
  totalCost += classZeroCost;
  
 
  return totalCost;
}

export function getBestShippingMethod(
  cartItems: CartItem[],
  destination: Record<string, any>
): { method: string; cost: number } | null {
  
  const availableMethods = getAvailableShippingMethods(cartItems);
  
  
  if (availableMethods.length === 0) {
    
    return null;
  }
  
  const methodCosts = availableMethods.map(methodName => {
    const totalCost = calculateTotalCostForMethod(cartItems, methodName);
    return {
      method: methodName,
      cost: totalCost
    };
  });
  
  // Sort by cost (ascending)
  methodCosts.sort((a, b) => a.cost - b.cost);
  
  
  return {
    method: methodCosts[0].method,
    cost: methodCosts[0].cost
  };
}

export async function calculateDynamicShippingCosts(
  cartItems: CartItem[]
): Promise<ShippingCostCalculation> {
  try {
    const availableMethods = getAvailableShippingMethods(cartItems);
    
    if (availableMethods.length === 0) {
      throw new Error('No shipping methods available for the current cart contents');
    }

    // Get all available methods with their costs
    const methodsWithCosts = availableMethods.map(methodName => {
      const cost = calculateTotalCostForMethod(cartItems, methodName);
      return {
        methodName,
        cost
      };
    });

    
    
    // Create product shipping info for each item
    const productShippingInfo: ProductShippingInfo[] = cartItems.map(item => ({
      productId: item.id,
      shippingClassId: item.product?.shipping_class_id || 0,
      shippingCost: calculateProductShippingCost(item.product?.shipping_class_id, item.quantity, ''),
      quantity: item.quantity
    }));
    
    

    return {
      productShippingInfo,
      matchedInstanceId: 0,
      availableMethods: availableMethods,
      allAvailableMethods: methodsWithCosts.map(m => ({
        methodId: m.methodName.toLowerCase().replace(/\s+/g, '-'),
        methodName: m.methodName,
        cost: m.cost
      }))
    };
  } catch (error) {
    console.error('Error calculating dynamic shipping costs:', error);
    throw error;
  }
}