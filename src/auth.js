import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

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
      try {
        await dbConnect();

        const email = user.email || profile?.email;
        const isAdmin = email === ADMIN_EMAIL || account?.providerAccountId === ADMIN_DISCORD_ID;

        // Prepare user data based on provider
        const userData = {
          email,
          name: user.name || profile?.username || profile?.global_name || profile?.name || '',
          image: user.image || profile?.image || '',
          isAdmin,
          provider: account?.provider,
          lastLogin: new Date(),
        };

        // Add provider-specific IDs
        if (account?.provider === 'discord') {
          userData.discordId = account.providerAccountId;
          
          // Build Discord avatar URL if needed
          if (profile?.avatar && account?.providerAccountId) {
            userData.image = `https://cdn.discordapp.com/avatars/${account.providerAccountId}/${profile.avatar}.png`;
          } else if (!userData.image) {
            const defaultAvatarNumber = parseInt(account.providerAccountId) % 5;
            userData.image = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
          }
        } else if (account?.provider === 'google') {
          userData.googleId = account.providerAccountId;
        }

        // Upsert user (update if exists, create if doesn't)
        await User.findOneAndUpdate(
          { email },
          userData,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return true;
      } catch (error) {
        console.error('Error saving user to database:', error);
        return true; // Still allow login even if DB save fails
      }
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
