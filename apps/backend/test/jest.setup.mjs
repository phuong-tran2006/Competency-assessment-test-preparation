import { jest } from '@jest/globals';

// ESM tests share the jest.fn()/jest.spyOn() API used by the existing suites.
Reflect.set(globalThis, 'jest', jest);
