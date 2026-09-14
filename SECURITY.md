# Security

## Reporting a vulnerability

Email **chotpisit.adu@gmail.com** with the details and, if you can, a way to
reproduce it. Please do not open a public issue for anything exploitable.

I maintain this in my own time, so expect a reply in days rather than hours.

## Scope

This repository builds a personal website that is **mostly** static, with one
live, dynamic feature: the `/activity` visit feed. That feature is a small
backend — two Next.js route handlers (`POST /api/activity/visit`,
`GET /api/activity/feed`) backed by an Upstash Redis instance — so it does store
data: anonymised, roughly-geo-tagged page-view events (a coarse country code, an
optional city, and coordinates rounded to ~10 km, with a salted hash of the IP
used only as a rate-limit key). There is no authentication and no account or
personally-identifiable data.

Everything outside that feed is prerendered at build time, so the realistic
surface is the dependency tree, the build pipeline, and the two activity
endpoints.

For anything exploitable in the activity feed — abuse of the write beacon, the
read path, the rate limiter, or anything that could read or write the store
beyond normal traffic — please email me directly (above) rather than opening a
public issue.

Dependency updates are automated through Dependabot, and CI runs typecheck,
lint, tests and a production build on every pull request.
