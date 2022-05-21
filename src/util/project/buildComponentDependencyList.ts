import type { Components } from '@emulsify-cli/config';

export default function buildComponentDependencyList(
  components: Components,
  name: string
) {
  const rootComponent = components.filter(
    (component) => component.name == name
  );
  if (rootComponent.length == 0) return [];
  let finalList = [name];
  if (rootComponent.length > 0) {
    const list = rootComponent[0].dependency as string[];
    if (list && list.length > 0) {
      list.forEach((componentName: string) => {
        finalList = [
          ...new Set(
            finalList.concat(
              buildComponentDependencyList(components, componentName)
            )
          ),
        ];
      });
    }
  }
  return finalList;
}
