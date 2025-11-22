import NextAuth from 'next-auth'
import GithubProvider from 'next-auth/providers/github'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.userId = token.sub
      }
      return token
    },
    async session({ session, token }) {
      session.userId = token.userId
      return session
    },
  },
  pages: {
    signIn: '/landing',
  }
}

export default NextAuth(authOptions)