---
name: find-docs
description: >-
  Retrieves up-to-date documentation, API references, and code examples for any
  developer technology. Use this skill whenever the user asks about a specific
  library, framework, SDK, CLI tool, or cloud service, including API syntax,
  configuration options, version migrations, library-specific debugging, setup
  instructions, and CLI usage. Prefer Context7 documentation over web search for
  library and API details.
---

# Documentation Lookup

Use Context7 to fetch current documentation and code examples for libraries,
frameworks, SDKs, APIs, CLIs, and cloud services.

Run Context7 through `npx`:

```bash
npx ctx7@latest library <name> "<query>"
npx ctx7@latest docs <libraryId> "<query>"
```

## Workflow

Use a two-step process: resolve the library name to a Context7 library ID, then
fetch docs with that ID.

1. Resolve the library:

   ```bash
   npx ctx7@latest library "Next.js" "How to configure middleware"
   ```

2. Pick the best result. Library IDs use `/org/project` format.

3. Fetch documentation:

   ```bash
   npx ctx7@latest docs /vercel/next.js "How to configure middleware"
   ```

Call `library` first unless the user directly provides a Context7 library ID in
`/org/project` or `/org/project/version` format. Do not run more than 3 Context7
commands for one question.

## Choosing a Library

Prefer the result with:

- Exact or near-exact official name match, such as `Next.js` instead of `nextjs`
- Relevant description for the user's task
- Higher code snippet count
- High or Medium source reputation
- Higher benchmark score

If results look wrong, try one alternate official spelling or a more specific
query before answering.

For version-specific questions, use a versioned ID from the `library` output
when available:

```bash
npx ctx7@latest docs /vercel/next.js/v14.3.0 "How to configure middleware"
```

## Query Rules

Use the user's full intent as the query. Specific queries rank better than vague
terms.

Good:

```bash
npx ctx7@latest library Prisma "How to define one-to-many relations with cascade delete"
```

Bad:

```bash
npx ctx7@latest library Prisma "relations"
```

Do not include secrets, API keys, credentials, personal data, or proprietary code
in Context7 queries.

## Authentication

Context7 works without login, but authentication can raise limits:

```bash
npx ctx7@latest login
```

Credentials are machine-local and must not be committed to the project.

## Errors

If Context7 fails with a quota error, tell the user the quota is exhausted and
suggest logging in with:

```bash
npx ctx7@latest login
```

If a Context7 command fails with DNS, host resolution, or fetch/network errors
inside Codex's sandbox, rerun it outside the sandbox with approval instead of
retrying repeatedly.

If Context7 cannot be used, say why before answering from general knowledge.
