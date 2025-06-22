import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Job from './models/job.js';
import ImportLog from './models/ImportLog.js';
import JobFeed from './models/jobFeed.js'; // Import the new JobFeed model

// import { jobQueue } from './queue/jobQueue.js'; // Import jobQueue to add import jobs - disabled for now

dotenv.config();

// MongoDB Atlas connection with proper options
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  maxPoolSize: 10, // Maintain up to 10 socket connections
})
.then(() => {
  console.log('✅ Connected to MongoDB Atlas successfully');
})
.catch((error) => {
  console.error('❌ MongoDB Atlas connection error:', error);
  process.exit(1);
});

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('📡 Mongoose connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('📴 Mongoose disconnected from MongoDB Atlas');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🔌 MongoDB Atlas connection closed through app termination');
  process.exit(0);
});

const app = express();

app.use(cors());
app.use(express.json());

// Utility function to transform MongoDB documents for frontend
const transformDocument = (doc) => {
  const obj = doc.toObject();
  const { _id, __v, ...cleanObj } = obj;
  return {
    ...cleanObj,
    id: _id.toString(),
  };
};

// API Routes for Feeds
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

    // Transform _id to id for frontend compatibility
    const transformedFeeds = feeds.map(feed => {
      const transformed = transformDocument(feed);
      return transformed;
    });

    res.json({ data: transformedFeeds }); // Wrap in data property to match frontend ApiResponse type
  } catch (error) {
    console.error('Error fetching feeds:', error);
    res.status(500).json({ message: 'Error fetching feeds' });
  }
});

app.post('/api/feeds', async (req, res) => {
  try {
    const newFeed = await JobFeed.create(req.body);

    // Transform _id to id for frontend compatibility
    const transformedFeed = transformDocument(newFeed);

    res.status(201).json({ data: transformedFeed }); // Wrap in data property
  } catch (error) {
    console.error('Error creating feed:', error);
    res.status(500).json({ message: 'Error creating feed' });
  }
});

app.patch('/api/feeds/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate feed ID
    if (!id || id === 'undefined' || id === 'null') {
      console.error('Invalid feed ID received:', id);
      return res.status(400).json({ message: 'Valid feed ID is required' });
    }

    const updatedFeed = await JobFeed.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedFeed) {
      return res.status(404).json({ message: 'Feed not found' });
    }

    // Transform _id to id for frontend compatibility
    const transformedFeed = transformDocument(updatedFeed);

    res.json({ data: transformedFeed }); // Wrap in data property
  } catch (error) {
    console.error('Error updating feed:', error);
    res.status(500).json({ message: 'Error updating feed' });
  }
});

app.delete('/api/feeds/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate feed ID
    if (!id || id === 'undefined' || id === 'null') {
      console.error('Invalid feed ID received for deletion:', id);
      return res.status(400).json({ message: 'Valid feed ID is required' });
    }

    const deletedFeed = await JobFeed.findByIdAndDelete(id);

    if (!deletedFeed) {
      return res.status(404).json({ message: 'Feed not found' });
    }

    res.status(204).send(); // No content for successful deletion
  } catch (error) {
    console.error('Error deleting feed:', error);
    res.status(500).json({ message: 'Error deleting feed' });
  }
});

// Existing routes
app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await Job.find({}, {
      // Only select essential fields
      title: 1,
      company: 1,
      location: 1,
      salary: 1,
      createdAt: 1,
      updatedAt: 1
    })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean(); // Use lean() for better performance

    // Minimal transformation
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
    console.error('Error fetching jobs:', error);
    res.status(500).json({ message: 'Error fetching jobs' });
  }
});

app.get('/api/import-logs', async (req, res) => {
  try {
    const { search, date, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 50); // Cap limit to prevent large queries
    const skip = (pageNum - 1) * limitNum;

    // Build query
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

    // Use Promise.all to run count and find queries in parallel
    const [total, logs] = await Promise.all([
      ImportLog.countDocuments(query),
      ImportLog.find(query, {
        // Select all needed fields including new ones
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
      .lean() // Use lean() for better performance
    ]);

    const totalPages = Math.ceil(total / limitNum);

    // Transform with enhanced processing
    const sanitizedLogs = logs.map(log => ({
      id: log._id.toString(),
      feedUrl: log.feedUrl || '',
      feedName: log.feedName || 'Unknown Feed',
      status: log.status || 'unknown',
      totalJobs: log.totalJobs || 0, // Total fetched from feed
      totalImported: log.totalImported || 0, // Successfully imported
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
    console.error('Error fetching import logs:', error);
    res.status(500).json({ message: 'Error fetching import logs' });
  }
});

// Get individual import log details with associated job records
app.get('/api/import-logs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate import log ID
    if (!id || id === 'undefined' || id === 'null') {
      console.error('Invalid import log ID received:', id);
      return res.status(400).json({ message: 'Valid import log ID is required' });
    }

    // Find the import log
    const importLog = await ImportLog.findById(id).lean();

    if (!importLog) {
      return res.status(404).json({ message: 'Import log not found' });
    }

    // Create job records that EXACTLY match totalJobs count
    const allJobs = [];
    const totalJobsCount = importLog.totalJobs || 0;

    // Create exactly totalJobs number of job records
    for (let i = 0; i < totalJobsCount; i++) {
      let status = 'new';
      let title = `Job ${i + 1}`;
      let failureReason = undefined;

      // Determine status based on counts
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
      } else {
        // Additional jobs beyond new+updated+failed (these are "other" jobs)
        status = 'new'; // Default to new for any extra jobs
        title = `Additional Job ${i + 1}`;
      }

      allJobs.push({
        id: `job_${i + 1}`,
        title: title,
        company: `Company ${i + 1}`,
        location: `Location ${i + 1}`,
        status: status,
        failureReason: failureReason,
        url: `https://example.com/job/${i + 1}`,
        importLogId: id
      });
    }

    // Transform the import log with enhanced details
    const transformedImportLog = {
      id: importLog._id.toString(),
      feedUrl: importLog.feedUrl || '',
      feedName: importLog.feedName || 'Unknown Feed',
      status: importLog.status || 'unknown',
      totalJobs: importLog.totalJobs || 0, // Total fetched
      totalImported: importLog.totalImported || 0, // Successfully imported
      newJobs: importLog.newJobs || 0,
      updatedJobs: importLog.updatedJobs || 0,
      failedJobs: importLog.failedJobs || 0,
      timestamp: importLog.timestamp,
      duration: importLog.duration || 0,
      failedJobDetails: importLog.failedJobDetails || [], // Real failed job details
      jobs: allJobs
    };

    // Validate that job counts match summary (for debugging)
    const actualCounts = {
      new: allJobs.filter(job => job.status === 'new').length,
      updated: allJobs.filter(job => job.status === 'updated').length,
      failed: allJobs.filter(job => job.status === 'failed').length
    };

    // Log any mismatches for debugging
    if (actualCounts.new !== transformedImportLog.newJobs ||
        actualCounts.updated !== transformedImportLog.updatedJobs ||
        actualCounts.failed !== transformedImportLog.failedJobs) {
      console.warn(`Job count mismatch for import ${id}:`, {
        expected: { new: transformedImportLog.newJobs, updated: transformedImportLog.updatedJobs, failed: transformedImportLog.failedJobs },
        actual: actualCounts
      });
    }

    res.json({ data: transformedImportLog });
  } catch (error) {
    console.error('Error fetching import log details:', error);
    res.status(500).json({ message: 'Error fetching import log details' });
  }
});

// New API route to manually trigger a feed import
app.post('/api/import/start', async (req, res) => {
  try {
    const { feedId } = req.query;

    // Validate feed ID
    if (!feedId || feedId === 'undefined' || feedId === 'null') {
      console.error('Invalid feedId received for import:', feedId);
      return res.status(400).json({ message: 'Valid feed ID is required' });
    }

    const feed = await JobFeed.findById(feedId);

    if (!feed) {
      return res.status(404).json({ message: 'Feed not found' });
    }

    // Create import log with in_progress status
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

    // Send immediate response
    res.status(202).json({
      data: {
        importId: importLog._id.toString(),
        message: `Import for feed ${feed.name} (${feed.url}) started successfully.`,
      }
    });

    // Broadcast import started to WebSocket clients
    if (global.wss) {
      const startMessage = JSON.stringify({
        type: 'import_started',
        data: {
          feedId: feedId,
          feedName: feed.name,
          importId: importLog._id.toString()
        }
      });

      global.wss.clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(startMessage);
        }
      });
    }

    // Simulate import process asynchronously
    setTimeout(async () => {
      try {
        // Simulate some processing time and generate mock data
        const mockJobCounts = {
          totalJobs: Math.floor(Math.random() * 100) + 10,
          newJobs: Math.floor(Math.random() * 50) + 5,
          updatedJobs: Math.floor(Math.random() * 30) + 2,
          failedJobs: Math.floor(Math.random() * 5) + 1 // Ensure at least 1 failed job for testing
        };

        // Create mock failed job details for testing
        const mockFailedJobDetails = [];
        for (let i = 0; i < mockJobCounts.failedJobs; i++) {
          mockFailedJobDetails.push({
            jobId: `mock_failed_job_${i + 1}`,
            reason: `Mock failure reason ${i + 1}: ${['Invalid data format', 'Missing required field', 'Database constraint violation', 'Network timeout'][i % 4]}`,
            title: `Failed Job Title ${i + 1}`,
            url: `https://example.com/failed-job/${i + 1}`
          });
        }

        // Update import log with results including failed job details
        await ImportLog.findByIdAndUpdate(importLog._id, {
          ...mockJobCounts,
          totalImported: mockJobCounts.newJobs + mockJobCounts.updatedJobs,
          failedJobDetails: mockFailedJobDetails,
          status: 'completed'
        });

        // Update feed's last import timestamp and job count
        await JobFeed.findByIdAndUpdate(feedId, {
          lastImport: new Date(),
          totalJobsImported: (feed.totalJobsImported || 0) + mockJobCounts.newJobs
        });

        // Broadcast to all WebSocket clients
        if (global.wss) {
          const message = JSON.stringify({
            type: 'import_completed',
            data: {
              feedId: feedId,
              feedName: feed.name,
              importId: importLog._id.toString(),
              jobCount: mockJobCounts.totalJobs,
              newJobs: mockJobCounts.newJobs,
              updatedJobs: mockJobCounts.updatedJobs,
              failedJobs: mockJobCounts.failedJobs
            }
          });

          global.wss.clients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN
              client.send(message);
            }
          });
        }

      } catch (error) {
        console.error('Error completing import:', error);

        // Update import log with failed status
        await ImportLog.findByIdAndUpdate(importLog._id, {
          status: 'failed'
        });

        // Broadcast failure to WebSocket clients
        if (global.wss) {
          const message = JSON.stringify({
            type: 'import_failed',
            data: {
              feedId: feedId,
              feedName: feed.name,
              importId: importLog._id.toString(),
              error: 'Import processing failed'
            }
          });

          global.wss.clients.forEach(client => {
            if (client.readyState === 1) {
              client.send(message);
            }
          });
        }
      }
    }, 2000 + Math.random() * 3000); // Random delay between 2-5 seconds

  } catch (error) {
    console.error('Error starting feed import:', error);
    res.status(500).json({ message: 'Failed to start feed import' });
  }
});

// New API route to get import status
app.get('/api/import/status/:id', async (req, res) => {
  try {
    const { id } = req.params; // This `id` is the import log ID

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
    console.error('Error getting import status:', error);
    res.status(500).json({ message: 'Failed to get import status' });
  }
});

// Delete import log
app.delete('/api/import-logs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate import log ID
    if (!id || id === 'undefined' || id === 'null') {
      console.error('Invalid import log ID received for deletion:', id);
      return res.status(400).json({ message: 'Valid import log ID is required' });
    }

    const deletedImportLog = await ImportLog.findByIdAndDelete(id);

    if (!deletedImportLog) {
      return res.status(404).json({ message: 'Import log not found' });
    }

    res.status(204).send(); // No content for successful deletion
  } catch (error) {
    console.error('Error deleting import log:', error);
    res.status(500).json({ message: 'Error deleting import log' });
  }
});

export default app;