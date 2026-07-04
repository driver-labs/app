<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Rules

- Use `pnpm` for all package management (install, add, remove, scripts). Never use `npm` or `yarn`.
- Do not use the `gh` CLI for any GitHub operation.
- Never run `rm -rf`.
- Always ask for confirmation before running `supabase db push`.
