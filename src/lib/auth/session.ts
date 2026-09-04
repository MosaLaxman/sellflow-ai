import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '../db/prisma';

const SESSION_COOKIE_NAME = 'sellflow_session';
const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'sellflow_local_super_secret_session_key_32_chars_long_verified'
);

export interface SessionPayload {
  merchantId: string;
  email: string;
  slug: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SESSION_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return {
      merchantId: payload.merchantId as string,
      email: payload.email as string,
      slug: payload.slug as string,
    };
  } catch {
    return null;
  }
}

export async function getCurrentMerchant() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  const merchant = await prisma.merchant.findUnique({
    where: { id: session.merchantId },
    include: { policy: true },
  });

  return merchant;
}

export function getSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}
