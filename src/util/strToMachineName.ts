/**
 * Takes a string and converts it to a machine-friendly string by eliminating
 * non-alphanumeric characters, and replacing spaces with dashes.
 *
 * @param str string that should be converted into a machine-friendly string.
 *
 * @returns machine-friendly version of the given string.
 */
export default function strToMachineName(str: string): string {
  return (
    str
      // Filter out all non-alphanumeric/space characters.
      .replace(/[^A-Za-z0-9 ]/g, '')
      // Exclude double-spaces to prevent dual dashes.
      .replace(/\s{2,}/g, ' ')
      // Turn all spaces into dashes.
      .replace(/\s/g, '-')
      .toLowerCase()
  );
}
