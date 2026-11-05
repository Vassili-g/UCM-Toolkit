/**
 * Les 180 faux positifs de F5 et F6 (section 4 du plan) : des composants valides, où le kit ne doit rien dire.
 *
 *   FP1  60 profils (10 jeux d'axes, 3 écritures du nom, 2 écritures des valeurs) : lecture complète, et les seuls constats que les
 *        décisions donnent. Un variant qui écrit `S`, `sm`, `Middle` ou `error` reçoit sa correction vers le mot entier (Q-F5-5, Q-F5-6),
 *        un token qui l'écrit de même reçoit C8 ou C10, et un jeu à deux axes de style reçoit le constat à faire de Q-F5-3.
 *   FP2  88 valeurs attestées, une par composant à un axe, le token écrit comme la valeur. L'oracle vient du modèle de référence, pas du
 *        champ `constat` du corpus : un token qui écrit un terme du registre autrement que par son identifiant attend C8 ou C10 avec
 *        cet identifiant (`Small` attend C10 `sm`, `XXL` attend C10 `2xl`, `error` attend C8 `danger`), et une taille ou une palette de
 *        variant qui n'est pas le mot entier attend sa correction (`S`, `Error`).
 *   FP3  9 valeurs limites : 4 à point ou à barre, que le token écrit avec un tiret (Q-F5-10), 5 à accent.
 *   FP4  23 composants de F6 : 5 textes, 6 icônes, 10 non-icônes de I6 posées comme layers, 2 composants sans texte ni icône.
 */
import { formeReconnue, termeReconnu } from '../../../src/referentiel/reconnaissance.js';
import { REGISTRE_PALETTES_COMPOSANT } from '../../../src/referentiel/architecture.js';
import { segmentDeToken } from '../../../src/referentiel/ecriture-des-mots.js';
import { attendusDuModele, c63DeuxAxesDeStyle, casDegrade, Numerotation, rolesDeLaBase, type CasDeVariants, type Degradation } from './cas.js';
import { avecLesCouchesF6, CODES_DE_LA_PORTEE, composantDeBase, composantF6, GRAINE_PAR_DEFAUT, liaisonVers, type AxeDeVariants } from './composantDeBase.js';
import { composantValide, type ComposantDeBase } from './portF3.js';
import { axesDuProfil, composantDuProfil, PROFILS, roleDuCorpus, VALEURS_ATTESTEES, JEUX_D_AXES, type ProfilDeVariants } from './profils.js';
import { NON_ICONES } from './typo/definitionsDIcone.js';
import { casF6, layerDe, layerNeuf, lierLeTexte, variableParNom, type CasMixte } from './typo/operateursTexte.js';
import type { AxeDuComposant } from '../../../src/controles/nommage.js';

// ---------------------------------------------------------------------------------------------------------------------------
// FP1 : les 60 profils

/**
 * Un profil dont l'axe de style porte des termes du registre des palettes (`primary`, `danger`) et qui n'a pas d'axe de palette : le
 * segment de style de ses tokens est ambigu pour la grammaire (hypothèse 2). Le nom de l'axe décide (Q-F5-2).
 */
function styleAValeursDePalette(profil: ProfilDeVariants): boolean {
  const axes = axesDuProfil(profil);
  return !axes.some((axe) => axe.segment === 'palette')
    && axes.some((axe) => axe.segment === 'style' && axe.valeurs.some((valeur) => termeReconnu(REGISTRE_PALETTES_COMPOSANT, valeur) !== undefined));
}

/** Le nombre d'axes du jeu dont le nom porte le style (`Variant` et `Fill style`, `Appearance` et `Shape`). */
const axesDeStyle = (profil: ProfilDeVariants): number => JEUX_D_AXES[profil.jeu].axes.filter(([nom]) => roleDuCorpus(nom) === 'style').length;

function profils(graine: number, numero: Numerotation): CasDeVariants[] {
  return PROFILS.map((profil: ProfilDeVariants): CasMixte => {
    let memoire: CasDeVariants['attendus'] | undefined;
    return {
      id: numero.prochain('FP1'), famille: 'F5', operateur: 'FP1', verdict: 'attendu',
      get attendus() {
        if (!memoire) {
          const composant = composantDuProfil(profil, graine);
          const jeu = composant.releve.jeu.cle;
          memoire = [...attendusDuModele(composant, { roles: rolesDeLaBase(composant) }), ...(axesDeStyle(profil) > 1 ? [c63DeuxAxesDeStyle(jeu)] : [])];
        }
        return memoire;
      },
      codesJuges: [...CODES_DE_LA_PORTEE, 'C63'],
      ...(styleAValeursDePalette(profil) ? { hypothese: 'H2' } : {}),
      controles: ['nommage', 'oublis'], verifierLaLecture: true,
    entree: {
      description: `FP1 : ${profil.id}, ${profil.jeu} ${profil.composant}, nom d'axe ${profil.ecritureDuNom}, valeurs ${profil.ecritureDesValeurs}`, zones: [],
      materialiser: () => { const composant = composantDuProfil(profil, graine); return { composant, base: composant, annuler: () => undefined }; },
    },
    };
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// FP2 et FP3 : une valeur, un axe, un token écrit comme elle

const AXE_DE_LA_CATEGORIE: Readonly<Record<'taille' | 'etat' | 'palette' | 'style', readonly [nom: string, role: AxeDuComposant]>> = {
  taille: ['Size', 'taille'], etat: ['State', 'etat'], palette: ['Color', 'palette'], style: ['Style', 'style'],
};

/** Un composant à un axe et un variant, dont les tokens écrivent la valeur telle quelle, ou avec un tiret pour un point et une barre. */
function composantDUneValeur(valeur: string, categorie: keyof typeof AXE_DE_LA_CATEGORIE, graine: number, ecritureDuSegment?: (valeur: string) => string): { composant: ComposantDeBase; axe: string } {
  const [axe, role] = AXE_DE_LA_CATEGORIE[categorie];
  const axes: AxeDeVariants[] = [{ nom: axe, valeurs: [valeur], segment: role }];
  return {
    axe,
    composant: composantValide({
      jeu: 'Button', axes, scopes: 'larges', imbriques: true, plages: 2, modesDeTaille: 1, graine,
      ecritureDesValeurs: (_propriete, ecrite) => ecritureDuSegment?.(ecrite) ?? ecrite,
    }),
  };
}

function valeursAttestees(graine: number, numero: Numerotation): CasDeVariants[] {
  return VALEURS_ATTESTEES.map((entree) => {
    const { composant, axe } = composantDUneValeur(entree.valeur, entree.categorie, graine);
    return casDegrade(composant, {
      id: numero.prochain('FP2'), operateur: 'FP2',
      description: `${axe} : l'unique valeur ${entree.valeur} (${entree.categorie}), écrite telle quelle dans les tokens`,
      zones: [{ axe, valeur: entree.valeur }], degrader: () => undefined,
    });
  });
}

const VALEURS_LIMITES: readonly (readonly [valeur: string, categorie: keyof typeof AXE_DE_LA_CATEGORIE, pointOuBarre: boolean])[] = [
  ['1.5', 'taille', true], ['2.5', 'taille', true], ['v2.0', 'style', true], ['Small/Medium', 'taille', true],
  ['Défaut', 'etat', false], ['Survol', 'etat', false], ['Pressé', 'etat', false], ['Désactivé', 'etat', false], ['Actif', 'etat', false],
];

/**
 * Q-F5-10 : le segment du token remplace le point et la barre par un tiret (`1.5` donne `1-5`), et le variant se compare au segment
 * ainsi écrit : aucun C7. Le token d'une valeur à accent s'écrit tel quel.
 */
function valeursLimites(graine: number, numero: Numerotation): CasDeVariants[] {
  return VALEURS_LIMITES.map(([valeur, categorie, pointOuBarre]) => {
    const { composant, axe } = composantDUneValeur(valeur, categorie, graine, pointOuBarre ? (ecrite) => segmentDeToken(ecrite) : undefined);
    return casDegrade(composant, {
      id: numero.prochain('FP3'), operateur: 'FP3',
      ...(pointOuBarre ? { hypothese: 'H12' } : {}),
      description: `${axe} : l'unique valeur ${valeur}, ${pointOuBarre ? 'à point ou à barre, écrite avec un tiret' : 'à accent, écrite telle quelle'} dans les tokens`,
      zones: [{ axe, valeur }], degrader: () => undefined,
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// FP4 : composants de F6 valides

function composantsDeTypographie(graine: number, numero: Numerotation): CasDeVariants[] {
  const base = composantF6(graine);
  const cas = (description: string, degrader: (d: Degradation) => void, plus: { hypothese?: string; ecartConnu?: string } = {}): CasDeVariants => casF6(base, {
    id: numero.prochain('FP4'), operateur: 'FP4', description, zones: [], degrader, attendus: () => [], ...plus,
  });
  const labels = (d: Degradation) => d.releve.variants.map((variant) => layerDe(variant, 'Label'));
  const lierLesDeux = (d: Degradation): void => {
    for (const label of labels(d)) {
      lierLeTexte(d, label, 'fontSize', variableParNom(d, 'label/md/font-size'));
      lierLeTexte(d, label, 'fontWeight', variableParNom(d, 'label/md/font-weight'));
    }
  };
  const textes = [
    cas('texte à style seul, le même dans les 12 variants', (d) => { for (const label of labels(d)) d.fixer(label.texte!, 'style', 'Label/Medium'); }),
    cas('texte sans style, taille et graisse liées à typography', (d) => { for (const label of labels(d)) d.fixer(label.texte!, 'style', null); lierLesDeux(d); }),
    cas('texte à style par taille, taille et graisse liées à typography', lierLesDeux),
    cas('texte de trois plages au même style', (d) => {
      for (const label of labels(d)) d.inserer(label.texte!.plages, { debut: 10, fin: 14, fontSize: 14, fontWeight: 500, peintures: [], liaisons: [] });
    }),
    cas('texte à style par taille (la base)', () => undefined),
  ];
  const icones = [
    cas('icône aux liaisons de base (la base)', () => undefined),
    cas('icône dont le remplissage est lié sans indice de peinture', (d) => {
      for (const variant of d.releve.variants) d.fixer(layerDe(variant, 'Icon').liaisons.find((liaison) => liaison.champ === 'fills')!, 'indice', undefined);
    }),
    cas('icône dont la largeur est liée à layout/sizing/16 : la taille vient de Size', (d) => {
      for (const variant of d.releve.variants) {
        const icone = layerDe(variant, 'Icon');
        d.inserer(icone.liaisons, liaisonVers(icone.id, 'width', variableParNom(d, 'sizing/16')));
      }
    }),
    ...['lucide/chevron-down', 'check_circle', 'ph-caret-down'].map((nom) => cas(`instance d'Icon dont le layer s'appelle ${nom}`, (d) => {
      for (const variant of d.releve.variants) d.fixer(layerDe(variant, 'Icon'), 'nom', nom);
    })),
  ];
  const nonIcones = NON_ICONES.map((definition) => cas(`le layer ${definition.nom} (${definition.type}) n'est pas une icône`, (d) => {
    for (const variant of d.releve.variants) {
      const racine = layerDe(variant, 'Root');
      d.inserer(variant.layers, layerNeuf(`${variant.id}~${definition.nom}`, definition.nom, definition.type, racine.id, {
        ...(definition.type === 'TEXT' ? { texte: { style: 'Label/Medium', plages: [] } } : {}),
      }));
    }
  }, { hypothese: 'H17', ecartConnu: 'E-26' }));
  return [...textes, ...icones, ...nonIcones];
}

/** Un composant sans texte ni icône : le séparateur `Divider`, le point d'un `Badge`. */
function composantsSansTexteNiIcone(graine: number, numero: Numerotation): CasDeVariants[] {
  const sansTexteNiIcone = (jeu: string, axes: readonly AxeDeVariants[], description: string, point: boolean): CasDeVariants => {
    const base = avecLesCouchesF6(composantDeBase(jeu, axes, graine));
    return casF6(base, {
      id: numero.prochain('FP4'), operateur: 'FP4', description, zones: [], attendus: () => [],
      degrader: (d) => {
        for (const variant of d.releve.variants) {
          for (const nom of ['Label', 'Icon']) d.retirer(variant.layers, layerDe(variant, nom));
          if (point) d.inserer(variant.layers, layerNeuf(`${variant.id}~dot`, 'Dot', 'ELLIPSE', layerDe(variant, 'Root').id));
        }
      },
    });
  };
  return [
    sansTexteNiIcone('Divider', [], 'Divider : un séparateur sans texte ni icône', false),
    sansTexteNiIcone('Badge', [{ nom: 'Size', valeurs: ['Small', 'Medium'], segment: 'taille' }], 'Badge : un point sans texte ni icône', true),
  ];
}

/** Les 180 faux positifs : 60 profils, 88 valeurs attestées, 9 valeurs limites, 23 composants de F6. */
export function fauxPositifs(graine: number = GRAINE_PAR_DEFAUT): CasDeVariants[] {
  const numero = new Numerotation();
  return [...profils(graine, numero), ...valeursAttestees(graine, numero), ...valeursLimites(graine, numero), ...composantsDeTypographie(graine, numero), ...composantsSansTexteNiIcone(graine, numero)];
}
