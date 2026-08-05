export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin-99x-hsd/'],
    },
    sitemap: 'https://repfinder.xyz/sitemap.xml',
  }
}
