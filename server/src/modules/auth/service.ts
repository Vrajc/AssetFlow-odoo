import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { signToken } from '../../middleware/auth';
import { badRequest, unauthorized } from '../../utils/errors';
import { logActivity } from '../activity/service';

const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  departmentId: true,
  department: { select: { id: true, name: true } },
} as const;

export async function signup(input: { name: string; email: string; password: string }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw badRequest('An account with that email already exists');

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    // Signup ALWAYS creates an EMPLOYEE. Roles are only assigned by an admin later.
    data: { name: input.name, email: input.email, passwordHash, role: 'EMPLOYEE' },
    select: publicUser,
  });
  await logActivity({ actorId: user.id, action: 'USER_SIGNUP', entityType: 'User', entityId: user.id });
  const token = signToken({ id: user.id, role: user.role });
  return { token, user };
}

export async function login(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw unauthorized('Invalid email or password');
  if (user.status === 'INACTIVE') throw unauthorized('Account is deactivated');
  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw unauthorized('Invalid email or password');

  const token = signToken({ id: user.id, role: user.role });
  const safe = await prisma.user.findUnique({ where: { id: user.id }, select: publicUser });
  return { token, user: safe };
}

// In-memory reset tokens (no email infra). Logged to console for demo.
const resetTokens = new Map<string, { email: string; expires: number }>();

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond success to avoid user enumeration.
  if (user) {
    const token = crypto.randomBytes(24).toString('hex');
    resetTokens.set(token, { email, expires: Date.now() + 1000 * 60 * 30 });
    // eslint-disable-next-line no-console
    console.log(`\n[AssetFlow] Password reset token for ${email}:\n  ${token}\n`);
  }
  return { message: 'If that email exists, a reset token has been generated (check server console).' };
}

export async function resetPassword(token: string, newPassword: string) {
  const entry = resetTokens.get(token);
  if (!entry || entry.expires < Date.now()) throw badRequest('Invalid or expired reset token');
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { email: entry.email }, data: { passwordHash } });
  resetTokens.delete(token);
  return { message: 'Password updated. You can now log in.' };
}

export async function me(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: publicUser });
}
