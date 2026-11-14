import { ApiError } from '../api/client';
import type { FeedError } from './liveFeed';

export function toFeedError(error: unknown): FeedError {
  if (error instanceof ApiError) return { code: error.code, message: error.message };
  return { code: 'UNKNOWN', message: error instanceof Error ? error.message : 'Something went wrong.' };
}

export function isNetworkError(error: FeedError | null): boolean {
  return error?.code === 'NETWORK_ERROR';
}
