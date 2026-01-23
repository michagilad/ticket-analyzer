import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';
import { IssueConfig, DEFAULT_ISSUES } from '@/lib/categoryStorage';

const CATEGORIES_KEY = 'qc-ticket-analyzer:categories';

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

// In-memory cache fallback for local development
let cachedCategories: IssueConfig | null = null;

async function readCategories(): Promise<IssueConfig> {
  const redis = getRedisClient();
  
  // Try Redis first
  if (redis) {
    try {
      const data = await redis.get(CATEGORIES_KEY);
      await redis.quit();
      
      if (data) {
        const parsed = JSON.parse(data) as IssueConfig;
        cachedCategories = parsed;
        return parsed;
      }
    } catch (error) {
      console.log('Redis read error, using fallback:', error);
    }
  }
  
  // Fall back to in-memory cache
  if (cachedCategories) {
    return cachedCategories;
  }
  
  // Return default config
  return {
    issues: DEFAULT_ISSUES,
    lastUpdated: new Date().toISOString()
  };
}

async function writeCategories(config: IssueConfig): Promise<void> {
  // Always update in-memory cache
  cachedCategories = config;
  
  const redis = getRedisClient();
  
  // Try to persist to Redis
  if (redis) {
    try {
      await redis.set(CATEGORIES_KEY, JSON.stringify(config));
      await redis.quit();
    } catch (error) {
      console.error('Failed to write to Redis:', error);
      // Don't throw - we still have in-memory cache for this session
    }
  }
}

export async function GET() {
  try {
    const config = await readCategories();
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error reading categories:', error);
    // Return defaults on error
    return NextResponse.json({
      issues: DEFAULT_ISSUES,
      lastUpdated: new Date().toISOString()
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config: IssueConfig = {
      issues: body.issues || body.categories, // Support both for compatibility
      lastUpdated: new Date().toISOString()
    };
    await writeCategories(config);
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error saving categories:', error);
    return NextResponse.json(
      { error: 'Failed to save categories' },
      { status: 500 }
    );
  }
}
