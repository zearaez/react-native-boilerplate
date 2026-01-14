import type { ApiError, Session, User } from '../../types';
import { appApi } from '../api/appApi';

type SignInRequest = {
  email: string;
  password: string;
};

type SignInResponse = {
  user: User;
};

export async function getMe(): Promise<Session | null> {
  try {
    const user = await appApi.get<User>('/me', {
      retryOnUnauthorized: false,
    });

    return { user };
  } catch (error) {
    const apiError = error as Partial<ApiError> | undefined;
    if (apiError?.code === 'UNAUTHORIZED') {
      return null;
    }

    throw error;
  }
}

export async function signIn(body: SignInRequest): Promise<SignInResponse> {
  // Assumes a standard backend path; centralize here for easy adjustment.
  return appApi.post<SignInResponse, SignInRequest>('/auth/login', body);
}

export async function signOut(): Promise<void> {
  await appApi.post<void, Record<string, never>>('/auth/logout', {});
}
