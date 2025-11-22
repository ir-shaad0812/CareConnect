// ============================================
// USE LOGIN FORM HOOK
// Manages login form state and validation
// ============================================

'use client';

import { useState, useCallback } from 'react';
import { isValidEmail } from '@/shared/lib';
import type { LoginFormState, LoginFormErrors } from '../types';

interface UseLoginFormReturn {
  formData: LoginFormState;
  errors: LoginFormErrors;
  setField: (field: keyof LoginFormState, value: string) => void;
  validate: () => boolean;
  reset: () => void;
}

const initialState: LoginFormState = {
  email: '',
  password: '',
};

export function useLoginForm(): UseLoginFormReturn {
  const [formData, setFormData] = useState<LoginFormState>(initialState);
  const [errors, setErrors] = useState<LoginFormErrors>({});

  const setField = useCallback((field: keyof LoginFormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const validate = useCallback((): boolean => {
    const newErrors: LoginFormErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const reset = useCallback(() => {
    setFormData(initialState);
    setErrors({});
  }, []);

  return {
    formData,
    errors,
    setField,
    validate,
    reset,
  };
}
