/**
 * Default dependencies using real implementations
 */

import * as fs from "node:fs";
import * as os from "node:os";
import { execSync } from "node:child_process";
import type { Dependencies } from "./types.js";

/**
 * Create default dependencies using Node.js APIs
 */
export function createDefaultDependencies(): Dependencies {
	return {
		fetch: globalThis.fetch,
		readFile: (path: string) => {
			try {
				return fs.readFileSync(path, "utf-8");
			} catch {
				return undefined;
			}
		},
		fileExists: (path: string) => {
			try {
				return fs.existsSync(path);
			} catch {
				return false;
			}
		},
		execSync: (command: string, options?: { encoding: string; timeout?: number; env?: NodeJS.ProcessEnv; stdio?: any[] }) => {
			return execSync(command, options as Parameters<typeof execSync>[1]) as string;
		},
		homedir: () => os.homedir(),
		env: process.env,
	};
}
