import mongoose from 'mongoose';
import { Worker } from 'bullmq';
import dotenv from 'dotenv';
import Job from '../models/job.js';
import ImportLog from '../models/ImportLog.js';
import JobFeed from '../models/jobFeed.js';

dotenv.config();

// MongoDB Atlas connection for worker
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
})
.then(() => {
  console.log('✅ Worker connected to MongoDB Atlas successfully');
})
.catch((error) => {
  console.error('❌ Worker MongoDB Atlas connection error:', error);
  process.exit(1);
});

function extractJobs(feedUrl, jobsJson) {
  // You must adapt this to the actual XML/JSON structure!
  if (jobsJson.rss && jobsJson.rss.channel && jobsJson.rss.channel.item) {
    return Array.isArray(jobsJson.rss.channel.item)
      ? jobsJson.rss.channel.item
      : [jobsJson.rss.channel.item];
  }
  return [];
}

const worker = new Worker('job-import', async job => {
  const startTime = new Date();
  const { feedId, feedUrl, feedName, jobs } = job.data;
  const jobItems = extractJobs(feedUrl, jobs);

  // Initialize counters
  const totalFetched = jobItems.length; // Total jobs found in feed
  let newJobs = 0;
  let updatedJobs = 0;
  let failedJobDetails = [];
  let failedJobsCount = 0;

  console.log(`\n=== IMPORT STARTED ===`);
  console.log(`Timestamp: ${startTime.toISOString()}`);
  console.log(`Feed: "${feedName}" (${feedUrl})`);
  console.log(`Total jobs fetched from feed: ${totalFetched}`);

  // Process each job item
  for (const item of jobItems) {
    try {
      const jobId = item.guid || item.link || item.title;
      
      if (!jobId) {
        throw new Error('No valid job identifier found (guid, link, or title)');
      }

      const update = {
        jobId,
        title: item.title || 'No title',
        company: item['company'] || item['dc:creator'] || 'Unknown',
        location: item['location'] || item['jobicy:location'] || '',
        url: item.link || '',
        feedId: feedId,
        raw: item,
        updatedAt: new Date()
      };

      const res = await Job.findOneAndUpdate(
        { jobId }, 
        update, 
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Check if this is a new job or updated job
      if (res.createdAt.getTime() === res.updatedAt.getTime()) {
        newJobs++;
      } else {
        updatedJobs++;
      }

    } catch (err) {
      failedJobsCount++;
      const jobId = item.guid || item.link || item.title || `Unknown-${failedJobsCount}`;
      failedJobDetails.push({ 
        jobId: jobId,
        reason: err.message,
        title: item.title || 'No title',
        url: item.link || 'No URL'
      });
      console.error(`Failed to process job "${jobId}": ${err.message}`);
    }
  }

  const totalImported = newJobs + updatedJobs;
  const importStatus = failedJobsCount === totalFetched ? 'failed' : 'completed';
  const endTime = new Date();
  const duration = endTime - startTime;

  // Enhanced logging
  console.log(`\n=== IMPORT COMPLETED ===`);
  console.log(`Timestamp: ${endTime.toISOString()}`);
  console.log(`Duration: ${duration}ms`);
  console.log(`Feed: "${feedName}"`);
  console.log(`Total Fetched: ${totalFetched}`);
  console.log(`Total Imported: ${totalImported}`);
  console.log(`New Jobs: ${newJobs}`);
  console.log(`Updated Jobs: ${updatedJobs}`);
  console.log(`Failed Jobs: ${failedJobsCount}`);
  
  if (failedJobDetails.length > 0) {
    console.log(`\n=== FAILED JOBS DETAILS ===`);
    failedJobDetails.forEach((failure, index) => {
      console.log(`${index + 1}. Job ID: ${failure.jobId}`);
      console.log(`   Title: ${failure.title}`);
      console.log(`   URL: ${failure.url}`);
      console.log(`   Reason: ${failure.reason}`);
      console.log('');
    });
  }

  // Create detailed import log
  const importLog = await ImportLog.create({
    timestamp: startTime,
    feedUrl,
    feedName: feedName,
    totalJobs: totalFetched, // Total jobs found in feed
    totalImported: totalImported, // Successfully imported (new + updated)
    newJobs,
    updatedJobs,
    failedJobs: failedJobsCount,
    status: importStatus,
    failedJobDetails,
    duration: duration
  });

  // Update feed statistics
  if (feedId) {
    try {
      await JobFeed.findByIdAndUpdate(feedId, {
        lastImport: endTime,
        $inc: { totalJobsImported: newJobs } // Only increment by new jobs
      });
      console.log(`Updated feed statistics for: ${feedName}`);
    } catch (err) {
      console.error(`Failed to update feed statistics for ${feedName}:`, err.message);
    }
  }

  // Broadcast completion via WebSocket if available
  if (global.wss) {
    const message = JSON.stringify({
      type: 'import_completed',
      data: {
        feedId: feedId,
        feedName: feedName,
        importId: importLog._id.toString(),
        totalFetched: totalFetched,
        totalImported: totalImported,
        newJobs: newJobs,
        updatedJobs: updatedJobs,
        failedJobs: failedJobsCount,
        duration: duration
      }
    });

    global.wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }

  console.log(`=== END IMPORT LOG ===\n`);
}, {
  connection: { url: process.env.REDIS_URL },
  concurrency: 3
});

worker.on('failed', (job, err) => {
  console.error('Job failed:', job.id, err);
});