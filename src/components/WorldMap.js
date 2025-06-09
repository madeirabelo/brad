import React, { useEffect, useState } from 'react';
import * as d3 from 'd3';
import './WorldMap.css';
import countryToISOData from '../data/countryToISO.json';

const API_URL = 'http://192.168.31.33:5050/api';
const GEOJSON_URL = 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson';

// Get the country to ISO mapping from the JSON file
const countryToISO = countryToISOData.countries;

const WorldMap = ({ showTitle = true }) => {
  const [visitedCountries, setVisitedCountries] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapData, setMapData] = useState(null);

  // Fetch visited countries
  useEffect(() => {
    const fetchVisitedCountries = async () => {
      try {
        const response = await fetch(`${API_URL}/visited-countries/default-user`);
        const data = await response.json();
        
        // Convert country codes to uppercase for consistency
        const countries = data.countries.map(code => code.toUpperCase());
        setVisitedCountries(new Set(countries));
      } catch (error) {
        console.error('Error fetching visited countries:', error);
        setError('Failed to fetch visited countries');
      }
    };

    fetchVisitedCountries();
  }, []);

  // Fetch map data
  useEffect(() => {
    const fetchMapData = async () => {
      try {
        const response = await fetch(GEOJSON_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setMapData(data);
      } catch (error) {
        console.error('Error loading world data:', error);
        setError('Failed to load world map data');
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
        const container = document.querySelector('.world-map-container');
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
          .fitSize([width, height], mapData)
          .translate([width / 2, height / 2]);

        // Create path generator
        const path = d3.geoPath().projection(projection);

        // Create tooltip
        const tooltip = d3.select(container)
          .append('div')
          .attr('class', 'tooltip')
          .style('opacity', 0);

        // Draw countries
        svg.selectAll('path')
          .data(mapData.features)
          .enter()
          .append('path')
          .attr('d', path)
          .attr('fill', d => {
            const countryISO = countryToISO[d.properties.name];
            const isVisited = countryISO && visitedCountries.has(countryISO);
            return isVisited ? '#ffa500' : '#e9ecef';
          })
          .attr('stroke', '#fff')
          .attr('stroke-width', 0.5)
          .on('mouseover', function(event, d) {
            const countryISO = countryToISO[d.properties.name];
            const isVisited = countryISO && visitedCountries.has(countryISO);
            d3.select(this)
              .attr('fill', isVisited ? '#ff8c00' : '#dee2e6');
            
            tooltip.transition()
              .duration(200)
              .style('opacity', .9);
            
            tooltip.html(d.properties.name)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 28) + 'px');
          })
          .on('mouseout', function(event, d) {
            const countryISO = countryToISO[d.properties.name];
            const isVisited = countryISO && visitedCountries.has(countryISO);
            d3.select(this)
              .attr('fill', isVisited ? '#ffa500' : '#e9ecef');
            
            tooltip.transition()
              .duration(500)
              .style('opacity', 0);
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

  if (isLoading) return <div className="loading">Loading map...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="map-container world-map-container">
      {showTitle && <h2>World Map</h2>}
      <div className="tooltip"></div>
    </div>
  );
};

export default WorldMap; 