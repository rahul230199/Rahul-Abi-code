const mongoose = require('mongoose');

const sourcingRequestSchema = new mongoose.Schema({
    componentName: {
        type: String,
        required: true
    },
    manufacturerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    requiredByDate: Date,
    qualityTier: {
        type: String,
        enum: ['Standard', 'Premium', 'Critical'],
        default: 'Standard'
    },
    designFileUrl: String,
    additionalNotes: String,
    specifications: {
        materialRequirements: [String],
        tolerance: String,
        surfaceFinish: String,
        testingRequirements: [String]
    },
    matchingStatus: {
        type: String,
        enum: ['Pending', 'Matched', 'In Progress', 'Completed'],
        default: 'Pending'
    },
    assignedSupplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'closed'],
        default: 'draft'
    }
}, {
    timestamps: true
});

sourcingRequestSchema.index({ manufacturerId: 1, status: 1 });
sourcingRequestSchema.index({ matchingStatus: 1 });

module.exports = mongoose.model('SourcingRequest', sourcingRequestSchema);