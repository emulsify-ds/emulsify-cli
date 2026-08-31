import type { EmulsifySystem, EmulsifyVariant } from '@emulsify-cli/config';

import { dirname, relative, sep } from 'path';
import safeResolveWithin from '../fs/safeResolveWithin.js';
import buildComponentDependencyList from '../project/buildComponentDependencyList.js';
import { getComponentDestination } from '../project/installComponentFromCache.js';

type SystemComponent = EmulsifyVariant['components'][number];

export type SystemInstallPlan = {
  components: SystemComponent[];
  requiredComponentCount: number;
  totalComponentCount: number;
  componentParentDestinations: string[];
  directoryAssetDestinations: string[];
  fileAssetDestinations: string[];
  directoryAssetCount: number;
  fileAssetCount: number;
  totalAssetCount: number;
};

function toProjectRelativeDisplayPath(
  projectRoot: string,
  destination: string,
): string {
  const displayPath = relative(projectRoot, destination).split(sep).join('/');
  return displayPath || '.';
}

function uniqueInOrder(values: string[]): string[] {
  return [...new Set(values)];
}

export function selectSystemComponents(
  variantConf: EmulsifyVariant,
  installAll: boolean,
): SystemComponent[] {
  if (installAll) {
    return [...variantConf.components];
  }

  const requiredComponents = variantConf.components.filter(
    ({ required }) => required === true,
  );
  const selectedNames = uniqueInOrder(
    requiredComponents.flatMap(({ name }) =>
      buildComponentDependencyList(variantConf.components, name),
    ),
  );

  return selectedNames.map((name) =>
    variantConf.components.find((component) => component.name === name)!,
  );
}

function assertSystemStructure(
  systemConf: EmulsifySystem,
  component: SystemComponent,
): void {
  if (!systemConf.structure.some(({ name }) => name === component.structure)) {
    throw new Error(
      `The structure (${component.structure}) specified within the component ${component.name} is invalid.`,
    );
  }
}

/**
 * Build a filesystem-independent review plan for a system installation.
 *
 * All returned destinations are project-relative display paths. Resolving the
 * destinations here validates that the reviewed installation remains within
 * the project before any project files are changed.
 */
export default function buildSystemInstallPlan(
  systemConf: EmulsifySystem,
  variantConf: EmulsifyVariant,
  installAll: boolean,
  projectConfigPath: string,
): SystemInstallPlan {
  const projectRoot = dirname(projectConfigPath);
  const requiredComponents = variantConf.components.filter(
    ({ required }) => required === true,
  );
  const components = selectSystemComponents(variantConf, installAll);

  const componentParentDestinations = uniqueInOrder(
    components.map((component) => {
      assertSystemStructure(systemConf, component);
      return toProjectRelativeDisplayPath(
        projectRoot,
        dirname(
          getComponentDestination(
            variantConf,
            component.name,
            projectConfigPath,
          ),
        ),
      );
    }),
  );

  const directories = variantConf.directories || [];
  const files = variantConf.files || [];
  const directoryAssetDestinations = uniqueInOrder(
    directories.map(({ destinationPath }) => {
      const destination = safeResolveWithin(
        projectRoot,
        destinationPath,
        'General asset destination',
      );
      return `${toProjectRelativeDisplayPath(projectRoot, destination)}/`;
    }),
  );
  const fileAssetDestinations = uniqueInOrder(
    files.map(({ destinationPath }) =>
      toProjectRelativeDisplayPath(
        projectRoot,
        safeResolveWithin(
          projectRoot,
          destinationPath,
          'General asset destination',
        ),
      ),
    ),
  );
  const directoryAssetCount = directories.length;
  const fileAssetCount = files.length;

  return {
    components,
    requiredComponentCount: requiredComponents.length,
    totalComponentCount: variantConf.components.length,
    componentParentDestinations,
    directoryAssetDestinations,
    fileAssetDestinations,
    directoryAssetCount,
    fileAssetCount,
    totalAssetCount: directoryAssetCount + fileAssetCount,
  };
}
