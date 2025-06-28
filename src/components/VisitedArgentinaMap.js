import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { API_URL } from '../config';
import './ArgentinaMap.css';

const VisitedArgentinaMap = () => {
  const [visitedProvinces, setVisitedProvinces] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapData, setMapData] = useState(null);
  const containerRef = useRef(null);

  // GeoJSON URL for Argentine provinces
  const GEOJSON_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson';

  // Fetch visited provinces
  useEffect(() => {
    const fetchVisitedProvinces = async () => {
      try {
        const response = await fetch(`${API_URL}/visited-provincias/default-user`);
        if (response.ok) {
          const data = await response.json();
          // Convert array to Set for efficient lookups
          const provincesArray = data.provincias || [];
          setVisitedProvinces(new Set(provincesArray));
        }
      } catch (error) {
        console.error('Error fetching visited provinces:', error);
        // Ensure visitedProvinces is always a Set
        setVisitedProvinces(new Set());
      }
    };

    fetchVisitedProvinces();
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
        
        // Filter for Argentine provinces
        const argentinaProvinces = data.features.filter(feature => {
          const props = feature.properties;
          return props.admin === 'Argentina';
        });
        
        if (argentinaProvinces.length === 0) {
          throw new Error('No Argentine provinces found');
        }

        console.log('Found provinces data');
        setMapData({
          ...data,
          features: argentinaProvinces
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
        const container = document.querySelector('.argentina-map-container');
        if (!container) return;

        // Clear previous SVG and tooltip
        d3.select(container).select('svg').remove();
        d3.select('body').select('.tooltip').remove();

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

        // Create projection centered on Argentina
        const projection = d3.geoMercator()
          .center([-65, -43]) // Center on Argentina
          .scale(800)
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

        // Draw provinces
        svg.selectAll('path')
          .data(mapData.features)
          .enter()
          .append('path')
          .attr('d', path)
          .attr('fill', d => {
            // Ensure visitedProvinces is a Set
            const provincesSet = visitedProvinces instanceof Set ? visitedProvinces : new Set();
            return provincesSet.has(d.properties.name) ? '#ffa500' : '#e9ecef';
          })
          .attr('stroke', '#fff')
          .attr('stroke-width', 0.5)
          .on('mouseover', function(event, d) {
            const provincesSet = visitedProvinces instanceof Set ? visitedProvinces : new Set();
            d3.select(this)
              .attr('fill', provincesSet.has(d.properties.name) ? '#ff8c00' : '#dee2e6');
            
            tooltip
              .style('visibility', 'visible')
              .style('opacity', '1')
              .html(d.properties.name)
              .style('left', (event.clientX + 15) + 'px')
              .style('top', (event.clientY - 15) + 'px');
          })
          .on('mousemove', function(event) {
            tooltip
              .style('left', (event.clientX + 15) + 'px')
              .style('top', (event.clientY - 15) + 'px');
          })
          .on('mouseout', function(event, d) {
            const provincesSet = visitedProvinces instanceof Set ? visitedProvinces : new Set();
            d3.select(this)
              .attr('fill', provincesSet.has(d.properties.name) ? '#ffa500' : '#e9ecef');
            
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
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      // Clean up D3 elements
      const container = document.querySelector('.argentina-map-container');
      if (container) {
        d3.select(container).select('svg').remove();
      }
      d3.select('body').select('.tooltip').remove();
    };
  }, [mapData, visitedProvinces]);

  if (loading) return <div className="loading">Loading map...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="map-container argentina-map-container" ref={containerRef}>
      <h2>Visited Provinces of Argentina</h2>
      {/* D3 will manage the SVG element */}
    </div>
  );
};

export default VisitedArgentinaMap; 