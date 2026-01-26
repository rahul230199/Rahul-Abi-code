// middleware/auth.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No authentication token' });
        }
        
        const token = authHeader.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'No authentication token' });
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Add user info to request
        req.user = decoded;
        next();
        
    } catch (error) {
        console.error('Auth error:', error.message);
        res.status(401).json({ error: 'Invalid authentication token' });
    }
};

const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        // Check userType
        if (!roles.includes(req.user.userType)) {
            return res.status(403).json({ 
                error: 'Insufficient permissions. Required role: ' + roles.join(', ') 
            });
        }
        
        next();
    };
};

module.exports = { authMiddleware, requireRole };