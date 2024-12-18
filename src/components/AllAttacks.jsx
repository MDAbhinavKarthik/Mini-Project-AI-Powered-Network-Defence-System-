import React from 'react';
import { Link } from 'react-router-dom';

const AllAttacks = ({ attacks }) => {
  return (
    <div className="all-attacks-page">
      <header>
        <h1>All Network Attacks</h1>
        <Link to="/" className="back-button">Back to Dashboard</Link>
      </header>
      
      <main>
        <div className="attacks-list">
          {attacks.map((attack, index) => (
            <div key={index} className="attack-item">
              <h3>Attack Detected</h3>
              <p>IP Address: {attack.ipAddress}</p>
              <p>Hostname: {attack.hostname}</p>
              <p>Attack Type: {attack.type}</p>
              <p>Severity: {attack.severity}</p>
              <p>Time: {new Date(attack.timestamp).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AllAttacks;