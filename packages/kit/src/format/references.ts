/**
 * La forme d'une référence de token, et les deux gestes qui la posent et
 * l'enlèvent.
 *
 * Elle vit dans le format et non chez les lecteurs, parce que les deux côtés en
 * ont besoin et que seul le format voyage partout : le moteur la produit dans
 * le bundle du plugin Figma, le validateur la refuse dans Node, et le repo
 * consommateur la déballe dans un navigateur. Une définition qui ne serait
 * atteignable que par les lecteurs obligerait les deux autres à la recopier :
 * ce qu'ils faisaient.
 */

/** Le nom d'un segment ou d'un chemin : ni accolade ni espace. Source commune de toutes les formes ci-dessous. */
const SANS_ACCOLADE_NI_ESPACE = String.raw`[^{}\s]+`;

/**
 * Référence complète : la chaîne entière est entre accolades et porte au moins
 * un point séparateur, sans espace ni accolade interne.
 *
 * C'est cet ancrage qui distingue `{components.button.sizes.medium.gap}` d'une
 * phrase écrite par un designer dans `intent`, d'une note comme `{à définir}`,
 * ou d'un texte de maquette qui cite une référence sans en être une.
 */
export const TOKEN_REFERENCE = new RegExp(String.raw`^\{${SANS_ACCOLADE_NI_ESPACE}\.${SANS_ACCOLADE_NI_ESPACE}\}$`);

/**
 * Référence à un token de premier niveau, sans point : `{marque}`. Un contrat
 * n'en cite pas (`isTokenReference` la refuse), mais un alias de `tokens.json`
 * peut viser un token placé à la racine.
 */
export const REFERENCE_DE_PREMIER_NIVEAU = /^\{[^{}\s.]+\}$/;

/**
 * Les références complètes d'un texte, une expression globale neuve à chaque
 * appel pour qu'aucun `lastIndex` ne se partage. Une accolade précédée de `$`
 * ouvre l'interpolation d'un gabarit de code (`${a.b}`), pas une référence.
 */
export function referencesDansUnTexte(): RegExp {
  return new RegExp(String.raw`(?<!\$)\{${SANS_ACCOLADE_NI_ESPACE}\.${SANS_ACCOLADE_NI_ESPACE}\}`, 'g');
}

/**
 * Vrai si cette valeur est une référence de token, et rien d'autre.
 */
export function isTokenReference(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_REFERENCE.test(value);
}

/**
 * Le chemin que désigne une chaîne d'alias de `tokens.json`, ou `null` si elle
 * n'en désigne aucun : une référence complète, ou une référence de premier
 * niveau.
 *
 * @example cheminDeReference('{marque}') // → 'marque'
 * @example cheminDeReference('{a b.c}') // → null
 */
export function cheminDeReference(value: unknown): string | null {
  return typeof value === 'string' && (TOKEN_REFERENCE.test(value) || REFERENCE_DE_PREMIER_NIVEAU.test(value))
    ? value.slice(1, -1)
    : null;
}

/**
 * Enrobe un nom de token en référence de contrat, entre accolades, même
 * convention que les références DTCG de `tokens.json`. Un token cité dans un
 * contrat est toujours un lien vers `tokens.json`, jamais une valeur : les
 * accolades le rendent explicite et le distinguent d'une chaîne littérale.
 * Le chemin lui-même vient de `normalizeName()`, les accolades sont un
 * enrobage, pas un renommage : les deux commandes restent recoupables.
 *
 * @example toRef('components.button.default.background')
 * // → '{components.button.default.background}'
 */
export function toRef(name: string): string {
  return `{${name}}`;
}

/**
 * Chemin nu d'une référence : l'inverse exact de `toRef`. Une chaîne qui n'est
 * pas une référence est rendue telle quelle.
 *
 * Elle est ici et pas ailleurs pour la même raison que `isTokenReference` :
 * déballer les accolades là où la forme n'est pas définie finirait par lire
 * « border} » comme le dernier segment d'un token, et un garde-fou entier se
 * tairait sans un mot.
 *
 * @example refPath('{components.button.default.border}')
 * // → 'components.button.default.border'
 */
export function refPath(reference: string): string {
  return isTokenReference(reference) ? reference.slice(1, -1) : reference;
}
