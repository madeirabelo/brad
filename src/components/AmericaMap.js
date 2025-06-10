import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './WorldMap.css';
import countryToISOData from '../data/countryToISO.json';

// Get the country to ISO mapping from the JSON file
const countryToISO = countryToISOData.countries;

// List of American countries' ISO codes (2-letter)
const AMERICAS_ISO = [
  'AG','AR','BS','BB','BZ','BO','BR','CA','CL','CO','CR','CU','DM','DO','EC','SV','GD','GT','GY','HT','HN','JM','MX','NI','PA','PY','PE','KN','LC','VC','SR','TT','US','UY','VE'
];

const AmericaMap = () => {
  const svgRef = useRef();
  const tooltipRef = useRef();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    const container = svgRef.current.parentElement;
    const width = container.clientWidth;
    const height = 0.6 * container.clientHeight; // smaller than world map
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    // Tooltip
    const tooltipDiv = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '5px 10px')
      .style('border-radius', '4px')
      .style('font-size', '14px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');
    tooltipRef.current = tooltipDiv;

    d3.json('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
      .then(data => {
        // Filter to only American countries
        const features = data.features.filter(f => {
          const countryName = f.properties.name;
          const countryCode = countryToISO[countryName];
          return AMERICAS_ISO.includes(countryCode);
        });
        
        // Projection centered on Americas
        const projection = d3.geoMercator()
          .fitSize([
            width - margin.left - margin.right,
            height - margin.top - margin.bottom
          ], { type: 'FeatureCollection', features });
        const path = d3.geoPath().projection(projection);
        svg
          .attr('width', width)
          .attr('height', height);
        svg.selectAll('path')
          .data(features)
          .enter()
          .append('path')
          .attr('d', path)
          .attr('fill', '#e9ecef')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 0.5)
          .on('mouseover', function(event, d) {
            d3.select(this).attr('fill', '#b3c6e7');
            tooltipDiv
              .style('visibility', 'visible')
              .html(`${d.properties.name} (${countryToISO[d.properties.name] || 'N/A'})`)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 10) + 'px');
          })
          .on('mousemove', function(event) {
            tooltipDiv
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 10) + 'px');
          })
          .on('mouseout', function() {
            d3.select(this).attr('fill', '#e9ecef');
            tooltipDiv.style('visibility', 'hidden');
          });
        setIsLoading(false);
      })
      .catch(error => {
        setError('Failed to load Americas map');
        setIsLoading(false);
      });
    // Cleanup
    return () => {
      if (tooltipRef.current) tooltipRef.current.remove();
    };
  }, []);

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  return (
    <div className="america-map-container" style={{ width: '100%', height: '40vh', marginTop: '2rem' }}>
      {isLoading && <div className="loading">Loading Americas map...</div>}
      <svg ref={svgRef} className="america-map"></svg>
    </div>
  );
};

export default AmericaMap; 