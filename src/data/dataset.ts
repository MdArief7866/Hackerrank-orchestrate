import type {
  Request,
  FinancialProfile,
  FinancialEvent,
  ExchangeRate,
  PaymentOption,
  Message,
  ImageRecord,
} from '@/types';
import {
  parseRequests,
  parseFinancialProfiles,
  parseFinancialEvents,
  parseExchangeRates,
  parsePaymentOptions,
  parseMessages,
  parseImages,
} from './csvParser';

export interface Dataset {
  requests: Request[];
  profiles: FinancialProfile[];
  events: FinancialEvent[];
  exchangeRates: ExchangeRate[];
  paymentOptions: PaymentOption[];
  messages: Message[];
  images: ImageRecord[];
}

let cachedDataset: Dataset | null = null;

export async function loadDataset(): Promise<Dataset> {
  if (cachedDataset) return cachedDataset;

  const fetchCSV = async (path: string): Promise<string> => {
    const res = await fetch(path);
    return res.text();
  };

  const [
    requestsText,
    profilesText,
    eventsText,
    ratesText,
    optionsText,
    messagesText,
    imagesText,
  ] = await Promise.all([
    fetchCSV('/dataset/requests.csv'),
    fetchCSV('/dataset/financial_profiles.csv'),
    fetchCSV('/dataset/financial_events.csv'),
    fetchCSV('/dataset/exchange_rates.csv'),
    fetchCSV('/dataset/request_payment_options.csv'),
    fetchCSV('/dataset/messages.csv'),
    fetchCSV('/dataset/images.csv'),
  ]);

  cachedDataset = {
    requests: parseRequests(requestsText),
    profiles: parseFinancialProfiles(profilesText),
    events: parseFinancialEvents(eventsText),
    exchangeRates: parseExchangeRates(ratesText),
    paymentOptions: parsePaymentOptions(optionsText),
    messages: parseMessages(messagesText),
    images: parseImages(imagesText),
  };

  return cachedDataset;
}

export function loadDatasetSync(
  texts: {
    requests: string;
    profiles: string;
    events: string;
    exchangeRates: string;
    paymentOptions: string;
    messages: string;
    images: string;
  }
): Dataset {
  return {
    requests: parseRequests(texts.requests),
    profiles: parseFinancialProfiles(texts.profiles),
    events: parseFinancialEvents(texts.events),
    exchangeRates: parseExchangeRates(texts.exchangeRates),
    paymentOptions: parsePaymentOptions(texts.paymentOptions),
    messages: parseMessages(texts.messages),
    images: parseImages(texts.images),
  };
}
