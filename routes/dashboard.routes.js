// routes/dashboard.routes.js
const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const ManufacturerMetrics = require('../models/ManufacturerMetrics');
const ActiveProgram = require('../models/ActiveProgram');
const DemandListing = require('../models/DemandListing');
const SourcingRequest = require('../models/SourcingRequest');

// Get dashboard data based on user type
router.get('/data', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const userType = req.user.userType;
        
        console.log('📊 Fetching dashboard for:', userType, userId);
        
        // Get user details
        const user = await User.findById(userId).select('-password -tempPassword');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        let dashboardData = {
            user: {
                id: user._id,
                name: user.name,
                company: user.company,
                userType: user.userType,
                profileCompletion: user.profileCompletion,
                status: user.status,
                lastLogin: user.lastLogin
            },
            quickStats: {},
            recentActivities: [],
            notifications: []
        };
        
        // Get data based on user type
        switch (userType) {
            case 'manufacturer':
            case 'oem':
                // Get manufacturer metrics
                const metrics = await ManufacturerMetrics.findOne({ manufacturerId: userId })
                    .sort({ createdAt: -1 });
                
                // Get active programs
                const activePrograms = await ActiveProgram.find({ 
                    manufacturerId: userId,
                    status: { $in: ['in-progress', 'planned'] }
                })
                .limit(5)
                .populate('supplierId', 'name company')
                .sort({ createdAt: -1 });
                
                // Get sourcing requests
                const sourcingRequests = await SourcingRequest.find({ 
                    manufacturerId: userId,
                    status: { $in: ['draft', 'published'] }
                })
                .limit(5)
                .sort({ createdAt: -1 });
                
                // Get demand listings (available to manufacturers)
                const demandListings = await DemandListing.find({ 
                    status: 'open',
                    visibility: { $in: ['public', 'invite-only'] }
                })
                .limit(5)
                .populate('buyerId', 'name company')
                .sort({ createdAt: -1 });
                
                dashboardData = {
                    ...dashboardData,
                    type: 'manufacturer',
                    metrics: metrics || {
                        activeProgramsCount: 0,
                        inProgressProgramsCount: 0,
                        completedProgramsCount: 0,
                        atRiskProgramsCount: 0,
                        executionHealthScore: 85,
                        timelineAdherenceStatus: 'On Track',
                        supplierReliabilityStatus: 'On Track',
                        qualityConsistencyStatus: 'On Track',
                        responseDisciplineStatus: 'On Track'
                    },
                    activePrograms: activePrograms || [],
                    sourcingRequests: sourcingRequests || [],
                    demandListings: demandListings || [],
                    quickStats: {
                        pendingQuotes: 3,
                        openRequests: sourcingRequests?.length || 0,
                        totalCapacity: 100,
                        utilizedCapacity: 65,
                        activePrograms: activePrograms?.length || 0
                    }
                };
                break;
                
            case 'supplier':
                // Get programs assigned to this supplier
                const supplierPrograms = await ActiveProgram.find({ 
                    supplierId: userId,
                    status: { $in: ['in-progress', 'planned'] }
                })
                .limit(5)
                .populate('manufacturerId', 'name company')
                .sort({ createdAt: -1 });
                
                // Get available demand listings
                const availableDemand = await DemandListing.find({ 
                    status: 'open',
                    $or: [
                        { visibility: 'public' },
                        { 
                            visibility: 'invite-only',
                            invitedSuppliers: { $in: [userId] }
                        }
                    ]
                })
                .limit(5)
                .populate('buyerId', 'name company')
                .sort({ createdAt: -1 });
                
                dashboardData = {
                    ...dashboardData,
                    type: 'supplier',
                    activePrograms: supplierPrograms || [],
                    availableDemand: availableDemand || [],
                    quickStats: {
                        activeOrders: user.pendingOrders || 0,
                        completedOrders: user.completedOrders || 0,
                        reliabilityScore: user.reliabilityScore || 100,
                        responseRate: user.responseRate || 0,
                        pendingQuotes: 2
                    },
                    capacityUtilization: {
                        total: user.manufacturingCapacity || '100 units',
                        utilized: '65 units',
                        available: '35 units'
                    }
                };
                break;
                
            case 'buyer':
                // Get demand listings by this buyer
                const buyerDemands = await DemandListing.find({ 
                    buyerId: userId 
                })
                .limit(5)
                .populate('awardedTo', 'name company')
                .sort({ createdAt: -1 });
                
                // Get active sourcing from manufacturers
                const buyerSourcing = await SourcingRequest.find({ 
                    status: 'published'
                })
                .limit(5)
                .populate('manufacturerId', 'name company')
                .sort({ createdAt: -1 });
                
                dashboardData = {
                    ...dashboardData,
                    type: 'buyer',
                    myDemands: buyerDemands || [],
                    availableSourcing: buyerSourcing || [],
                    quickStats: {
                        openRFQs: buyerDemands?.filter(d => d.status === 'open').length || 0,
                        activeOrders: buyerDemands?.filter(d => d.status === 'in-progress').length || 0,
                        completedOrders: buyerDemands?.filter(d => d.status === 'closed').length || 0,
                        pendingQuotes: 4
                    },
                    recommendedSuppliers: []
                };
                break;
                
            case 'admin':
                // Admin dashboard
                const totalUsers = await User.countDocuments();
                const activeUsers = await User.countDocuments({ status: 'active' });
                const totalPrograms = await ActiveProgram.countDocuments();
                const totalDemands = await DemandListing.countDocuments();
                
                dashboardData = {
                    ...dashboardData,
                    type: 'admin',
                    systemStats: {
                        totalUsers,
                        activeUsers,
                        totalPrograms,
                        totalDemands,
                        totalSuppliers: await User.countDocuments({ userType: 'supplier' }),
                        totalManufacturers: await User.countDocuments({ userType: { $in: ['manufacturer', 'oem'] } })
                    },
                    recentUsers: await User.find()
                        .select('name email userType status createdAt')
                        .sort({ createdAt: -1 })
                        .limit(5),
                    systemAlerts: []
                };
                break;
        }
        
        // Add default notifications
        dashboardData.notifications = [
            {
                id: 1,
                title: 'Welcome to AXO Networks',
                message: 'Complete your profile to get started',
                type: 'info',
                read: false,
                createdAt: new Date()
            }
        ];
        
        res.json({ success: true, data: dashboardData });
        
    } catch (error) {
        console.error('Dashboard data error:', error);
        res.status(500).json({ error: 'Failed to load dashboard data' });
    }
});

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select('-password -tempPassword');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load profile' });
    }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const updateData = req.body;
        
        const user = await User.findByIdAndUpdate(
            userId,
            { ...updateData, updatedAt: new Date() },
            { new: true }
        ).select('-password -tempPassword');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Calculate profile completion
        let completion = 30; // Base for registration
        
        if (user.phone) completion += 10;
        if (user.industry?.length > 0) completion += 10;
        if (user.certifications?.length > 0) completion += 10;
        if (user.manufacturingCapacity) completion += 10;
        if (user.location) completion += 10;
        if (user.website) completion += 10;
        
        user.profileCompletion = Math.min(completion, 100);
        await user.save();
        
        res.json({ success: true, user });
        
    } catch (error) {
        res.status(500).json({ error: 'Profile update failed' });
    }
});

// Submit sourcing request (Manufacturer)
router.post('/sourcing-request', authMiddleware, requireRole('manufacturer', 'oem'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const requestData = req.body;
        
        const sourcingRequest = new SourcingRequest({
            ...requestData,
            manufacturerId: userId,
            matchingStatus: 'Pending',
            status: 'published'
        });
        
        await sourcingRequest.save();
        
        res.json({ 
            success: true, 
            message: 'Sourcing request submitted successfully',
            request: sourcingRequest
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit sourcing request' });
    }
});

// Submit demand listing (Buyer)
router.post('/demand-listing', authMiddleware, requireRole('buyer', 'both'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const listingData = req.body;
        
        const demandListing = new DemandListing({
            ...listingData,
            buyerId: userId,
            status: 'open',
            actionStatus: 'Pending'
        });
        
        await demandListing.save();
        
        res.json({ 
            success: true, 
            message: 'Demand listing created successfully',
            listing: demandListing
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to create demand listing' });
    }
});

// Accept/Decline demand action
router.post('/demand/:id/action', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body;
        const userId = req.user.userId;
        
        const demand = await DemandListing.findById(id);
        if (!demand) {
            return res.status(404).json({ error: 'Demand listing not found' });
        }
        
        // Check if user is the buyer or has permission
        if (demand.buyerId.toString() !== userId.toString() && 
            !req.user.userType.includes('admin')) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        demand.actionStatus = action;
        if (action === 'Accepted') {
            demand.status = 'in-progress';
        } else if (action === 'Declined') {
            demand.status = 'cancelled';
        }
        
        await demand.save();
        
        res.json({ 
            success: true, 
            message: `Demand ${action.toLowerCase()} successfully`,
            demand 
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to update demand' });
    }
});

module.exports = router;