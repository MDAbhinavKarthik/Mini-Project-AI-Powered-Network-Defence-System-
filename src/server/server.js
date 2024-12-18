const express = require('express');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const NetworkMonitor = require('./networkMonitor');

const app = express();
const port = process.env.PORT || 8080;

// Initialize network monitor
const networkMonitor = new NetworkMonitor();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../../public')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const hash = crypto.createHash('sha256');
    hash.update(file.originalname + Date.now());
    cb(null, hash.digest('hex') + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Create WebSocket server
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  // Initialize network monitoring
  networkMonitor.init().catch(console.error);
});

const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();

// WebSocket connection handling
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('New client connected');

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected');
  });
});

// Set up attack notification callback
networkMonitor.setAttackCallback((attack) => {
  // Broadcast attack information to all connected clients
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(attack));
    }
  });
});

// API Routes
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      name: req.file.originalname,
      status: 'protected',
      uploadTime: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Serve index.html for all routes to support client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

module.exports = app;