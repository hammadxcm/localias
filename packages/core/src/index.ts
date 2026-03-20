// Result type
export type { Result, Ok, Err } from './result.js'
export { ok, err, isOk, isErr, unwrap, mapResult } from './result.js'

// Errors
export {
	RouteConflictError,
	PortExhaustedError,
	ProxyNotRunningError,
	CertificateError,
	LockAcquisitionError,
	HostnameValidationError,
	ProxyLoopError,
	ConfigValidationError,
} from './errors.js'

// Value objects
export {
	Hostname,
	sanitizeForHostname,
	truncateLabel,
	Port,
	ProcessId,
	Route,
	ProxyConfig,
	CertificateInfo,
} from './values/index.js'

// Port interfaces
export type {
	IRouteRepository,
	Disposable,
	IProxyServer,
	ICertificateManager,
	SNICallback,
	IHostsManager,
	IPortAllocator,
	IProcessManager,
	ILogger,
	IGitAdapter,
	WorktreeResult,
	IProjectDetector,
	InferredProject,
	IStateManager,
	ProxyState,
} from './ports/index.js'

// Middleware
export type { ProxyContext, NextFunction, ProxyMiddleware } from './middleware/index.js'
export {
	MiddlewarePipeline,
	hostValidator,
	loopDetector,
	routeMatcher,
	forwardedHeaders,
} from './middleware/index.js'

// Plugins
export type { FrameworkPlugin, FrameworkDetectionContext } from './plugins/index.js'
export { PluginRegistry } from './plugins/index.js'

// Use cases
export {
	RunAppUseCase,
	StartProxyUseCase,
	StopProxyUseCase,
	AddAliasUseCase,
	RemoveAliasUseCase,
	ListRoutesUseCase,
	GetServiceUrlUseCase,
	TrustCaUseCase,
	SyncHostsUseCase,
	CleanHostsUseCase,
} from './use-cases/index.js'

export type {
	RunAppDeps,
	RunAppParams,
	StartProxyDeps,
	StartProxyParams,
	StopProxyDeps,
	AddAliasDeps,
	RemoveAliasDeps,
	ListRoutesDeps,
	RouteInfo,
	ListRoutesResult,
	GetServiceUrlDeps,
	TrustCaDeps,
	SyncHostsDeps,
	CleanHostsDeps,
} from './use-cases/index.js'
