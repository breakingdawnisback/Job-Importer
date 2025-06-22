import mongoose from 'mongoose';

const JobSchema = new mongoose.Schema({
  jobId: { type: String, unique: true },
  title: String,
  company: String,
  location: String,
  url: String,
  raw: Object,
  updatedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Job', JobSchema);