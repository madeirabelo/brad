import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { API_URL, USE_LOCAL_STORAGE_FALLBACK, STORAGE_KEY, STORAGE_VERSION } from '../config';
import countryToISOData from '../data/countryToISO.json';
import './AustraliaMap.css';

// Get the country to ISO mapping from the JSON file
const countryToISO = countryToISOData.countries;

const AustraliaMap = ({ showTitle = true }) => {
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
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (parsedData.version === STORAGE_VERSION) {
          setVisitedCountries(new Set(parsedData.countries));
          return true;
        }
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
    return false;
  };

  // First effect: Fetch visited countries
  useEffect(() => {
    console.log('Fetching visited countries...');
    const fetchVisitedCountries = async () => {
      try {
        const response = await fetch(`${API_URL}/visited-countries/default-user`);
        const data = await response.json();
        console.log('Raw API response:', data);
        
        // Convert country codes to uppercase for consistency
        const countries = data.countries.map(code => code.toUpperCase());
        console.log('Converted to uppercase:', countries);
        
        setVisitedCountries(new Set(countries));
      } catch (error) {
        console.error('Error fetching visited countries:', error);
        if (USE_LOCAL_STORAGE_FALLBACK) {
          console.log('Falling back to localStorage...');
          if (!loadFromStorage()) {
            setError('Failed to fetch visited countries and no local data available');
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
        const response = await fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (!data.features || !Array.isArray(data.features)) {
          throw new Error('Invalid GeoJSON data structure');
        }

        // Filter for Australia and Oceania countries
        const oceaniaFeatures = data.features.filter(feature => {
          const countryName = feature.properties.name;
          
          // List of Australia and Oceania country ISO codes and their alternative names
          const oceaniaCountries = {
            'AU': ['Australia'],
            'FJ': ['Fiji'],
            'KI': ['Kiribati'],
            'MH': ['Marshall Islands'],
            'FM': ['Micronesia', 'Federated States of Micronesia'],
            'NR': ['Nauru'],
            'NZ': ['New Zealand'],
            'PW': ['Palau'],
            'PG': ['Papua New Guinea'],
            'WS': ['Samoa'],
            'SB': ['Solomon Islands'],
            'TO': ['Tonga'],
            'TV': ['Tuvalu'],
            'VU': ['Vanuatu'],
            'NC': ['New Caledonia'],
            'PF': ['French Polynesia'],
            'GU': ['Guam'],
            'MP': ['Northern Mariana Islands'],
            'AS': ['American Samoa'],
            'CK': ['Cook Islands'],
            'NU': ['Niue'],
            'NF': ['Norfolk Island'],
            'PN': ['Pitcairn Islands'],
            'TK': ['Tokelau'],
            'WF': ['Wallis and Futuna']
          };
          
          // Check if the country name matches any of the alternative names
          return Object.entries(oceaniaCountries).some(([iso, names]) => {
            const isMatch = names.some(name => name === countryName);
            if (isMatch) {
              console.log(`Matched ${countryName} to ISO ${iso}`);
            }
            return isMatch;
          });
        });

        console.log(`Found ${oceaniaFeatures.length} Australia and Oceania countries`);
        setMapData(oceaniaFeatures);
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

        // Create the projection centered on Australia
        const projection = d3.geoMercator()
          .center([135, -25]) // Center on Australia
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
    <div className="map-container australia-map-container" ref={containerRef}>
      {showTitle && <h2>Map of Australia and Oceania</h2>}
      <svg ref={svgRef}></svg>
      <div className="tooltip"></div>
    </div>
  );
};

export default AustraliaMap; 