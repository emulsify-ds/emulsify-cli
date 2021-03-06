/**
 * @file constants.ts
 * Exports all global constants.
 */

import { homedir } from 'os';
import { join } from 'path';

export const EXIT_ERROR = 1;
export const EMULSIFY_PROJECT_CONFIG_FILE = 'emulsify.config.json';
export const UTIL_DIR = join(homedir(), '.emulsify');
export const SYSTEMS_DIR = join(UTIL_DIR, 'systems');
export const TMP_DIR = join(UTIL_DIR, '.tmp');
