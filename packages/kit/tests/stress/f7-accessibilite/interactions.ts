/**
 * Les interactions déclarées : sept couples d'opérateurs sur le même composant, chacun sur trois profils (P0, Pα et le profil tiré
 * de la graine), soit 21 cas. Le huitième couple du plan, O2 et E1 (couches empilées en Display P3), est retiré avec Display P3 :
 * ses trois cas ne sont pas posés. Chaque couple a son oracle, écrit avec `oracleContraste.ts` seul. Les cas posent leur niveau
 * (AA, sauf G1 et S3) pour que le niveau du profil ne change pas l'attendu.
 */
import {
  attendusSurPageEtCarte, contrasteAttendu, fabrique, limiteAttendue, modesDuProfil, nomDeLaCible, sansAnneauAttendu,
  type AttenduAcc, type CasAccessibilite, type DefinitionDeCas,
} from './cas.js';
import { composantDeContraste, themeDuCatalogue, type ComposantDeContraste } from './composantDeContraste.js';
import { cadre, peintureDeType, solide, type Degradation } from './degradation.js';
import { attendusDeLaBorne, poserLaBorne, type SpecDeBorne } from './operateursBorne.js';
import { couleurDeHex, rapportDeHex, tronquerA2 } from './oracleContraste.js';
import { paireLaPlusProche } from './paires.js';
import { PROFIL_ALPHA, PROFIL_P0, profilTire, type ProfilDeContraste } from './profils.js';

const BLANC = '#FFFFFF';
const NOIR = '#000000';
const ECHEC = '#CCCCCC';

/** Les trois profils des interactions : P0, Pα (`alert-11`, fond translucide) et celui que la graine tire. */
export const PROFILS_DES_INTERACTIONS = (graine: number): readonly ProfilDeContraste[] => [PROFIL_P0, PROFIL_ALPHA, profilTire(graine)];

type Couple = (base: ComposantDeContraste) => DefinitionDeCas;

const COUPLES: readonly (readonly [string, Couple])[] = [
  // Fond translucide et texte en dur sur un thème à deux modes : la page et la carte se mesurent dans chaque mode du thème (Q-F7-6).
  ['O4+M6', (base) => {
    const fond = couleurDeHex(BLANC, 0.1);
    return {
      description: 'texte noir en dur sur un fond blanc d\'alpha 0,1, sans ancêtre opaque',
      degrader: (d) => { d.scene({ fond, racineEnDur: true }); d.ajouterUnTexte('Texte', { peintures: [solide(NOIR)] }); },
      attendus: attendusSurPageEtCarte({ usage: 'texte', seuil: 4.5, cible: nomDeLaCible(base), premierPlan: () => [couleurDeHex(NOIR)], fond: [fond], modes: modesDuProfil(base) }),
      hypothese: 'H6',
    };
  }],
  // Un dégradé en fond et une couleur illisible ailleurs : deux limites de causes distinctes, aucun verdict.
  ['F1+M5', (base) => {
    const cible = nomDeLaCible(base);
    return {
      description: 'dégradé en fond du Root pour un texte, variable non chargée sur un texte posé sur un fond blanc',
      degrader: (d) => {
        const racine = d.scene({ fond: null, racineEnDur: true });
        d.remplacerLesPeintures(racine, 'fills', [peintureDeType('GRADIENT_LINEAR')]);
        d.ajouterUnTexte('Texte', { peintures: [solide(NOIR)] });
        const zone = cadre(d, 'Zone', racine, [solide(BLANC)]);
        const autre = d.ajouterUnTexte('Autre', { peintures: [solide(NOIR)] }, { parent: zone });
        d.lier(autre, d.nouvelleVariable({ nom: 'test/v', collection: d.nouvelleCollection('Test', ['Mode 1']), valeurs: [NOIR], etat: 'non-chargee' }), { plage: 0 });
      },
      attendus: [
        limiteAttendue({ usage: 'texte', layer: 'Texte', cause: 'degrade', plage: '0-10', variants: [cible] }),
        limiteAttendue({ usage: 'texte', layer: 'Autre', cause: 'mode-illisible', plage: '0-10', variants: [cible] }),
      ],
    };
  }],
  // Des variants désactivés de 5 001 combinaisons chacun ne consomment aucune combinaison.
  ['X1+Q1', () => {
    const spec: SpecDeBorne = {
      collections: [{ modes: 5001 }, { modes: 10 }],
      variantes: [{ via: [0], etat: 'Disabled' }, { via: [0], etat: 'Disabled' }, { via: [0], etat: 'Disabled' }, { via: [1] }],
    };
    return { description: 'trois variants désactivés de 5 001 combinaisons et un actif de 10', degrader: (d) => poserLaBorne(d, spec), attendus: attendusDeLaBorne(spec).attendus };
  }],
  // En AAA, le grand texte vise 4,5 et le texte 7.
  ['G1+S3', (base) => {
    const cible = nomDeLaCible(base);
    const [troisNeuf, cinq] = [paireLaPlusProche(3.9, BLANC).auDessus.couleur, paireLaPlusProche(5, BLANC).auDessus.couleur];
    const constat = (usage: 'texte' | 'grand-texte', layer: string, couleur: string, seuil: number): AttenduAcc => contrasteAttendu({
      usage, layer, plage: '0-10', rapport: rapportDeHex(couleur, BLANC), seuil, niveau: 'AAA', variants: [cible], premierPlan: couleur, fondHex: BLANC,
    });
    return {
      description: `texte de 24 px à 3,9:1 et texte de 14 px à 5:1, niveau AAA`,
      degrader: (d) => {
        d.scene();
        d.ajouterUnTexte('Grand', { peintures: [solide(troisNeuf)], fontSize: 24 });
        d.ajouterUnTexte('Petit', { peintures: [solide(cinq)], fontSize: 14 });
      },
      attendus: [constat('grand-texte', 'Grand', troisNeuf, 4.5), constat('texte', 'Petit', cinq, 7)], niveau: 'AAA',
    };
  }],
  // Un anneau invisible d'épaisseur 1 n'est pas un anneau : le variant en focus est sans anneau, et aucun C51 ne sort.
  ['R4+R5', (base) => ({
    description: 'variant en focus dont l\'anneau « ring » d\'épaisseur 1 a une peinture masquée',
    degrader: (d) => {
      d.fixer(d.cible.valeurs, 'State', 'Focus');
      d.scene();
      d.ajouterUnLayer({ nom: 'ring', peintures: [solide(NOIR, { champ: 'strokes', visible: false })], strokeWeight: 1 });
    },
    attendus: [sansAnneauAttendu([nomDeLaCible(base)])],
  })],
  // Un texte lié à surface/foreground sur un fond translucide : la page et la carte ont chacune leur constat et leur type.
  ['Y1+O4', (base) => {
    const [clair, sombre] = [paireLaPlusProche(4.5, BLANC).auDessous.couleur, BLANC];
    const fond = couleurDeHex(BLANC, 0.1);
    return {
      description: `texte lié à primary/surface/foreground (${clair} en Light, blanc en Dark) sur un fond blanc d'alpha 0,1`,
      degrader: (d) => {
        d.scene({ fond, racineEnDur: true });
        const theme = themeDuCatalogue(d.catalogue);
        const texte = d.ajouterUnTexte('Texte', { peintures: [solide(NOIR)] });
        d.lier(texte, d.nouvelleVariable({ nom: 'primary/surface/foreground', collection: theme, valeurs: [clair, sombre].slice(0, theme.modes.length) }), { plage: 0 });
      },
      attendus: attendusSurPageEtCarte({
        usage: 'texte', seuil: 4.5, cible: nomDeLaCible(base), premierPlan: (mode) => [couleurDeHex(mode === 'light' ? clair : sombre)], fond: [fond],
        modes: modesDuProfil(base), type: 'corriger', variableDuTheme: 'surface/foreground',
      }),
    };
  }],
  // Deux plages liées à des tokens qui échouent chacune dans un seul mode, au même rapport : un seul constat, celui de la première plage (Q-F7-12).
  ['T1+M1', (base) => {
    const cible = nomDeLaCible(base);
    const modes = modesDuProfil(base);
    const rapport = rapportDeHex(ECHEC, BLANC);
    const valeurs = (echoue: 'light' | 'dark'): readonly (readonly [string, number])[] => modes.map((mode) => [`theme en ${mode === 'light' ? 'Light' : 'Dark'}`, mode === echoue ? tronquerA2(rapport) : 21] as const);
    const plage = (debut: number, fin: number, echoue: 'light' | 'dark'): AttenduAcc[] => {
      if (!modes.includes(echoue)) return [];
      return [contrasteAttendu({
        usage: 'texte', layer: 'Label', plage: `${debut}-${fin}`, rapport, seuil: 4.5, variants: [cible], premierPlan: ECHEC, fondHex: BLANC,
        mode: `theme en ${echoue === 'light' ? 'Light' : 'Dark'}`, autresModes: 0, rapports: valeurs(echoue),
      })];
    };
    return {
      description: `texte à deux plages liées à des tokens du thème, gris clair en Light pour la première et en Dark pour la seconde`,
      degrader: (d) => {
        d.scene({ racineEnDur: true });
        const theme = themeDuCatalogue(d.catalogue);
        const plages = [0, 5].map((debut) => ({ debut, fin: debut + 5, peintures: [solide(NOIR)] }));
        const texte = d.ajouterUnLayer({ nom: 'Label', type: 'TEXT', plages });
        d.lier(texte, d.nouvelleVariable({ nom: 'test/a', collection: theme, valeurs: [ECHEC, NOIR].slice(0, theme.modes.length) }), { plage: 0 });
        d.lier(texte, d.nouvelleVariable({ nom: 'test/b', collection: theme, valeurs: [NOIR, ECHEC].slice(0, theme.modes.length) }), { plage: 1 });
      },
      attendus: [...plage(0, 5, 'light'), ...plage(5, 10, 'dark')].slice(0, 1),
    };
  }],
];

export const NOMBRE_DE_COUPLES = COUPLES.length;

/** Les 21 cas : chaque couple sur chaque profil. */
export function lesInteractions(graine: number): CasAccessibilite[] {
  const bases = PROFILS_DES_INTERACTIONS(graine).map((profil) => ({ profil, base: composantDeContraste(profil, graine) }));
  return COUPLES.flatMap(([nom, couple]) => bases.map(({ profil, base }) => {
    const definition = couple(base);
    return fabrique(base)(`${nom}-${profil.id}`, nom, { ...definition, description: `${profil.id} (${profil.forme}) : ${definition.description}`, niveau: definition.niveau ?? 'AA' });
  }));
}
