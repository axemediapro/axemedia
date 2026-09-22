import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Përdoruesi ose Email", type: "text" },
        email:    { label: "Email",               type: "text" },
        password: { label: "Fjalëkalimi",         type: "password" },
      },
      async authorize(credentials) {
        const loginInput = (credentials?.username || credentials?.email || "").trim();
        const password = credentials?.password || "";

        if (!loginInput || !password) return null;

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { username: loginInput },
              { email: loginInput },
              { username: loginInput.toLowerCase() },
              { email: loginInput.toLowerCase() },
            ],
          },
        });

        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return {
          id:       String(user.id),
          name:     user.name,
          username: user.username,
          email:    user.email,
          role:     user.role,
          clientId: user.clientId ? String(user.clientId) : null,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role     = (user as { role: string; clientId: string | null; username?: string | null }).role;
        token.id       = user.id;
        token.clientId = (user as { role: string; clientId: string | null; username?: string | null }).clientId;
        token.username = (user as { role: string; clientId: string | null; username?: string | null }).username ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role     = token.role     as string;
      session.user.id       = token.id       as string;
      session.user.username = (token.username as string | null) ?? null;
      session.user.clientId = token.clientId as string | null;
      return session;
    },
  },

  pages:   { signIn: "/login" },
  session: { strategy: "jwt" },
  secret:  process.env.NEXTAUTH_SECRET ?? "axemedia-dev-secret-super-secure-key-2026",
};

