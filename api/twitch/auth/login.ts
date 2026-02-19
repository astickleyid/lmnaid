// Vercel Serverless Function: Initiate Twitch OAuth
// Deploy: /api/twitch/auth/login

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // TODO: Replace with real credentials
  const clientId = process.env.TWITCH_CLIENT_ID || 'YOUR_CLIENT_ID';
  const redirectUri = process.env.TWITCH_REDIRECT_URI || 'http://localhost:3000/api/twitch/auth/callback';
  const scopes = [
    'user:read:email',
    'chat:read',
    'chat:edit',
    'channel:read:subscriptions',
    'clips:edit'
  ].join(' ');

  // Generate random state for CSRF protection
  const state = Math.random().toString(36).substring(7);

  // TODO: Store state in session/cookies for verification

  const authUrl = `https://id.twitch.tv/oauth2/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `state=${state}`;

  res.redirect(authUrl);
}
