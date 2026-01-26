import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';
import { format, subDays, parseISO } from 'date-fns';

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

// GET endpoint - retrieve flagged data for a specific date
export async function GET(request: NextRequest) {
  const redis = getRedisClient();
  
  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not available' },
      { status: 503 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
    
    // Clean up old data on every GET request
    await cleanupOldData(redis);
    
    const key = `${FLAGGED_DATA_PREFIX}${date}`;
    const data = await redis.get(key);
    await redis.quit();
    
    if (!data) {
      return NextResponse.json({
        date,
        data: [],
        exists: false
      });
    }
    
    return NextResponse.json({
      date,
      data: JSON.parse(data),
      exists: true
    });
  } catch (error) {
    console.error('Error reading flagged data:', error);
    return NextResponse.json(
      { error: 'Failed to read flagged data' },
      { status: 500 }
    );
  }
}

// POST endpoint - save flagged data for a specific date (defaults to today)
export async function POST(request: NextRequest) {
  const redis = getRedisClient();
  
  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not available' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const date = body.date || format(new Date(), 'yyyy-MM-dd');
    const data = body.data;
    
    if (!data) {
      return NextResponse.json(
        { error: 'No data provided' },
        { status: 400 }
      );
    }
    
    // Clean up old data before saving new data
    await cleanupOldData(redis);
    
    const key = `${FLAGGED_DATA_PREFIX}${date}`;
    
    // Check if data is empty (admin deleted all experiences for this date)
    const isEmpty = !data || (Array.isArray(data) && data.length === 0);
    
    if (isEmpty) {
      // Delete the data and remove the date from the set
      await redis.del(key);
      await redis.srem(FLAGGED_DATES_KEY, date);
      
      await redis.quit();
      
      return NextResponse.json({
        success: true,
        date,
        message: 'Flagged data cleared for this date'
      });
    }
    
    // Save the flagged data
    await redis.set(key, JSON.stringify(data));
    
    // Add the date to the set of dates
    await redis.sadd(FLAGGED_DATES_KEY, date);
    
    await redis.quit();
    
    return NextResponse.json({
      success: true,
      date,
      message: 'Flagged data saved successfully'
    });
  } catch (error) {
    console.error('Error saving flagged data:', error);
    return NextResponse.json(
      { error: 'Failed to save flagged data' },
      { status: 500 }
    );
  }
}
