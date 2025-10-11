export interface TaxInfo {
  rate: number;
  label: string;
  amount: number;
}

export const getTaxRateFromClass = (taxClass: string): number => {
  switch (taxClass) {
    case 'tva-7':
      return 7;
    case '':
    case 'standard':
    default:
      return 19;
  }
};

export const getTaxLabel = (taxRate: number): string => {
  return `${taxRate}% TVA`;
};

export const calculateTaxAmount = (price: number, taxRate: number): number => {
  // Since prices are tax-inclusive, calculate the tax amount contained within the price
  // Tax = TTC - HT = TTC - (TTC / (1 + taxRate/100))
  const htPrice = price / (1 + taxRate / 100);
  return price - htPrice;
};

export const parsePrice = (priceString: string | number): number => {
  if (!priceString && priceString !== 0) return 0;
  
  // If it's already a number, return it
  if (typeof priceString === 'number') {
    return priceString;
  }
  
  // If it's a string, clean it and convert to number
  const cleanPrice = priceString.replace(/[^\d.,]/g, '').replace(',', '.');
  return parseFloat(cleanPrice) || 0;
};

export const getProductTaxInfo = (price: string | number, taxClass?: string, taxStatus?: string): TaxInfo | null => {
  if (taxStatus === 'none' || taxStatus === 'taxable' && taxClass === 'zero-rate') {
    return null;
  }
  
  const rate = getTaxRateFromClass(taxClass || '');
  const priceValue = parsePrice(price);
  const amount = calculateTaxAmount(priceValue, rate);
  
  return {
    rate,
    label: getTaxLabel(rate),
    amount
  };
};

export const calculateHTPrice = (ttcPrice: number, taxRate: number): number => {
  return ttcPrice / (1 + taxRate / 100);
};

export const formatHTPrice = (price: number): string => {
  return price.toFixed(3) + ' TND HT';
};

export const formatTTCPrice = (price: number): string => {
  return price.toFixed(3) + ' TND TTC';
};

export const formatPrice = (price: number): string => {
  return price.toFixed(3) + ' TND';
};