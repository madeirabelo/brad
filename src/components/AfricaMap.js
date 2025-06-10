import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { API_URL, USE_LOCAL_STORAGE_FALLBACK, STORAGE_KEY, STORAGE_VERSION, INITIAL_VISITED_COUNTRIES } from '../config';
import './AfricaMap.css';
import countryToISOData from '../data/countryToISO.json';

// Get the country to ISO mapping from the JSON file
const countryToISO = countryToISOData.countries;

const GEOJSON_URL = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';

const AfricaMap = ({ showTitle = true }) => {
  const svgRef = useRef();
  const containerRef = useRef();
  const [visitedCountries, setVisitedCountries] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapData, setMapData] = useState(null);

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

  // Second effect: Fetch and filter map data
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching map data...');
        const response = await fetch(GEOJSON_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (!data.features || !Array.isArray(data.features)) {
          throw new Error('Invalid GeoJSON data structure');
        }

        // Filter for African countries
        const africaFeatures = data.features.filter(feature => {
          const countryName = feature.properties.name;
          
          // List of African country ISO codes and their alternative names
          const africaCountries = {
            'DZ': ['Algeria'],
            'AO': ['Angola'],
            'BJ': ['Benin'],
            'BW': ['Botswana'],
            'BF': ['Burkina Faso'],
            'BI': ['Burundi'],
            'CM': ['Cameroon'],
            'CV': ['Cape Verde'],
            'CF': ['Central African Republic'],
            'TD': ['Chad'],
            'KM': ['Comoros'],
            'CG': ['Congo', 'Republic of the Congo'],
            'CD': ['Democratic Republic of the Congo', 'Congo, Democratic Republic of the'],
            'CI': ['Ivory Coast', 'Côte d\'Ivoire'],
            'DJ': ['Djibouti'],
            'EG': ['Egypt'],
            'GQ': ['Equatorial Guinea'],
            'ER': ['Eritrea'],
            'ET': ['Ethiopia'],
            'GA': ['Gabon'],
            'GM': ['Gambia', 'The Gambia'],
            'GH': ['Ghana'],
            'GN': ['Guinea'],
            'GW': ['Guinea-Bissau'],
            'KE': ['Kenya'],
            'LS': ['Lesotho'],
            'LR': ['Liberia'],
            'LY': ['Libya'],
            'MG': ['Madagascar'],
            'MW': ['Malawi'],
            'ML': ['Mali'],
            'MR': ['Mauritania'],
            'MU': ['Mauritius'],
            'MA': ['Morocco'],
            'MZ': ['Mozambique'],
            'NA': ['Namibia'],
            'NE': ['Niger'],
            'NG': ['Nigeria'],
            'RW': ['Rwanda'],
            'ST': ['São Tomé and Príncipe'],
            'SN': ['Senegal'],
            'SC': ['Seychelles'],
            'SL': ['Sierra Leone'],
            'SO': ['Somalia'],
            'ZA': ['South Africa'],
            'SS': ['South Sudan'],
            'SD': ['Sudan'],
            'SZ': ['Eswatini', 'Swaziland'],
            'TZ': ['Tanzania', 'United Republic of Tanzania'],
            'TG': ['Togo'],
            'TN': ['Tunisia'],
            'UG': ['Uganda'],
            'ZM': ['Zambia'],
            'ZW': ['Zimbabwe']
          };
          
          // Check if the country name matches any of the alternative names
          return Object.entries(africaCountries).some(([iso, names]) => {
            const isMatch = names.some(name => name === countryName);
            if (isMatch) {
              console.log(`Matched ${countryName} to ISO ${iso}`);
            }
            return isMatch;
          });
        });

        console.log(`Found ${africaFeatures.length} African countries`);
        setMapData(africaFeatures);
      } catch (err) {
        console.error('Error loading map:', err);
        setError(`Failed to load map data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Third effect: Handle map rendering and window resize
  useEffect(() => {
    if (!mapData || !svgRef.current || !containerRef.current) return;

    const renderMap = () => {
      try {
        console.log('Rendering map...');
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        // Get container dimensions
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight - 50; // Subtract space for title

        // Set SVG dimensions
        svg.attr('width', containerWidth)
           .attr('height', containerHeight)
           .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`);

        // Calculate scale based on screen width and aspect ratio
        let scale;
        const aspectRatio = containerWidth / containerHeight;
        
        if (containerWidth > 1200) {
          // Large horizontal screens
          scale = containerWidth / (aspectRatio > 1.5 ? 5 : 3.5);
        } else if (containerWidth > 768) {
          // Medium screens
          scale = containerWidth / (aspectRatio > 1.5 ? 3.5 : 2.5);
        } else {
          // Mobile screens
          scale = containerWidth / 2;
        }

        // Create the projection centered on Africa
        const projection = d3.geoMercator()
          .center([20, 0]) // Center on Africa
          .scale(scale)
          .translate([containerWidth / 2, containerHeight / 2]);

        const path = d3.geoPath().projection(projection);

        // Create tooltip div
        const tooltipDiv = d3.select('body')
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

        // Draw the countries
        svg.append('g')
          .selectAll('path')
          .data(mapData)
          .enter()
          .append('path')
          .attr('d', path)
          .attr('fill', d => {
            const countryISO = countryToISO[d.properties.name];
            const isVisited = countryISO && visitedCountries.has(countryISO);
            return isVisited ? '#ffa500' : '#e9ecef';
          })
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 0.5)
          .on('mouseover', function(event, d) {
            const countryISO = countryToISO[d.properties.name];
            const isVisited = countryISO && visitedCountries.has(countryISO);
            d3.select(this)
              .attr('fill', isVisited ? '#ffb700' : '#dee2e6');
            tooltipDiv
              .style('visibility', 'visible')
              .style('opacity', '1')
              .html(d.properties.name)
              .style('left', (event.clientX + 15) + 'px')
              .style('top', (event.clientY - 15) + 'px');
          })
          .on('mousemove', function(event) {
            tooltipDiv
              .style('left', (event.clientX + 15) + 'px')
              .style('top', (event.clientY - 15) + 'px');
          })
          .on('mouseout', function(event, d) {
            const countryISO = countryToISO[d.properties.name];
            const isVisited = countryISO && visitedCountries.has(countryISO);
            d3.select(this)
              .attr('fill', isVisited ? '#ffa500' : '#e9ecef');
            tooltipDiv
              .style('visibility', 'hidden')
              .style('opacity', '0');
          });

        console.log('Map rendered successfully');
      } catch (err) {
        console.error('Error rendering map:', err);
        setError(`Failed to render map: ${err.message}`);
      }
    };

    // Initial render
    renderMap();

    // Handle window resize
    const handleResize = () => {
      renderMap();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      d3.selectAll('.tooltip').remove();
    };
  }, [mapData, visitedCountries]); // Re-run when map data or visited countries change

  if (loading) return <div className="loading">Loading map...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="map-container africa-map-container" ref={containerRef}>
      {showTitle && <h2>Map of Africa</h2>}
      <svg ref={svgRef}></svg>
      <div className="tooltip"></div>
    </div>
  );
};

export default AfricaMap; 