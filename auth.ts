import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    // Expose user id (sub) in the session for rate limiting
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
    // Redirect unauthenticated users to /login instead of returning 401
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
});
