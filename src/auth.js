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
    async signIn({ user, account }) {
      // Wszyscy użytkownicy mogą się zalogować (zarówno Google jak i Discord)
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
      }
      return session;
    },
    async jwt({ token, account, profile }) {
      // Zapisz Discord ID, username i avatar do tokena
      if (account?.provider === "discord" && profile) {
        token.discordId = account.providerAccountId;
        token.discordUsername = profile.username || profile.global_name || profile.name;
        
        // Discord avatar - próbujemy różne źródła
        if (profile.image) {
          // NextAuth automatycznie pobiera avatar
          token.discordAvatar = profile.image;
        } else if (profile.avatar) {
          // Budujemy URL z hash avatara
          token.discordAvatar = `https://cdn.discordapp.com/avatars/${account.providerAccountId}/${profile.avatar}.png`;
        } else {
          // Domyślny avatar Discord (używamy discriminatora)
          const defaultAvatarNumber = parseInt(account.providerAccountId) % 5;
          token.discordAvatar = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
        }
      }
      return token;
    },
  },
});
