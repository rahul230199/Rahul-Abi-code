// routes/manufacturer.routes.js
const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const ActiveProgram = require('../models/ActiveProgram');
const SourcingRequest = require('../models/SourcingRequest');
const DemandListing = require('../models/DemandListing');
const ManufacturerMetrics = require('../models/ManufacturerMetrics');

// Get all active programs for manufacturer
router.get('/programs', authMiddleware, requireRole('manufacturer', 'oem'), async (req, res) => {
    try {
        const programs = await ActiveProgram.find({ manufacturerId: req.user.userId })
            .populate('supplierId', 'name company reliabilityScore')
            .sort({ createdAt: -1 });
        
        res.json({ success: true, programs });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch programs' });
    }
});

// Create new program
router.post('/programs', authMiddleware, requireRole('manufacturer', 'oem'), async (req, res) => {
    try {
        const programData = {
            ...req.body,
            manufacturerId: req.user.userId,
            status: 'planned'
        };
        
        const program = new ActiveProgram(programData);
        await program.save();
        
        // Update manufacturer metrics
        await updateManufacturerMetrics(req.user.userId);
        
        res.json({ 
            success: true, 
            message: 'Program created successfully',
            program 
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create program' });
    }
});

// Update program
router.put('/programs/:id', authMiddleware, requireRole('manufacturer', 'oem'), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const program = await ActiveProgram.findOneAndUpdate(
            { _id: id, manufacturerId: req.user.userId },
            updateData,
            { new: true }
        );
        
        if (!program) {
            return res.status(404).json({ error: 'Program not found or not authorized' });
        }
        
        // Update metrics
        await updateManufacturerMetrics(req.user.userId);
        
        res.json({ 
            success: true, 
            message: 'Program updated successfully',
            program 
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update program' });
    }
});

// Get sourcing requests
router.get('/sourcing-requests', authMiddleware, requireRole('manufacturer', 'oem'), async (req, res) => {
    try {
        const requests = await SourcingRequest.find({ manufacturerId: req.user.userId })
            .sort({ createdAt: -1 });
        
        res.json({ success: true, requests });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sourcing requests' });
    }
});

// Get available demand listings
router.get('/available-demand', authMiddleware, requireRole('manufacturer', 'oem'), async (req, res) => {
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

// Update manufacturer metrics
async function updateManufacturerMetrics(manufacturerId) {
    try {
        const activeProgramsCount = await ActiveProgram.countDocuments({ 
            manufacturerId, 
            status: { $in: ['planned', 'in-progress'] }
        });
        
        const inProgressProgramsCount = await ActiveProgram.countDocuments({ 
            manufacturerId, 
            status: 'in-progress' 
        });
        
        const completedProgramsCount = await ActiveProgram.countDocuments({ 
            manufacturerId, 
            status: 'completed' 
        });
        
        const atRiskProgramsCount = await ActiveProgram.countDocuments({ 
            manufacturerId, 
            milestoneHealthStatus: 'At Risk' 
        });
        
        // Calculate execution health score
        const totalPrograms = await ActiveProgram.countDocuments({ manufacturerId });
        const onTrackPrograms = await ActiveProgram.countDocuments({ 
            manufacturerId, 
            milestoneHealthStatus: 'On Track' 
        });
        
        const executionHealthScore = totalPrograms > 0 ? 
            Math.round((onTrackPrograms / totalPrograms) * 100) : 100;
        
        // Create or update metrics
        await ManufacturerMetrics.findOneAndUpdate(
            { manufacturerId },
            {
                activeProgramsCount,
                inProgressProgramsCount,
                completedProgramsCount,
                atRiskProgramsCount,
                executionHealthScore,
                timelineAdherenceStatus: executionHealthScore > 80 ? 'On Track' : 
                                       executionHealthScore > 60 ? 'Attention' : 'At Risk',
                calculatedAt: new Date()
            },
            { upsert: true, new: true }
        );
        
    } catch (error) {
        console.error('Error updating manufacturer metrics:', error);
    }
}

module.exports = router;