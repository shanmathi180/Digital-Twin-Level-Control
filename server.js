const express = require('express');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// Data storage
let currentData = { height: 0, setpoint: 6.5 };

// 1. Setup Serial Port (Ensure COM4 is correct for your PC)
const port = new SerialPort({ path: 'COM4', baudRate: 9600 }, (err) => {
    if (err) console.log("ERROR: COM4 is busy or not found. Close Arduino Serial Monitor!");
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

// 2. Parse Arduino String: "SP: 8.00  Level: 7.23  PWM: 145"
// --- Replace the parser.on('data'...) section with this ---
parser.on('data', (data) => {
    try {
        // This converts the Arduino string into a JavaScript Object
        const json = JSON.parse(data);

        currentData.height = json.level;
        currentData.setpoint = json.sp;

        // Log it so you can see it working in your terminal
        console.log(`Received -> Level: ${json.level}cm, SP: ${json.sp}cm`);
    } catch (e) {
        // If data is messy/incomplete, this prevents the server from crashing
        console.log("Waiting for clean data...");
    }
});

// 3. API Endpoints
app.get('/data', (req, res) => res.json(currentData));

app.post('/control', (req, res) => {
    const sp = req.body.setpoint;
    if (port.isOpen) {
        port.write(sp + "\n"); // Sends new setpoint back to Arduino
    }
    res.sendStatus(200);
});

app.listen(3000, () => console.log("Server Live: http://localhost:3000/3d.html"));
