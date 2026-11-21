const receiptAssets = [
	"./src/company-receipts/logo.png",
	"./node_modules/@fontsource/open-sans/files/open-sans-latin-{400,700}-normal.woff",
	"./node_modules/@fontsource/open-sans/LICENSE",
];

module.exports = {
	output: "standalone",
	serverExternalPackages: ["nodemailer", "pdfkit"],
	outputFileTracingIncludes: {
		"/api/cron": receiptAssets,
		"/api/company-receipt-preview": receiptAssets,
	},
	skipTrailingSlashRedirect: true,
};
