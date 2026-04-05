declare module "node:assert/strict" {
  interface Assert {
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    equal(actual: unknown, expected: unknown, message?: string): void;
    ok(value: unknown, message?: string): asserts value;
  }

  const assert: Assert;
  export default assert;
}

declare module "node:test" {
  export interface TestContext {}

  export type TestFunction = (
    name: string,
    fn: (context: TestContext) => void | Promise<void>,
  ) => void;

  const test: TestFunction;
  export default test;
}
