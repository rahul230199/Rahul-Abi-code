// server.js - FIXED VERSION
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const manufacturerRoutes = require('./routes/manufacturer.routes');
const supplierRoutes = require('./routes/supplier.routes');

// Import models
require('./models/User');
require('./models/ManufacturerMetrics');
require('./models/ActiveProgram');
require('./models/DemandListing');
require('./models/SourcingRequest');

const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Database connection - FIXED: Removed old options
const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://axo:Admin1234@cluster0.2oo74ku.mongodb.net/axo?retryWrites=true&w=majority';
mongoose.connect(mongoURI)
.then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log(`📁 Database: ${mongoose.connection.db.databaseName}`);
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('💡 Check your connection string in .env file');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/manufacturer', manufacturerRoutes);
app.use('/api/supplier', supplierRoutes);

// Health check endpoint
app.get('/api/_health', (req, res) => {
    res.json({ 
        status: 'up', 
        timestamp: new Date(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

app.get('/manufacturer-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'manufacturer-dashboard.html'));
});

app.get('/supplier-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'supplier-dashboard.html'));
});

app.get('/oem-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'oem-dashboard.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('🔥 Server Error:', err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});