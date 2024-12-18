        const net = require('net');
const os = require('os');
const dns = require('dns').promises;

class NetworkMonitor {
    constructor() {
        this.connections = new Map();
        this.attackCallback = null;
        this.lastCheck = Date.now();
        this.connectionCount = 0;
        this.DDOS_THRESHOLD = 100;
        this.blockedIPs = new Set();
        this.attackHistory = new Map();
    }

    setAttackCallback(callback) {
        this.attackCallback = callback;
    }

    async init() {
        this.server = net.createServer((socket) => {
            this.handleConnection(socket);
        });

        const port = 3002;
        this.server.listen(port, () => {
            console.log(`Network monitoring initialized on port ${port}`);
        });

        this.monitorResources();
        this.startBlockedIPsCleanup();
    }

    async getHostname(ip) {
        try {
            const hostnames = await dns.reverse(ip);
            return hostnames[0] || ip;
        } catch (error) {
            return ip;
        }
    }

    isIPBlocked(ip) {
        return this.blockedIPs.has(ip);
    }

    blockIP(ip, duration = 300000) { // 5 minutes by default
        this.blockedIPs.add(ip);
        setTimeout(() => {
            this.blockedIPs.delete(ip);
            console.log(`IP ${ip} has been unblocked`);
        }, duration);
    }

    startBlockedIPsCleanup() {
        setInterval(() => {
            console.log(`Currently blocked IPs: ${Array.from(this.blockedIPs).join(', ')}`);
        }, 60000); // Log blocked IPs every minute
    }

    async handleConnection(socket) {
        const clientIP = socket.remoteAddress;
        console.log(`[Connection] New connection from ${clientIP}`);

        if (this.isIPBlocked(clientIP)) {
            console.log(`[Security] Blocked connection attempt from ${clientIP}`);
            socket.end();
            return;
        }

        let dataBuffer = '';

        socket.on('data', (data) => {
            dataBuffer += data.toString();
            
            if (dataBuffer.includes('\n')) {
                try {
                    const messages = dataBuffer.split('\n');
                    for (const msg of messages) {
                        if (msg.trim()) {
                            const packet = JSON.parse(msg);
                            this.processPacket(packet, clientIP);
                        }
                    }
                } catch (err) {
                    console.error(`[Error] Failed to process packet from ${clientIP}:`, err.message);
                    if (this.attackCallback) {
                        this.attackCallback({
                            type: 'Malformed Data',
                            ip: clientIP,
                            severity: 'medium',
                            details: { error: err.message }
                        });
                    }
                    socket.end();
                }
                dataBuffer = '';
            }
        });

        socket.on('error', (err) => {
            console.error('[Error] Socket error:', err.message);
        });

        socket.on('end', () => {
            console.log(`[Connection] Client ${clientIP} disconnected`);
        });
    }

    isDDoSAttack(ip) {
        const connInfo = this.connections.get(ip);
        const connectionsPerSecond = connInfo.count;
        return connectionsPerSecond > this.DDOS_THRESHOLD;
    }

    isSQLInjection(payload) {
        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b.*\b(FROM|INTO|WHERE|TABLE)\b)/i,
            /'.*(\b(OR|AND)\b).*'/i,
            /--.*$/m,
            /;.*$/m
        ];
        return sqlPatterns.some(pattern => pattern.test(payload));
    }

    isXSSAttack(payload) {
        const xssPatterns = [
            /<script\b[^>]*>/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /<img[^>]+src[^>]*/i
        ];
        return xssPatterns.some(pattern => pattern.test(payload));
    }

    isCommandInjection(payload) {
        const cmdPatterns = [
            /[;&|`]|\$\(/,
            /\b(cat|grep|awk|sed|wget|curl|nc|bash|sh)\b/
        ];
        return cmdPatterns.some(pattern => pattern.test(payload));
    }

    async monitorResources() {
        setInterval(() => {
            const cpuUsage = os.loadavg()[0];
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const memUsage = ((totalMem - freeMem) / totalMem) * 100;

            if (cpuUsage > 80 || memUsage > 90) {
                this.notifyAttack({
                    type: 'Resource Exhaustion',
                    severity: 'Medium',
                    ip: 'System',
                    hostname: os.hostname(),
                    details: {
                        cpuUsage: `${cpuUsage.toFixed(2)}%`,
                        memoryUsage: `${memUsage.toFixed(2)}%`,
                        action: 'Monitoring'
                    }
                });
            }
        }, 5000);
    }

    notifyAttack(attackInfo) {
        // Add blocked IPs count to attack details
        attackInfo.details = {
            ...attackInfo.details,
            totalBlockedIPs: this.blockedIPs.size
        };

        if (this.attackCallback) {
            this.attackCallback(attackInfo);
        }
    }

    processPacket(packet, clientIP) {
        const timestamp = new Date().toISOString();
        let attackDetected = false;
        let attackInfo = null;

        // Initialize connection tracking
        if (!this.connections.has(clientIP)) {
            this.connections.set(clientIP, {
                count: 0,
                lastAccess: Date.now(),
                attackCount: 0,
                lastReset: Date.now()
            });
        }

        const connInfo = this.connections.get(clientIP);
        connInfo.count++;

        // Reset connection count periodically
        const now = Date.now();
        if (now - connInfo.lastReset > 1000) {
            connInfo.count = 1;
            connInfo.lastReset = now;
        }

        // Check for DDoS
        if (this.isDDoSAttack(clientIP)) {
            this.blockIP(clientIP);
            attackInfo = {
                type: 'DDoS Attack',
                ip: clientIP,
                timestamp,
                severity: 'high',
                details: {
                    connectionsPerSecond: connInfo.count,
                    blocked: true,
                    blockDuration: '5 minutes'
                }
            };
            attackDetected = true;
        }

        // Check for SQL Injection
        if (this.isSQLInjection(JSON.stringify(packet))) {
            attackInfo = {
                type: 'SQL Injection',
                ip: clientIP,
                timestamp,
                severity: 'critical',
                details: {
                    payload: JSON.stringify(packet).substring(0, 100),
                    blocked: true
                }
            };
            attackDetected = true;
        }

        // Check for XSS
        if (this.isXSSAttack(JSON.stringify(packet))) {
            attackInfo = {
                type: 'XSS Attack',
                ip: clientIP,
                timestamp,
                severity: 'high',
                details: {
                    payload: JSON.stringify(packet).substring(0, 100),
                    blocked: true
                }
            };
            attackDetected = true;
        }

        // Check for Command Injection
        if (this.isCommandInjection(JSON.stringify(packet))) {
            attackInfo = {
                type: 'Command Injection',
                ip: clientIP,
                timestamp,
                severity: 'critical',
                details: {
                    payload: JSON.stringify(packet).substring(0, 100),
                    blocked: true
                }
            };
            attackDetected = true;
        }

        if (attackDetected) {
            connInfo.attackCount++;
            console.log(`[Security] Attack detected from ${clientIP}. Attack count: ${connInfo.attackCount}`);
            
            if (connInfo.attackCount >= 3) {
                this.blockIP(clientIP);
                console.log(`[Security] IP ${clientIP} blocked due to multiple attacks`);
                if (attackInfo) {
                    attackInfo.details.blocked = true;
                }
            }

            if (attackInfo && this.attackCallback) {
                this.attackCallback(attackInfo);
            }
        }
    }
}

module.exports = NetworkMonitor;
