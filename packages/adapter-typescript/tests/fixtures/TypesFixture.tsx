// @ts-ignore L'import est volontairement introuvable : le type reste non résolu.
import type { TonInconnu } from "./Absent";

export interface TypesFixtureProps {
  /** Enum du contrat contre un nombre : incompatible. */
  nombre?: number;
  /** Enum du contrat contre un booléen : incompatible. */
  booleen?: boolean;
  /** Enum du contrat contre une chaîne : plus large, compatible. */
  chaine?: string;
  /** Union de chaînes plus large que le contrat : compatible. */
  large?: "primary" | "danger" | "ghost";
  /** Union mixte qui contient des chaînes : compatible. */
  mixte?: "primary" | number;
  /** Alias non résolu : le vérificateur ne peut pas juger. */
  inconnu?: TonInconnu;
  /** Booléen du contrat contre une chaîne : incompatible. */
  actifTexte?: string;
  /** Booléen du contrat contre un alias non résolu : non analysé. */
  actifInconnu?: TonInconnu;
}

export function TypesFixture(props: TypesFixtureProps) {
  return <span {...props} />;
}
