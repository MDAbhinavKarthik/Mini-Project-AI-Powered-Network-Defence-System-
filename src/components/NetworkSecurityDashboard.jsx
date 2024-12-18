import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const NetworkSecurityDashboard = () => {
  const [attacks, setAttacks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Function to handle file uploads
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      setDocuments([...documents, data]);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  // Real-time attack monitoring
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');
    
    ws.onopen = () => {
      console.log('Connected to WebSocket server');
    };
    
    ws.onmessage = (event) => {
      const attack = JSON.parse(event.data);
      setAttacks(prevAttacks => {
        const newAttacks = [attack, ...prevAttacks];
        // Keep only the most recent attacks in state
        return newAttacks.slice(0, 50); // Store up to 50 attacks in memory
      });
      
      // Show notification for high severity attacks
      if (attack.severity === 'high') {
        setNotifications(prev => [...prev, {
          message: `High severity attack detected from ${attack.ipAddress}`,
          timestamp: new Date().toISOString()
        }]);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, []);

  // Get only the 3 most recent attacks
  const recentAttacks = attacks.slice(0, 3);

  return (
    <div className="dashboard">
      <header>
        <h1>Network Security Dashboard</h1>
      </header>
      
      <main>
        <section className="upload-section">
          <h2>Secure Document Upload</h2>
          <input 
            type="file" 
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.txt"
          />
        </section>

        <section className="attacks-section">
          <div className="section-header">
            <h2>Recent Attacks</h2>
            <Link to="/all-attacks" className="view-all-button">View All Attacks</Link>
          </div>
          <div className="attacks-list">
            {recentAttacks.map((attack, index) => (
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
        </section>

        <section className="documents-section">
          <h2>Protected Documents</h2>
          <div className="documents-list">
            {documents.map((doc, index) => (
              <div key={index} className="document-item">
                <p>Name: {doc.name}</p>
                <p>Status: {doc.status}</p>
                <p>Uploaded: {new Date(doc.uploadTime).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="notifications-section">
          <h2>Security Notifications</h2>
          <div className="notifications-list">
            {notifications.map((notif, index) => (
              <div key={index} className="notification-item">
                <p>{notif.message}</p>
                <small>{new Date(notif.timestamp).toLocaleString()}</small>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default NetworkSecurityDashboard;