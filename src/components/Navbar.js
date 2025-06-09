import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <ul>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/travels/countries">Countries</Link></li>
        <li><Link to="/travels/map">World Map</Link></li>
        <li><Link to="/travels/america-map">America Map</Link></li>
      </ul>
    </nav>
  );
};

export default Navbar; 