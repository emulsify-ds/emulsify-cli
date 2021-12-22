/**
 * @file constants.ts
 * Exports all global constants.
 */

import { homedir } from 'os';
import { join } from 'path';

export const EXIT_ERROR = 1;
export const EXIT_SUCCESS = 0;
export const EMULSIFY_PROJECT_CONFIG_FILE = 'project.emulsify.json';
export const EMULSIFY_PROJECT_HOOK_FOLDER = '.cli';
export const EMULSIFY_PROJECT_HOOK_INIT = 'init.js';
export const EMULSIFY_PROJECT_HOOK_SYSTEM_INSTALL = 'systemInstall.js';
export const EMULSIFY_SYSTEM_CONFIG_FILE = 'system.emulsify.json';
export const UTIL_DIR = join(homedir(), '.emulsify');
export const CACHE_DIR = join(UTIL_DIR, 'cache');
