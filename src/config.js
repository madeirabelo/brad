// API configuration
// In development: REACT_APP_API_URL=http://192.168.31.71:5050
// In production (Raspberry Pi): REACT_APP_API_URL=http://localhost:5050 or leave undefined
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050';
export const API_URL = `${API_BASE_URL}/api`;

// Fallback configuration
export const USE_LOCAL_STORAGE_FALLBACK = true;
export const STORAGE_KEY = 'visitedCountries';
export const STORAGE_VERSION = '1.0';

// Initial visited countries data
export const INITIAL_VISITED_COUNTRIES = [
  'GB',  // United Kingdom
  'US',  // United States
  'CR',  // Costa Rica
  'PY',  // Paraguay
  'PT',  // Portugal
  'ES',  // Spain
  'FR',  // France
  'NL',  // Netherlands
  'GR',  // Greece
  'IT',  // Italy
  'RU',  // Russia
  'PE',  // Peru
  'CN',  // China
  'JP',  // Japan
  'KR',  // South Korea
  'DE',  // Germany
  'AR',  // Argentina
  'BR',  // Brazil
  'MX',  // Mexico
  'PA'   // Panama
];

// Initialize localStorage with default data if empty
export const initializeLocalStorage = () => {
  try {
    // Force reinitialization by always setting the data
    const initialData = {
      version: STORAGE_VERSION,
      timestamp: new Date().toISOString(),
      countries: INITIAL_VISITED_COUNTRIES
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
    console.log('Local storage initialized with:', initialData);
  } catch (error) {
    console.error('Error initializing local storage:', error);
  }
}; 