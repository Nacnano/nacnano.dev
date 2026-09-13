import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { escape } from 'pliny/utils/htmlEscaper.js'
import siteMetadata from '../data/siteMetadata.js'

// Read the generated JSON directly. The generated `index.mjs` uses the
// `assert { type: 'json' }` import syntax, which current Node no longer parses.
const blogsPath = path.join(
  process.cwd(),
  '.contentlayer/generated/Blog/_index.json'
)
const allBlogs = JSON.parse(readFileSync(blogsPath, 'utf8'))

const byDateDesc = (a, b) => new Date(b.date) - new Date(a.date)

const generateRssItem = (config, post) => `
  <item>
    <guid>${config.siteUrl}/blogs/${post.slug}</guid>
    <title>${escape(post.title)}</title>
    <link>${config.siteUrl}/blogs/${post.slug}</link>
    ${post.summary ? `<description>${escape(post.summary)}</description>` : ''}
    <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    <author>${config.email} (${config.author})</author>
    ${(post.tags || []).map(t => `<category>${escape(t)}</category>`).join('')}
  </item>
`

const generateRss = (config, posts, page = 'feed.xml') => `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
      <title>${escape(config.title)}</title>
      <link>${config.siteUrl}</link>
      <description>${escape(config.description)}</description>
      <language>${config.language}</language>
      <managingEditor>${config.email} (${config.author})</managingEditor>
      <webMaster>${config.email} (${config.author})</webMaster>
      <lastBuildDate>${new Date(posts[0].date).toUTCString()}</lastBuildDate>
      <atom:link href="${config.siteUrl}/${page}" rel="self" type="application/rss+xml"/>
      ${posts.map(post => generateRssItem(config, post)).join('')}
    </channel>
  </rss>
`

const rss = () => {
  const published = allBlogs.filter(post => post.draft !== true).sort(byDateDesc)
  if (published.length === 0) {
    console.log('RSS feed skipped: no published posts.')
    return
  }
  writeFileSync('./public/feed.xml', generateRss(siteMetadata, published))
  console.log(`RSS feed generated (${published.length} items).`)
}

export default rss
