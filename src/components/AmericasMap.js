import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './AmericasMap.css';
import countryToISOData from '../data/countryToISO.json';

const API_URL = 'http://192.168.31.33:5050/api';
const GEOJSON_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson';

// Get the country to ISO mapping from the JSON file
const countryToISO = countryToISOData.countries;

const AmericasMap = () => {
  const svgRef = useRef();
  const containerRef = useRef();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapData, setMapData] = useState(null);
  const [visitedCountries, setVisitedCountries] = useState(new Set());

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
        setError('Failed to fetch visited countries');
      }
    };

    fetchVisitedCountries();
  }, []);

  // Fetch and render map data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(GEOJSON_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (!data.features || !Array.isArray(data.features)) {
          throw new Error('Invalid GeoJSON data structure');
        }
        
        // Filter for Americas countries
        const americasFeatures = data.features.filter(feature => {
          const props = feature.properties;
          const continent = props.CONTINENT;
          const name = props.NAME;
          
          // Include both North and South American countries, but exclude Greenland
          return (continent === 'North America' || continent === 'South America') && 
                 name !== 'Greenland';
        });
        
        if (americasFeatures.length === 0) {
          throw new Error('No Americas countries found in the data');
        }

        console.log(`Found ${americasFeatures.length} Americas countries`);
        setMapData({
          ...data,
          features: americasFeatures
        });
      } catch (error) {
        console.error('Error fetching map data:', error);
        setError('Failed to load map data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Render map
  useEffect(() => {
    if (!mapData || !mapData.features) return;

    const renderMap = () => {
      try {
        const container = document.querySelector('.americas-map-container');
        if (!container) return;

        // Clear previous SVG
        d3.select(container).select('svg').remove();

        // Get container dimensions
        const { width, height } = container.getBoundingClientRect();
        if (width === 0 || height === 0) {
          console.warn('Container has zero dimensions');
          return;
        }

        // Create SVG
        const svg = d3.select(container)
          .append('svg')
          .attr('width', width)
          .attr('height', height);

        // Create projection
        const projection = d3.geoMercator()
          .center([-90, 0]) // Center on Americas
          .scale(200) // Reduced scale to show more of the continent
          .translate([width / 2, height / 2]);

        // Create path generator
        const path = d3.geoPath().projection(projection);

        // Create tooltip
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
          .attr('fill', d => {
            const countryISO = countryToISO[d.properties.NAME];
            const isVisited = countryISO && visitedCountries.has(countryISO);
            return isVisited ? '#ffa500' : '#e9ecef';
          })
          .attr('stroke', '#fff')
          .attr('stroke-width', 0.5)
          .on('mouseover', function(event, d) {
            const countryISO = countryToISO[d.properties.NAME];
            const isVisited = countryISO && visitedCountries.has(countryISO);
            d3.select(this)
              .attr('fill', isVisited ? '#ff8c00' : '#dee2e6');
            
            tooltip
              .style('visibility', 'visible')
              .style('opacity', '1')
              .html(d.properties.NAME)
              .style('left', (event.clientX + 15) + 'px')
              .style('top', (event.clientY - 15) + 'px');
          })
          .on('mousemove', function(event) {
            tooltip
              .style('left', (event.clientX + 15) + 'px')
              .style('top', (event.clientY - 15) + 'px');
          })
          .on('mouseout', function(event, d) {
            const countryISO = countryToISO[d.properties.NAME];
            const isVisited = countryISO && visitedCountries.has(countryISO);
            d3.select(this)
              .attr('fill', isVisited ? '#ffa500' : '#e9ecef');
            
            tooltip
              .style('visibility', 'hidden')
              .style('opacity', '0');
          });

        console.log('Map rendered successfully');
      } catch (error) {
        console.error('Error rendering map:', error);
        setError('Failed to render map');
      }
    };

    renderMap();

    // Handle window resize
    const handleResize = () => {
      renderMap();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mapData, visitedCountries]);

  if (loading) return <div className="loading">Loading map...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="map-container americas-map-container" ref={containerRef}>
      <h2>Map of the Americas</h2>
      <svg ref={svgRef}></svg>
      <div className="tooltip"></div>
    </div>
  );
};

export default AmericasMap; 