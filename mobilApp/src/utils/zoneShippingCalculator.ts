import { CartItem, ProductShippingInfo } from '../types';

export const SHIPPING_METHOD_CONFIGS = {
  'Retrait en Showroom': {
    id: 'Retrait en Showroom',
    method_id: 'local_pickup',
    instance_id: 1,
    name: 'Retrait en Showroom',
    allowed_classes: ['all'],
    restricted_classes: [],
    baseCost: 0,
    classPricing: {
      'big-safe': { type: 'fixed', cost: 0 },
      'coffres': { type: 'fixed', cost: 0 },
      'heavy': { type: 'fixed', cost: 0 },
      'pharmacy': { type: 'custom', cost: 0 }, // Special quantity-based pricing
      'super-heavy': { type: 'fixed', cost: 0 },
      'none': { type: 'fixed', cost: 0 },
    }
  },
  'FIRST DELIVERY': {
    id: 'FIRST DELIVERY',
    method_id: 'first_delivery',
    instance_id: 2,
    name: 'FIRST DELIVERY',
    allowed_classes: ['big-safe', 'coffres', 'pharmacy', 'none'],
    restricted_classes: ['heavy', 'super-heavy'],
    baseCost: 8000,
    classPricing: {
      'big-safe': { type: 'fixed', cost: 45000 },
      'coffres': { type: 'fixed', cost: 35000 },
      'heavy': { type: 'fixed', cost: 0 }, // Not allowed
      'pharmacy': { type: 'custom', cost: 0 }, // Special quantity-based pricing
      'super-heavy': { type: 'fixed', cost: 0 }, // Not allowed
      'none': { type: 'fixed', cost: 20000 },
    }
  },
  'TPS': {
    id: 'TPS',
    method_id: 'tps_shipping',
    instance_id: 3,
    name: 'TPS',
    allowed_classes: ['big-safe', 'coffres', 'heavy', 'pharmacy', 'none'],
    restricted_classes: [],
    baseCost: 15000,
    classPricing: {
      'big-safe': { type: 'fixed', cost: 0 }, // Free
      'coffres': { type: 'fixed', cost: 25000 },
      'heavy': { type: 'fixed', cost: 25000 },
      'pharmacy': { type: 'custom', cost: 0 }, // Special quantity-based pricing
      'super-heavy': { type: 'fixed', cost: 0 }, // Not allowed
      'none': { type: 'fixed', cost: 15000 },
    }
  },
  'DJERBA TRANS.': {
    id: 'DJERBA TRANS.',
    method_id: 'djerba_transport',
    instance_id: 4,
    name: 'DJERBA TRANS.',
    allowed_classes: ['big-safe', 'coffres', 'heavy', 'pharmacy', 'none'],
    restricted_classes: [],
    baseCost: 15000,
    classPricing: {
      'big-safe': { type: 'fixed', cost: 40000 },
      'coffres': { type: 'fixed', cost: 35000 },
      'heavy': { type: 'fixed', cost: 40000 },
      'pharmacy': { type: 'custom', cost: 0 }, // Special quantity-based pricing
      'super-heavy': { type: 'fixed', cost: 0 }, // Not allowed
      'none': { type: 'fixed', cost: 25000 },
    }
  },
  'Livraison via transporteur': {
    id: 'Livraison via transporteur',
    method_id: 'transporteur',
    instance_id: 5,
    name: 'Livraison via transporteur',
    allowed_classes: ['super-heavy'],
    restricted_classes: ['big-safe', 'coffres', 'heavy', 'pharmacy', 'none'],
    baseCost: 0,
    customMessage: 'Les frais de livraison seront définis après la validation de votre commande',
    classPricing: {
      'big-safe': { type: 'fixed', cost: 0 }, // Not allowed
      'coffres': { type: 'fixed', cost: 0 }, // Not allowed
      'heavy': { type: 'fixed', cost: 0 }, // Not allowed
      'pharmacy': { type: 'fixed', cost: 0 }, // Not allowed
      'super-heavy': { type: 'fixed', cost: 80000 },
      'none': { type: 'fixed', cost: 0 }, // Not allowed
    }
  },
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

function getPharmacyPrice(qty: number): number {
  return Math.ceil(qty / 2) * 15;
}

export const CLASS_PRICING_RULES = {
  1741: { // chemical
    'FIRST DELIVERY': 30,
    'TPS': 20,
    'DJERBA TRANS.': 0,
    'Livraison via Transporteur': 0,
    'Retrait en Showroom': 0,
  },
  1819: { // big-safe
    'FIRST DELIVERY': 45,
    'TPS': 0,
    'DJERBA TRANS.': 40,
    'Livraison via Transporteur': 60,
    'Retrait en Showroom': 0,
  },
  1750: { // coffres
    'FIRST DELIVERY': 35,
    'TPS': 25,
    'DJERBA TRANS.': 35,
    'Livraison via Transporteur': 45,
    'Retrait en Showroom': 0,
  },
  1749: { // heavy
    'FIRST DELIVERY': 35,
    'TPS': 25,
    'DJERBA TRANS.': 40,
    'Livraison via Transporteur': 55,
    'Retrait en Showroom': 0,
  },
  1843: { // pharmacy
    'FIRST DELIVERY': 25,
    'TPS': 15,
    'DJERBA TRANS.': 0,
    'Livraison via Transporteur': 0,
    'Retrait en Showroom': 0,
    // Dynamic quantity-based pricing for pharmacy
    getQuantityPrice: (qty: number) => getPharmacyPrice(qty)
  },
  1748: { // super-heavy
    'FIRST DELIVERY': 0,
    'TPS': 0,
    'DJERBA TRANS.': 0,
    'Livraison via Transporteur': 80,
    'Retrait en Showroom': 0,
  },
  'no-class': {
    'FIRST DELIVERY': 20,
    'TPS': 15,
    'DJERBA TRANS.': 25,
    'Livraison via Transporteur': 30,
    'Retrait en Showroom': 0,
  },
};

// Mapping from method IDs to method names for proper lookup
export const METHOD_ID_TO_NAME = {
  'local_pickup': 'Retrait en Showroom',
  'first_delivery': 'FIRST DELIVERY',
  'tps_shipping': 'TPS',
  'djerba_transport': 'DJERBA TRANS.',
  'transporteur': 'Livraison via Transporteur'
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

function isShippingMethodAvailable(
  methodName: string,
  shippingClassSlug: string
): boolean {
  const methodConfig = SHIPPING_METHOD_CONFIGS[methodName];
  if (!methodConfig) return false;
  
  if (methodConfig.allowed_classes.includes('all')) return true;
  if (methodConfig.allowed_classes.includes(shippingClassSlug)) return true;
  
  return false;
}

function calculateProductShippingCost(
  shippingClassId: number,
  quantity: number,
  shippingMethodId: string
): number {
  console.log(`=== CALCULATE PRODUCT SHIPPING COST ===`);
  console.log(`shippingClassId: ${shippingClassId}, quantity: ${quantity}, shippingMethodId: ${shippingMethodId}`);
  
  const methodName = METHOD_ID_TO_NAME[shippingMethodId];
  if (!methodName) {
    console.log(`Method name not found for ID ${shippingMethodId}, returning 0`);
    return 0;
  }
  
  // Use shipping class ID directly for pricing lookup
  const classPricing = CLASS_PRICING_RULES[shippingClassId as keyof typeof CLASS_PRICING_RULES];
  if (!classPricing) {
    console.log(`No pricing rules found for shipping class ID ${shippingClassId}`);
    // Try to get pricing for "no-class" products
    const noClassPricing = CLASS_PRICING_RULES['no-class'];
    if (noClassPricing && noClassPricing[methodName as keyof typeof noClassPricing]) {
      return noClassPricing[methodName as keyof typeof noClassPricing] as number;
    }
    return 0;
  }
  
  const cost = classPricing[methodName as keyof typeof classPricing];
  if (typeof cost === 'number') {
    console.log(`Found cost ${cost} for shipping class ${shippingClassId} and method ${methodName}`);
    return cost;
  }
  
  // Handle special pharmacy quantity pricing
  if (shippingClassId === 1843 && methodName === 'FIRST DELIVERY') { // pharmacy
    const pharmacyCost = calculatePharmacyCost(quantity);
    console.log(`Pharmacy custom pricing: ${pharmacyCost}`);
    return pharmacyCost;
  }
  
  console.log(`No cost found for shipping class ${shippingClassId} and method ${methodName}`);
  return 0;
}

function evaluateCostFormula(formula: string, quantity: number): number {
  try {
    const expression = formula.replace(/\[qty\]/g, quantity.toString());
    const result = Function('"use strict"; return (' + expression + ')')();
    return parseFloat(result) || 0;
  } catch (error) {
    console.error('Error evaluating cost formula:', formula, error);
    return 0;
  }
}

function calculatePharmacyCost(quantity: number): number {
  // Pharmacy pricing: 15.000 for 1-2 items, 30.000 for 3-4 items, etc.
  const quantityPricing = CLASS_PRICING_RULES['pharmacy']['quantity_pricing'];
  if (!quantityPricing) {
    return 15000; // Default fallback
  }
  
  if (quantity >= 1 && quantity <= 2) return quantityPricing['1-2'];
  if (quantity >= 3 && quantity <= 4) return quantityPricing['3-4'];
  if (quantity >= 5 && quantity <= 6) return quantityPricing['5-6'];
  if (quantity >= 7 && quantity <= 8) return quantityPricing['7-8'];
  
  // For quantities > 8, continue the pattern (15k per 2 items)
  const multiplier = Math.ceil(quantity / 2);
  return 15000 * multiplier;
}

function getAvailableShippingMethods(cartItems: CartItem[]): string[] {
  const cartShippingClasses = new Set<string>();
  let hasProductsWithoutShippingClass = false;
  
  cartItems.forEach(item => {
    const shippingClassSlug = getShippingClassSlug(item.product.shipping_class_id || 0);
    if (shippingClassSlug && shippingClassSlug !== 'none') {
      cartShippingClasses.add(shippingClassSlug);
    } else {
      hasProductsWithoutShippingClass = true;
    }
  });
  
  console.log('Cart shipping classes:', Array.from(cartShippingClasses));
  console.log('Has products without shipping class:', hasProductsWithoutShippingClass);
  
  // If no specific shipping classes, show all methods except transporteur
  if (cartShippingClasses.size === 0 && hasProductsWithoutShippingClass) {
    const methods = Object.values(SHIPPING_METHOD_CONFIGS)
      .filter(method => method.id !== 'livraison-transporteur')
      .map(method => method.id);
    console.log('No specific classes, available methods:', methods);
    return methods;
  }
  
  const availableMethods = Object.values(SHIPPING_METHOD_CONFIGS)
    .filter(method => {
      // Check if method allows ALL shipping classes in the cart
      const allowsAllClasses = Array.from(cartShippingClasses).every(shippingClass => {
        return isShippingMethodAvailable(method.id, shippingClass);
      });
      
      console.log(`Method ${method.id} allows all classes:`, allowsAllClasses);
      return allowsAllClasses;
    })
    .map(method => method.id);
    
  console.log('Available methods for cart:', availableMethods);
  return availableMethods;
}

function calculateTotalCostForMethod(
  cartItems: CartItem[],
  method: ShippingMethod,
  destination: ShippingDestination
): number {
  console.log(`=== CALCULATE TOTAL COST FOR METHOD ===`);
  console.log(`method:`, method);
  console.log(`cartItems:`, cartItems);
  
  let totalCost = 0;
  
  cartItems.forEach(item => {
    console.log(`Processing item: ${item.name} (shipping_class: ${item.shipping_class_id})`);
    const itemCost = calculateProductShippingCost(item.shipping_class_id || 0, item.quantity, method.id);
    console.log(`Item cost: ${itemCost}`);
    totalCost += itemCost;
  });
  
  console.log(`Total cost for method ${method.name}: ${totalCost}`);
  return totalCost;
}

function findBestShippingMethod(
  cartItems: CartItem[]
): { method: ShippingMethodConfig | null; cost: number } {
  const availableMethodIds = getAvailableShippingMethods(cartItems);
  
  if (availableMethodIds.length === 0) {
    return { method: null, cost: 0 };
  }
  
  const availableMethods = Object.values(SHIPPING_METHOD_CONFIGS).filter(method => 
    availableMethodIds.includes(method.id)
  );
  
  let bestMethod: ShippingMethodConfig | null = null;
  let lowestCost = Infinity;
  
  for (const method of availableMethods) {
    const cost = calculateTotalForMethod(cartItems, method.id);
    
    if (cost < lowestCost) {
      lowestCost = cost;
      bestMethod = method;
    }
  }
  
  return { method: bestMethod, cost: lowestCost === Infinity ? 0 : lowestCost };
}

export function getBestShippingMethod(
  cartItems: CartItem[],
  destination: ShippingDestination
): ShippingMethod | null {
  console.log(`=== GET BEST SHIPPING METHOD ===`);
  console.log(`cartItems:`, cartItems);
  console.log(`destination:`, destination);
  
  const availableMethods = getAvailableShippingMethods(cartItems, destination);
  console.log(`availableMethods:`, availableMethods);
  
  if (availableMethods.length === 0) {
    console.log(`No available shipping methods found`);
    return null;
  }
  
  const methodCosts = availableMethods.map(method => {
    const totalCost = calculateTotalCostForMethod(cartItems, method, destination);
    console.log(`Method ${method.id} (${method.name}): ${totalCost} TND`);
    return {
      method,
      cost: totalCost
    };
  });
  
  // Sort by cost (ascending)
  methodCosts.sort((a, b) => a.cost - b.cost);
  
  console.log(`Best method: ${methodCosts[0].method.name} at ${methodCosts[0].cost} TND`);
  
  return {
    ...methodCosts[0].method,
    cost: methodCosts[0].cost
  };
}

export async function calculateDynamicShippingCosts(
  cartItems: CartItem[]
): Promise<ShippingCostCalculation> {
  try {
    console.log('=== CALCULATE DYNAMIC SHIPPING COSTS ===');
    console.log('Cart items:', cartItems);
    
    const availableMethods = getAvailableShippingMethods(cartItems);
    console.log('Available methods:', availableMethods);
    
    if (availableMethods.length === 0) {
      throw new Error('No shipping methods available for the current cart contents');
    }

    // Get all available methods with their costs, not just the best one
    const availableMethodConfigs = Object.values(SHIPPING_METHOD_CONFIGS).filter(method => 
      availableMethods.includes(method.id)
    );

    const methodsWithCosts = availableMethodConfigs.map(method => {
      const cost = calculateTotalCostForMethod(cartItems, method, {});
      return {
        method,
        cost
      };
    });

    // Sort by cost (ascending) but keep all methods
    methodsWithCosts.sort((a, b) => a.cost - b.cost);
    
    const bestMethod = methodsWithCosts[0].method;
    const totalCost = methodsWithCosts[0].cost;

    console.log('All methods with costs:', methodsWithCosts);
    console.log('Best method:', bestMethod.name, 'at', totalCost, 'TND');

    const productShippingInfo: ProductShippingInfo[] = [];
    
    for (const item of cartItems) {
      const productCost = calculateProductShippingCost(
        item.product.shipping_class_id || 0,
        item.quantity,
        bestMethod.id
      );

      const shippingClassSlug = getShippingClassSlug(item.product.shipping_class_id || 0);
      
      console.log(`Product ${item.product.id} (${item.product.name}): shipping_class=${item.product.shipping_class_id}, quantity=${item.quantity}, cost=${productCost}`);
      
      productShippingInfo.push({
        product_id: item.product.id,
        shipping_class_id: item.product.shipping_class_id || 0,
        quantity: item.quantity,
        calculated_cost: productCost,
        matched_instance_id: bestMethod.instance_id,
        shipping_method_title: bestMethod.name,
        shipping_class_slug: shippingClassSlug
      });
    }

    console.log('Final result:', { totalCost, method: bestMethod.name, allMethods: methodsWithCosts.length });

    return {
      totalCost,
      productShippingInfo,
      matchedInstanceId: bestMethod.instance_id,
      shippingMethodTitle: bestMethod.name,
      allAvailableMethods: methodsWithCosts.map(m => ({
        methodId: m.method.id,
        methodName: m.method.name,
        cost: m.cost
      }))
    };

  } catch (error) {
    console.error('Error calculating dynamic shipping costs:', error);
    return {
      totalCost: 0,
      productShippingInfo: [],
      matchedInstanceId: 0,
      shippingMethodTitle: 'Error calculating shipping'
    };
  }
}