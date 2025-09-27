import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../services/api';

interface PaymentCallbackProps {
  success: boolean;
}

const PaymentCallback: React.FC<PaymentCallbackProps> = ({ success }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      const query = new URLSearchParams(location.search);
      const orderId = query.get('order_id');
      const parentOrigin = query.get('parent_origin');

      // Determine if running inside an iframe
      const isInIframe = window.self !== window.top;

      if (!orderId) {
        if (isInIframe && parentOrigin) {
          window.parent.postMessage({ type: 'konnectPaymentResult', success: false, error: 'Invalid payment callback: No order ID' }, parentOrigin);
        } else {
          navigate('/thank-you', { state: { error: 'Invalid payment callback: No order ID' } });
        }
        return;
      }

      try {
        const order = await api.getOrder(parseInt(orderId));

        if (success) {
          const paymentId = order.meta_data?.find(meta => meta.key === 'konnect_payment_id')?.value;

          if (!paymentId) {
            if (isInIframe && parentOrigin) {
              window.parent.postMessage({ type: 'konnectPaymentResult', success: false, error: 'Payment ID not found for verification' }, parentOrigin);
            } else {
              navigate('/thank-you', { state: { error: 'Payment ID not found for verification' } });
            }
            return;
          }

          const verification = await api.verifyKonnectPayment(paymentId);

          if (verification.status === 'completed') {
            await api.updateOrder(parseInt(orderId), { status: 'completed' });
            if (isInIframe && parentOrigin) {
              window.parent.postMessage({ type: 'konnectPaymentResult', success: true, orderId: parseInt(orderId) }, parentOrigin);
            } else {
              navigate('/thank-you', { state: { order } });
            }
          } else {
            // Payment verification failed, set order status to on-hold
            await api.updateOrder(parseInt(orderId), { status: 'on-hold' });
            if (isInIframe && parentOrigin) {
              window.parent.postMessage({ type: 'konnectPaymentResult', success: false, orderId: parseInt(orderId), error: 'Payment verification failed' }, parentOrigin);
            } else {
              navigate('/thank-you', { state: { error: 'Payment verification failed' } });
            }
          }
        } else {
          // Payment failed, set order status to on-hold
          await api.updateOrder(parseInt(orderId), { status: 'on-hold' });
          if (isInIframe && parentOrigin) {
            window.parent.postMessage({ type: 'konnectPaymentResult', success: false, orderId: parseInt(orderId), error: 'Payment failed, please try again' }, parentOrigin);
          } else {
            navigate('/thank-you', { state: { error: 'Payment failed, please try again' } });
          }
        }
      } catch (error) {
        console.error('Error handling payment callback:', error);
        if (isInIframe && parentOrigin) {
          window.parent.postMessage({ type: 'konnectPaymentResult', success: false, error: 'Error processing payment callback' }, parentOrigin);
        } else {
          navigate('/thank-you', { state: { error: 'Error processing payment callback' } });
        }
      }
    };

    handleCallback();
  }, [success, location.search, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">Processing payment...</p>
      </div>
    </div>
  );
};

export default PaymentCallback;