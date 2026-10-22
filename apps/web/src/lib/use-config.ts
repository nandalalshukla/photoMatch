import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { AppConfig } from './types';

/** Which optional features the server has configured (Google login, bots, uploads). */
export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: () => api<AppConfig>('/public/config'),
    staleTime: Infinity, // it only changes when the server restarts
  }).data;
}
