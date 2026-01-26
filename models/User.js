const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Basic info
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    tempPassword: String,
    forcePasswordReset: {
        type: Boolean,
        default: true
    },
    name: {
        type: String,
        required: true
    },
    company: {
        type: String,
        required: true
    },
    phone: String,
    
    // User role and type
    userType: {
        type: String,
        enum: ['manufacturer', 'supplier', 'buyer', 'oem', 'admin', 'both'],
        default: 'supplier'
    },
    roles: {
        manufacturer: { type: Boolean, default: false },
        supplier: { type: Boolean, default: false },
        buyer: { type: Boolean, default: false },
        oem: { type: Boolean, default: false },
        admin: { type: Boolean, default: false }
    },
    
    // Company profile
    companyType: String,
    industry: [String],
    location: String,
    certifications: [String],
    manufacturingCapacity: String,
    website: String,
    
    // Dashboard stats
    profileCompletion: { type: Number, default: 0 },
    reliabilityScore: { type: Number, default: 100 },
    completedOrders: { type: Number, default: 0 },
    pendingOrders: { type: Number, default: 0 },
    responseRate: { type: Number, default: 0 },
    
    // Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'pending'],
        default: 'pending'
    },
    
    // Timestamps
    lastLogin: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        try {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        } catch (error) {
            return next(error);
        }
    }
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        // First check against temporary password (plain text)
        if (candidatePassword === this.tempPassword) {
            return true;
        }
        // Then check against hashed password
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

// Update timestamp
userSchema.pre('findOneAndUpdate', function(next) {
    this.set({ updatedAt: new Date() });
    next();
});

module.exports = mongoose.model('User', userSchema);