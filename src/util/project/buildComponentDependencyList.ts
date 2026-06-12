import type { Components } from '@emulsify-cli/config';

export default function buildComponentDependencyList(
  components: Components,
  name: string,
): string[] {
  const componentsByName = new Map<string, Components[number]>();
  for (const component of components) {
    if (!componentsByName.has(component.name)) {
      componentsByName.set(component.name, component);
    }
  }

  if (!componentsByName.has(name)) return [];

  const finalList: string[] = [];
  const visited = new Set<string>();
  const stack: string[] = [];

  function visit(componentName: string, referencedBy?: string): void {
    const cycleStart = stack.indexOf(componentName);
    if (cycleStart !== -1) {
      const cyclePath = [...stack.slice(cycleStart), componentName].join(
        ' -> ',
      );

      throw new Error(
        `Circular component dependency detected while resolving "${name}": ${cyclePath}.`,
      );
    }

    if (visited.has(componentName)) {
      return;
    }

    const component = componentsByName.get(componentName);
    if (!component) {
      const dependencyPath = [...stack, componentName].join(' -> ');
      const referencedByMessage = referencedBy
        ? ` referenced by "${referencedBy}"`
        : '';

      throw new Error(
        `Cannot resolve component dependency "${componentName}"${referencedByMessage} while resolving "${name}". Dependency path: ${dependencyPath}.`,
      );
    }

    stack.push(componentName);
    visited.add(componentName);
    finalList.push(componentName);

    for (const dependencyName of component.dependency ?? []) {
      visit(dependencyName, componentName);
    }

    stack.pop();
  }

  visit(name);

  return finalList;
}
