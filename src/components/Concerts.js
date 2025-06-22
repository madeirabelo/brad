import React, { useState, useEffect } from 'react';
import './Concerts.css';

const Concerts = () => {
  const [concerts, setConcerts] = useState([]);
  const [filteredConcerts, setFilteredConcerts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('concert'); // 'concert' or 'vol'

  useEffect(() => {
    fetchConcerts();
  }, []);

  useEffect(() => {
    filterAndSortConcerts();
  }, [concerts, searchQuery, sortBy]);

  const fetchConcerts = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5050/api/concerts');
      if (!response.ok) {
        throw new Error('Failed to fetch concerts');
      }
      const data = await response.json();
      setConcerts(data.concerts || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching concerts:', err);
      setError('Failed to load concerts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortConcerts = () => {
    let filtered = concerts;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = concerts.filter(concert =>
        concert.concert && concert.concert.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort concerts
    filtered.sort((a, b) => {
      if (sortBy === 'concert') {
        return (a.concert || '').localeCompare(b.concert || '');
      } else if (sortBy === 'vol') {
        return (a.vol || '').localeCompare(b.vol || '');
      }
      return 0;
    });

    setFilteredConcerts(filtered);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="concerts-container">
        <div className="concerts-loading">
          <div className="loading-spinner"></div>
          <p>Loading concerts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="concerts-container">
        <div className="concerts-error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchConcerts} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="concerts-container">
      <div className="concerts-header">
        <h1>Concerts Collection</h1>
        <p className="concerts-subtitle">
          Browse through {concerts.length} concerts in your collection
        </p>
      </div>

      <div className="concerts-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search concerts..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
          {searchQuery && (
            <button onClick={clearSearch} className="clear-search">
              ✕
            </button>
          )}
        </div>

        <div className="sort-container">
          <label htmlFor="sort-select">Sort by:</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={handleSortChange}
            className="sort-select"
          >
            <option value="concert">Concert Name</option>
            <option value="vol">Volume</option>
          </select>
        </div>
      </div>

      <div className="concerts-stats">
        <p>
          Showing {filteredConcerts.length} of {concerts.length} concerts
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      </div>

      <div className="concerts-table-container">
        {filteredConcerts.length === 0 ? (
          <div className="no-results">
            <p>
              {searchQuery 
                ? `No concerts found matching "${searchQuery}"`
                : 'No concerts available'
              }
            </p>
            {searchQuery && (
              <button onClick={clearSearch} className="clear-search-button">
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <table className="concerts-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Concert Name</th>
                <th>Volume</th>
              </tr>
            </thead>
            <tbody>
              {filteredConcerts.map((concert, index) => (
                <tr key={index} className="concert-row">
                  <td className="concert-number">{index + 1}</td>
                  <td className="concert-title-cell">
                    {concert.concert || 'Untitled Concert'}
                  </td>
                  <td className="concert-volume-cell">
                    {concert.vol || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="concerts-help">
        <h3>To add new sources:</h3>
        <div className="command-box">
          <code>
            {`volume=$(ls /Volumes/ | grep -v Mac | awk '{print $0}')
gfind . -maxdepth 2 \\
    ! -name "*.inf"  ! -path "*BDMV*" ! -path "*CERTIFICATE*" ! -path "*VIDEO_TS*" ! -name ".DS_Store"  ! -name "*.srt"  ! -name "*.txt" ! -name "*.jpg" ! -name "Scans" ! -name "Cover" \\
    -printf "  - vol: $volume\\n    concert: \\"%P\\"\\n"  >>  ~/Documents/sw/raspberryPi/brad/server/data/concerts.yaml`}
          </code>
        </div>
      </div>
    </div>
  );
};

export default Concerts; 