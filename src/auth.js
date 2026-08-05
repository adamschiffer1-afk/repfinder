import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";

const ADMIN_EMAIL = "kakobuybs209@gmail.com";
const ADMIN_DISCORD_ID = "1464343590586290287"; // frostyy | frostyyreps

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google,
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Just allow sign in - we'll save to DB via API call from client side
      return true;
    },
    async session({ session, token, user }) {
      if (session.user) {
        session.user.id = token.sub;
        // Admin jeśli email lub Discord ID się zgadza
        session.user.isAdmin = session.user.email === ADMIN_EMAIL || token.discordId === ADMIN_DISCORD_ID;
        // Dodaj Discord username i avatar
        if (token.discordUsername) {
          session.user.name = token.discordUsername;
        }
        if (token.discordAvatar) {
          session.user.image = token.discordAvatar;
        }
        // Add provider info
        if (token.provider) {
          session.user.provider = token.provider;
        }
        if (token.discordId) {
          session.user.discordId = token.discordId;
        }
        if (token.googleId) {
          session.user.googleId = token.googleId;
        }
      }
      return session;
    },
    async jwt({ token, account, profile }) {
      // Save provider info to token
      if (account) {
        token.provider = account.provider;
        
        if (account.provider === "discord") {
          token.discordId = account.providerAccountId;
          token.discordUsername = profile.username || profile.global_name || profile.name;
          
          // Discord avatar - próbujemy różne źródła
          if (profile.image) {
            token.discordAvatar = profile.image;
          } else if (profile.avatar) {
            token.discordAvatar = `https://cdn.discordapp.com/avatars/${account.providerAccountId}/${profile.avatar}.png`;
          } else {
            const defaultAvatarNumber = parseInt(account.providerAccountId) % 5;
            token.discordAvatar = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
          }
        } else if (account.provider === "google") {
          token.googleId = account.providerAccountId;
        }
      }
      return token;
    },
  },
});
