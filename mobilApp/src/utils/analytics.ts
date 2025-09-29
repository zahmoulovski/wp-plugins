import ReactGA from 'react-ga4';

const GA_MEASUREMENT_ID = 'G-LQJF91R73K';

export const initGA = () => {
  ReactGA.initialize(GA_MEASUREMENT_ID);
};

export const logPageView = () => {
  ReactGA.send({ hitType: 'pageview', page: window.location.pathname });
};

export const logEvent = (category: string, action: string, label?: string, value?: number) => {
  ReactGA.event({
    category,
    action,
    label,
    value
  });
};

export const logPurchase = (orderId: string, value: number, currency: string = 'TND') => {
  ReactGA.event('purchase', {
    transaction_id: orderId,
    value: value,
    currency: currency
  });
};

export const logAddToCart = (productId: string, productName: string, price: number, quantity: number = 1) => {
  ReactGA.event('add_to_cart', {
    items: [{
      item_id: productId,
      item_name: productName,
      price: price,
      quantity: quantity
    }]
  });
};

export const logRemoveFromCart = (productId: string, productName: string, price: number, quantity: number = 1) => {
  ReactGA.event('remove_from_cart', {
    items: [{
      item_id: productId,
      item_name: productName,
      price: price,
      quantity: quantity
    }]
  });
};

export const logBeginCheckout = (value: number, currency: string = 'TND') => {
  ReactGA.event('begin_checkout', {
    value: value,
    currency: currency
  });
};

export const logPaymentInfo = (paymentMethod: string) => {
  ReactGA.event('add_payment_info', {
    payment_type: paymentMethod
  });
};

export const logSearch = (searchTerm: string) => {
  ReactGA.event('search', {
    search_term: searchTerm
  });
};

export const logViewItem = (productId: string, productName: string, price: number, category?: string) => {
  ReactGA.event('view_item', {
    items: [{
      item_id: productId,
      item_name: productName,
      price: price,
      item_category: category
    }]
  });
};