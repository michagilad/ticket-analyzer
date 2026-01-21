import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { CategoryConfig, DEFAULT_CATEGORIES } from '@/lib/categoryStorage';

const CATEGORIES_KEY = 'qc-ticket-analyzer:categories';

// Initialize Redis client from environment variable
function getRedisClient(): Redis | null {
  const redisUrl = process.env.KV_REDIS_URL;
  if (!redisUrl) {
    console.log('KV_REDIS_URL not configured');
    return null;
  }
  
  try {
    // Parse the Redis URL to extract the token
    // Format: https://:<token>@<host>
    const url = new URL(redisUrl);
    const token = url.password;
    const baseUrl = `${url.protocol}//${url.host}`;
    
    return new Redis({
      url: baseUrl,
      token: token,
    });
  } catch (error) {
    console.error('Failed to create Redis client:', error);
    return null;
  }
}

// In-memory cache fallback for local development
let cachedCategories: CategoryConfig | null = null;

async function readCategories(): Promise<CategoryConfig> {
  const redis = getRedisClient();
  
  // Try Redis first
  if (redis) {
    try {
      const data = await redis.get<CategoryConfig>(CATEGORIES_KEY);
      if (data) {
        cachedCategories = data;
        return data;
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
    categories: DEFAULT_CATEGORIES,
    lastUpdated: new Date().toISOString()
  };
}

async function writeCategories(config: CategoryConfig): Promise<void> {
  // Always update in-memory cache
  cachedCategories = config;
  
  const redis = getRedisClient();
  
  // Try to persist to Redis
  if (redis) {
    try {
      await redis.set(CATEGORIES_KEY, config);
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
      categories: DEFAULT_CATEGORIES,
      lastUpdated: new Date().toISOString()
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config: CategoryConfig = {
      categories: body.categories,
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
