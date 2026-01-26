import { NextResponse } from 'next/server';
import Redis from 'ioredis';
import { format, subDays } from 'date-fns';

const FLAGGED_DATES_KEY = 'qc-ticket-analyzer:flagged:dates';
const FLAGGED_DATA_PREFIX = 'qc-ticket-analyzer:flagged:';
const RETENTION_DAYS = 30;

// Initialize Redis client from environment variable
function getRedisClient(): Redis | null {
  const redisUrl = process.env.KV_REDIS_URL;
  if (!redisUrl) {
    console.log('KV_REDIS_URL not configured');
    return null;
  }
  
  try {
    return new Redis(redisUrl);
  } catch (error) {
    console.error('Failed to create Redis client:', error);
    return null;
  }
}

// Clean up data older than 30 days
async function cleanupOldData(redis: Redis): Promise<void> {
  try {
    const cutoffDate = format(subDays(new Date(), RETENTION_DAYS), 'yyyy-MM-dd');
    
    // Get all dates
    const dates = await redis.smembers(FLAGGED_DATES_KEY);
    
    for (const date of dates) {
      if (date < cutoffDate) {
        // Delete the data
        await redis.del(`${FLAGGED_DATA_PREFIX}${date}`);
        // Remove from the dates set
        await redis.srem(FLAGGED_DATES_KEY, date);
        console.log(`Cleaned up flagged data for ${date}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old data:', error);
  }
}

// GET endpoint - retrieve all dates that have flagged data
export async function GET() {
  const redis = getRedisClient();
  
  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not available' },
      { status: 503 }
    );
  }

  try {
    // Clean up old data first
    await cleanupOldData(redis);
    
    // Get all dates
    const dates = await redis.smembers(FLAGGED_DATES_KEY);
    
    // Verify each date has actual data, remove if empty
    const validDates: string[] = [];
    for (const date of dates) {
      const key = `${FLAGGED_DATA_PREFIX}${date}`;
      const data = await redis.get(key);
      
      if (data) {
        try {
          const parsed = JSON.parse(data);
          // Only keep dates that have non-empty data
          if (Array.isArray(parsed) && parsed.length > 0) {
            validDates.push(date);
          } else {
            // Remove empty date from set
            await redis.srem(FLAGGED_DATES_KEY, date);
            await redis.del(key);
          }
        } catch (e) {
          // Invalid JSON, remove from set
          await redis.srem(FLAGGED_DATES_KEY, date);
          await redis.del(key);
        }
      } else {
        // No data for this date, remove from set
        await redis.srem(FLAGGED_DATES_KEY, date);
      }
    }
    
    await redis.quit();
    
    // Sort dates in descending order (newest first)
    const sortedDates = validDates.sort((a, b) => b.localeCompare(a));
    
    return NextResponse.json({
      dates: sortedDates
    });
  } catch (error) {
    console.error('Error reading flagged dates:', error);
    return NextResponse.json(
      { error: 'Failed to read flagged dates' },
      { status: 500 }
    );
  }
}
