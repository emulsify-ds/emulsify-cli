export default function expectToContainInOrder(
  received: string,
  substrings: readonly string[],
): void {
  let previousIndex = -1;

  for (const substring of substrings) {
    expect(received).toContain(substring);

    const index = received.indexOf(substring, previousIndex + 1);
    expect(previousIndex).toBeLessThan(index);
    previousIndex = index;
  }
}
