import React, { useState, useEffect, useCallback } from 'react';
import './Movies.css';

const Movies = () => {
  const [movies, setMovies] = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('movie'); // 'movie' or 'vol'

  useEffect(() => {
    fetchMovies();
  }, []);

  const filterAndSortMovies = useCallback(() => {
    let filtered = movies;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = movies.filter(movie =>
        movie.movie && movie.movie.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort movies
    filtered.sort((a, b) => {
      if (sortBy === 'movie') {
        return (a.movie || '').localeCompare(b.movie || '');
      } else if (sortBy === 'vol') {
        return (a.vol || '').localeCompare(b.vol || '');
      }
      return 0;
    });

    setFilteredMovies(filtered);
  }, [movies, searchQuery, sortBy]);

  useEffect(() => {
    filterAndSortMovies();
  }, [filterAndSortMovies]);

  const fetchMovies = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://192.168.31.71:5050/api/movies');
      if (!response.ok) {
        throw new Error('Failed to fetch movies');
      }
      const data = await response.json();
      setMovies(data.movies || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching movies:', err);
      setError('Failed to load movies. Please try again later.');
    } finally {
      setLoading(false);
    }
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
      <div className="movies-container">
        <div className="movies-loading">
          <div className="loading-spinner"></div>
          <p>Loading movies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="movies-container">
        <div className="movies-error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchMovies} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="movies-container">
      <div className="movies-header">
        <h1>Movies Collection</h1>
        <p className="movies-subtitle">
          Browse through {movies.length} movies in your collection
        </p>
      </div>

      <div className="movies-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search movies..."
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
            <option value="movie">Movie Name</option>
            <option value="vol">Volume</option>
          </select>
        </div>
      </div>

      <div className="movies-stats">
        <p>
          Showing {filteredMovies.length} of {movies.length} movies
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      </div>

      <div className="movies-table-container">
        {filteredMovies.length === 0 ? (
          <div className="no-results">
            <p>
              {searchQuery 
                ? `No movies found matching "${searchQuery}"`
                : 'No movies available'
              }
            </p>
            {searchQuery && (
              <button onClick={clearSearch} className="clear-search-button">
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <table className="movies-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Movie Name</th>
                <th>Volume</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovies.map((movie, index) => (
                <tr key={index} className="movie-row">
                  <td className="movie-number">{index + 1}</td>
                  <td className="movie-title-cell">
                    {movie.movie || 'Untitled Movie'}
                  </td>
                  <td className="movie-volume-cell">
                    {movie.vol || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="movies-help">
        <h3>To add new sources:</h3>
        <div className="command-box">
          <code>
            {`volume=$(ls /Volumes/ | grep -v Mac | awk '{print $0}')
gfind . -maxdepth 1 -printf "  - vol: $volume\\n    movie: \\"%P\\"\\n" >>  ~/Documents/sw/raspberryPi/brad/server/data/movies.yaml`}
          </code>
        </div>
      </div>
    </div>
  );
};

export default Movies; 