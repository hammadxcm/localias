# Architecture

## Layer Diagram

```
┌─────────────────────────────────────────────┐
│                   CLI                        │
│  ArgParser → Command Handlers → Output       │
├─────────────────────────────────────────────┤
│              Plugin SDK                      │
│  definePlugin · Built-in Plugins             │
├─────────────────────────────────────────────┤
│             Infrastructure                   │
│  FileRouteRepository · NodeProxyServer       │
│  X509CertificateManager · FileStateManager   │
│  NodeProcessManager · TcpPortAllocator       │
│  CliGitAdapter · ConsoleLogger · Container   │
├─────────────────────────────────────────────┤
│                  Core                        │
│  Value Objects · Port Interfaces · Errors    │
│  Middleware Pipeline · Plugin Registry       │
│  Use Cases (RunApp, StartProxy, etc.)        │
└─────────────────────────────────────────────┘
```

## Design Decisions

### Result Type over Exceptions
All fallible operations return `Result<T, E>` instead of throwing. This makes error handling explicit and composable.

### Port/Adapter Pattern
Core defines interfaces (ports). Infrastructure provides implementations (adapters). This enables:
- Unit testing with in-memory stubs
- Swapping implementations (e.g., different cert libraries)
- Clear dependency direction (infra depends on core, never reverse)

### Constructor Injection
Use cases receive all dependencies via constructor. The DI container in infra wires everything at startup.

### Middleware Pipeline
HTTP request handling uses a Koa-style middleware pipeline. Each middleware is a pure function that can:
- Short-circuit (return without calling next)
- Transform context
- Run post-processing after next()

### Value Objects
Domain primitives (Hostname, Port, ProcessId, Route) are immutable classes with static factory methods that validate on construction.

## Extension Points

The architecture supports these future features without modifying existing code:

1. **Dashboard** — Add `onRequest` event to proxy server
2. **Health Checks** — Add `healthCheckUrl` to Route
3. **`.localiasrc`** — Add `IConfigLoader` port
4. **Profiles** — Add `profile` field to ProxyConfig
5. **`localias doctor`** — Add `IDiagnostic` interface
6. **Request Inspector** — Add middleware slot in pipeline
7. **Metrics** — Add middleware for counting/latency
