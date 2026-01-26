const mongoose = require('mongoose');

const manufacturerMetricsSchema = new mongoose.Schema({
    manufacturerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    activeProgramsCount: { type: Number, default: 0 },
    inProgressProgramsCount: { type: Number, default: 0 },
    completedProgramsCount: { type: Number, default: 0 },
    atRiskProgramsCount: { type: Number, default: 0 },
    executionHealthScore: { type: Number, default: 0 },
    timelineAdherenceStatus: {
        type: String,
        enum: ['On Track', 'Attention', 'At Risk'],
        default: 'On Track'
    },
    supplierReliabilityStatus: {
        type: String,
        enum: ['On Track', 'Attention', 'At Risk'],
        default: 'On Track'
    },
    qualityConsistencyStatus: {
        type: String,
        enum: ['On Track', 'Attention', 'At Risk'],
        default: 'On Track'
    },
    responseDisciplineStatus: {
        type: String,
        enum: ['On Track', 'Attention', 'At Risk'],
        default: 'On Track'
    },
    periodStart: { type: Date, default: Date.now },
    periodEnd: Date,
    totalCapacityUtilization: Number,
    averageLeadTime: Number,
    qualityPassRate: Number,
    calculatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

manufacturerMetricsSchema.index({ manufacturerId: 1, createdAt: -1 });

module.exports = mongoose.model('ManufacturerMetrics', manufacturerMetricsSchema);