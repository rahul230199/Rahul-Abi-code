const mongoose = require('mongoose');

const demandListingSchema = new mongoose.Schema({
    componentName: {
        type: String,
        required: true
    },
    componentType: String,
    description: String,
    buyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    timeline: String,
    requiredByDate: Date,
    qualityTier: {
        type: String,
        enum: ['Standard', 'Premium', 'Critical'],
        default: 'Standard'
    },
    specifications: {
        material: String,
        dimensions: Object,
        tolerance: String,
        certifications: [String]
    },
    designFileUrl: String,
    budgetRange: {
        min: Number,
        max: Number,
        currency: { type: String, default: 'USD' }
    },
    status: {
        type: String,
        enum: ['open', 'in-progress', 'closed', 'cancelled'],
        default: 'open'
    },
    actionStatus: {
        type: String,
        enum: ['Pending', 'Accepted', 'Declined', 'Expired'],
        default: 'Pending'
    },
    awardedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    visibility: {
        type: String,
        enum: ['public', 'private', 'invite-only'],
        default: 'public'
    },
    invitedSuppliers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

demandListingSchema.index({ buyerId: 1, status: 1 });
demandListingSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('DemandListing', demandListingSchema);