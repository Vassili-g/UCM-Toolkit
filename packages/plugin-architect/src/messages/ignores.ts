/** Les messages des constats ignorés. */
import type { IdentiteDAnalyse } from './commun';

export type DemandeDIgnores =
  | { type: 'ignorer'; analyse: IdentiteDAnalyse; constat: string; portee: 'constat' | 'proposition' }
  | { type: 'ne-plus-ignorer'; analyse: IdentiteDAnalyse; constat: string };

export type MessageDIgnores =
  | { type: 'ignores'; analyse: IdentiteDAnalyse; constats: readonly string[] };
