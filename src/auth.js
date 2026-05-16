import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google,
  ],
  callbacks: {
    async signIn({ user }) {
      const allowedEmail = "kakobuybs209@gmail.com";
      if (user.email === allowedEmail) {
        return true;
      }
      return false; // Deny access to everyone else
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.isAdmin = session.user.email === "kakobuybs209@gmail.com";
      }
      return session;
    },
  },
});
