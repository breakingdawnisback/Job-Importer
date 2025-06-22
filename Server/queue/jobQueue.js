import { Queue } from 'bullmq';
import dotenv from 'dotenv';
dotenv.config();

export const jobQueue = new Queue('job-import', {
  connection: { url: process.env.REDIS_URL }
});