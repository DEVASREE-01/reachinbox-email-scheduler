import { Request, Response, NextFunction } from 'express';
import {
  getGoogleAuthUrl,
  getGoogleUser,
  findOrCreateUser,
} from '../services/auth.service';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Redirects the user to Google OAuth.
 * Uses developer bypass only when placeholder credentials are configured.
 */
export function googleLogin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (env.GOOGLE_CLIENT_ID.startsWith('placeholder')) {
      logger.info(
        'Google OAuth credentials are placeholders. Redirecting to dev bypass login.'
      );

      const backendUrl = `http://localhost:${env.PORT}`;

      return res.redirect(
        `${backendUrl}/api/auth/google/bypass`
      );
    }

    const authUrl = getGoogleAuthUrl();

    logger.info(
      '🔍 [Debug] Redirecting user to Google OAuth'
    );

    return res.redirect(authUrl);
  } catch (error) {
    logger.error(
      { err: error },
      '❌ Google OAuth login initialization failed'
    );

    return next(error);
  }
}

/**
 * Local developer authentication bypass.
 */
export async function googleBypass(
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.info(
    '🔍 [Debug] Developer bypass login triggered'
  );

  try {
    const devProfile = {
      sub: 'dev-google-oauth-placeholder-id',
      name: 'Developer User',
      email: 'dev-user@reachinbox.com',
      picture:
        'https://lh3.googleusercontent.com/a/default-user=s96-c',
    };

    logger.info(
      '🔍 [Debug] Upserting developer user in database...'
    );

    const user = await findOrCreateUser(devProfile);

    // Store authenticated user ID in session
    req.session.userId = user.id;

    logger.info(
      '🔍 [Debug] Saving developer session to Redis...'
    );

    req.session.save((err) => {
      if (err) {
        logger.error(
          { err },
          '❌ [Debug] Failed to save developer session'
        );

        return next(err);
      }

      logger.info(
        {
          sessionId: req.sessionID,
          userId: req.session.userId,
          redirectUrl: env.FRONTEND_URL,
        },
        '✅ [Debug] Developer session saved successfully'
      );

      return res.redirect(env.FRONTEND_URL);
    });
  } catch (error: any) {
    logger.error(
      { err: error.message },
      '❌ [Debug] Developer bypass login failed'
    );

    return res.redirect(
      `${env.FRONTEND_URL}/login?error=bypass_failed`
    );
  }
}

/**
 * Handles the callback from Google OAuth.
 */
export async function googleCallback(
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log('\n🔍 [Debug] GOOGLE CALLBACK RECEIVED');
  console.log('🔍 [Debug] Step 1: Checking authorization code');
  const code = req.query.code as string;

  if (!code) {
    console.error('❌ [Debug] Google authorization code is missing');
    return next(
      new UnauthorizedError(
        'Google authorization code not found in callback'
      )
    );
  }

  try {
    const googleProfile = await getGoogleUser(code);

    console.log('🔍 [Debug] Step 4: Finding or creating user in PostgreSQL');
    const user = await findOrCreateUser(googleProfile);
    console.log('🔍 [Debug] Step 5: User database operation completed');

    // Store user ID in the Express session
    console.log('🔍 [Debug] Step 6: Setting session userId');
    req.session.userId = user.id;

    console.log('🔍 [Debug] Step 7: Saving session to Redis');

    // IMPORTANT: Explicitly save the session before redirecting.
    req.session.save((err) => {
      if (err) {
        console.error('❌ FULL SESSION SAVE ERROR:', err);
        return next(err);
      }

      console.log('🔍 [Debug] Step 8: Session successfully saved');
      console.log('🔍 [Debug] Step 9: Redirecting user to frontend dashboard');
      return res.redirect(env.FRONTEND_URL);
    });
  } catch (error: any) {
    console.error('❌ FULL GOOGLE OAUTH ERROR:', error);
    console.error('❌ ERROR MESSAGE:', error?.message);
    console.error('❌ ERROR STACK:', error?.stack);
    
    if (error?.response) {
      console.error('❌ AXIOS RESPONSE STATUS:', error.response?.status);
      console.error('❌ AXIOS RESPONSE DATA:', error.response?.data);
    }

    if (error?.code) {
      console.error('❌ PRISMA ERROR CODE:', error.code);
      console.error('❌ PRISMA ERROR METADATA:', error.meta);
    }

    return res.redirect(
      `${env.FRONTEND_URL}/login?error=oauth_failed`
    );
  }
}

/**
 * Returns the currently authenticated user.
 *
 * Route:
 * GET /api/auth/me
 */
export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log('\n========================================');
  console.log('🔍 [Debug] GET /api/auth/me called');
  console.log('🔍 [Debug] Session ID:', req.sessionID);
  console.log(
    '🔍 [Debug] Session userId:',
    req.session?.userId
  );
  console.log(
    '🔍 [Debug] Request cookies:',
    req.cookies
  );
  console.log(
    '🔍 [Debug] Raw cookie header:',
    req.headers.cookie
  );
  console.log('========================================\n');

  const userId = req.session?.userId;

  if (!userId) {
    console.log(
      '❌ [Debug] No userId found in the current session'
    );

    return next(
      new UnauthorizedError(
        'Authentication required'
      )
    );
  }

  try {
    console.log(
      '🔍 [Debug] Searching authenticated user in database:',
      userId
    );

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      console.log(
        '❌ [Debug] User does not exist in database:',
        userId
      );

      return next(
        new UnauthorizedError(
          'User not found'
        )
      );
    }

    console.log(
      '✅ [Debug] Authenticated user found:',
      user.email
    );

    return res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error(
      '❌ [Debug] Error while fetching authenticated user:',
      error
    );

    return next(error);
  }
}

/**
 * Logs out the current user.
 */
export function logout(
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.info(
    {
      sessionId: req.sessionID,
      userId: req.session?.userId,
    },
    '🔍 [Debug] Logout requested'
  );

  req.session.destroy((err) => {
    if (err) {
      logger.error(
        { err },
        '❌ Error destroying session during logout'
      );

      return next(err);
    }

    res.clearCookie('sid', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    logger.info(
      '✅ [Debug] Session destroyed successfully'
    );

    return res.json({
      success: true,
      message: 'Logged out successfully',
    });
  });
}
