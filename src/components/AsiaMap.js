import React, { useState, useEffect } from 'react';
import * as d3 from 'd3';
import { API_URL, USE_LOCAL_STORAGE_FALLBACK, STORAGE_KEY, STORAGE_VERSION, INITIAL_VISITED_COUNTRIES } from '../config';
import './AsiaMap.css';
import countryToISOData from '../data/countryToISO.json';

// Get the country to ISO mapping from the JSON file
const countryToISO = countryToISOData.countries;

// List of Asian country codes
const ASIAN_COUNTRIES = [
  'CN', 'JP', 'KR', 'IN', 'ID', 'MY', 'SG', 'TH', 'VN', 'PH', 'MM', 'KH', 'LA', 'BD', 'NP', 'PK', 'LK', 'MV', 'BT', 'MN', 'KP', 'TW', 'HK', 'MO', 'BN', 'TL', 'PG', 'FJ', 'VU', 'SB', 'TO', 'WS', 'KI', 'NR', 'MH', 'PW', 'FM', 'CK', 'NU', 'PF', 'NC', 'WF'
];

const GEOJSON_URL = 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson';

const AsiaMap = () => {
  const [mapData, setMapData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visitedCountries, setVisitedCountries] = useState(new Set());

  // Load from localStorage
  const loadFromStorage = () => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      console.log('Loading from localStorage:', savedData);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        console.log('Parsed localStorage data:', parsedData);
        if (parsedData.version === STORAGE_VERSION) {
          const countries = parsedData.countries.map(code => code.toUpperCase());
          console.log('Setting visited countries from localStorage:', countries);
          setVisitedCountries(new Set(countries));
          return true;
        }
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
    return false;
  };

  // Fetch visited countries
  useEffect(() => {
    const fetchVisitedCountries = async () => {
      try {
        console.log('Attempting to fetch from API:', `${API_URL}/visited-countries/default-user`);
        const response = await fetch(`${API_URL}/visited-countries/default-user`);
        const data = await response.json();
        console.log('Raw API response:', data);
        
        // Convert country codes to uppercase for consistency
        const countries = data.countries.map(code => code.toUpperCase());
        console.log('Setting visited countries from API:', countries);
        setVisitedCountries(new Set(countries));
      } catch (error) {
        console.error('Error fetching visited countries:', error);
        if (USE_LOCAL_STORAGE_FALLBACK) {
          console.log('Falling back to localStorage...');
          if (!loadFromStorage()) {
            console.log('No data in localStorage, initializing with default data');
            const initialData = {
              version: STORAGE_VERSION,
              timestamp: new Date().toISOString(),
              countries: INITIAL_VISITED_COUNTRIES
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
            setVisitedCountries(new Set(INITIAL_VISITED_COUNTRIES));
          }
        } else {
          setError('Failed to fetch visited countries');
        }
      }
    };

    fetchVisitedCountries();
  }, []);

  // Fetch map data
  useEffect(() => {
    const fetchMapData = async () => {
      try {
        console.log('Fetching map data from:', GEOJSON_URL);
        const response = await fetch(GEOJSON_URL);
        const data = await response.json();
        
        // Log the first few features to understand the data structure
        console.log('First 3 features:', data.features.slice(0, 3).map(f => ({
          name: f.properties.name,
          iso: f.properties.ISO_A2,
          allProps: f.properties
        })));

        // Filter for Asian countries
        const asianData = {
          type: 'FeatureCollection',
          features: data.features.filter(f => {
            const countryName = f.properties.name;
            const countryCode = countryToISO[countryName];
            console.log(`Checking country: ${countryName}, Code: ${countryCode}`);
            
            const isAsian = countryCode && ASIAN_COUNTRIES.includes(countryCode);
            if (isAsian) {
              console.log(`Found Asian country: ${countryName} (${countryCode})`);
            }
            return isAsian;
          })
        };

        console.log('Filtered Asian countries:', asianData.features.map(f => ({
          name: f.properties.name,
          code: countryToISO[f.properties.name]
        })));
        
        if (asianData.features.length === 0) {
          console.error('No Asian countries found. Available countries:', 
            data.features.map(f => ({
              name: f.properties.name,
              code: countryToISO[f.properties.name]
            }))
          );
          throw new Error('No Asian countries found in the data');
        }

        console.log('Map data loaded successfully');
        setMapData(asianData);
      } catch (error) {
        console.error('Error fetching map data:', error);
        setError('Failed to load map data: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMapData();
  }, []);

  // Render map
  useEffect(() => {
    if (!mapData || !mapData.features) return;

    const renderMap = () => {
      try {
        console.log('Rendering map with visited countries:', Array.from(visitedCountries));
        const container = document.querySelector('.asia-map-container');
        if (!container) return;

        // Clear previous map
        container.innerHTML = '';

        // Create SVG element
        const svg = d3.select(container)
          .append('svg')
          .attr('width', '100%')
          .attr('height', '100%')
          .attr('viewBox', '0 0 1000 500')
          .attr('preserveAspectRatio', 'xMidYMid meet');

        // Create projection
        const projection = d3.geoMercator()
          .scale(300)
          .center([100, 30])
          .translate([500, 250]);

        // Create path generator
        const path = d3.geoPath().projection(projection);

        // Add tooltip div
        const tooltip = d3.select('body')
          .append('div')
          .attr('class', 'tooltip')
          .style('position', 'fixed')
          .style('visibility', 'hidden')
          .style('background-color', 'rgba(0, 0, 0, 0.8)')
          .style('color', 'white')
          .style('padding', '8px 12px')
          .style('border-radius', '4px')
          .style('font-size', '14px')
          .style('font-weight', 'bold')
          .style('pointer-events', 'none')
          .style('z-index', '9999')
          .style('box-shadow', '0 2px 4px rgba(0, 0, 0, 0.2)')
          .style('transition', 'opacity 0.2s');

        // Draw countries
        svg.selectAll('path')
          .data(mapData.features)
          .enter()
          .append('path')
          .attr('d', path)
          .attr('class', 'country')
          .attr('fill', d => {
            const countryName = d.properties.name;
            const countryCode = countryToISO[countryName];
            if (!countryCode) {
              console.warn(`No ISO code found for country: ${countryName}`);
              return '#ccc';
            }
            const isVisited = visitedCountries.has(countryCode);
            return isVisited ? '#FFA500' : '#e9ecef';
          })
          .attr('stroke', '#fff')
          .attr('stroke-width', 0.5)
          .on('mouseover', function(event, d) {
            const countryName = d.properties.name;
            const countryCode = countryToISO[countryName];
            const isVisited = countryCode && visitedCountries.has(countryCode);
            d3.select(this)
              .attr('fill', isVisited ? '#ff8c00' : '#dee2e6');
            
            tooltip
              .style('visibility', 'visible')
              .style('opacity', '1')
              .html(countryName)
              .style('left', (event.clientX + 15) + 'px')
              .style('top', (event.clientY - 15) + 'px');
          })
          .on('mousemove', function(event) {
            tooltip
              .style('left', (event.clientX + 15) + 'px')
              .style('top', (event.clientY - 15) + 'px');
          })
          .on('mouseout', function(event, d) {
            const countryName = d.properties.name;
            const countryCode = countryToISO[countryName];
            const isVisited = countryCode && visitedCountries.has(countryCode);
            d3.select(this)
              .attr('fill', isVisited ? '#FFA500' : '#e9ecef');
            
            tooltip
              .style('visibility', 'hidden')
              .style('opacity', '0');
          });

      } catch (error) {
        console.error('Error rendering map:', error);
      }
    };

    renderMap();
  }, [mapData, visitedCountries]);

  if (isLoading) return <div className="loading">Loading map...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="asia-map-container">
      <h2>Map of Asia</h2>
    </div>
  );
};

export default AsiaMap; 