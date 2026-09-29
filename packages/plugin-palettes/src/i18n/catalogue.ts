/** La forme des messages, avec des chaînes élargies indépendamment de leur langue. */
import type * as francais from './fr';

type Elargir<T> = T extends string ? string
  : T extends (...arguments_: infer A) => infer R ? (...arguments_: A) => R
  : T extends readonly unknown[] ? { [K in keyof T]: Elargir<T[K]> }
  : T extends object ? { [K in keyof T]: Elargir<T[K]> } : T;

export type Catalogue = Elargir<typeof francais>;
