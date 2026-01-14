import { useQuery } from '@tanstack/react-query';

import type { Session } from '../../types';
import { getMe } from './authService';

export function useMe() {
  return useQuery<Session | null>({
    queryKey: ['me'],
    queryFn: getMe,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: false,
  });
}
