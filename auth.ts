import { writeAuditLog } from "@/lib/audit";
import { isProdAppEnv } from "@/lib/env";
import prisma from "@/lib/prisma";
import { normalizeEmail } from "@/lib/security/email";
import { getClientIp } from "@/lib/security/ip";
import { verifyPassword } from "@/lib/security/password";
import {
  assertRateLimit,
  rateLimitRules,
  RateLimitExceededError,
} from "@/lib/security/rate-limit";
import { AuditEvent } from "@/prisma/generated/client";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const DUMMY_BCRYPT_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcXeOi5V5n7V6czS4QhIwTZPIYOvTo95OfzK";
const SECURE_COOKIES = isProdAppEnv();
const SESSION_COOKIE_NAME = SECURE_COOKIES
  ? "__Secure-next-auth.session-token"
  : "next-auth.session-token";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = normalizeEmail(credentials.email);
        const ipAddress = getClientIp({ headers: req?.headers });

        try {
          await assertRateLimit(ipAddress, rateLimitRules.loginByIp);
          await assertRateLimit(normalizedEmail, rateLimitRules.loginByAccount);
        } catch (error) {
          if (error instanceof RateLimitExceededError) {
            await writeAuditLog({
              event: AuditEvent.AUTH_LOGIN_FAIL,
              metadata: {
                reason: "rate_limited",
              },
            });
            return null;
          }
          throw error;
        }

        const user = await prisma.user.findFirst({
          where: {
            email: normalizedEmail,
            deletedAt: null,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            passwordHash: true,
          },
        });

        const passwordHash = user?.passwordHash ?? DUMMY_BCRYPT_HASH;
        const isCorrectPassword = await verifyPassword(credentials.password, passwordHash);

        if (!user || !isCorrectPassword) {
          await writeAuditLog({
            event: AuditEvent.AUTH_LOGIN_FAIL,
            targetUserId: user?.id,
            metadata: {
              reason: "invalid_credentials",
            },
          });
          return null;
        }

        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            lastLoginAt: new Date(),
          },
        });

        await writeAuditLog({
          event: AuditEvent.AUTH_LOGIN_SUCCESS,
          actorUserId: user.id,
          targetUserId: user.id,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  useSecureCookies: SECURE_COOKIES,
  cookies: {
    sessionToken: {
      name: SESSION_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: SECURE_COOKIES,
      },
    },
  },
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.email = token.email ?? session.user.email;
      }
      return session;
    },
  },
} satisfies NextAuthOptions;
