module.exports = {
	root: true,
	env: {
		node: true,
		es2022: true,
	},
	parser: "@typescript-eslint/parser",
	parserOptions: {
		ecmaVersion: 2022,
		sourceType: "module",
	},
	plugins: ["@typescript-eslint"],
	extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
	ignorePatterns: ["node_modules", "coverage", "dist"],
};
