const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
    name: String,
    dueDate: Date,
    completedDate: Date,
    status: {
        type: String,
        enum: ['not-started', 'in-progress', 'completed', 'delayed'],
        default: 'not-started'
    },
    description: String
});

const activeProgramSchema = new mongoose.Schema({
    programName: {
        type: String,
        required: true
    },
    manufacturerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    currentMilestone: String,
    milestoneHealthStatus: {
        type: String,
        enum: ['On Track', 'Attention', 'At Risk'],
        default: 'On Track'
    },
    startDate: { type: Date, default: Date.now },
    expectedCompletionDate: Date,
    actualCompletionDate: Date,
    status: {
        type: String,
        enum: ['planned', 'in-progress', 'completed', 'delayed', 'cancelled'],
        default: 'planned'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    componentType: String,
    quantity: Number,
    qualityTier: {
        type: String,
        enum: ['Standard', 'Premium', 'Critical'],
        default: 'Standard'
    },
    milestones: [milestoneSchema],
    notes: String
}, {
    timestamps: true
});

activeProgramSchema.index({ manufacturerId: 1, status: 1 });
activeProgramSchema.index({ supplierId: 1, status: 1 });

module.exports = mongoose.model('ActiveProgram', activeProgramSchema);