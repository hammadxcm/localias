import type {
	IRouteRepository,
	IProxyServer,
	ICertificateManager,
	IHostsManager,
	IPortAllocator,
	IProcessManager,
	ILogger,
	IGitAdapter,
	IProjectDetector,
	IStateManager,
} from '@publify/core'
import {
	PluginRegistry,
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
} from '@publify/core'

import { ConsoleLogger } from './logger/console-logger.js'
import { FileStateManager } from './state/file-state-manager.js'
import { TcpPortAllocator } from './ports/tcp-port-allocator.js'
import { CliGitAdapter } from './git/cli-git-adapter.js'
import { FilesystemProjectDetector } from './project/filesystem-project-detector.js'
import { FileRouteRepository } from './routes/file-route-repository.js'
import { FileHostsManager } from './hosts/file-hosts-manager.js'
import { NodeProcessManager } from './process/node-process-manager.js'
import { X509CertificateManager } from './certs/x509-certificate-manager.js'
import { NodeProxyServer } from './proxy/node-proxy-server.js'

export interface Container {
	// Infrastructure
	readonly logger: ILogger
	readonly state: IStateManager
	readonly ports: IPortAllocator
	readonly git: IGitAdapter
	readonly project: IProjectDetector
	readonly routes: IRouteRepository
	readonly hosts: IHostsManager
	readonly process: IProcessManager
	readonly certs: ICertificateManager
	readonly proxy: IProxyServer
	readonly plugins: PluginRegistry

	// Use cases
	readonly runApp: RunAppUseCase
	readonly startProxy: StartProxyUseCase
	readonly stopProxy: StopProxyUseCase
	readonly addAlias: AddAliasUseCase
	readonly removeAlias: RemoveAliasUseCase
	readonly listRoutes: ListRoutesUseCase
	readonly getServiceUrl: GetServiceUrlUseCase
	readonly trustCa: TrustCaUseCase
	readonly syncHosts: SyncHostsUseCase
	readonly cleanHosts: CleanHostsUseCase
}

export interface ContainerOverrides {
	readonly logger?: ILogger
	readonly state?: IStateManager
	readonly ports?: IPortAllocator
	readonly git?: IGitAdapter
	readonly project?: IProjectDetector
	readonly routes?: IRouteRepository
	readonly hosts?: IHostsManager
	readonly process?: IProcessManager
	readonly certs?: ICertificateManager
	readonly proxy?: IProxyServer
	readonly plugins?: PluginRegistry
}

export function createContainer(overrides?: ContainerOverrides): Container {
	const logger = overrides?.logger ?? new ConsoleLogger()
	const state = overrides?.state ?? new FileStateManager()
	const ports = overrides?.ports ?? new TcpPortAllocator()
	const git = overrides?.git ?? new CliGitAdapter()
	const project = overrides?.project ?? new FilesystemProjectDetector(git)
	const processManager = overrides?.process ?? new NodeProcessManager()
	const certs = overrides?.certs ?? new X509CertificateManager()
	const proxy = overrides?.proxy ?? new NodeProxyServer(certs)
	const hosts = overrides?.hosts ?? new FileHostsManager()
	const plugins = overrides?.plugins ?? new PluginRegistry()

	// Routes need a state dir — use default discovery
	const stateDir = state.resolveStateDir(1355)
	const routes = overrides?.routes ?? new FileRouteRepository(stateDir, processManager)

	// Wire use cases
	const runApp = new RunAppUseCase({ routes, ports, process: processManager, state, git, project, logger, plugins })
	const startProxy = new StartProxyUseCase({ proxy, routes, certs, state, hosts, process: processManager, logger })
	const stopProxy = new StopProxyUseCase({ state, process: processManager, logger })
	const addAlias = new AddAliasUseCase({ routes, logger })
	const removeAlias = new RemoveAliasUseCase({ routes, logger })
	const listRoutes = new ListRoutesUseCase({ routes, state, process: processManager })
	const getServiceUrl = new GetServiceUrlUseCase({ state, git, project })
	const trustCa = new TrustCaUseCase({ certs, state, logger })
	const syncHosts = new SyncHostsUseCase({ routes, hosts, logger })
	const cleanHosts = new CleanHostsUseCase({ hosts, logger })

	return Object.freeze({
		logger,
		state,
		ports,
		git,
		project,
		routes,
		hosts,
		process: processManager,
		certs,
		proxy,
		plugins,
		runApp,
		startProxy,
		stopProxy,
		addAlias,
		removeAlias,
		listRoutes,
		getServiceUrl,
		trustCa,
		syncHosts,
		cleanHosts,
	})
}

export function createDefaultContainer(): Container {
	return createContainer()
}
