const LABEL_MAX = 63

export function sanitizeForHostname(name: string): string {
	return name
		.toLowerCase()
		.replace(/^@[^/]+\//, '')
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-{2,}/g, '-')
		.replace(/^-|-$/g, '')
}

export function truncateLabel(label: string, hashFn?: (input: string) => string): string {
	if (label.length <= LABEL_MAX) return label
	if (hashFn) {
		const hash = hashFn(label).slice(0, 8)
		return `${label.slice(0, LABEL_MAX - 9)}-${hash}`.replace(/-+$/, '')
	}
	return label.slice(0, LABEL_MAX).replace(/-+$/, '')
}
