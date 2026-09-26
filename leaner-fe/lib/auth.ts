import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { JWT } from "next-auth/jwt";
import { create } from "@bufbuild/protobuf";
import { signIn } from "./grpc";
import { SignInRequestSchema, Role } from "./gen/leaner/v1/leaner_pb";
import { DefaultSession } from "next-auth";

// Extend the built-in session types
declare module "next-auth" {
  interface User {
    id?: string | undefined;
    role: Role;
    token: string;
    must_change_password: boolean;
  }
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: Role;
      token: string;
      must_change_password: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    token: string;
    must_change_password: boolean;
  }
}

export const {
  handlers,
  auth,
  signIn: nextAuthSignIn,
  signOut,
} = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret-do-not-use-in-production",
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        student_id: { label: "Student ID", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({
            student_id: z.string().optional(),
            email: z.string().optional(),
            password: z.string().min(6),
          })
          .safeParse(credentials);

        if (!parsedCredentials.success) {
          return null;
        }

        try {
          const request = create(SignInRequestSchema, {
            studentId: parsedCredentials.data.student_id || undefined,
            email: parsedCredentials.data.email || undefined,
            password: parsedCredentials.data.password,
          });

          const response = await signIn(request);
          const { token, user, mustChangePassword } = response;

          if (!user) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.displayName || user.username,
            role: user.role,
            token: token,
            must_change_password: mustChangePassword,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          id: user.id,
          role: user.role,
          token: user.token,
          must_change_password: user.must_change_password,
        } as JWT;
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id,
          role: token.role,
          token: token.token,
          must_change_password: token.must_change_password,
        },
      };
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});
