import React, { useState, useEffect, useCallback } from 'react';
import './VisitedCountries.css';

const API_URL = 'http://localhost:5050/api';
const STORAGE_KEY = 'visitedCountries';
const STORAGE_VERSION = '1.0';

const VisitedCountries = () => {
  const [countries, setCountries] = useState([]);
  const [visitedCountries, setVisitedCountries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [error, setError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [userId] = useState('default-user'); // Removed setUserId since it's not used

  const saveToStorage = useCallback((data) => {
    try {
      const storageData = {
        version: STORAGE_VERSION,
        timestamp: new Date().toISOString(),
        countries: data
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
      setLastSaved(new Date().toISOString());
      console.log('Saved to localStorage:', storageData);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      setError('Failed to save your selections. Please check your browser storage settings.');
    }
  }, []);

  const loadFromStorage = useCallback(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        console.log('Loaded from localStorage:', parsedData);
        if (parsedData.version === STORAGE_VERSION) {
          setVisitedCountries(parsedData.countries);
          setLastSaved(parsedData.timestamp);
        } else {
          console.warn('Storage version mismatch, resetting data');
          saveToStorage([]);
        }
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      setError('Failed to load your saved selections.');
    }
  }, [saveToStorage]);

  const saveToServer = useCallback(async (data) => {
    try {
      const response = await fetch(`${API_URL}/visited-countries/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ countries: data }),
      });

      if (!response.ok) {
        throw new Error('Failed to save to server');
      }

      const result = await response.json();
      setLastSaved(result.lastUpdated);
      console.log('Saved to server:', result);
    } catch (error) {
      console.error('Error saving to server:', error);
      // Fallback to localStorage if server save fails
      saveToStorage(data);
    }
  }, [userId, saveToStorage]);

  const loadFromServer = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/visited-countries/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load from server');
      }

      const data = await response.json();
      setVisitedCountries(data.countries);
      setLastSaved(data.lastUpdated);
      console.log('Loaded from server:', data);
    } catch (error) {
      console.error('Error loading from server:', error);
      // Only fallback to localStorage if server is completely unreachable
      if (error.message === 'Failed to fetch') {
        loadFromStorage();
      } else {
        setError('Failed to load your saved selections from the server.');
      }
    }
  }, [userId, loadFromStorage]);

  useEffect(() => {
    let isMounted = true;

    const fetchCountries = async () => {
      try {
        console.log('Fetching countries...');
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,flags,cca2');
        
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        console.log('Received countries data:', data.length);
        
        if (isMounted) {
          const sortedCountries = data
            .map(country => ({
              name: country.name.common,
              flag: country.flags.svg,
              code: country.cca2
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
          
          console.log('Processed countries:', sortedCountries.length);
          setCountries(sortedCountries);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
        if (isMounted) {
          setError('Failed to load countries. Please try again later.');
          setLoading(false);
        }
      }
    };

    fetchCountries();
    loadFromServer();

    return () => {
      isMounted = false;
    };
  }, [loadFromServer]);

  const handleCountryToggle = useCallback((countryCode) => {
    setVisitedCountries(prev => {
      const newVisited = prev.includes(countryCode)
        ? prev.filter(code => code !== countryCode)
        : [...prev, countryCode];
      
      // Save to server (with localStorage fallback)
      saveToServer(newVisited);
      return newVisited;
    });
  }, [saveToServer]);

  const handleDropdownSelect = useCallback((event) => {
    const selectedCode = event.target.value;
    setSelectedCountry(selectedCode);
    if (selectedCode) {
      handleCountryToggle(selectedCode);
      setSelectedCountry(''); // Reset dropdown after selection
    }
  }, [handleCountryToggle]);

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="loading">Loading countries...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="visited-countries">
      <h1>Visited Countries</h1>
      <div className="search-container">
        <input
          type="text"
          placeholder="Search countries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select 
          value={selectedCountry}
          onChange={handleDropdownSelect}
          className="country-dropdown"
        >
          <option value="">Select a country...</option>
          {countries && countries.length > 0 ? (
            countries.map(country => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))
          ) : (
            <option value="" disabled>No countries available</option>
          )}
        </select>
      </div>

      {/* Visited Countries Section */}
      <div className="countries-section">
        <h2 className="section-title">Visited Countries ({visitedCountries.length})</h2>
        <div className="countries-grid">
          {filteredCountries
            .filter(country => visitedCountries.includes(country.code))
            .map(country => (
              <div key={country.code} className="country-card">
                <img 
                  src={country.flag} 
                  alt={`${country.name} flag`} 
                  className="country-flag"
                  loading="lazy"
                />
                <div className="country-info">
                  <span className="country-name">{country.name}</span>
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => handleCountryToggle(country.code)}
                    />
                    <span className="checkmark"></span>
                  </label>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Separator */}
      <div className="section-separator">
        <span>Not Visited Countries</span>
      </div>

      {/* Non-Visited Countries Section */}
      <div className="countries-section">
        <h2 className="section-title">Not Visited Countries ({countries.length - visitedCountries.length})</h2>
        <div className="countries-grid">
          {filteredCountries
            .filter(country => !visitedCountries.includes(country.code))
            .map(country => (
              <div key={country.code} className="country-card">
                <img 
                  src={country.flag} 
                  alt={`${country.name} flag`} 
                  className="country-flag"
                  loading="lazy"
                />
                <div className="country-info">
                  <span className="country-name">{country.name}</span>
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => handleCountryToggle(country.code)}
                    />
                    <span className="checkmark"></span>
                  </label>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="stats">
        <p>Total countries visited: {visitedCountries.length}</p>
        <p>Total countries: {countries.length}</p>
        {lastSaved && (
          <p className="last-saved">Last saved: {new Date(lastSaved).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
};

export default VisitedCountries; 