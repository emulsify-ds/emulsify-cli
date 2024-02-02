import type { Components } from '@emulsify-cli/config';

export default function buildComponentDependencyList(
  components: Components,
  componentsList: string[]
) {
  const rootComponents = components.filter((component) =>
    componentsList.includes(component.name)
  );
  if (rootComponents.length == 0) return [];
  let finalList = [...componentsList];
  if (rootComponents.length > 0) {
    rootComponents.forEach((rootComponent) => {
      const list = rootComponent.dependency as string[];
      if (list && list.length > 0) {
        list.forEach((componentName: string) => {
          finalList = [
            ...new Set(
              finalList.concat(
                buildComponentDependencyList(components, [componentName])
              )
            ),
          ];
        });
      }
    });
  }
  return finalList;
}
