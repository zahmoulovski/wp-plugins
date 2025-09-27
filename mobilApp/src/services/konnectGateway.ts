const KONNECT_BASE_URL = 'https://api.konnect.network/api/v2';

/**
 * Create a Konnect payment session and return { payUrl, paymentId }.
 * amount should be in millimes (e.g., 10000 for 10 TND).
 */
export async function initKonnectPayment(paymentData: {
  amount: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  success_link: string;
  fail_link: string;
  session_id: string;
}): Promise<{ payUrl: string; paymentRef: string }> {
  const currentDomain = window.location.origin;
  
  const body = {
    receiverWalletId: import.meta.env.VITE_KONNECT_WALLET_ID,
    token: "TND",
    amount: paymentData.amount,
    type: "immediate",
    firstName: paymentData.first_name,
    lastName: paymentData.last_name,
    phoneNumber: paymentData.phone,
    email: paymentData.email,
    orderId: paymentData.session_id,
    successUrl: paymentData.success_link,
    failUrl: paymentData.fail_link,
    webhook: `${currentDomain}/webhook`,
    acceptedPaymentMethods: ["wallet", "bank_card", "e-DINAR"],
    lifespan: 10
  };
  
  const response = await fetch(`${KONNECT_BASE_URL}/payments/init-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_KONNECT_API_KEY
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(`Konnect payment initialization failed: ${response.status} ${errorData?.message || response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    payUrl: data.payUrl,
    paymentRef: data.paymentRef
  };
}

/**
 * Verify Konnect payment status.
 */
export async function verifyKonnectPayment(paymentId: string): Promise<any> {
  const response = await fetch(`${KONNECT_BASE_URL}/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'x-api-key': import.meta.env.VITE_KONNECT_API_KEY
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(`Konnect payment verification failed: ${response.status} ${errorData?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.payment;
}