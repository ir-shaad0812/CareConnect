"use client";

import { useState, useEffect, ReactNode } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { env } from "@/config/env";
import { paymentService } from "@/services/api/payment.service";

let stripePromise: Promise<Stripe | null> | null = null;

function getStripePromise(publishableKey: string): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

interface StripeProviderProps {
  children: ReactNode;
}

export function StripeProvider({ children }: StripeProviderProps) {
  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initStripe() {
      try {
        // First try env variable
        let key = env.STRIPE_PUBLISHABLE_KEY;

        // If not set, fetch from backend
        if (!key) {
          const response = await paymentService.getStripeConfig();
          if (response.success && response.data?.publishableKey) {
            key = response.data.publishableKey;
          }
        }

        if (key) {
          setStripe(getStripePromise(key));
        }
      } catch (error) {
        console.error("Failed to initialize Stripe:", error);
      } finally {
        setIsLoading(false);
      }
    }

    initStripe();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full border-2 border-gray-200" />
          <div className="absolute inset-0 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!stripe) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Payment system is not available at the moment.</p>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripe}
      options={{
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#4461F2",
            colorBackground: "#ffffff",
            colorText: "#1a1a1a",
            colorDanger: "#ef4444",
            fontFamily: "Inter, system-ui, sans-serif",
            spacingUnit: "4px",
            borderRadius: "8px",
          },
        },
      }}
    >
      {children}
    </Elements>
  );
}

export default StripeProvider;
