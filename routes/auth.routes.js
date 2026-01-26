// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

// Generate temp password
function generateTempPassword() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Helper function to create user in database
async function createUser(userData) {
    try {
        // Generate username from email
        const username = userData.email.split('@')[0];
        
        // Generate temp password
        const tempPassword = generateTempPassword();
        
        // Create user object
        const user = new User({
            username: username,
            email: userData.email.toLowerCase(),
            password: tempPassword, // Will be hashed
            tempPassword: tempPassword,
            forcePasswordReset: true,
            name: userData.name || userData.contactPerson,
            company: userData.company,
            phone: userData.phone,
            userType: userData.userType,
            roles: {
                [userData.userType]: true
            },
            companyType: userData.userType === 'manufacturer' ? 'OEM' : userData.userType,
            industry: userData.industry ? [userData.industry] : [],
            profileCompletion: 30,
            status: 'active'
        });
        
        await user.save();
        return { user, tempPassword };
        
    } catch (error) {
        throw error;
    }
}

// User registration endpoint
router.post('/register', async (req, res) => {
    try {
        const { userType, company, name, email, phone, industry } = req.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                error: 'User already exists' 
            });
        }
        
        // Create user
        const { user, tempPassword } = await createUser({
            userType, company, name, email, phone, industry
        });
        
        console.log('✅ User created:', user.email, 'Temp password:', tempPassword);
        
        res.json({ 
            success: true, 
            message: 'Account created successfully',
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                company: user.company,
                userType: user.userType
            },
            tempPassword: tempPassword // For testing, remove in production
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Registration failed',
            details: error.message 
        });
    }
});

// User login endpoint - UPDATED FOR YOUR FRONTEND
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('Login attempt for:', email);
        
        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid email or password' 
            });
        }
        
        // Check account status
        if (user.status !== 'active') {
            return res.status(401).json({ 
                success: false, 
                error: 'Account is not active. Please contact admin.' 
            });
        }
        
        // Verify password
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            console.log('Invalid password for:', email);
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid email or password' 
            });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user._id,
                email: user.email,
                userType: user.userType,
                company: user.company,
                name: user.name,
                forcePasswordReset: user.forcePasswordReset
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        
        console.log('✅ Login successful for:', user.email);
        
        res.json({
            success: true,
            token: token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                company: user.company,
                userType: user.userType,
                forcePasswordReset: user.forcePasswordReset,
                profileCompletion: user.profileCompletion
            },
            message: user.forcePasswordReset ? 
                'First login detected. Please reset your password.' : 
                'Login successful'
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Login failed. Please try again.' 
        });
    }
});

// Force password reset endpoint
router.post('/force-reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        
        console.log('Password reset for:', email);
        
        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
        
        // Update password
        user.password = newPassword;
        user.tempPassword = '';
        user.forcePasswordReset = false;
        await user.save();
        
        console.log('✅ Password reset for:', user.email);
        
        // Generate new token
        const token = jwt.sign(
            { 
                userId: user._id,
                email: user.email,
                userType: user.userType,
                company: user.company,
                name: user.name,
                forcePasswordReset: false
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            token: token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                company: user.company,
                userType: user.userType,
                forcePasswordReset: false
            },
            message: 'Password reset successful'
        });
        
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Password reset failed' 
        });
    }
});

// Check if user exists
router.post('/check', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (user) {
            res.json({ 
                exists: true, 
                userType: user.userType,
                forcePasswordReset: user.forcePasswordReset 
            });
        } else {
            res.json({ exists: false });
        }
    } catch (error) {
        res.status(500).json({ error: 'Check failed' });
    }
});

// Get current user profile
router.get('/me', async (req, res) => {
    try {
        // This requires authentication middleware
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password -tempPassword');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ success: true, user });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user profile' });
    }
});

module.exports = router;