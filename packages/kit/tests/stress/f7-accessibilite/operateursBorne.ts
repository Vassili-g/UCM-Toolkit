/**
 * Les opérateurs de la borne de 5 000 combinaisons sur P0 : Q1 à Q5. Un cas remplace les 48 variants de P0 par des variants fabriqués
 * (`poserLaBorne`) : chacun porte un `Root` blanc et un texte noir par collection qu'il atteint, lié à une variable dont la valeur
 * échoue (gris clair) dans les modes que le cas désigne. L'oracle rejoue la borne : les variants actifs se mesurent dans l'ordre du
 * relevé, la dernière collection d'un variant varie le plus vite, les 5 000 premières combinaisons se mesurent, le reste se compte.
 * Les variants désactivés n'entrent pas dans le compte. Les totaux sont des entiers exacts (BigInt) : au-delà de 2^53 le compte est
 * la chaîne de ses chiffres.
 */
import {
  borneAttendue, contrasteAttendu, desactivesAttendu, fabrique, type AttenduAcc, type CasAccessibilite,
} from './cas.js';
import type { ComposantDeContraste } from './composantDeContraste.js';
import { solide, type Degradation } from './degradation.js';
import { rapportDeHex } from './oracleContraste.js';

const BLANC = '#FFFFFF';
const NOIR = '#000000';
const ECHEC = '#CCCCCC';
const BORNE = 5000;

export interface CollectionDeBorne { readonly modes: number; readonly echecs?: readonly number[] }
export interface VarianteDeBorne { readonly etat?: 'Default' | 'Disabled'; readonly via: readonly number[] }
export interface SpecDeBorne { readonly collections: readonly CollectionDeBorne[]; readonly variantes: readonly VarianteDeBorne[] }

const nomDuVariant = (rang: number): string => `Q=${rang}`;
const nomDuTexte = (rang: number): string => (rang === 0 ? 'Texte' : `Texte ${rang}`);
const identifiantsDeModes = (n: number): string[] => Array.from({ length: n }, (_, rang) => `m${rang}`);

/** Remplace les variants de la base par ceux de `spec`. */
export function poserLaBorne(d: Degradation, spec: SpecDeBorne): void {
  for (const variant of [...d.releve.variants]) d.retirer(d.releve.variants, variant);
  const variables = spec.collections.map((collection, rang) => {
    const posee = d.nouvelleCollection(`Col${rang}`, identifiantsDeModes(collection.modes));
    const echecs = new Set(collection.echecs ?? []);
    return d.nouvelleVariable({ nom: `borne/${rang}`, collection: posee, valeurs: Array.from({ length: collection.modes }, (_, mode) => (echecs.has(mode) ? ECHEC : NOIR)) });
  });
  spec.variantes.forEach((entree, rang) => {
    const variant = { id: `q:${rang}`, nom: nomDuVariant(rang), valeurs: { State: entree.etat ?? 'Default', Q: String(rang) }, layers: [], modesEffectifs: {} };
    d.inserer(d.releve.variants, variant);
    d.ajouterUnLayer({ variant, nom: 'Root', type: 'FRAME', parent: null, peintures: [solide(BLANC)], dimensions: { x: 0, y: 0, largeur: 48, hauteur: 48 } });
    entree.via.forEach((collection, k) => {
      const texte = d.ajouterUnTexte(nomDuTexte(k), { peintures: [solide(NOIR)] }, { variant });
      d.lier(texte, variables[collection], { plage: 0 });
    });
  });
}

const exact = (n: bigint): number | string => (n <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(n) : n.toString());

/** Ce que le contrôle doit rendre pour `spec` : les constats de texte des combinaisons mesurées, la borne et les variants exclus. */
export function attendusDeLaBorne(spec: SpecDeBorne): { attendus: AttenduAcc[]; nonMesurees: bigint } {
  const echecs = spec.collections.map((collection) => new Set(collection.echecs ?? []));
  const echouent = new Map<string, Set<string>>();
  let reste = BORNE;
  let nonMesurees = BigInt(0);
  let desactives = 0;
  spec.variantes.forEach((variante, rang) => {
    if (variante.etat === 'Disabled') { desactives++; return; }
    const modes = variante.via.map((collection) => spec.collections[collection].modes);
    const total = modes.reduce((produit, n) => produit * BigInt(n), BigInt(1));
    const prises = Number(total < BigInt(reste) ? total : BigInt(reste));
    reste -= prises;
    nonMesurees += total - BigInt(prises);
    for (let n = 0; n < prises; n++) {
      let q = n;
      for (let k = variante.via.length - 1; k >= 0; k--) {
        const mode = q % modes[k];
        q = Math.floor(q / modes[k]);
        if (echecs[variante.via[k]].has(mode)) {
          const nom = nomDuTexte(k);
          echouent.set(nom, (echouent.get(nom) ?? new Set()).add(nomDuVariant(rang)));
        }
      }
    }
  });
  const rapport = rapportDeHex(ECHEC, BLANC);
  const attendus: AttenduAcc[] = [...echouent].map(([layer, variants]) => contrasteAttendu({
    usage: 'texte', layer, plage: '0-10', rapport, seuil: 4.5, variants: [...variants], premierPlan: ECHEC, fondHex: BLANC,
  }));
  if (nonMesurees > BigInt(0)) attendus.push(borneAttendue(exact(nonMesurees)));
  if (desactives > 0) attendus.push(desactivesAttendu(desactives));
  return { attendus, nonMesurees };
}

const uniforme = (variants: number, modes: number): SpecDeBorne => ({ collections: [{ modes }], variantes: Array.from({ length: variants }, () => ({ via: [0] })) });

export function operateurQ(base: ComposantDeContraste): CasAccessibilite[] {
  const faire = fabrique(base);
  const cas: CasAccessibilite[] = [];
  const numero = (operateur: string): number => cas.filter((c) => c.operateur === operateur).length + 1;
  const sur = (operateur: string, description: string, spec: SpecDeBorne, plus: Partial<Parameters<typeof faire>[2]> = {}): void => {
    cas.push(faire(`${operateur}-${numero(operateur)}`, operateur, { description, degrader: (d) => poserLaBorne(d, spec), attendus: attendusDeLaBorne(spec).attendus, ...plus }));
  };

  // Q1 : la borne sonne si et seulement si le total dépasse 5 000, et les comptes sont exacts.
  for (const [variants, modes] of [[1, 4999], [1, 5000], [1, 5001], [2, 2500], [2, 2501], [50, 100], [51, 100], [216, 24]] as const) {
    sur('Q1', `${variants} variant${variants > 1 ? 's' : ''} × ${modes} combinaisons = ${variants * modes}`, uniforme(variants, modes));
  }

  // Q2 : un variant qui échoue à un rang mesuré donne un constat, à un rang non mesuré aucun, et la borne ne le dit pas (Q-F7-11).
  const troisVariants = (rangDeLEchec: number): SpecDeBorne => ({
    collections: [{ modes: 2000 }, { modes: 2000 }, { modes: 2000, echecs: [rangDeLEchec] }], variantes: [{ via: [0] }, { via: [1] }, { via: [2] }],
  });
  sur('Q2', 'trois variants de 2 000 combinaisons, le troisième échoue à son 1 000e et dernier rang mesuré', troisVariants(999));
  sur('Q2', 'trois variants de 2 000 combinaisons, le troisième échoue à son 1 001e rang, le premier non mesuré', troisVariants(1000), {
    attendus: attendusDeLaBorne(troisVariants(1000)).attendus.map((a) => (a.cle === 'borne' ? borneAttendue(1000, { variantsNonMesures: 1 }) : a)), verdict: 'mesure', question: 'Q-F7-11', hypothese: 'H12',
  });
  sur('Q2', 'un variant à deux collections de 100 et 70 modes (7 000 combinaisons), la seconde échoue à son mode 25 : au milieu du produit coupé', {
    collections: [{ modes: 100 }, { modes: 70, echecs: [25] }], variantes: [{ via: [0, 1] }],
  });
  sur('Q2', 'deux variants de 3 000 combinaisons, le premier échoue à son premier rang', {
    collections: [{ modes: 3000, echecs: [0] }, { modes: 3000 }], variantes: [{ via: [0] }, { via: [1] }],
  });

  // Q3 : le compte reste exact, en nombre puis en chaîne de chiffres.
  const lesModes = (...modes: number[]): SpecDeBorne => ({ collections: modes.map((n) => ({ modes: n })), variantes: [{ via: modes.map((_, rang) => rang) }] });
  sur('Q3', 'cinq collections de 2, 3, 4, 5 et 6 modes : 720 combinaisons', lesModes(2, 3, 4, 5, 6));
  sur('Q3', 'trois collections de 100 modes : 1 000 000 combinaisons', lesModes(100, 100, 100));
  sur('Q3', 'dix collections de 100 modes : 10^20 combinaisons, au-delà de 2^53', lesModes(...Array(10).fill(100)));

  // Q4 : une collection dont le mode ne change pas la couleur lue devrait sortir du produit (Q-F7-11).
  for (const modes of [2, 3]) {
    const spec: SpecDeBorne = { collections: [{ modes, echecs: Array.from({ length: modes }, (_, rang) => rang) }], variantes: [{ via: [0] }] };
    const rapport = rapportDeHex(ECHEC, BLANC);
    sur('Q4', `une collection de ${modes} modes dont la couleur #CCCCCC ne change pas`, spec, {
      attendus: [contrasteAttendu({ usage: 'texte', layer: 'Texte', plage: '0-10', rapport, seuil: 4.5, variants: [nomDuVariant(0)], premierPlan: ECHEC, fondHex: BLANC, autresModes: 0 })],
      verdict: 'mesure', question: 'Q-F7-11', hypothese: 'H13',
    });
  }

  // Q5 : les variants désactivés n'entrent pas dans le compte ; sans couleur liée, le total vaut 1.
  sur('Q5', 'un variant actif et deux désactivés, chacun de 5 000 combinaisons : 5 000 combinaisons comptées', {
    collections: [{ modes: 5000 }], variantes: [{ via: [0] }, { via: [0], etat: 'Disabled' }, { via: [0], etat: 'Disabled' }],
  });
  const rapport = rapportDeHex(ECHEC, BLANC);
  cas.push(faire(`Q5-${numero('Q5')}`, 'Q5', {
    description: 'un variant sans couleur liée, texte #CCCCCC en dur : une combinaison, sans borne',
    degrader: (d) => {
      poserLaBorne(d, { collections: [], variantes: [{ via: [] }] });
      d.ajouterUnTexte('Texte', { peintures: [solide(ECHEC)] }, { variant: d.releve.variants[0] });
    },
    attendus: [contrasteAttendu({
      usage: 'texte', layer: 'Texte', plage: '0-10', rapport, seuil: 4.5, variants: [nomDuVariant(0)], premierPlan: ECHEC, fondHex: BLANC, mode: '', autresModes: 0, rapports: [['', Math.trunc(rapport * 100) / 100]],
    })],
  }));
  return cas;
}
