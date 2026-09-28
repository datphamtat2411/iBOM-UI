let nextPrimitiveId = 0;

export function createIbomPrimitiveId(prefix: string): string {
  nextPrimitiveId += 1;
  return `${prefix}-${nextPrimitiveId}`;
}

export function isSameIbomValue<T>(left: T | null, right: T | null): boolean {
  return Object.is(left, right);
}
