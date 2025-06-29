import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';

const ALL_PROVINCIAS = [
  "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos",
  "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro",
  "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán"
];

const USER = 'default-user';

const VisitedProvincias = () => {
  const [visited, setVisited] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadFromServer = async () => {
    try {
      const response = await fetch(`${API_URL}/visited-provincias/${USER}`);
      if (response.ok) {
        const data = await response.json();
        setVisited(data.provincias || []);
        setLoading(false);
        setLastUpdated(data.lastUpdated || null);
      }
    } catch (error) {
      console.error('Error loading from server:', error);
    }
  };

  const saveToServer = async (provinces) => {
    try {
      const response = await fetch(`${API_URL}/visited-provincias/${USER}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provinces,
          lastUpdated: new Date().toISOString()
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setLastUpdated(data.lastUpdated);
      }
    } catch (error) {
      console.error('Error saving to server:', error);
    }
  };

  useEffect(() => {
    loadFromServer();
  }, []);

  const toggleProvincia = (provincia) => {
    let updated;
    if (visited.includes(provincia)) {
      updated = visited.filter(p => p !== provincia);
    } else {
      updated = [...visited, provincia];
    }
    setVisited(updated);
    saveToServer(updated);
  };

  const handleDropdownChange = (e) => {
    const provincia = e.target.value;
    if (provincia) {
      toggleProvincia(provincia);
      setSelected(''); // Reset dropdown
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: 500, margin: '2rem auto', padding: 20, background: '#f8f9fa', borderRadius: 8 }}>
      <h2>Visited Provinces of Argentina</h2>
      <div style={{ marginBottom: 20 }}>
        <select value={selected} onChange={handleDropdownChange} style={{ width: '100%', padding: 8, fontSize: 16 }}>
          <option value="">-- Select a province to toggle --</option>
          {ALL_PROVINCIAS.map(provincia => (
            <option key={provincia} value={provincia}>
              {visited.includes(provincia) ? '✅ ' : ''}{provincia}
            </option>
          ))}
        </select>
      </div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {ALL_PROVINCIAS.map(provincia => (
          <li key={provincia} style={{ margin: '0.5rem 0', textAlign: 'left' }}>
            <label style={{ cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', textAlign: 'left' }}>
              <input
                type="checkbox"
                checked={visited.includes(provincia)}
                onChange={() => toggleProvincia(provincia)}
                style={{ marginRight: 8 }}
              />
              {provincia}
            </label>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 20 }}>
        <strong>Total visited:</strong> {visited.length} / {ALL_PROVINCIAS.length}
      </div>
      {lastUpdated && (
        <div style={{ marginTop: 20, fontSize: '0.8em', color: '#6c757d' }}>
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default VisitedProvincias; 