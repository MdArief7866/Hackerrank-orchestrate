import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import jitiPkg from 'jiti';
const createJiti = jitiPkg.createJiti || jitiPkg.default || jitiPkg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function readCSV(name) {
  return readFileSync(join(root, 'dataset', name), 'utf-8');
}

const texts = {
  requests: readCSV('requests.csv'),
  profiles: readCSV('financial_profiles.csv'),
  events: readCSV('financial_events.csv'),
  exchangeRates: readCSV('exchange_rates.csv'),
  paymentOptions: readCSV('request_payment_options.csv'),
  messages: readCSV('messages.csv'),
  images: readCSV('images.csv'),
};

const jiti = createJiti(import.meta.url);
const { loadDatasetSync } = await jiti.import(join(root, 'src', 'data', 'dataset.ts'));
const { runAllDecisions } = await jiti.import(join(root, 'src', 'engine', 'decisionEngine.ts'));
const { generateOutputCSV } = await jiti.import(join(root, 'src', 'engine', 'outputGenerator.ts'));

const dataset = loadDatasetSync(texts);
const results = runAllDecisions(
  dataset.requests,
  dataset.profiles,
  dataset.events,
  dataset.exchangeRates,
  dataset.paymentOptions,
  dataset.messages,
  dataset.images
);

const csv = generateOutputCSV(results);
writeFileSync(join(root, 'output.csv'), csv);
console.log(`Generated output.csv with ${results.length} rows`);
