import mongoose from 'mongoose';

const ImportLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  feedUrl: { type: String, required: true },
  feedName: { type: String }, // Add feed name for better logging
  totalJobs: { type: Number, default: 0 }, // Total jobs fetched from feed
  totalImported: { type: Number, default: 0 }, // Successfully imported (new + updated)
  newJobs: { type: Number, default: 0 },
  updatedJobs: { type: Number, default: 0 },
  failedJobs: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['completed', 'failed', 'in_progress'], 
    default: 'in_progress' 
  },
  failedJobDetails: [{ 
    jobId: String, 
    reason: String,
    title: String,
    url: String
  }], // Enhanced failure details with title and URL
  duration: { type: Number }, // Import duration in milliseconds
});

// Add virtual for id field to match frontend expectations
ImportLogSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
ImportLogSchema.set('toJSON', {
  virtuals: true
});

export default mongoose.model('ImportLog', ImportLogSchema, 'import_logs');