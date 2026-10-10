/** Qollab resolves dotted names to Python modules at runtime; TypeScript only needs to know the shape. */
declare module 'qsg.circuit' {
  import type { PyFn } from './engine/qollab';
  export const ideal_json: PyFn;
  export const qiskit_code: PyFn;
  export const run_json: PyFn;
  export const describe_backend_json: PyFn;
}
