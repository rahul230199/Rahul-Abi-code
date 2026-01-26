// routes/supplier.routes.js
const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const ActiveProgram = require('../models/ActiveProgram');
const DemandListing = require('../models/DemandListing');
const User = require('../models/User');

// Get supplier's active programs
router.get('/programs', authMiddleware, requireRole('supplier'), async (req, res) => {
    try {
        const programs = await ActiveProgram.find({ supplierId: req.user.userId })
            .populate('manufacturerId', 'name company')
            .sort({ createdAt: -1 });
        
        res.json({ success: true, programs });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch programs' });
    }
});

// Get available demand listings for supplier
router.get('/available-demand', authMiddleware, requireRole('supplier'), async (req, res) => {
    try {
        const demands = await DemandListing.find({ 
            status: 'open',
            $or: [
                { visibility: 'public' },
                { 
                    visibility: 'invite-only',
                    invitedSuppliers: { $in: [req.user.userId] }
                }
            ]
        })
        .populate('buyerId', 'name company')
        .sort({ createdAt: -1 });
        
        res.json({ success: true, demands });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch demand listings' });
    }
});

// Submit quote for demand
router.post('/demand/:id/quote', authMiddleware, requireRole('supplier'), async (req, res) => {
    try {
        const { id } = req.params;
        const { quoteAmount, proposedTimeline, notes } = req.body;
        
        const demand = await DemandListing.findById(id);
        if (!demand) {
            return res.status(404).json({ error: 'Demand listing not found' });
        }
        
        // Check if supplier can access this demand
        if (demand.visibility === 'invite-only' && 
            !demand.invitedSuppliers.includes(req.user.userId)) {
            return res.status(403).json({ error: 'Not invited to bid on this demand' });
        }
        
        // Add quote to interested suppliers
        demand.interestedSuppliers = demand.interestedSuppliers || [];
        demand.interestedSuppliers.push({
            supplierId: req.user.userId,
            quoteAmount,
            proposedTimeline,
            notes,
            status: 'submitted',
            submittedAt: new Date()
        });
        
        await demand.save();
        
        res.json({ 
            success: true, 
            message: 'Quote submitted successfully',
            demand 
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit quote' });
    }
});

// Update supplier profile
router.put('/profile', authMiddleware, requireRole('supplier'), async (req, res) => {
    try {
        const updateData = req.body;
        
        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { 
                ...updateData, 
                updatedAt: new Date(),
                profileCompletion: calculateProfileCompletion(updateData)
            },
            { new: true }
        ).select('-password -tempPassword');
        
        res.json({ success: true, user });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Calculate profile completion
function calculateProfileCompletion(userData) {
    let completion = 30; // Base
    
    if (userData.phone) completion += 10;
    if (userData.industry?.length > 0) completion += 10;
    if (userData.certifications?.length > 0) completion += 10;
    if (userData.manufacturingCapacity) completion += 10;
    if (userData.location) completion += 10;
    
    return Math.min(completion, 100);
}

module.exports = router;