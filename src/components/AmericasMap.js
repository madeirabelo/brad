import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './AmericasMap.css';

const API_URL = 'http://192.168.31.33:5050/api';
const GEOJSON_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson';

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
        
        // Filter for Americas countries, excluding Greenland
        const americasFeatures = data.features.filter(feature => {
          const props = feature.properties;
          const continent = props.CONTINENT;
          const name = props.NAME;
          
          const isAmericas = 
            (continent === 'North America' || 
            continent === 'South America') &&
            name !== 'Greenland'; // Exclude Greenland
          
          return isAmericas;
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
        const container = document.getElementById('americas-map-container');
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

        // Create projection centered on Americas
        const projection = d3.geoMercator()
          .fitSize([width, height], mapData)
          .translate([width / 2, height / 2])
          .scale(width / 2.5);

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
            const countryCode = d.properties.iso_a2;
            return visitedCountries.has(countryCode) ? '#ffa500' : '#e9ecef';
          })
          .attr('stroke', '#fff')
          .attr('stroke-width', 0.5)
          .on('mouseover', function(event, d) {
            d3.select(this)
              .attr('fill', visitedCountries.has(d.properties.iso_a2) ? '#ff8c00' : '#dee2e6');
            
            tooltip.transition()
              .duration(200)
              .style('opacity', .9);
            
            tooltip.html(d.properties.name)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 28) + 'px');
          })
          .on('mouseout', function(event, d) {
            d3.select(this)
              .attr('fill', visitedCountries.has(d.properties.iso_a2) ? '#ffa500' : '#e9ecef');
            
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