// A temporary script to create a JSON file with the tag count for each tag
// Use for development in window devices
// since the linux deployment ran the script automatically with contentlayer build.
// For running in window, cd in to apps/client and run "node ./src/scripts/createTagJson.mjs"

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
