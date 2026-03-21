import type {
	ICertificateManager,
	IComposeAdapter,
	IGitAdapter,
	IHostsManager,
	ILogger,
	IPortAllocator,
	IProcessManager,
	IProjectDetector,
	IProxyServer,
	IRouteRepository,
	IStateManager,
} from '@localias/core'
import {
	AddAliasUseCase,
	CleanHostsUseCase,
	GetServiceUrlUseCase,
	ListRoutesUseCase,
	PluginRegistry,
	RemoveAliasUseCase,
	RunAppUseCase,
	RunComposeUseCase,
	RunUpUseCase,
	StartProxyUseCase,
	StopProxyUseCase,
	SyncHostsUseCase,
	TrustCaUseCase,
} from '@localias/core'

import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { X509CertificateManager } from './certs/x509-certificate-manager.js'
import { ShellComposeAdapter } from './compose/shell-compose-adapter.js'
import { CliGitAdapter } from './git/cli-git-adapter.js'
import { FileHostsManager } from './hosts/file-hosts-manager.js'
import { ConsoleLogger } from './logger/console-logger.js'
import { TcpPortAllocator } from './ports/tcp-port-allocator.js'
import { NodeProcessManager } from './process/node-process-manager.js'
import { FilesystemProjectDetector } from './project/filesystem-project-detector.js'
import { NodeProxyServer } from './proxy/node-proxy-server.js'
import { FileRouteRepository } from './routes/file-route-repository.js'
import { FileStateManager } from './state/file-state-manager.js'

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
	readonly compose: IComposeAdapter

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
	readonly runCompose: RunComposeUseCase
	readonly runUp: RunUpUseCase
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
	readonly compose?: IComposeAdapter
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
	const compose = overrides?.compose ?? new ShellComposeAdapter()

	// Routes need a state dir — use the base state dir, not tied to any specific port
	const stateDir = process.env.LOCALIAS_STATE_DIR ?? join(tmpdir(), 'localias')
	const routes = overrides?.routes ?? new FileRouteRepository(stateDir, processManager)

	// Wire use cases
	const runApp = new RunAppUseCase({
		routes,
		ports,
		process: processManager,
		state,
		git,
		project,
		logger,
		plugins,
	})
	const startProxy = new StartProxyUseCase({
		proxy,
		routes,
		certs,
		state,
		hosts,
		process: processManager,
		logger,
	})
	const stopProxy = new StopProxyUseCase({ state, process: processManager, logger })
	const addAlias = new AddAliasUseCase({ routes, logger })
	const removeAlias = new RemoveAliasUseCase({ routes, logger })
	const listRoutes = new ListRoutesUseCase({ routes, state, process: processManager })
	const getServiceUrl = new GetServiceUrlUseCase({ state, git, project })
	const trustCa = new TrustCaUseCase({ certs, state, logger })
	const syncHosts = new SyncHostsUseCase({ routes, hosts, logger })
	const cleanHosts = new CleanHostsUseCase({ hosts, logger })
	const runCompose = new RunComposeUseCase({
		routes,
		ports,
		process: processManager,
		state,
		project,
		compose,
		logger,
	})
	const runUp = new RunUpUseCase({
		routes,
		ports,
		process: processManager,
		state,
		logger,
	})

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
		compose,
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
		runCompose,
		runUp,
	})
}

export function createDefaultContainer(): Container {
	return createContainer()
}
