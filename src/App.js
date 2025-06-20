import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import HamburgerMenu from './components/HamburgerMenu';
import WorldMap from './components/WorldMap';
import AsiaMap from './components/AsiaMap';
import AfricaMap from './components/AfricaMap';
import AustraliaMap from './components/AustraliaMap';
import VisitedCountries from './components/VisitedCountries';
import AmericaMap from './components/AmericaMap';
import AmericasMap from './components/AmericasMap';
import EuropeMap from './components/EuropeMap';
import ArgentinaMap from './components/ArgentinaMap';
import VisitedProvincias from './components/VisitedProvincias';
import VisitedArgentinaMap from './components/VisitedArgentinaMap';
import ChessGame from './components/Chess';
import Go from './components/Go';
import Xiangqi from './components/Xiangqi';
import { initializeLocalStorage } from './config';

function App() {
  // Initialize local storage with default data when the app starts
  useEffect(() => {
    initializeLocalStorage();
  }, []);

  return (
    <Router>
      <div className="App">
        <header>
          <HamburgerMenu />
        </header>
        <main>
          <Routes>
            <Route path="/" element={
              <div className="home-container">
                <h1>Welcome to Your Travel Map</h1>
                <p>Use the menu to explore different regions of the world and track your visited countries.</p>
              </div>
            } />
            <Route path="/travels/world" element={<WorldMap />} />
            <Route path="/travels/asia" element={<AsiaMap />} />
            <Route path="/travels/africa" element={<AfricaMap />} />
            <Route path="/travels/australia" element={<AustraliaMap />} />
            <Route path="/travels/countries" element={<VisitedCountries />} />
            <Route path="/travels/map" element={<WorldMap />} />
            <Route path="/travels/america-map" element={<AmericaMap />} />
            <Route path="/travels/americas" element={<AmericasMap />} />
            <Route path="/travels/europe" element={<EuropeMap />} />
            <Route path="/travels/argentina" element={<ArgentinaMap />} />
            <Route path="/travels/visited-argentina" element={<VisitedProvincias />} />
            <Route path="/travels/argentina-map" element={<VisitedArgentinaMap />} />
            <Route path="/chess" element={<ChessGame />} />
            <Route path="/go" element={<Go />} />
            <Route path="/xiangqi" element={<Xiangqi />} />
            <Route path="*" element={<h1>Page not found</h1>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
