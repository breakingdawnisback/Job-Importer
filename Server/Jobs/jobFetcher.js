import axios from 'axios';
import xml2js from 'xml2js';
import { jobQueue } from '../queue/jobQueue.js';
import JobFeed from '../models/jobFeed.js';

function sanitizeXml(xmlString) {
  return xmlString
    .replace(/<\?xml.*?\?>/, '')
    .replace(/(\w+)=([^\s">]+)/g, '$1="$2"') // fix unquoted attributes
    .replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;');
}

export async function fetchAndQueueJobs() {
  try {
    console.log('Starting job fetch process...');
    
    // Fetch all active feeds from MongoDB (user-added feeds only)
    const activeFeeds = await JobFeed.find({ isActive: true }).lean();
    
    if (!activeFeeds || activeFeeds.length === 0) {
      console.log('No active feeds found in database. Please add feeds through the frontend.');
      return;
    }

    console.log(`Found ${activeFeeds.length} active feed(s) to process`);

    let successCount = 0;
    let errorCount = 0;

    // Process each feed from the database
    for (const feed of activeFeeds) {
      try {
        console.log(`Processing feed: "${feed.name}" - ${feed.url}`);
        
        // Fetch XML data from the feed URL
        const response = await axios.get(feed.url, {
          timeout: 30000, // 30 second timeout
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; JobImporter/1.0)',
            'Accept': 'application/rss+xml, application/xml, text/xml'
          },
          maxRedirects: 5
        });

        if (!response.data) {
          throw new Error('Empty response from feed URL');
        }
        
        // Sanitize and parse XML
        const sanitizedXml = sanitizeXml(response.data);
        const parsedJson = await xml2js.parseStringPromise(sanitizedXml, { 
          explicitArray: false,
          trim: true,
          normalize: true
        });

        if (!parsedJson) {
          throw new Error('Failed to parse XML data');
        }
        
        // Queue the job with feed information
        await jobQueue.add('import', { 
          feedId: feed._id.toString(),
          feedUrl: feed.url, 
          feedName: feed.name,
          feedCategory: feed.category,
          jobs: parsedJson 
        }, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        });
        
        console.log(`✓ Successfully queued jobs from feed: "${feed.name}"`);
        successCount++;
        
      } catch (error) {
        errorCount++;
        console.error(`✗ Error processing feed "${feed.name}" (${feed.url}):`, {
          message: error.message,
          code: error.code,
          status: error.response?.status
        });
        
        // Continue processing other feeds even if one fails
        continue;
      }
    }

    console.log(`Job fetch process completed. Success: ${successCount}, Errors: ${errorCount}`);
    
  } catch (dbError) {
    console.error('Database error while fetching feeds:', dbError.message);
    throw dbError;
  }
}