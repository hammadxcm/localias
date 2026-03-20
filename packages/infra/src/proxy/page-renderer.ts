import type { Route } from '@publify/core'

const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

function baseHtml(title: string, body: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — Publify</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
	font-family: ${FONT_STACK};
	background: #0a0a0a;
	color: #e5e5e5;
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 100vh;
	padding: 2rem;
}
.container {
	max-width: 560px;
	width: 100%;
}
h1 {
	font-size: 1.5rem;
	font-weight: 600;
	margin-bottom: 1rem;
	color: #fff;
}
.code {
	font-size: 4rem;
	font-weight: 700;
	color: #666;
	margin-bottom: 0.5rem;
}
p { line-height: 1.6; color: #999; margin-bottom: 0.75rem; }
a { color: #3b82f6; text-decoration: none; }
a:hover { text-decoration: underline; }
.routes { margin-top: 1.5rem; }
.route {
	display: flex;
	justify-content: space-between;
	padding: 0.5rem 0;
	border-bottom: 1px solid #1a1a1a;
}
.route-host { color: #e5e5e5; }
.route-port { color: #666; font-variant-numeric: tabular-nums; }
.hint {
	margin-top: 1.5rem;
	padding: 1rem;
	background: #111;
	border-radius: 8px;
	border: 1px solid #222;
}
.hint code {
	font-family: "SF Mono", "Cascadia Code", "Fira Code", monospace;
	font-size: 0.875rem;
	color: #f59e0b;
}
</style>
</head>
<body>
<div class="container">
${body}
</div>
</body>
</html>`
}

export class PageRenderer {
	render404(host: string, routes: Route[], proxyPort: number, tls: boolean): string {
		const routeHtml = routes.length > 0
			? `<div class="routes">
${routes.map((r) => {
	const url = r.hostname.toUrl(proxyPort, tls)
	return `<div class="route"><a href="${url}" class="route-host">${r.hostname.value}</a><span class="route-port">:${r.port.value}</span></div>`
}).join('\n')}
</div>`
			: '<p>No routes registered yet.</p>'

		return baseHtml('Not Found', `
<div class="code">404</div>
<h1>No route for ${escapeHtml(host)}</h1>
<p>This hostname isn't registered with Publify.</p>
${routeHtml}
`)
	}

	render502(host: string, port: number): string {
		return baseHtml('Bad Gateway', `
<div class="code">502</div>
<h1>Cannot reach ${escapeHtml(host)}</h1>
<p>The app at <strong>127.0.0.1:${port}</strong> isn't responding.</p>
<div class="hint">
<p>Make sure your app is running and listening on port <code>${port}</code>.</p>
</div>
`)
	}

	render508(host: string): string {
		return baseHtml('Loop Detected', `
<div class="code">508</div>
<h1>Loop detected for ${escapeHtml(host)}</h1>
<p>The request was forwarded too many times. This usually means the app is proxying back to Publify.</p>
<div class="hint">
<p>Ensure your app connects to its upstream directly, not through the <code>.localhost</code> URL.</p>
</div>
`)
	}
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
