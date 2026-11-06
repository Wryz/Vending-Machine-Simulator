import { create } from 'zustand';

import { CURRENCIES, type Currency } from '@/config/currency';
import { currencyForCountry } from '@/ui/currency';

/**
 * The currency in-game money shows in: the open city's (SPEC §6.3). Set by
 * useGame.openCity from the city's country; money formatting in
 * src/ui/format.ts reads it, so call sites keep passing US cents.
 */
interface CurrencyStore {
  currency: Currency;
}

export const useCurrency = create<CurrencyStore>(() => ({ currency: CURRENCIES.USD }));

export function setCurrencyForCountry(countryCode: string | null | undefined): void {
  const currency = currencyForCountry(countryCode);
  if (useCurrency.getState().currency.code !== currency.code) useCurrency.setState({ currency });
}

export function currentCurrency(): Currency {
  return useCurrency.getState().currency;
}
