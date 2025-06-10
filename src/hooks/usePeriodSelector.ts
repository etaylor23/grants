import { useState, useEffect, useCallback } from 'react';
import { PeriodOption } from '../components/PeriodSelector';

const PERIOD_STORAGE_KEY = 'grants-app-selected-period';

export interface UsePeriodSelectorReturn {
  selectedPeriod: string;
  selectedPeriodOption: PeriodOption | null;
  handlePeriodChange: (periodId: string, periodOption: PeriodOption) => void;
  resetToDefault: () => void;
}

export const usePeriodSelector = (defaultPeriod: string = 'monthly'): UsePeriodSelectorReturn => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>(defaultPeriod);
  const [selectedPeriodOption, setSelectedPeriodOption] = useState<PeriodOption | null>(null);

  // Load saved period from localStorage on mount
  useEffect(() => {
    try {
      const savedPeriod = localStorage.getItem(PERIOD_STORAGE_KEY);
      if (savedPeriod) {
        setSelectedPeriod(savedPeriod);
      }
    } catch (error) {
      console.warn('Failed to load saved period from localStorage:', error);
    }
  }, []);

  // Save period to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(PERIOD_STORAGE_KEY, selectedPeriod);
    } catch (error) {
      console.warn('Failed to save period to localStorage:', error);
    }
  }, [selectedPeriod]);

  const handlePeriodChange = useCallback((periodId: string, periodOption: PeriodOption) => {
    setSelectedPeriod(periodId);
    setSelectedPeriodOption(periodOption);
    
    // Also save to sessionStorage for cross-component sharing
    try {
      sessionStorage.setItem('current-period-option', JSON.stringify(periodOption));
    } catch (error) {
      console.warn('Failed to save period option to sessionStorage:', error);
    }
  }, []);

  const resetToDefault = useCallback(() => {
    setSelectedPeriod(defaultPeriod);
    setSelectedPeriodOption(null);
    try {
      localStorage.removeItem(PERIOD_STORAGE_KEY);
      sessionStorage.removeItem('current-period-option');
    } catch (error) {
      console.warn('Failed to clear period storage:', error);
    }
  }, [defaultPeriod]);

  return {
    selectedPeriod,
    selectedPeriodOption,
    handlePeriodChange,
    resetToDefault,
  };
};
