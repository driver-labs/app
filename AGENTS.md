<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Rules

- Do not use the `gh` CLI for any GitHub operation.
- Never run `rm -rf`.
- Always ask for confirmation before running `supabase db push`.

<!-- BEGIN:commit-standards -->
# Commit standard

Use Conventional Commits v1.0.0 for commit messages:
https://www.conventionalcommits.org/en/v1.0.0/
<!-- END:commit-standards -->
