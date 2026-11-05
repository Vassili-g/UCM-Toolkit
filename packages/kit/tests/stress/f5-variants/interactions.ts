/**
 * Les 32 interactions déclarées de F5 et F6 (section 3.4 du plan) : 16 couples de dégradations qui touchent la même zone, sur P0 et
 * sur p18 (J3 en forme UCM, majuscules initiales). Chaque cas se nomme `<couple>-<profil>`, par exemple `V1+M1-P0`.
 *
 * L'oracle d'un couple ne s'écrit pas comme l'union des oracles de ses deux membres : les deux dégradations partagent une valeur, un
 * variant ou un token, et leurs constats se recoupent ou se retirent. Pour un couple de F5, l'oracle est donc le modèle de référence
 * (`attendusDuModele`, qui applique les règles 4.1 et 4.4 au composant déjà dégradé), retouché quand une proposition de la section 9
 * l'exige. Pour un couple de F6, l'oracle s'écrit à la main, d'après le motif que le plan donne pour le couple. Le dernier couple
 * (V1 et I2) mêle les deux familles sur le même composant : l'oracle de F5 se lit sur le composant à couches de F6, et celui de F6 s'y
 * ajoute.
 *
 * P0 n'a pas d'axe de palette dans p18 : les couples qui touchent `Color` prennent alors l'axe `Kind`, le seul axe de style.
 */
import type { AxeDuComposant } from '../../../src/controles/nommage.js';
import type { ConstatAttendu } from '../commun/types.js';
import { attendusDuModele, c63DeuxAxesDeStyle, Degradation, rolesDeLaBase, type CasDeVariants } from './cas.js';
import {
  avecLesCouchesF6, AXES_DE_P0, composantDeBase, composantP0, GRAINE_PAR_DEFAUT, liaisonVers, segmentDeLaValeur, styleDeTexteDeLaTaille, type AxeDeVariants,
} from './composantDeBase.js';
import type { ComposantDeBase } from './portF3.js';
import { axesDuProfil, composantDuProfil, profilParId } from './profils.js';
import { autreTailleDuPremierVariant } from './typo/operateursIcones.js';
import {
  a64, a65, a66, a67, delierLeChamp, layerDe, lierLeTexte, variableParNom, type CasMixte, type ControleDeStress,
} from './typo/operateursTexte.js';

export const COUPLES = [
  'V1+M1', 'V1+O1', 'V1+V1', 'V3+V4', 'M1+O5', 'A3+V1', 'O2+M1', 'A4+V1',
  'S2+S1', 'S3+S3', 'S2+S2', 'I1+I2', 'I1+I5', 'S1+I6', 'I2+I3', 'V1+I2',
] as const;
export type Couple = (typeof COUPLES)[number];

const MOT_NEUF: Readonly<Record<AxeDuComposant, string>> = { style: 'Tonal', palette: 'Destructive', taille: 'Compact', etat: 'Idle' };
const STYLE_DE_L_ECART = 'Label/Caption';

interface Profil {
  readonly nom: 'P0' | 'p18';
  readonly f5: ComposantDeBase;
  readonly f6: ComposantDeBase;
  readonly axesDuProfil: readonly AxeDeVariants[];
}

function profils(graine: number): Profil[] {
  const p0 = composantP0(graine);
  const p18 = composantDuProfil(profilParId('p18'), graine);
  return [
    { nom: 'P0', f5: p0, f6: avecLesCouchesF6(p0), axesDuProfil: AXES_DE_P0 },
    { nom: 'p18', f5: p18, f6: avecLesCouchesF6(p18), axesDuProfil: axesDuProfil(profilParId('p18')) },
  ];
}

const axeDuRole = (base: ComposantDeBase, role: AxeDuComposant) => {
  const axe = base.carte.axes.find((entree) => entree.segment === role);
  if (!axe) throw new Error(`${base.carte.jeu} n'a pas d'axe de rôle ${role}`);
  return axe;
};

interface SpecDeCouple {
  readonly couple: Couple;
  readonly profil: Profil;
  readonly description: string;
  readonly base: ComposantDeBase;
  readonly famille: 'F5' | 'F6' | 'F5+F6';
  readonly degrader: (degradation: Degradation) => void;
  readonly attendus: (degradation: Degradation) => ConstatAttendu[];
  readonly verdict?: 'attendu' | 'mesure';
  readonly question?: string;
  readonly hypothese?: string;
}

function casDeCouple(spec: SpecDeCouple): CasMixte {
  let memoire: readonly ConstatAttendu[] | undefined;
  const calculer = (): readonly ConstatAttendu[] => {
    const degradation = new Degradation(spec.base);
    spec.degrader(degradation);
    return spec.attendus(degradation);
  };
  const controles: ControleDeStress[] = spec.famille === 'F5' ? ['nommage', 'oublis'] : spec.famille === 'F6' ? ['typographie'] : ['nommage', 'oublis', 'typographie'];
  return {
    id: `${spec.couple}-${spec.profil.nom}`, famille: spec.famille, operateur: spec.couple, verdict: spec.verdict ?? 'attendu',
    ...(spec.question ? { question: spec.question } : {}),
    get attendus() { return (memoire ??= calculer()); },
    ...(spec.hypothese ? { hypothese: spec.hypothese } : {}),
    controles,
    entree: {
      description: `${spec.couple} sur ${spec.profil.nom} : ${spec.description}`, zones: [],
      materialiser: () => { const degradation = new Degradation(spec.base); spec.degrader(degradation); return degradation.materialiser(); },
    },
  };
}

/** L'oracle de F5 : le modèle de référence appliqué au composant dégradé. */
const modele = (base: ComposantDeBase) => (d: Degradation): ConstatAttendu[] => attendusDuModele(d.composant, { roles: rolesDeLaBase(base) });

// ---------------------------------------------------------------------------------------------------------------------------
// Couples de F5

/**
 * p18 (J3, `Kind`) a un axe de style dont les valeurs sont des termes de palette. Q-F5-2 lit un token à la position de l'axe tant que
 * l'axe porte sa valeur ; une fois la valeur renommée, le segment qui reste n'est plus une valeur de l'axe, et la lecture le prend pour
 * une palette. Aucune règle écrite ne départage ce cas : il reste en attente.
 */
const valeurDePaletteRenommee = (profil: Profil): { verdict?: 'mesure'; question?: string } => (profil.nom === 'p18' ? { verdict: 'mesure', question: 'Q-F5-2' } : {});

function couplesDeValeurs(profil: Profil): CasMixte[] {
  const { f5 } = profil;
  const style = axeDuRole(f5, 'style');
  const etat = axeDuRole(f5, 'etat');
  const taille = axeDuRole(f5, 'taille');
  const autreDeStyle = axeDuRole(f5, profil.nom === 'P0' ? 'palette' : 'style');
  const valeurRenommee = style.valeurs[1];
  const base = { profil, base: f5, famille: 'F5' as const };

  const renommer = (d: Degradation, axe: { propriete: string }, valeur: string, role: AxeDuComposant): void => d.renommerLaValeur(axe.propriete, valeur, MOT_NEUF[role]);

  return [
    casDeCouple({
      ...base, couple: 'V1+M1', ...valeurDePaletteRenommee(profil), description: `${style.propriete} : ${valeurRenommee} devient ${MOT_NEUF.style} et le premier variant qui la porte est retiré`,
      degrader: (d) => {
        renommer(d, style, valeurRenommee, 'style');
        d.retirer(d.releve.variants, d.variantsOu({ [style.propriete]: MOT_NEUF.style })[0]);
      },
      attendus: modele(f5),
    }),
    casDeCouple({
      ...base, couple: 'V1+O1', ...valeurDePaletteRenommee(profil), description: `${style.propriete} : ${valeurRenommee} devient ${MOT_NEUF.style}, et un token nomme l'état selected, que nul variant ne porte`,
      degrader: (d) => {
        renommer(d, style, valeurRenommee, 'style');
        const modeleDeToken = d.jetons({ nature: 'couleur', role: 'background', valeurs: d.carte.variants[0].valeurs })[0];
        const segments = modeleDeToken.nom.split('/');
        segments[d.rangDuSegment('color', 'etat')] = 'selected';
        d.cloner(modeleDeToken, segments.join('/'));
      },
      attendus: modele(f5),
    }),
    casDeCouple({
      ...base, couple: 'V1+V1', hypothese: 'H5', ...valeurDePaletteRenommee(profil),
      description: `${autreDeStyle.propriete} : ${autreDeStyle.valeurs[0]} devient ${MOT_NEUF[autreDeStyle.segment!]}, et ${taille.propriete} : ${taille.valeurs[0]} devient ${MOT_NEUF.taille}`,
      degrader: (d) => { renommer(d, autreDeStyle, autreDeStyle.valeurs[0], autreDeStyle.segment!); renommer(d, taille, taille.valeurs[0], 'taille'); },
      attendus: modele(f5),
    }),
    casDeCouple({
      ...base, couple: 'V3+V4', hypothese: 'H6',
      description: `${etat.propriete} : le token de hover s'écrit hovered et le variant s'écrit Hover`,
      degrader: (d) => { d.reecrireLeSegment(etat.propriete, 'hover', () => 'hovered'); d.renommerLaValeur(etat.propriete, 'hover', 'Hover'); },
      attendus: modele(f5),
    }),
    casDeCouple({
      ...base, couple: 'M1+O5', hypothese: 'H5',
      description: `${taille.propriete} : tous les tokens de ${taille.valeurs.at(-1)} sont supprimés et le premier variant qui la porte est retiré`,
      degrader: (d) => {
        const valeur = taille.valeurs.at(-1)!;
        for (const { variable } of d.jetonsDe(taille.propriete, valeur)) { d.delier(variable.cle); d.retirer(d.catalogue.variables, variable); }
        d.retirer(d.releve.variants, d.variantsOu({ [taille.propriete]: valeur })[0]);
      },
      attendus: modele(f5),
    }),
    casDeCouple({
      ...base, couple: 'O2+M1',
      description: 'le token border du premier variant n\'est lié par aucun layer, et ce variant est retiré',
      degrader: (d) => {
        const premier = d.releve.variants[0];
        d.delier(d.jetons({ nature: 'couleur', role: 'border', valeurs: premier.valeurs })[0].cle);
        d.retirer(d.releve.variants, premier);
      },
      attendus: modele(f5),
    }),
  ];
}

/** A3 et A4 fabriquent leur composant. */
function couplesDAxes(profil: Profil, graine: number): CasMixte[] {
  const parRole = (role: AxeDuComposant) => profil.axesDuProfil.find((axe) => axe.segment === role);
  const second: AxeDeVariants = { nom: 'Appearance', valeurs: ['subtle', 'strong'], segment: null };
  const baseA3 = composantDeBase('Button', [...profil.axesDuProfil, second], graine);

  const styleDeA4 = profil.nom === 'P0'
    ? { nom: 'Variant', valeurs: ['default', 'primary', 'danger'], segment: 'style' as const }
    : parRole('style')!;
  const baseA4 = composantDeBase('Button', profil.nom === 'P0' ? [styleDeA4, ...profil.axesDuProfil.filter((axe) => axe.segment === 'taille' || axe.segment === 'etat')] : profil.axesDuProfil, graine);

  return [
    casDeCouple({
      couple: 'A3+V1', profil, base: baseA3, famille: 'F5', hypothese: 'H4',
      description: `le second axe de rôle style, Appearance : ${second.valeurs[0]} devient ${MOT_NEUF.style}`,
      degrader: (d) => d.renommerLaValeur('Appearance', second.valeurs[0], MOT_NEUF.style),
      // Deux axes de style : le constat à faire de Q-F5-3, et le renommage de la valeur du second axe n'est jamais une question.
      attendus: (d) => [...modele(baseA3)(d), c63DeuxAxesDeStyle(d.composant.releve.jeu.cle)],
    }),
    casDeCouple({
      couple: 'A4+V1', profil, base: baseA4, famille: 'F5', verdict: 'mesure', question: 'Q-F5-2', hypothese: 'H2',
      description: `l'axe ${styleDeA4.nom} (${styleDeA4.valeurs.join(', ')}), dont les valeurs sont des termes de palette : danger devient ${MOT_NEUF.style}`,
      degrader: (d) => d.renommerLaValeur(styleDeA4.nom, 'danger', MOT_NEUF.style),
      attendus: modele(baseA4),
    }),
  ];
}

// ---------------------------------------------------------------------------------------------------------------------------
// Couples de F6

function couplesDeTypographie(profil: Profil): CasMixte[] {
  const { f6 } = profil;
  const variants = f6.releve.variants;
  const A = variants[0];
  const B = variants[Math.floor(variants.length / 2)];
  const nomsDe = (d: Degradation, rang: number): string => d.releve.variants[rang].nom;
  const taille = axeDuRole(f6, 'taille');
  const base = { profil, base: f6, famille: 'F6' as const };
  const icone = (d: Degradation) => layerDe(d.releve.variants[0], 'Icon');
  const label = (d: Degradation, rang: number) => layerDe(d.releve.variants[rang], 'Label');
  const rangB = Math.floor(variants.length / 2);

  return [
    casDeCouple({
      ...base, couple: 'S2+S1', hypothese: 'H13',
      description: `le texte de ${A.nom} porte ${STYLE_DE_L_ECART} (S2) et celui de ${B.nom} n'a ni style ni variable (S1)`,
      degrader: (d) => { d.fixer(label(d, 0).texte!, 'style', STYLE_DE_L_ECART); d.fixer(label(d, rangB).texte!, 'style', null); },
      attendus: (d) => [a64('Label', 'style-different', [nomsDe(d, 0)], STYLE_DE_L_ECART), a64('Label', 'sans-style-ni-variables', [nomsDe(d, rangB)])],
    }),
    casDeCouple({
      ...base, couple: 'S3+S3',
      description: `fontSize est lié à typography dans tous les variants sauf ${A.nom}, où il est lié à primitives : le texte porte une liaison, donc il n'est pas « sans liaison »`,
      degrader: (d) => {
        d.releve.variants.forEach((variant, rang) => {
          const texte = layerDe(variant, 'Label');
          lierLeTexte(d, texte, 'fontSize', variableParNom(d, rang === 0 ? 'dimension/none' : 'label/md/font-size'));
        });
      },
      attendus: (d) => [a65('Label', 'mauvaise-collection', [nomsDe(d, 0)], 'fontSize', 'dimension/none')],
    }),
    casDeCouple({
      ...base, couple: 'S2+S2', hypothese: 'H13',
      description: `${taille.valeurs[0]} et ${taille.valeurs[1]} partagent le style de ${taille.valeurs[0]} (S2 de taille), et ${A.nom} porte ${STYLE_DE_L_ECART} (S2 d'écart)`,
      degrader: (d) => {
        const partage = styleDeTexteDeLaTaille(segmentDeLaValeur('taille', taille.valeurs[0]));
        for (const variant of d.releve.variants) if (variant.valeurs[taille.propriete] === taille.valeurs[1]) d.fixer(layerDe(variant, 'Label').texte!, 'style', partage);
        d.fixer(label(d, 0).texte!, 'style', STYLE_DE_L_ECART);
      },
      attendus: (d) => [a64('Label', 'style-different', [nomsDe(d, 0)], STYLE_DE_L_ECART)],
    }),
    casDeCouple({
      ...base, couple: 'I1+I2',
      description: `l'icône de ${A.nom} est une instance du composant Chevron (I1) et sa propriété Size n'est pas celle du variant (I2)`,
      degrader: (d) => { d.fixer(icone(d).instanceDe!, 'nom', 'Chevron'); d.fixer(icone(d).instanceDe!.valeurs!, 'Size', autreTailleDuPremierVariant(d)); },
      attendus: (d) => [a66('Icon', 'autre-composant', [nomsDe(d, 0)]), a66('Icon', 'taille-differente', [nomsDe(d, 0)], { detail: autreTailleDuPremierVariant(d) })],
    }),
    casDeCouple({
      ...base, couple: 'I1+I5',
      description: `l'icône de ${A.nom} est une instance du composant Chevron (I1) que pilote Missing#9:9, absente du jeu (I5)`,
      degrader: (d) => { d.fixer(icone(d).instanceDe!, 'nom', 'Chevron'); d.fixer(icone(d).instanceDe!, 'pilotee', 'Missing#9:9'); },
      attendus: (d) => [a66('Icon', 'autre-composant', [nomsDe(d, 0)]), a67('Icon', 'propriete-absente', [nomsDe(d, 0)], 'Missing#9:9')],
    }),
    casDeCouple({
      ...base, couple: 'S1+I6', hypothese: 'H17',
      description: `le texte de ${A.nom} s'appelle Silicone et n'a ni style ni variable : un texte n'est jamais une icône`,
      degrader: (d) => { d.fixer(label(d, 0).texte!, 'style', null); d.fixer(label(d, 0), 'nom', 'Silicone'); },
      attendus: (d) => [a64('Silicone', 'sans-style-ni-variables', [nomsDe(d, 0)])],
    }),
    casDeCouple({
      ...base, couple: 'I2+I3',
      description: `la propriété Size de l'icône de ${A.nom} n'est pas celle du variant (I2) et sa couleur est portée par un trait lié à un premier plan du composant (I3)`,
      degrader: (d) => {
        const layer = icone(d);
        d.fixer(layer.instanceDe!.valeurs!, 'Size', autreTailleDuPremierVariant(d));
        delierLeChamp(d, layer, 'fills');
        d.retirer(layer.peintures, layer.peintures.find((peinture) => peinture.champ === 'fills')!);
        d.inserer(layer.peintures, { champ: 'strokes', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: { r: 0.2, g: 0.4, b: 0.8, a: 1 } });
        const premierPlan = d.jetons({ nature: 'couleur', role: 'foreground', valeurs: d.releve.variants[0].valeurs })[0];
        d.inserer(layer.liaisons, liaisonVers(layer.id, 'strokes', variableParNom(d, premierPlan.nom), { indice: 0 }));
      },
      attendus: (d) => [a66('Icon', 'taille-differente', [nomsDe(d, 0)], { detail: autreTailleDuPremierVariant(d) })],
    }),
  ];
}

/** V1 et I2 sur le même composant : l'oracle de F5 se lit sur le composant à couches de F6, celui de F6 s'y ajoute. */
function coupleMixte(profil: Profil): CasMixte {
  const { f6 } = profil;
  const style = axeDuRole(f6, 'style');
  const valeur = style.valeurs[1];
  return casDeCouple({
    profil, base: f6, famille: 'F5+F6', couple: 'V1+I2', ...valeurDePaletteRenommee(profil),
    description: `${style.propriete} : ${valeur} devient ${MOT_NEUF.style} (V1), et la propriété Size de l'icône du premier variant n'est pas celle du variant (I2)`,
    degrader: (d) => {
      d.renommerLaValeur(style.propriete, valeur, MOT_NEUF.style);
      d.fixer(layerDe(d.releve.variants[0], 'Icon').instanceDe!.valeurs!, 'Size', autreTailleDuPremierVariant(d));
    },
    attendus: (d) => [...attendusDuModele(d.composant, { roles: rolesDeLaBase(f6) }), a66('Icon', 'taille-differente', [d.releve.variants[0].nom], { detail: autreTailleDuPremierVariant(d) })],
  });
}

/** Les 32 interactions : 16 couples sur P0 puis sur p18. */
export function interactions(graine: number = GRAINE_PAR_DEFAUT): CasDeVariants[] {
  const cas = profils(graine).flatMap((profil) => [
    ...couplesDeValeurs(profil), ...couplesDAxes(profil, graine), ...couplesDeTypographie(profil), coupleMixte(profil),
  ]);
  return COUPLES.flatMap((couple) => cas.filter((entree) => entree.operateur === couple));
}
