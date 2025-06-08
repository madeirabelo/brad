import React, { useState } from 'react';
import './HamburgerMenu.css';

const HamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItem, setExpandedItem] = useState(null);

  const menuItems = [
    { id: 1, text: 'Concerts', path: '/concerts' },
    { 
      id: 2, 
      text: 'Travels Toti & Tope', 
      path: '/travels',
      submenu: [
        { id: '2.1', text: 'Visited Countries', path: '/travels/countries' },
        { id: '2.2', text: 'World Map', path: '/travels/map' }
      ]
    },
    { id: 3, text: 'Game Chess', path: '/chess' },
    { id: 4, text: 'Game Go', path: '/go' },
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
    <div className="hamburger-menu">
      <button 
        className={`hamburger-button ${isOpen ? 'open' : ''}`}
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      
      <nav className={`menu ${isOpen ? 'open' : ''}`}>
        <ul className="main-menu">
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
                        <a href={subItem.path} onClick={() => setIsOpen(false)}>
                          {subItem.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <a href={item.path} onClick={() => setIsOpen(false)}>
                  {item.text}
                </a>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default HamburgerMenu; 