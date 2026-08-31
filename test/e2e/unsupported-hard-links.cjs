const { appendFileSync, promises: fs } = require('node:fs');

fs.link = async () => {
  const code = process.env.EMULSIFY_E2E_LINK_ERROR || 'ENOTSUP';
  const tracePath = process.env.EMULSIFY_E2E_LINK_TRACE;
  if (tracePath) appendFileSync(tracePath, `${code}\n`);
  throw Object.assign(new Error(`simulated ${code} from fs.link`), { code });
};
