# Contributing to Publify

## Quick Start

```bash
# Clone and install
git clone https://github.com/user/publify
cd publify
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint

# Typecheck
pnpm typecheck
```

## Architecture

Publify follows clean architecture with four packages:

| Package | Purpose | Dependencies |
|---------|---------|-------------|
| `@publify/core` | Domain logic, interfaces, value objects | None (pure TS) |
| `@publify/infra` | Node.js implementations of core interfaces | `@publify/core` |
| `@publify/plugin-sdk` | Framework plugin definitions | `@publify/core` |
| `publify` (cli) | CLI entry point, arg parsing, output | All packages |

**Key rule**: `core` has zero runtime dependencies and no Node.js imports. All I/O goes through port interfaces.

## Adding a Framework Plugin

Adding support for a new framework takes ~15 lines:

1. Create `packages/plugin-sdk/src/built-in/<framework>.ts`:

```typescript
import { definePlugin } from '../define-plugin.js'

export const myFrameworkPlugin = definePlugin({
  name: 'my-framework',
  strictPort: false,
  detect: (ctx) => ctx.command === 'my-framework',
  injectFlags: (args, port) => {
    if (!args.some((a) => a === '--port')) {
      args.push('--port', String(port))
    }
    if (!args.some((a) => a === '--host')) {
      args.push('--host', '127.0.0.1')
    }
    return args
  },
})
```

2. Register it in `packages/plugin-sdk/src/built-in/index.ts`
3. Add a test in the plugin-sdk test suite
4. Submit a PR

## Commit Messages

Use conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.

## Changesets

For any user-facing change, add a changeset:

```bash
pnpm changeset
```
