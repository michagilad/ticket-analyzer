import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { CategoryConfig, DEFAULT_CATEGORIES } from '@/lib/categoryStorage';

const CATEGORIES_KEY = 'qc-ticket-analyzer:categories';

function parseRedisUrl(redisUrl: string): { url: string; token: string } | null {
  try {
    // Parse the Redis URL to extract the token
    // Format: https://:<token>@<host> or redis://:<token>@<host>
    const url = new URL(redisUrl);
    const token = url.password;
    const baseUrl = `${url.protocol}//${url.host}`;
    return { url: baseUrl, token };
  } catch {
    return null;
  }
}

export async function GET() {
  const result: {
    redisAvailable: boolean;
    redisError?: string;
    storedData: CategoryConfig | null;
    isUsingDefaults: boolean;
    categoryCount: number;
    lastUpdated: string | null;
    categories?: string[];
    envVarPresent: boolean;
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
    result.categoryCount = DEFAULT_CATEGORIES.length;
    result.categories = DEFAULT_CATEGORIES.map(c => c.name);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  }

  const parsed = parseRedisUrl(redisUrl);
  if (!parsed) {
    result.redisError = 'Failed to parse KV_REDIS_URL';
    result.isUsingDefaults = true;
    result.categoryCount = DEFAULT_CATEGORIES.length;
    result.categories = DEFAULT_CATEGORIES.map(c => c.name);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  }

  try {
    const redis = new Redis({
      url: parsed.url,
      token: parsed.token,
    });
    
    // Try to read from Redis
    const data = await redis.get<CategoryConfig>(CATEGORIES_KEY);
    result.redisAvailable = true;
    
    if (data) {
      result.storedData = data;
      result.isUsingDefaults = false;
      result.categoryCount = data.categories.length;
      result.lastUpdated = data.lastUpdated;
      result.categories = data.categories.map(c => c.name);
    } else {
      result.storedData = null;
      result.isUsingDefaults = true;
      result.categoryCount = DEFAULT_CATEGORIES.length;
      result.categories = DEFAULT_CATEGORIES.map(c => c.name);
    }
  } catch (error) {
    result.redisAvailable = false;
    result.redisError = error instanceof Error ? error.message : 'Unknown error';
    result.isUsingDefaults = true;
    result.categoryCount = DEFAULT_CATEGORIES.length;
    result.categories = DEFAULT_CATEGORIES.map(c => c.name);
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
}
