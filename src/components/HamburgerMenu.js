import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './HamburgerMenu.css';

const HamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItem, setExpandedItem] = useState(null);

  const menuItems = [
    { id: 1, text: 'Concerts', path: '/concerts' },
    { id: 2, text: 'Movies', path: '/movies' },
    { 
      id: 3, 
      text: 'Travels Toti & Tope', 
      path: '/travels',
      submenu: [
        { id: '3.1', text: 'Visited Countries', path: '/travels/countries' },
        { id: '3.2', text: 'World Map', path: '/travels/map' },
        { id: '3.3', text: 'Americas', path: '/travels/americas' },
        { id: '3.4', text: 'Europe', path: '/travels/europe' },
        { id: '3.5', text: 'Asia', path: '/travels/asia' },
        { id: '3.6', text: 'Africa', path: '/travels/africa' },
        { id: '3.7', text: 'Australia', path: '/travels/australia' },
        { id: '3.8', text: 'Visited Argentina', path: '/travels/visited-argentina' },
        { id: '3.9', text: 'Argentina Map', path: '/travels/argentina-map' }
      ]
    },
    { id: 4, text: 'Game Chess', path: '/chess' },
    { id: 5, text: 'Game Go', path: '/go' },
    { id: 6, text: 'Xiangqi - Chinese Chess', path: '/xiangqi' },
    { id: 7, text: 'Mandelbrot Fractal', path: '/mandelbrot' },
    { id: 8, text: 'Mandelbrot Fractal Movie', path: '/mandelbrot-movie' }
  ];

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setExpandedItem(null);
    }
  };

  const toggleSubmenu = (itemId) => {
    setExpandedItem(expandedItem === itemId ? null : itemId);
  };

  return (
    <div className="hamburger-menu-fixed">
      <button 
        className={`hamburger-button ${isOpen ? 'open' : ''}`}
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      <nav className={`menu-overlay ${isOpen ? 'open' : ''}`}>
        <ul className="main-menu">
          <li>
            <Link to="/" onClick={toggleMenu}>Home</Link>
          </li>
          {menuItems.map((item) => (
            <li key={item.id} className={item.submenu ? 'has-submenu' : ''}>
              {item.submenu ? (
                <div className="submenu-container">
                  <div 
                    className="menu-item-with-submenu"
                    onClick={() => toggleSubmenu(item.id)}
                  >
                    <span>{item.text}</span>
                    <span className={`submenu-arrow ${expandedItem === item.id ? 'expanded' : ''}`}>▼</span>
                  </div>
                  <ul className={`submenu ${expandedItem === item.id ? 'expanded' : ''}`}>
                    {item.submenu.map((subItem) => (
                      <li key={subItem.id}>
                        <Link to={subItem.path} onClick={() => {
                          setIsOpen(false);
                          setExpandedItem(null);
                        }}>
                          {subItem.text}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <Link to={item.path} onClick={() => setIsOpen(false)}>
                  {item.text}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default HamburgerMenu; 