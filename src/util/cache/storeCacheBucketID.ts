import writeToJsonFile from '../fs/writeToJsonFile.js';
import { resolveCurrentPath } from '../fs/resolveCurrentPath.js';
import { EMULSIFY_PROJECT_CACHE_FILE } from '../../lib/constants.js';

export default async function storeCacheBucketID(id: string): Promise<void> {
  let path = resolveCurrentPath().absoluteFilePath;
  path += '/' + EMULSIFY_PROJECT_CACHE_FILE;

  console.log(path);
  const data = { id: id };

  await writeToJsonFile(path, data);
}
