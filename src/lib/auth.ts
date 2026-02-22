import NextAuth from "next-auth";
import type { Adapter, AdapterAccount } from "next-auth/adapters";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users, accounts } from "./db/schema";
import { encrypt, decrypt, isEncryptionAvailable } from "./encryption";

const TOKEN_FIELDS = ["access_token", "refresh_token", "id_token"] as const;

async function encryptTokens(account: AdapterAccount): Promise<AdapterAccount> {
  if (!isEncryptionAvailable()) return account;
  const copy = { ...account };
  for (const field of TOKEN_FIELDS) {
    const val = copy[field];
    if (typeof val === "string" && val.length > 0) {
      copy[field] = await encrypt(val);
    }
  }
  return copy;
}

async function decryptTokens(account: AdapterAccount): Promise<AdapterAccount> {
  if (!isEncryptionAvailable()) return account;
  const copy = { ...account };
  for (const field of TOKEN_FIELDS) {
    const val = copy[field];
    if (typeof val === "string" && val.length > 0) {
      try {
        copy[field] = await decrypt(val);
      } catch {
        // Value wasn't encrypted (pre-existing row) — leave as-is
      }
    }
  }
  return copy;
}

function withEncryptedTokens(base: Adapter): Adapter {
  return {
    ...base,
    linkAccount: async (account: AdapterAccount) => {
      await base.linkAccount!(await encryptTokens(account));
    },
    ...(base.getAccount && {
      getAccount: async (providerAccountId: string, provider: string) => {
        const acct = await base.getAccount!(providerAccountId, provider);
        return acct ? await decryptTokens(acct) : null;
      },
    }),
  };
}

const baseAdapter = DrizzleAdapter(getDb(), {
  usersTable: users,
  accountsTable: accounts,
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: withEncryptedTokens(baseAdapter),
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in: read tier from DB
      if (user?.id) {
        try {
          const db = getDb();
          const [dbUser] = await db.select({ tier: users.tier }).from(users).where(eq(users.id, user.id));
          token.tier = (dbUser?.tier as "free" | "pro") ?? "free";
        } catch {
          token.tier = "free";
        }
        token.tierCheckedAt = Date.now();
      }

      // Re-check tier from DB every 5 minutes (picks up admin changes)
      const TIER_REFRESH_MS = 5 * 60 * 1000;
      if (token.sub && (!token.tierCheckedAt || Date.now() - token.tierCheckedAt > TIER_REFRESH_MS)) {
        try {
          const db = getDb();
          const [dbUser] = await db.select({ tier: users.tier }).from(users).where(eq(users.id, token.sub));
          token.tier = (dbUser?.tier as "free" | "pro") ?? "free";
        } catch {
          // Keep existing tier on error
        }
        token.tierCheckedAt = Date.now();
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.tier = (token.tier as "free" | "pro") ?? "free";
      }
      return session;
    },
  },
});
