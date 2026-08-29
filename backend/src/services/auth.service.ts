import axios from 'axios';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export interface GoogleUserProfile {
  sub: string; // Google User ID
  name: string;
  email: string;
  picture: string; // Avatar URL
}

/**
 * Generates the redirect URL for Google OAuth consent screen.
 */
export function getGoogleAuthUrl(): string {
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    client_id: env.GOOGLE_CLIENT_ID,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
  };

  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
}

/**
 * Exchanges the Google authorization code for access tokens and fetches the user profile.
 */
export async function getGoogleUser(code: string): Promise<GoogleUserProfile> {
  console.log('🔍 [Debug] Step 2: Exchanging Google authorization code for tokens');
  const url = 'https://oauth2.googleapis.com/token';
  const values = {
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    grant_type: 'authorization_code',
  };

  try {
    const res = await axios.post(url, new URLSearchParams(values), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, id_token } = res.data;

    console.log('🔍 [Debug] Step 3: Fetching Google user profile');
    // Fetch user profile info
    const profileRes = await axios.get<GoogleUserProfile>(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    return profileRes.data;
  } catch (error: any) {
    logger.error({ err: error?.response?.data || error.message }, '❌ Failed to authenticate with Google OAuth');
    throw error;
  }
}

/**
 * Finds or creates a user record in the PostgreSQL database.
 */
export async function findOrCreateUser(profile: GoogleUserProfile) {
  try {
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: {
        name: profile.name,
        avatar: profile.picture,
      },
      create: {
        googleId: profile.sub,
        email: profile.email,
        name: profile.name,
        avatar: profile.picture,
      },
    });

    return user;
  } catch (error) {
    logger.error({ err: error }, '❌ Database user upsert error');
    throw error;
  }
}
