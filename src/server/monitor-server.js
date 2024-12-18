const express = require('express');
const WebSocket = require('ws');
const NetworkMonitor = require('./networkMonitor');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Initialize Express App
const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Server Configuration
const CONFIG = {
    WEB_PORT: process.env.PORT || 8082,
    MONITOR_PORT: process.env.MONITOR_PORT || 3002
};

// WebSocket connections
let connections = new Set();

// Attack History Management
const attackHistory = {
    attacks: [],
    add(attack) {
        const timestamp = new Date().toISOString();
        attack.timestamp = timestamp;
        this.attacks.unshift(attack);
        broadcastAttack(attack);
    },
    getRecent(count = 3) {
        return this.attacks.slice(0, count);
    },
    getAll() {
        return this.attacks;
    }
};

// WebSocket connection handling
wss.on('connection', (ws) => {
    connections.add(ws);
    console.log('New WebSocket client connected');
    
    // Send initial attack history
    ws.send(JSON.stringify({
        type: 'initial',
        attacks: attackHistory.getAll()
    }));

    ws.on('close', () => {
        connections.delete(ws);
        console.log('Client disconnected');
    });
});

// Broadcast attack to all connected clients
function broadcastAttack(attack) {
    const message = JSON.stringify({
        type: 'attack',
        data: attack
    });
    
    connections.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Initialize Network Monitor
const monitor = new NetworkMonitor();
monitor.setAttackCallback((attack) => {
    attackHistory.add(attack);
});

monitor.init().catch(error => {
    console.error('Failed to initialize network monitor:', error);
});

// Routes
app.get('/api/attacks', (req, res) => {
    res.json(attackHistory.getAll());
});

app.get('/api/attacks/recent', (req, res) => {
    res.json(attackHistory.getRecent());
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error Handling
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// Start the server
server.listen(CONFIG.WEB_PORT, () => {
    console.log(`Web server running on port ${CONFIG.WEB_PORT}`);
});

// Graceful Shutdown
function gracefulShutdown() {
    console.log('Shutting down gracefully...');
    server.close(() => {
        console.log('Web server closed');
        process.exit(0);
    });
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);