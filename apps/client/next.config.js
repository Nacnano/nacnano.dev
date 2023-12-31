import { withContentlayer } from 'next-contentlayer'

const config = {
  reactStrictMode: true,
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  eslint: {
    dirs: ['src/app', 'src/components', 'src/layouts', 'src/scripts']
  }
}

export default withContentlayer(config)
