import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NetworkSecurityDashboard from './components/NetworkSecurityDashboard';
import AllAttacks from './components/AllAttacks';

const App = () => {
  const [attacks, setAttacks] = useState([]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<NetworkSecurityDashboard attacks={attacks} setAttacks={setAttacks} />} />
        <Route path="/all-attacks" element={<AllAttacks attacks={attacks} />} />
      </Routes>
    </Router>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);