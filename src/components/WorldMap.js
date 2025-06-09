import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './WorldMap.css';
import countryToISOData from '../data/countryToISO.json';

const API_URL = 'http://192.168.31.33:5050/api';

// Temporary fallback mapping in case YAML loading fails
const fallbackCountryToISO = {
  'France': 'FR',
  'Germany': 'DE',
  'Italy': 'IT',
  'Spain': 'ES',
  'United Kingdom': 'GB',
  'United States': 'US'
};

// Get the country to ISO mapping from the JSON file
const countryToISO = countryToISOData.countries;

const WorldMap = () => {
  const svgRef = useRef();
  const tooltipRef = useRef();
  const [visitedCountries, setVisitedCountries] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch visited countries
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

  // Render map
  useEffect(() => {
    console.log('Starting map render...');
    console.log('Current visited countries:', visitedCountries);
    console.log('Country to ISO mapping:', countryToISO);
    
    if (!svgRef.current) {
      console.log('SVG ref not ready');
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Get the container dimensions
    const container = svgRef.current.parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    console.log('Container dimensions:', { width, height });

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    const projection = d3.geoMercator()
      .fitSize([width - margin.left - margin.right, height - margin.top - margin.bottom], { type: 'Sphere' });

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

    // Store tooltip div reference
    tooltipRef.current = tooltipDiv;

    // Load world data
    console.log('Loading world data...');
    d3.json('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
      .then(data => {
        console.log('World data loaded');
        console.log('Number of countries:', data.features.length);

        // Debug: Log all country codes and their properties
        console.log('All country codes with properties:', data.features.map(f => ({
          name: f.properties.name,
          iso_a2: countryToISO[f.properties.name] || 'unknown'
        })));
        console.log('Visited country codes:', Array.from(visitedCountries));

        // Draw countries
        svg.selectAll('path')
          .data(data.features)
          .enter()
          .append('path')
          .attr('d', path)
          .attr('class', d => {
            const countryISO = countryToISO[d.properties.name];
            const isVisited = countryISO && visitedCountries.has(countryISO);
            console.log(`Country ${d.properties.name} (${countryISO}) visited:`, isVisited);
            return `country ${isVisited ? 'visited' : ''}`;
          })
          .attr('fill', d => {
            const countryISO = countryToISO[d.properties.name];
            const isVisited = countryISO && visitedCountries.has(countryISO);
            const fill = isVisited ? '#ffa500' : '#e9ecef';
            console.log(`Setting fill for ${d.properties.name}: ${fill}`);
            return fill;
          })
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 0.5)
          .on('mouseover', function(event, d) {
            const countryISO = countryToISO[d.properties.name];
            const isVisited = countryISO && visitedCountries.has(countryISO);
            d3.select(this)
              .attr('fill', isVisited ? '#ffb700' : '#dee2e6');
            
            const countryName = d.properties.name;
            tooltipDiv
              .style('visibility', 'visible')
              .style('opacity', '1')
              .html(countryName)
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

        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error loading world data:', error);
        setError('Failed to load world map data');
        setIsLoading(false);
      });

    // Handle window resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      const isMobile = newWidth < 768;
      const newScale = isMobile ? newWidth / 6 : newWidth / 3 / Math.PI;

      // Update SVG dimensions
      svg
        .attr('width', newWidth)
        .attr('height', newHeight);

      // Update projection
      projection
        .scale(newScale)
        .translate([newWidth / 2, newHeight / 2]);

      // Update paths
      svg.selectAll('path')
        .attr('d', path);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (tooltipRef.current) {
        tooltipRef.current.remove();
      }
    };
  }, [visitedCountries]); // Re-run when visited countries change

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  return (
    <div className="map-container">
      <h2>World Map</h2>
      <div className="world-map-container">
        {isLoading && <div className="loading">Loading map...</div>}
        <svg ref={svgRef} className="world-map"></svg>
      </div>
    </div>
  );
};

export default WorldMap; 