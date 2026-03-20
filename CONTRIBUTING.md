# Contributing to Localias

## Quick Start

```bash
# Clone and install
git clone https://github.com/user/localias
cd localias
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

Localias follows clean architecture with four packages:

| Package | Purpose | Dependencies |
|---------|---------|-------------|
| `@localias/core` | Domain logic, interfaces, value objects | None (pure TS) |
| `@localias/infra` | Node.js implementations of core interfaces | `@localias/core` |
| `@localias/plugin-sdk` | Framework plugin definitions | `@localias/core` |
| `localias` (cli) | CLI entry point, arg parsing, output | All packages |

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
