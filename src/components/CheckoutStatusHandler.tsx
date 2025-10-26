import { useCheckoutStatus } from '@/hooks/useCheckoutStatus';

export const CheckoutStatusHandler = () => {
  useCheckoutStatus();
  return null;
};
