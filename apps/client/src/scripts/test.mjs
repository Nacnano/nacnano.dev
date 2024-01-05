import { allBlogs } from '../../.contentlayer/generated/index.mjs'
import { writeFileSync } from 'fs'
import GithubSlugger from 'github-slugger'

const isProduction = process.env.NODE_ENV === 'production'

function createTagCount (allBlogs) {
  const tagCount = {}
  allBlogs.forEach(file => {
    if (file.tags && (!isProduction || file.draft !== true)) {
      file.tags.forEach(tag => {
        const formattedTag = GithubSlugger.slug(tag)
        if (formattedTag in tagCount) {
          tagCount[formattedTag] += 1
        } else {
          tagCount[formattedTag] = 1
        }
      })
    }
  })
  writeFileSync('./src/app/tag-data.json', JSON.stringify(tagCount))
}

createTagCount(allBlogs)
