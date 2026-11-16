import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const socialProviders = ['google', 'zalo'] as const;
export type SocialProvider = typeof socialProviders[number];
export type SocialConfig = Partial<Record<SocialProvider, { clientId: string; secret: string }>>;
export interface SocialIdentity { subject: string; name: string; email?: string }

export function readSocialConfig(env: NodeJS.ProcessEnv): SocialConfig {
  const config: SocialConfig = {};
  for (const provider of socialProviders) {
    const prefix = provider.toUpperCase();
    const clientId = env[provider === 'zalo' ? 'ZALO_APP_ID' : 'GOOGLE_CLIENT_ID'];
    const key = provider === 'zalo' ? 'ZALO_APP_SECRET' : 'GOOGLE_CLIENT_SECRET';
    const file = env[key + '_FILE'];
    if (env[key] && file) throw new Error(`Choose ${key} or ${key}_FILE`);
    const secret = file ? readFileSync(file, 'utf8').trim() : env[key];
    if (!clientId && !secret) continue;
    if (!clientId || !secret) throw new Error(`Incomplete ${prefix} login configuration`);
    config[provider] = { clientId, secret };
  }
  return config;
}

export const socialChallenge = (verifier: string) => createHash('sha256').update(verifier).digest('base64url');

export function authorizationUrl(provider: SocialProvider, clientId: string, callback: string, state: string, verifier: string) {
  const google = provider === 'google';
  const url = new URL(google ? 'https://accounts.google.com/o/oauth2/v2/auth' : 'https://oauth.zaloapp.com/v4/permission');
  url.search = new URLSearchParams({
    [google ? 'client_id' : 'app_id']: clientId, redirect_uri: callback, state,
    code_challenge: socialChallenge(verifier),
    ...(google ? { response_type: 'code', scope: 'openid email profile', code_challenge_method: 'S256' } : {}),
  }).toString();
  return url.href;
}

async function providerJson(url: string, options: RequestInit) {
  const response = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Social provider rejected request');
  return await response.json() as Record<string, unknown>;
}

export async function exchangeIdentity(provider: SocialProvider, config: NonNullable<SocialConfig[SocialProvider]>, callback: string, code: string, verifier: string): Promise<SocialIdentity> {
  const google = provider === 'google';
  const token = await providerJson(google ? 'https://oauth2.googleapis.com/token' : 'https://oauth.zaloapp.com/v4/access_token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...(google ? {} : { secret_key: config.secret }) },
    body: new URLSearchParams({
      grant_type: 'authorization_code', code, code_verifier: verifier,
      ...(google ? { client_id: config.clientId, client_secret: config.secret, redirect_uri: callback } : { app_id: config.clientId }),
    }),
  });
  if (typeof token.access_token !== 'string' || !token.access_token) throw new Error('Missing social access token');
  const profile = await providerJson(google ? 'https://openidconnect.googleapis.com/v1/userinfo' : 'https://graph.zalo.me/v2.0/me?fields=id,name', {
    headers: google ? { authorization: `Bearer ${token.access_token}` } : { access_token: token.access_token },
  });
  const subject = google ? profile.sub : profile.id;
  if (typeof subject !== 'string' || !subject.trim() || subject.length > 200) throw new Error('Missing social identity');
  const email = typeof profile.email === 'string' ? profile.email.trim().toLowerCase() : '';
  if (google && (profile.email_verified !== true || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error('Google email must be verified');
  const name = typeof profile.name === 'string' ? profile.name.trim().slice(0, 120).trim() : '';
  return { subject, name: name || (google ? 'Khách hàng Google' : 'Khách hàng Zalo'), email: google ? email : undefined };
}
