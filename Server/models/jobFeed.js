import mongoose from 'mongoose';

const JobFeedSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true, unique: true },
  category: { type: String },
  jobTypes: { type: String },
  region: { type: String },
  isActive: { type: Boolean, default: true },
  lastImport: { type: Date },
  totalJobsImported: { type: Number, default: 0 },
}, { timestamps: true }); // Add timestamps for createdAt and updatedAt

export default mongoose.model('JobFeed', JobFeedSchema);