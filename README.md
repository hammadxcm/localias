<div align="center">

<img src="website/public/favicon.svg" width="80" height="80" alt="localias logo" />

# localias

**Stable `.localhost` URLs for every dev service.**

[![CI](https://img.shields.io/github/actions/workflow/status/hammadxcm/localias/ci.yml?label=CI&style=flat-square)](https://github.com/hammadxcm/localias/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen?style=flat-square)](https://nodejs.org)

</div>

---

Stop memorizing port numbers. Localias is a local reverse proxy that gives every dev service a memorable `.localhost` hostname — automatically.

```
                ┌─────────────────┐
  Browser       │  *.localhost    │
  ───────────►  │     :1355      │  ◄── single proxy port
                │   (localias)    │
                └──────┬─────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    web.localhost  api.localhost  docs.localhost
       :3291         :4102          :5500
```

## Quick Start

**1. Install globally**

```bash
npm i -g localias
# or
brew install hammadxcm/localias/localias
```

**2. Start the proxy**

```bash
localias proxy start
# proxy listening on :1355
```

**3. Run your dev server**

```bash
localias run -- npm run dev
# framework: vite
# allocated port 3291
# ready at http://myapp.localhost:1355
```

## Why Localias?

| Without localias | With localias |
|---|---|
| `PORT=3001 npm run dev:web` | `localias run -- npm run dev` |
| Manually track which port is which | Every service gets a named `.localhost` URL |
| Port collisions between projects | Ports allocated automatically, never collide |
| URLs change between restarts | URLs are stable forever |
| Share port numbers over Slack | Share `api.localhost:1355` — always works |
| Configure each framework differently | Framework auto-detected, flags injected |

## Commands

| Command | Description |
|---|---|
| `localias proxy start` | Start the reverse proxy on `:1355` |
| `localias proxy stop` | Stop the running proxy |
| `localias run -- <cmd>` | Run a dev server with auto-routing |
| `localias compose -- <cmd>` | Route all services from `docker-compose.yml` |
| `localias list` / `localias ls` | List all active routes |
| `localias get <name>` | Get the URL for a service |
| `localias alias set <alias> <name>` | Create a hostname alias |
| `localias alias list` | List all aliases |
| `localias trust` | Trust the local CA certificate |
| `localias hosts sync` | Sync routes to `/etc/hosts` |
| `localias hosts clean` | Remove localias entries from `/etc/hosts` |

---

<details>
<summary><strong><code>localias run</code></strong> — running dev servers</summary>

### Basic usage

```bash
localias run -- npm run dev
```

Localias infers the project name from the directory, detects the framework, allocates a free port, and registers a `.localhost` route.

### Named mode

```bash
localias run --name api -- node server.js
# → http://api.localhost:1355
```

### Injected environment variables

| Variable | Value | Example |
|---|---|---|
| `PORT` | Allocated port number | `3291` |
| `LOCALIAS_URL` | Full URL of the service | `http://myapp.localhost:1355` |
| `LOCALIAS_HOSTNAME` | Hostname portion | `myapp.localhost` |

### Framework plugin flags

Localias detects your framework and injects the right CLI flags:

```bash
# Vite → --port 3291 --host
# Astro → --port 3291 --host
# Angular → --port 3291 --host 0.0.0.0
# React Router → --port 3291
```

</details>

<details>
<summary><strong><code>localias compose</code></strong> — Docker multi-service routing</summary>

### How it works

Localias wraps your `docker compose` command, discovers all services from your compose file, allocates ports, registers `.localhost` routes for each one, and injects the ports as environment variables — then runs Docker.

### Basic usage

```bash
localias compose -- docker compose up
# web  → web.myproject.localhost:1355  (:3291)
# api  → api.myproject.localhost:1355  (:4102)
# docs → docs.myproject.localhost:1355 (:5500)
```

Everything after `--` is passed directly to Docker. Localias parses your compose config via `docker compose config --format json` to discover services.

### Custom compose files

```bash
localias compose -- docker compose -f docker-compose.dev.yml up
localias compose -- docker compose -f base.yml -f override.yml up
```

Multiple `-f` flags are supported — localias extracts them and passes them to Docker.

### Named projects

```bash
localias compose --name myproject -- docker compose up
# web.myproject.localhost:1355
# api.myproject.localhost:1355
```

Without `--name`, the project name is inferred from the current directory.

### Force route registration

```bash
localias compose --force -- docker compose up
```

Use `--force` to override existing routes that conflict.

### Custom TLD

```bash
localias compose --tld local.dev -- docker compose up
# web.myproject.local.dev:1355
```

### Environment variables injected per service

Service names are uppercased (hyphens → underscores) and used as env var prefixes:

**Single-port service:**
```
WEB_PORT=3291
WEB_PORT_0=3291
```

**Multi-port service (e.g. service exposing ports 8080 and 9090):**
```
API_PORT=4102
API_PORT_0=4102
API_PORT_1=4103
```

### Example `docker-compose.yml`

```yaml
services:
  web:
    build: ./web
    environment:
      - PORT=${WEB_PORT}
    # localias injects WEB_PORT=3291

  api:
    build: ./api
    ports:
      - "${API_PORT_0}:8080"
      - "${API_PORT_1}:9090"
    # localias injects API_PORT_0=4102, API_PORT_1=4103

  docs:
    build: ./docs
    environment:
      - PORT=${DOCS_PORT}
    # localias injects DOCS_PORT=5500
```

```bash
localias compose -- docker compose up
# web.myproject.localhost:1355   → :3291  (running)
# api.myproject.localhost:1355   → :4102  (running)
# 1.api.myproject.localhost:1355 → :4103  (running)
# docs.myproject.localhost:1355  → :5500  (running)
```

### Hostname format

| Scenario | Hostname pattern |
|---|---|
| Single-port service | `<service>.<project>.localhost` |
| Multi-port service (index 0) | `<service>.<project>.localhost` |
| Multi-port service (index N) | `N.<service>.<project>.localhost` |

### Cleanup

Routes are automatically cleaned up when Docker exits or when you press Ctrl+C. Localias handles SIGINT/SIGTERM and removes all registered routes.

### Flags reference

| Flag | Description | Default |
|---|---|---|
| `--name <name>` | Project name override | Inferred from cwd |
| `--force` | Override conflicting routes | `false` |
| `--tld <tld>` | Custom top-level domain | `localhost` |

</details>

<details>
<summary><strong><code>localias alias</code> / <code>list</code> / <code>get</code></strong> — route management</summary>

### Create an alias

```bash
localias alias set dashboard myapp
# dashboard.localhost:1355 → myapp
```

### List routes

```bash
localias list
# HOSTNAME                PORT   STATUS
# myapp.localhost:1355    3291   running
# api.localhost:1355      4102   running
```

### Get a specific route

```bash
localias get myapp
# hostname: myapp.localhost:1355
# port:     3291
# status:   running
```

</details>

<details>
<summary><strong>TLS / HTTPS</strong></summary>

### Trust the local CA

```bash
localias trust
# CA certificate added to system keychain
```

### Start proxy with HTTPS

```bash
localias proxy start --https
# TLS enabled
# proxy listening on :1355
# https://myapp.localhost:1355
```

Certificates are generated per-hostname using `@peculiar/x509` and stored locally.

</details>

<details>
<summary><strong>Options & Flags</strong></summary>

| Flag | Command | Description |
|---|---|---|
| `--name <name>` | `run`, `compose` | Override inferred service/project name |
| `--https` | `proxy start` | Enable TLS on the proxy |
| `--port <n>` | `proxy start` | Override proxy port (default: `1355`) |
| `--host <addr>` | `proxy start` | Bind address (default: `127.0.0.1`) |
| `--force` | `compose` | Override conflicting routes |
| `--tld <tld>` | `compose` | Custom top-level domain (default: `localhost`) |

</details>

<details>
<summary><strong>Environment Variables</strong></summary>

### Configuration

| Variable | Default | Description |
|---|---|---|
| `LOCALIAS_PROXY_PORT` | `1355` | Proxy listen port |
| `LOCALIAS_DATA_DIR` | `~/.localias` | Data directory |

### Injected into child processes (`localias run`)

| Variable | Description |
|---|---|
| `PORT` | Allocated port number |
| `LOCALIAS_URL` | Full service URL |
| `LOCALIAS_HOSTNAME` | Service hostname |

### Injected into Docker processes (`localias compose`)

| Variable | Description |
|---|---|
| `<SERVICE>_PORT` | Port for service (same as index 0) |
| `<SERVICE>_PORT_0` | First port for service |
| `<SERVICE>_PORT_N` | Nth port for multi-port services |

Service names are uppercased with hyphens replaced by underscores (e.g. `my-api` → `MY_API_PORT`).

</details>

<details>
<summary><strong>Framework Plugins</strong></summary>

| Framework | Detected By | Injected Flags |
|---|---|---|
| Vite | `vite` in command | `--port <n> --host` |
| Astro | `astro` in command | `--port <n> --host` |
| Angular | `ng serve` in command | `--port <n> --host 0.0.0.0` |
| React Router | `react-router dev` in command | `--port <n>` |
| React Native | `react-native start` in command | `--port <n>` |
| Expo | `expo start` in command | `--port <n>` |

Extend with `@localias/plugin-sdk`:

```typescript
import { definePlugin } from '@localias/plugin-sdk';

export default definePlugin({
  name: 'my-framework',
  detect: (cmd) => cmd.includes('my-fw'),
  portFlag: (port) => [`--port`, String(port)],
});
```

</details>

<details>
<summary><strong>Git Worktree Support</strong></summary>

When running inside a git worktree, localias prefixes the branch name to the hostname:

```bash
# On branch feat-auth, in project "myapp"
localias run -- npm run dev
# → http://feat-auth.myapp.localhost:1355
```

This lets you run multiple branches side-by-side and access them at different URLs.

</details>

## How It Works

```
  localias run -- npm run dev
         │
         ▼
  ┌──────────────┐
  │ Infer Name   │  directory name → "myapp"
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ Allocate Port│  find free port → 3291
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ Register     │  myapp.localhost:1355 → :3291
  │ Route        │
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ Spawn Process│  PORT=3291 npm run dev
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ Proxy Routes │  *.localhost:1355 → correct port
  └──────────────┘
```

<details>
<summary><strong>Architecture</strong></summary>

Localias is a monorepo with 4 packages following hexagonal (ports & adapters) architecture:

```
┌─────────────┐     ┌──────────────┐
│ @localias/cli│────▶│@localias/infra│
└──────┬──────┘     └──────┬───────┘
       │                   │
       ▼                   ▼
┌──────────────┐    ┌──────────────┐
│@localias/     │    │@localias/core │
│plugin-sdk    │───▶│              │
└──────────────┘    └──────────────┘
```

- **`@localias/core`** — Pure domain logic. Zero Node.js imports. All I/O through port interfaces. Uses `Result<T, E>` over exceptions.
- **`@localias/infra`** — Node.js adapters: HTTP proxy, file system, certificate generation, process spawning.
- **`@localias/plugin-sdk`** — Framework plugin definitions and built-in plugins (Vite, Astro, Angular, etc.).
- **`localias` (cli)** — Entry point. Argument parsing, command routing, orchestration.

</details>

## License

MIT
