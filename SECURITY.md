# Security

## Reporting a vulnerability

Email **chotpisit.adu@gmail.com** with the details and, if you can, a way to
reproduce it. Please do not open a public issue for anything exploitable.

I maintain this in my own time, so expect a reply in days rather than hours.

## Scope

This repository builds a static personal website. It has no backend, no
database, no authentication and stores no user data. The realistic surface is
the dependency tree and the build pipeline.

Dependency updates are automated through Dependabot, and CI runs typecheck,
lint, tests and a production build on every pull request.
