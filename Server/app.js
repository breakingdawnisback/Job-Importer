import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Job from './models/job.js';
import ImportLog from './models/ImportLog.js';
import JobFeed from './models/jobFeed.js';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
}).then(() => console.log('✅ Connected to MongoDB Atlas successfully'))
  .catch((error) => {
    console.error('❌ MongoDB Atlas connection error:', error);
    process.exit(1);
  });

mongoose.connection.on('connected', () => console.log('📡 Mongoose connected'));
mongoose.connection.on('error', (err) => console.error('❌ Mongoose error:', err));
mongoose.connection.on('disconnected', () => console.log('📴 Mongoose disconnected'));
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🔌 MongoDB connection closed');
  process.exit(0);
});

const app = express();
app.use(cors());
app.use(express.json());

const transform = doc => {
  if (!doc) return null;
  const { _id, __v, ...rest } = doc.toObject ? doc.toObject() : doc;
  return { ...rest, id: _id?.toString() || doc.id };
};

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// --- FEEDS ---
app.get('/api/feeds', asyncHandler(async (req, res) => {
  const { search } = req.query;
  const query = search ? {
    $or: ['name', 'url', 'category', 'region'].map(field => ({
      [field]: { $regex: search, $options: 'i' }
    }))
  } : {};
  const feeds = await JobFeed.find(query).sort({ name: 1 });
  res.json({ data: feeds.map(transform) });
}));

app.post('/api/feeds', asyncHandler(async (req, res) => {
  const feed = await JobFeed.create(req.body);
  res.status(201).json({ data: transform(feed) });
}));

app.patch('/api/feeds/:id', asyncHandler(async (req, res) => {
  const feed = await JobFeed.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!feed) return res.status(404).json({ message: 'Feed not found' });
  res.json({ data: transform(feed) });
}));

app.delete('/api/feeds/:id', asyncHandler(async (req, res) => {
  const feed = await JobFeed.findByIdAndDelete(req.params.id);
  if (!feed) return res.status(404).json({ message: 'Feed not found' });
  res.status(204).send();
}));

// --- JOBS ---
app.get('/api/jobs', asyncHandler(async (req, res) => {
  const jobs = await Job.find({}, 'title company location salary createdAt updatedAt')
    .sort({ createdAt: -1 }).limit(100).lean();
  res.json({ data: jobs.map(j => ({ ...j, id: j._id.toString() })) });
}));

// --- IMPORT LOGS ---
app.get('/api/import-logs', asyncHandler(async (req, res) => {
  const { search, date, page = 1, limit = 10 } = req.query;
  const pageNum = parseInt(page), limitNum = Math.min(parseInt(limit), 50), skip = (pageNum - 1) * limitNum;
  let query = {};
  if (search) query.feedUrl = { $regex: search, $options: 'i' };
  if (date) {
    const start = new Date(date), end = new Date(date); end.setDate(end.getDate() + 1);
    query.timestamp = { $gte: start, $lt: end };
  }
  const [total, logs] = await Promise.all([
    ImportLog.countDocuments(query),
    ImportLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limitNum).lean()
  ]);
  res.json({
    data: {
      data: logs.map(log => ({
        ...transform(log),
        failedJobsCount: (log.failedJobDetails || []).length
      })),
      total, page: pageNum, totalPages: Math.ceil(total / limitNum)
    }
  });
}));

app.get('/api/import-logs/:id', asyncHandler(async (req, res) => {
  const log = await ImportLog.findById(req.params.id).lean();
  if (!log) return res.status(404).json({ message: 'Import log not found' });
  const jobs = Array.from({ length: log.totalJobs || 0 }, (_, i) => {
    let status = 'new', title = `Job ${i + 1}`, failureReason;
    if (i < (log.newJobs || 0)) status = 'new', title = `New Job ${i + 1}`;
    else if (i < (log.newJobs || 0) + (log.updatedJobs || 0)) status = 'updated', title = `Updated Job ${i + 1}`;
    else if (i < (log.newJobs || 0) + (log.updatedJobs || 0) + (log.failedJobs || 0)) {
      status = 'failed';
      const idx = i - (log.newJobs || 0) - (log.updatedJobs || 0);
      const fail = (log.failedJobDetails || [])[idx];
      title = fail?.title || `Failed Job ${idx + 1}`;
      failureReason = fail?.reason || 'No detailed failure information available';
    }
    return {
      id: `job_${i + 1}`,
      title, company: `Company ${i + 1}`, location: `Location ${i + 1}`,
      status, failureReason, url: `https://example.com/job/${i + 1}`, importLogId: req.params.id
    };
  });
  res.json({ data: { ...transform(log), jobs } });
}));

// --- IMPORT START/STATUS ---
app.post('/api/import/start', asyncHandler(async (req, res) => {
  const { feedId } = req.query;
  const feed = await JobFeed.findById(feedId);
  if (!feed) return res.status(404).json({ message: 'Feed not found' });
  
  const importLog = await ImportLog.create({
    feedUrl: feed.url, totalJobs: 0, newJobs: 0, updatedJobs: 0, failedJobs: 0,
    timestamp: new Date(), status: 'in_progress'
  });
  
  res.status(202).json({
    data: { importId: importLog._id.toString(), message: `Import for feed ${feed.name} started.` }
  });

  // Process import asynchronously
  processImport(importLog._id, feed);
}));

// Import processing function
async function processImport(importLogId, feed) {
  try {
    console.log(`🚀 Starting import for feed: ${feed.name}`);
    
    // Fetch RSS feed
    const response = await fetch(feed.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.statusText}`);
    }
    
    const feedText = await response.text();
    
    // Simple XML parsing for job feeds (you might want to use a proper XML parser)
    const jobMatches = feedText.match(/<item>[\s\S]*?<\/item>/g) || [];
    
    let newJobs = 0;
    let updatedJobs = 0;
    let failedJobs = 0;
    const failedJobDetails = [];
    
    for (const jobXml of jobMatches) {
      try {
        // Extract job data from XML
        const title = extractXmlValue(jobXml, 'title') || 'Unknown Title';
        const description = extractXmlValue(jobXml, 'description') || '';
        const link = extractXmlValue(jobXml, 'link') || '';
        const pubDate = extractXmlValue(jobXml, 'pubDate') || new Date().toISOString();
        
        // Create job object
        const jobData = {
          title: title.trim(),
          company: feed.name || 'Unknown Company',
          location: feed.region || 'Remote',
          description: description.substring(0, 1000), // Limit description length
          url: link,
          category: feed.category || 'General',
          feedId: feed._id,
          feedUrl: feed.url,
          publishedAt: new Date(pubDate),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Check if job already exists
        const existingJob = await Job.findOne({ 
          $or: [
            { url: jobData.url },
            { title: jobData.title, company: jobData.company }
          ]
        });
        
        if (existingJob) {
          // Update existing job
          await Job.findByIdAndUpdate(existingJob._id, {
            ...jobData,
            updatedAt: new Date()
          });
          updatedJobs++;
        } else {
          // Create new job
          await Job.create(jobData);
          newJobs++;
        }
        
      } catch (jobError) {
        console.error(`Failed to process job:`, jobError);
        failedJobs++;
        failedJobDetails.push({
          title: 'Failed to parse job',
          reason: jobError.message
        });
      }
    }
    
    // Update import log with results
    await ImportLog.findByIdAndUpdate(importLogId, {
      totalJobs: newJobs + updatedJobs + failedJobs,
      newJobs,
      updatedJobs,
      failedJobs,
      failedJobDetails,
      status: 'completed',
      completedAt: new Date()
    });
    
    // Update feed statistics
    await JobFeed.findByIdAndUpdate(feed._id, {
      totalJobsImported: (feed.totalJobsImported || 0) + newJobs,
      lastImport: new Date(),
      $inc: { importCount: 1 }
    });
    
    console.log(`✅ Import completed for ${feed.name}: ${newJobs} new, ${updatedJobs} updated, ${failedJobs} failed`);
    
  } catch (error) {
    console.error(`❌ Import failed for feed ${feed.name}:`, error);
    
    // Update import log with failure
    await ImportLog.findByIdAndUpdate(importLogId, {
      status: 'failed',
      failedJobs: 1,
      failedJobDetails: [{
        title: 'Import process failed',
        reason: error.message
      }],
      completedAt: new Date()
    });
  }
}

// Helper function to extract values from XML
function extractXmlValue(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : null;
}

app.get('/api/import/status/:id', asyncHandler(async (req, res) => {
  const log = await ImportLog.findById(req.params.id);
  if (!log) return res.status(404).json({ data: { status: 'not-found', progress: 0 } });
  res.json({ data: { status: log.status, progress: log.status === 'completed' ? 100 : 0 } });
}));

// --- ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

export default app;