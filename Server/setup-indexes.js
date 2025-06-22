// Run this script to add database indexes for better performance
// Execute: node setup-indexes.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function setupIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Helper function to create index if it doesn't exist
    const createIndexSafely = async (collection, indexSpec, options = {}) => {
      try {
        await db.collection(collection).createIndex(indexSpec, options);
        console.log(`✅ Created index on ${collection}:`, indexSpec);
      } catch (error) {
        if (error.code === 86) { // IndexKeySpecsConflict
          console.log(`ℹ️  Index already exists on ${collection}:`, indexSpec);
        } else {
          console.error(`❌ Error creating index on ${collection}:`, error.message);
        }
      }
    };

    // Add indexes for ImportLog collection
    await createIndexSafely('importlogs', { timestamp: -1 });
    await createIndexSafely('importlogs', { feedUrl: 1 });
    await createIndexSafely('importlogs', { status: 1 });
    
    // Add indexes for JobFeed collection
    await createIndexSafely('jobfeeds', { name: 1 });
    await createIndexSafely('jobfeeds', { lastImport: -1 });

    // Add indexes for Job collection
    await createIndexSafely('jobs', { createdAt: -1 });
    await createIndexSafely('jobs', { updatedAt: -1 });

    console.log('\n✅ Database index setup completed');
    
    // Show existing indexes
    const importLogIndexes = await db.collection('importlogs').indexes();
    const jobFeedIndexes = await db.collection('jobfeeds').indexes();
    const jobIndexes = await db.collection('jobs').indexes();
    
    console.log('\n📊 Current Database Indexes:');
    console.log('ImportLogs:', importLogIndexes.map(i => i.name));
    console.log('JobFeeds:', jobFeedIndexes.map(i => i.name));
    console.log('Jobs:', jobIndexes.map(i => i.name));
    
  } catch (error) {
    console.error('❌ Error setting up indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

setupIndexes();