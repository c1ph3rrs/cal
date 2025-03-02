const express = require("express");
const http = require("http");
const cors = require("cors");
// const https = require("https");
// const fs = require("fs");
const scheduleRoute = require('./routes/v1_1/schedule_route');
const servicesRoute = require('./routes/v1_1/services_route');

const app = express();
const server = http.createServer(app);

// SSL certificates
// const privateKey = fs.readFileSync("privkey.pem", "utf8");
// const certificate = fs.readFileSync("cert.pem", "utf8");
// const credentials = { key: privateKey, cert: certificate };

// const httpsServer = https.createServer(credentials, app);

const PORT_HTTP = 4000;
const PORT_HTTPS = 4001;

// Enable CORS for all origins
app.use(cors({
    origin: '*',  // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE'], 
    allowedHeaders: ['Content-Type', 'Authorization']
}));


// Middleware
app.use(express.json());

// Routes
app.use('/api/v1.1/cal/schedule', scheduleRoute);
app.use('/api/v1.1/cal/services', servicesRoute);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: err.message
    });
});



server.listen(PORT_HTTP, '192.168.0.101', () => {
    console.log(`Server running on http://0.0.0.0:${PORT_HTTP}`);
});
