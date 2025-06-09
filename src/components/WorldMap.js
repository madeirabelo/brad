import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './WorldMap.css';

const API_URL = 'http://192.168.31.33:5050/api';

// Mapping of country names to ISO codes
const countryToISO = {
  // A
  'Afghanistan': 'AF',
  'Albania': 'AL',
  'Algeria': 'DZ',
  'Andorra': 'AD',
  'Angola': 'AO',
  'Antigua and Barbuda': 'AG',
  'Argentina': 'AR',
  'Armenia': 'AM',
  'Australia': 'AU',
  'Austria': 'AT',
  'Azerbaijan': 'AZ',
  // B
  'Bahamas': 'BS',
  'Bahrain': 'BH',
  'Bangladesh': 'BD',
  'Barbados': 'BB',
  'Belarus': 'BY',
  'Belgium': 'BE',
  'Belize': 'BZ',
  'Benin': 'BJ',
  'Bhutan': 'BT',
  'Bolivia': 'BO',
  'Bosnia and Herzegovina': 'BA',
  'Botswana': 'BW',
  'Brazil': 'BR',
  'Brunei': 'BN',
  'Bulgaria': 'BG',
  'Burkina Faso': 'BF',
  'Burundi': 'BI',
  // C
  'Cabo Verde': 'CV',
  'Cambodia': 'KH',
  'Cameroon': 'CM',
  'Canada': 'CA',
  'Central African Republic': 'CF',
  'Chad': 'TD',
  'Chile': 'CL',
  'China': 'CN',
  'Colombia': 'CO',
  'Comoros': 'KM',
  'Congo': 'CG',
  'Costa Rica': 'CR',
  'Croatia': 'HR',
  'Cuba': 'CU',
  'Cyprus': 'CY',
  'Czech Republic': 'CZ',
  'Czechia': 'CZ',
  // D
  'Denmark': 'DK',
  'Djibouti': 'DJ',
  'Dominica': 'DM',
  'Dominican Republic': 'DO',
  // E
  'Ecuador': 'EC',
  'Egypt': 'EG',
  'El Salvador': 'SV',
  'Equatorial Guinea': 'GQ',
  'Eritrea': 'ER',
  'Estonia': 'EE',
  'Eswatini': 'SZ',
  'Ethiopia': 'ET',
  // F
  'Fiji': 'FJ',
  'Finland': 'FI',
  'France': 'FR',
  // G
  'Gabon': 'GA',
  'Gambia': 'GM',
  'Georgia': 'GE',
  'Germany': 'DE',
  'Ghana': 'GH',
  'Greece': 'GR',
  'Grenada': 'GD',
  'Guatemala': 'GT',
  'Guinea': 'GN',
  'Guinea-Bissau': 'GW',
  'Guyana': 'GY',
  // H
  'Haiti': 'HT',
  'Honduras': 'HN',
  'Hungary': 'HU',
  // I
  'Iceland': 'IS',
  'India': 'IN',
  'Indonesia': 'ID',
  'Iran': 'IR',
  'Iraq': 'IQ',
  'Ireland': 'IE',
  'Israel': 'IL',
  'Italy': 'IT',
  'Ivory Coast': 'CI',
  // J
  'Jamaica': 'JM',
  'Japan': 'JP',
  'Jordan': 'JO',
  // K
  'Kazakhstan': 'KZ',
  'Kenya': 'KE',
  'Kiribati': 'KI',
  'Kuwait': 'KW',
  'Kyrgyzstan': 'KG',
  // L
  'Laos': 'LA',
  'Latvia': 'LV',
  'Lebanon': 'LB',
  'Lesotho': 'LS',
  'Liberia': 'LR',
  'Libya': 'LY',
  'Liechtenstein': 'LI',
  'Lithuania': 'LT',
  'Luxembourg': 'LU',
  // M
  'Madagascar': 'MG',
  'Malawi': 'MW',
  'Malaysia': 'MY',
  'Maldives': 'MV',
  'Mali': 'ML',
  'Malta': 'MT',
  'Marshall Islands': 'MH',
  'Mauritania': 'MR',
  'Mauritius': 'MU',
  'Mexico': 'MX',
  'Micronesia': 'FM',
  'Moldova': 'MD',
  'Monaco': 'MC',
  'Mongolia': 'MN',
  'Montenegro': 'ME',
  'Morocco': 'MA',
  'Mozambique': 'MZ',
  'Myanmar': 'MM',
  // N
  'Namibia': 'NA',
  'Nauru': 'NR',
  'Nepal': 'NP',
  'Netherlands': 'NL',
  'New Zealand': 'NZ',
  'Nicaragua': 'NI',
  'Niger': 'NE',
  'Nigeria': 'NG',
  'North Korea': 'KP',
  'North Macedonia': 'MK',
  'Norway': 'NO',
  // O
  'Oman': 'OM',
  // P
  'Pakistan': 'PK',
  'Palau': 'PW',
  'Palestine': 'PS',
  'Panama': 'PA',
  'Papua New Guinea': 'PG',
  'Paraguay': 'PY',
  'Peru': 'PE',
  'Philippines': 'PH',
  'Poland': 'PL',
  'Portugal': 'PT',
  // Q
  'Qatar': 'QA',
  // R
  'Romania': 'RO',
  'Russia': 'RU',
  'Rwanda': 'RW',
  // S
  'Saint Kitts and Nevis': 'KN',
  'Saint Lucia': 'LC',
  'Saint Vincent and the Grenadines': 'VC',
  'Samoa': 'WS',
  'San Marino': 'SM',
  'Sao Tome and Principe': 'ST',
  'Saudi Arabia': 'SA',
  'Senegal': 'SN',
  'Serbia': 'RS',
  'Seychelles': 'SC',
  'Sierra Leone': 'SL',
  'Singapore': 'SG',
  'Slovakia': 'SK',
  'Slovenia': 'SI',
  'Solomon Islands': 'SB',
  'Somalia': 'SO',
  'South Africa': 'ZA',
  'South Korea': 'KR',
  'South Sudan': 'SS',
  'Spain': 'ES',
  'Sri Lanka': 'LK',
  'Sudan': 'SD',
  'Suriname': 'SR',
  'Sweden': 'SE',
  'Switzerland': 'CH',
  'Syria': 'SY',
  // T
  'Taiwan': 'TW',
  'Tajikistan': 'TJ',
  'Tanzania': 'TZ',
  'Thailand': 'TH',
  'Timor-Leste': 'TL',
  'Togo': 'TG',
  'Tonga': 'TO',
  'Trinidad and Tobago': 'TT',
  'Tunisia': 'TN',
  'Turkey': 'TR',
  'Turkmenistan': 'TM',
  'Tuvalu': 'TV',
  // U
  'Uganda': 'UG',
  'Ukraine': 'UA',
  'United Arab Emirates': 'AE',
  'United Kingdom': 'GB',
  'United States': 'US',
  'United States of America': 'US',
  'USA': 'US',
  'Uruguay': 'UY',
  'Uzbekistan': 'UZ',
  // V
  'Vanuatu': 'VU',
  'Vatican City': 'VA',
  'Venezuela': 'VE',
  'Vietnam': 'VN',
  // Y
  'Yemen': 'YE',
  // Z
  'Zambia': 'ZM',
  'Zimbabwe': 'ZW'
};

const WorldMap = () => {
  const svgRef = useRef();
  const tooltipRef = useRef();
  const [visitedCountries, setVisitedCountries] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);

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
      }
    };

    fetchVisitedCountries();
  }, []);

  // Render map
  useEffect(() => {
    console.log('Starting map render...');
    console.log('Current visited countries:', visitedCountries);
    
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
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '5px 10px')
      .style('border-radius', '4px')
      .style('font-size', '14px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');

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
              .html(countryName)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 10) + 'px');
          })
          .on('mousemove', function(event) {
            tooltipDiv
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 10) + 'px');
          })
          .on('mouseout', function() {
            tooltipDiv.style('visibility', 'hidden');
          });

        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error loading world data:', error);
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

  return (
    <div className="world-map-container">
      {isLoading && <div className="loading">Loading map...</div>}
      <svg ref={svgRef} className="world-map"></svg>
    </div>
  );
};

export default WorldMap; 