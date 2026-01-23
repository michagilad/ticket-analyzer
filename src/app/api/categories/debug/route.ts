import { NextResponse } from 'next/server';
import Redis from 'ioredis';
import { IssueConfig, DEFAULT_ISSUES } from '@/lib/categoryStorage';

const CATEGORIES_KEY = 'qc-ticket-analyzer:categories';

export async function GET() {
  const result: {
    redisAvailable: boolean;
    redisError?: string;
    storedData: IssueConfig | null;
    isUsingDefaults: boolean;
    categoryCount: number;
    lastUpdated: string | null;
    categories?: string[];
    envVarPresent: boolean;
    redisHost?: string;
  } = {
    redisAvailable: false,
    storedData: null,
    isUsingDefaults: true,
    categoryCount: 0,
    lastUpdated: null,
    envVarPresent: !!process.env.KV_REDIS_URL,
  };

  const redisUrl = process.env.KV_REDIS_URL;
  
  if (!redisUrl) {
    result.redisError = 'KV_REDIS_URL environment variable is not set';
    result.isUsingDefaults = true;
    result.categoryCount = DEFAULT_ISSUES.length;
    result.categories = DEFAULT_ISSUES.map(c => c.name);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  }

  // Extract host for debugging (don't show full URL with credentials)
  try {
    const url = new URL(redisUrl);
    result.redisHost = url.host;
  } catch {
    result.redisHost = 'invalid-url';
  }

  let redis: Redis | null = null;
  
  try {
    redis = new Redis(redisUrl);
    
    // Try to read from Redis with a timeout
    const data = await redis.get(CATEGORIES_KEY);
    result.redisAvailable = true;
    
    if (data) {
      const parsed = JSON.parse(data) as IssueConfig;
      result.storedData = parsed;
      result.isUsingDefaults = false;
      result.categoryCount = parsed.issues.length;
      result.lastUpdated = parsed.lastUpdated;
      result.categories = parsed.issues.map(c => c.name);
    } else {
      result.storedData = null;
      result.isUsingDefaults = true;
      result.categoryCount = DEFAULT_ISSUES.length;
      result.categories = DEFAULT_ISSUES.map(c => c.name);
    }
  } catch (error) {
    result.redisAvailable = false;
    result.redisError = error instanceof Error ? error.message : 'Unknown error';
    result.isUsingDefaults = true;
    result.categoryCount = DEFAULT_ISSUES.length;
    result.categories = DEFAULT_ISSUES.map(c => c.name);
  } finally {
    if (redis) {
      try {
        await redis.quit();
      } catch {
        // Ignore quit errors
      }
    }
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
}
