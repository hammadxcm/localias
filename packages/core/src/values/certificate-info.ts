export class CertificateInfo {
	constructor(
		readonly certPath: string,
		readonly keyPath: string,
		readonly caPath: string,
		readonly caGenerated: boolean,
	) {}
}
