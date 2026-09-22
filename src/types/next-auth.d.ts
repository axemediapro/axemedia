import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    username?: string | null;
    role:     string;
    clientId: string | null;
  }
  interface Session {
    user: {
      id:        string;
      username?: string | null;
      role:      string;
      clientId:  string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string | null;
    role:      string;
    id:        string;
    clientId:  string | null;
  }
}

