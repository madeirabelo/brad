import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import HamburgerMenu from './components/HamburgerMenu';
import VisitedCountries from './components/VisitedCountries';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <HamburgerMenu />
        </header>
        <main>
          <Routes>
            <Route path="/" element={<h1>Welcome to Brad</h1>} />
            <Route path="/travels/countries" element={<VisitedCountries />} />
            <Route path="*" element={<h1>Page not found</h1>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
