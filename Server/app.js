import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Job from './models/job.js';
import ImportLog from './models/ImportLog.js';
import JobFeed from './models/jobFeed.js';

dotenv.config();

// MongoDB Atlas connection with proper options
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
})
.then(() => console.log('✅ Connected to MongoDB Atlas successfully'))
.catch((error) => {
  console.error('❌ MongoDB Atlas connection error:', error);
  process.exit(1);
});

// Handle MongoDB connection events
mongoose.connection.on('connected', () => console.log('📡 Mongoose connected to MongoDB Atlas'));
mongoose.connection.on('error', (err) => console.error('❌ Mongoose connection error:', err));
mongoose.connection.on('disconnected', () => console.log('📴 Mongoose disconnected from MongoDB Atlas'));

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🔌 MongoDB Atlas connection closed through app termination');
  process.exit(0);
});

const app = express();

app.use(cors());
app.use(express.json());

// Utility functions
const transformDocument = (doc) => {
  const obj = doc.toObject();
  const { _id, __v, ...cleanObj } = obj;
  return { ...cleanObj, id: _id.toString() };
};

const validateId = (id, res, entityName = 'Entity') => {
  if (!id || id === 'undefined' || id === 'null') {
    console.error(`Invalid ${entityName.toLowerCase()} ID received:`, id);
    res.status(400).json({ message: `Valid ${entityName.toLowerCase()} ID is required` });
    return false;
  }
  return true;
};

const handleError = (error, res, message = 'An error occurred') => {
  console.error(`Error: ${message}`, error);
  res.status(500).json({ message });
};

const broadcastWebSocketMessage = (type, data) => {
  if (global.wss) {
    const message = JSON.stringify({ type, data });
    global.wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }
};

// Feed Routes
app.get('/api/feeds', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { url: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
          { region: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const feeds = await JobFeed.find(query).sort({ name: 1 });
    const transformedFeeds = feeds.map(transformDocument);

    res.json({ data: transformedFeeds });
  } catch (error) {
    handleError(error, res, 'Error fetching feeds');
  }
});

app.post('/api/feeds', async (req, res) => {
  try {
    const newFeed = await JobFeed.create(req.body);
    const transformedFeed = transformDocument(newFeed);
    res.status(201).json({ data: transformedFeed });
  } catch (error) {
    handleError(error, res, 'Error creating feed');
  }
});

app.patch('/api/feeds/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateId(id, res, 'Feed')) return;

    const updatedFeed = await JobFeed.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedFeed) {
      return res.status(404).json({ message: 'Feed not found' });
    }

    const transformedFeed = transformDocument(updatedFeed);
    res.json({ data: transformedFeed });
  } catch (error) {
    handleError(error, res, 'Error updating feed');
  }
});

app.delete('/api/feeds/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateId(id, res, 'Feed')) return;

    const deletedFeed = await JobFeed.findByIdAndDelete(id);
    if (!deletedFeed) {
      return res.status(404).json({ message: 'Feed not found' });
    }

    res.status(204).send();
  } catch (error) {
    handleError(error, res, 'Error deleting feed');
  }
});

// Job Routes
app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await Job.find({}, {
      title: 1,
      company: 1,
      location: 1,
      salary: 1,
      createdAt: 1,
      updatedAt: 1
    })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

    const transformedJobs = jobs.map(job => ({
      id: job._id.toString(),
      title: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    }));

    res.json({ data: transformedJobs });
  } catch (error) {
    handleError(error, res, 'Error fetching jobs');
  }
});

// Import Log Routes
app.get('/api/import-logs', async (req, res) => {
  try {
    const { search, date, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 50);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (search) {
      query.feedUrl = { $regex: search, $options: 'i' };
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.timestamp = { $gte: startDate, $lt: endDate };
    }

    const [total, logs] = await Promise.all([
      ImportLog.countDocuments(query),
      ImportLog.find(query, {
        feedUrl: 1,
        feedName: 1,
        status: 1,
        totalJobs: 1,
        totalImported: 1,
        newJobs: 1,
        updatedJobs: 1,
        failedJobs: 1,
        timestamp: 1,
        duration: 1,
        failedJobDetails: 1
      })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean()
    ]);

    const totalPages = Math.ceil(total / limitNum);

    const sanitizedLogs = logs.map(log => ({
      id: log._id.toString(),
      feedUrl: log.feedUrl || '',
      feedName: log.feedName || 'Unknown Feed',
      status: log.status || 'unknown',
      totalJobs: log.totalJobs || 0,
      totalImported: log.totalImported || 0,
      newJobs: log.newJobs || 0,
      updatedJobs: log.updatedJobs || 0,
      failedJobs: log.failedJobs || 0,
      timestamp: log.timestamp,
      duration: log.duration || 0,
      failedJobsCount: (log.failedJobDetails || []).length
    }));

    res.json({
      data: {
        data: sanitizedLogs,
        total,
        page: pageNum,
        totalPages
      }
    });
  } catch (error) {
    handleError(error, res, 'Error fetching import logs');
  }
});

app.get('/api/import-logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateId(id, res, 'Import log')) return;

    const importLog = await ImportLog.findById(id).lean();
    if (!importLog) {
      return res.status(404).json({ message: 'Import log not found' });
    }

    // Generate job records that match totalJobs count
    const allJobs = [];
    const totalJobsCount = importLog.totalJobs || 0;

    for (let i = 0; i < totalJobsCount; i++) {
      let status = 'new';
      let title = `Job ${i + 1}`;
      let failureReason = undefined;

      if (i < (importLog.newJobs || 0)) {
        status = 'new';
        title = `New Job ${i + 1}`;
      } else if (i < (importLog.newJobs || 0) + (importLog.updatedJobs || 0)) {
        status = 'updated';
        title = `Updated Job ${i + 1}`;
      } else if (i < (importLog.newJobs || 0) + (importLog.updatedJobs || 0) + (importLog.failedJobs || 0)) {
        status = 'failed';
        const failedIndex = i - (importLog.newJobs || 0) - (importLog.updatedJobs || 0);
        const failedJobDetail = (importLog.failedJobDetails || [])[failedIndex];
        title = failedJobDetail?.title || `Failed Job ${failedIndex + 1}`;
        failureReason = failedJobDetail?.reason || 'No detailed failure information available';
      }

      allJobs.push({
        id: `job_${i + 1}`,
        title,
        company: `Company ${i + 1}`,
        location: `Location ${i + 1}`,
        status,
        failureReason,
        url: `https://example.com/job/${i + 1}`,
        importLogId: id
      });
    }

    const transformedImportLog = {
      id: importLog._id.toString(),
      feedUrl: importLog.feedUrl || '',
      feedName: importLog.feedName || 'Unknown Feed',
      status: importLog.status || 'unknown',
      totalJobs: importLog.totalJobs || 0,
      totalImported: importLog.totalImported || 0,
      newJobs: importLog.newJobs || 0,
      updatedJobs: importLog.updatedJobs || 0,
      failedJobs: importLog.failedJobs || 0,
      timestamp: importLog.timestamp,
      duration: importLog.duration || 0,
      failedJobDetails: importLog.failedJobDetails || [],
      jobs: allJobs
    };

    res.json({ data: transformedImportLog });
  } catch (error) {
    handleError(error, res, 'Error fetching import log details');
  }
});

app.delete('/api/import-logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateId(id, res, 'Import log')) return;

    const deletedImportLog = await ImportLog.findByIdAndDelete(id);
    if (!deletedImportLog) {
      return res.status(404).json({ message: 'Import log not found' });
    }

    res.status(204).send();
  } catch (error) {
    handleError(error, res, 'Error deleting import log');
  }
});

// Import Process Routes
app.post('/api/import/start', async (req, res) => {
  try {
    const { feedId } = req.query;
    if (!validateId(feedId, res, 'Feed')) return;

    const feed = await JobFeed.findById(feedId);
    if (!feed) {
      return res.status(404).json({ message: 'Feed not found' });
    }

    const importLog = await ImportLog.create({
      feedUrl: feed.url,
      feedName: feed.name,
      totalJobs: 0,
      newJobs: 0,
      updatedJobs: 0,
      failedJobs: 0,
      timestamp: new Date(),
      status: 'in_progress'
    });

    res.status(202).json({
      data: {
        importId: importLog._id.toString(),
        message: `Import for feed ${feed.name} (${feed.url}) started successfully.`,
      }
    });

    // Broadcast import started
    broadcastWebSocketMessage('import_started', {
      feedId,
      feedName: feed.name,
      importId: importLog._id.toString()
    });

    // Simulate import process asynchronously
    setTimeout(async () => {
      try {
        const mockJobCounts = {
          totalJobs: Math.floor(Math.random() * 100) + 10,
          newJobs: Math.floor(Math.random() * 50) + 5,
          updatedJobs: Math.floor(Math.random() * 30) + 2,
          failedJobs: Math.floor(Math.random() * 5) + 1
        };

        const mockFailedJobDetails = [];
        for (let i = 0; i < mockJobCounts.failedJobs; i++) {
          mockFailedJobDetails.push({
            jobId: `mock_failed_job_${i + 1}`,
            reason: `Mock failure reason ${i + 1}: ${['Invalid data format', 'Missing required field', 'Database constraint violation', 'Network timeout'][i % 4]}`,
            title: `Failed Job Title ${i + 1}`,
            url: `https://example.com/failed-job/${i + 1}`
          });
        }

        await ImportLog.findByIdAndUpdate(importLog._id, {
          ...mockJobCounts,
          totalImported: mockJobCounts.newJobs + mockJobCounts.updatedJobs,
          failedJobDetails: mockFailedJobDetails,
          status: 'completed'
        });

        await JobFeed.findByIdAndUpdate(feedId, {
          lastImport: new Date(),
          totalJobsImported: (feed.totalJobsImported || 0) + mockJobCounts.newJobs
        });

        broadcastWebSocketMessage('import_completed', {
          feedId,
          feedName: feed.name,
          importId: importLog._id.toString(),
          jobCount: mockJobCounts.totalJobs,
          newJobs: mockJobCounts.newJobs,
          updatedJobs: mockJobCounts.updatedJobs,
          failedJobs: mockJobCounts.failedJobs
        });

      } catch (error) {
        console.error('Error completing import:', error);

        await ImportLog.findByIdAndUpdate(importLog._id, { status: 'failed' });

        broadcastWebSocketMessage('import_failed', {
          feedId,
          feedName: feed.name,
          importId: importLog._id.toString(),
          error: 'Import processing failed'
        });
      }
    }, 2000 + Math.random() * 3000);

  } catch (error) {
    handleError(error, res, 'Failed to start feed import');
  }
});

app.get('/api/import/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const importLog = await ImportLog.findById(id);

    if (!importLog) {
      return res.status(404).json({ data: { status: 'not-found', progress: 0 } });
    }

    res.json({
      data: {
        status: importLog.status,
        progress: importLog.status === 'completed' ? 100 : 0
      }
    });
  } catch (error) {
    handleError(error, res, 'Failed to get import status');
  }
});

export default app;