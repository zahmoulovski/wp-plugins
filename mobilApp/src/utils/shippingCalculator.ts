import { CartItem } from "../types/Cart";
import { ShippingMethod } from "../types/Shipping";
import { ApiService } from "../services/api";

interface CalculateShippingParams {
  api: ApiService;
  cart: CartItem[];
  formData: {
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  selectedShipping: string | null;
  setShippingMethods: (methods: ShippingMethod[]) => void;
  setSelectedShipping: (id: string) => void;
  setShippingCost: (cost: number) => void;
  setIsCalculatingShipping: (isCalculating: boolean) => void;
  getRestrictedShippingClasses: () => Set<string>;
}

export const calculateShipping = async ({
  api,
  cart,
  formData,
  selectedShipping,
  setShippingMethods,
  setSelectedShipping,
  setShippingCost,
  setIsCalculatingShipping,
  getRestrictedShippingClasses,
}: CalculateShippingParams) => {
  if (formData.city && formData.state && formData.zipCode) {
    setIsCalculatingShipping(true);
    try {
      const shippingAddress = {
        city: formData.city,
        state: formData.state,
        postcode: formData.zipCode,
        country: formData.country,
      };

      const allMethods = await api.getAllShippingMethods();
      let availableMethods = allMethods;

      const restrictedMethods = getRestrictedShippingClasses();
      availableMethods = availableMethods.filter(method => 
        !restrictedMethods.has(method.method_id)
      );

      let currentSelectedMethod = availableMethods.find(method => method.id === selectedShipping);

      if (!currentSelectedMethod && availableMethods.length > 0) {
        currentSelectedMethod = availableMethods[0];
        setSelectedShipping(currentSelectedMethod.id);
      }

      if (currentSelectedMethod) {
        const methodInstance = await api.getShippingMethodInstance(
          currentSelectedMethod.zone_id,
          currentSelectedMethod.instance_id
        );

        let calculatedCost = 0;
        const costFormula = methodInstance.settings.cost.value;

        if (costFormula) {
          cart.forEach(item => {
            const qty = item.quantity;
            const shippingClassId = item.product.shipping_class_id;

            let itemCost = costFormula.replace(/\\[qty\\]/g, qty);

            if (methodInstance.settings.class_costs && shippingClassId) {
              const classCost = methodInstance.settings.class_costs[`class_${shippingClassId}`];
              if (classCost) {
                itemCost = classCost.replace(/\\[qty\\]/g, qty);
              }
            }
            calculatedCost += eval(itemCost);
          });
        } else {
          calculatedCost = parseFloat(currentSelectedMethod.cost) || 0;
        }
        setShippingCost(calculatedCost);
      } else {
        setShippingCost(0);
      }

      setShippingMethods(availableMethods);
      
    } catch (error) {
      console.error('Error calculating shipping:', error);
      try {
        const allMethods = await api.getAllShippingMethods();
        setShippingMethods(allMethods);
        
        if (allMethods.length > 0 && !selectedShipping) {
          setSelectedShipping(allMethods[0].id);
          setShippingCost(parseFloat(allMethods[0].cost) || 0);
        }
      } catch (fallbackError) {
        console.error('Error loading fallback shipping methods:', fallbackError);
      }
    } finally {
      setIsCalculatingShipping(false);
    }
  }
};