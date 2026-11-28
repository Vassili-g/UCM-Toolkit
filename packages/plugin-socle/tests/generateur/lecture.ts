/**
 * La lecture du contrat : ce que le kit résout pour un variant (`vueExacteDuVariant`, l'unique résolveur des renvois), écrit dans la
 * langue de `rendu.ts`. Elle ne complète rien : un champ que le contrat ne publie pas reste absent du rendu lu, et c'est le comparateur
 * qui juge s'il manquait.
 *
 * Le contrat désigne un calque par un chemin de slots (`slotPath`) ; ce fichier le traduit en identité par le `figmaLayer` de chaque slot
 * et son rang parmi les frères de même nom de la vue. Une couleur se lit par les placements de la vue et la feuille du variant, un texte
 * dans l'échantillon, un style typographique par `textStyles`, une icône par `icons`, un effet par `effectStyles`.
 *
 * Borne : ce lecteur lit les contrats de la 14.0 (sans pièce). Les renvois d'une occurrence se lisent avec le sous-lot 1.10.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- le contrat se lit ici sans type : c'est le comparateur qui le juge */
import { vueExacteDuVariant } from '@ucm-kit/core/lecteurs';

import { elaguer, identiteDe, nomAvecRang, surChaqueCote, type Boite, type Contour, type Coin, type Cote, type Flux, type RenduDeCalque, type RenduNormalise, type Typographie } from './rendu';

const COINS = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const;
const AXES_DE_TAILLE = new Set(['stretch', 'fit-content']);

/** Les `nodeId` des variants que le contrat publie, dans son ordre. */
export function variantsDuContrat(contrat: any): string[] {
  return (contrat.variants ?? []).map((v: any) => v.nodeId);
}

const cleDeChemin = (chemin: readonly string[]) => JSON.stringify(chemin);
const memeChemin = (a: readonly string[], b: readonly string[]) => cleDeChemin(a) === cleDeChemin(b);

/** Le rendu que le contrat donne d'un variant. */
export function renduLu(contrat: any, variant: string): RenduNormalise {
  const donnee = (contrat.variants ?? []).find((v: any) => v.nodeId === variant);
  if (!donnee) throw new Error(`variant absent du contrat : ${variant}`);
  const vue: any = vueExacteDuVariant(contrat, donnee);
  if (!vue?.structure) throw new Error(`le kit ne résout aucune vue pour ${variant}`);
  const proprietes = contrat.props ?? {};
  const echantillon = typeof donnee.sample === 'string' ? contrat.samples?.[donnee.sample] : donnee.sample;

  const parChemin = <T extends { slotPath: string[] }>(liste: T[] | undefined, chemin: string[]) => (liste ?? []).filter((x) => memeChemin(x.slotPath, chemin));
  const placees = (champ: 'fills' | 'strokes', chemin: string[]): string[] =>
    Object.entries(vue.paintPlacements?.[champ] ?? {}).filter(([, chemins]) => (chemins as string[][]).some((c) => memeChemin(c, chemin))).map(([cle]) => cle);

  const couleursDe = (chemin: string[]): string[] => [...new Set(placees('fills', chemin).map((cle) => donnee.tokens?.[cle]).filter((t): t is string => typeof t === 'string'))].sort();
  const contoursDe = (chemin: string[]): Contour[] =>
    placees('strokes', chemin).map((cle) => donnee.strokes?.[cle]).filter(Boolean).map((s: any) => ({
      couleur: s.color,
      largeur: typeof s.width === 'string' ? s.width : s.width ? elaguer(s.width) : undefined,
      alignement: s.align,
    }));
  const typographieDe = (chemin: string[]): Typographie | undefined => {
    const emploi = parChemin<any>(vue.typography, chemin)[0];
    const style = emploi && contrat.textStyles?.[emploi.style];
    return style ? { style: style.figmaName, jetons: style.tokens } : undefined;
  };
  const effetsDe = (chemin: string[]): string[] => parChemin<any>(vue.effects, chemin).map((e) => contrat.effectStyles?.[e.style]?.figmaName).filter((x): x is string => typeof x === 'string');
  const iconeDe = (chemin: string[]): string | undefined => Object.values<any>(vue.icons ?? {}).find((i) => memeChemin(i.slotPath, chemin))?.figmaName;
  const texteDe = (chemin: string[]): string | undefined => parChemin<any>(echantillon?.text, chemin)[0]?.value;

  const taille = (taille: unknown): Pick<Boite, 'largeur' | 'hauteur'> => {
    if (typeof taille === 'string') return { largeur: taille, hauteur: taille };
    const { width, height } = (taille ?? {}) as { width?: string; height?: string };
    return { largeur: width, hauteur: height };
  };
  const boiteDe = (slot: any, estRacine: boolean): Boite => {
    // La racine dit sa taille dans `sizing` : un mot de dimensionnement n'est pas un jeton.
    const racine = estRacine ? Object.fromEntries(Object.entries({ largeur: slot.sizing?.width, hauteur: slot.sizing?.height }).filter(([, v]) => typeof v === 'string' && !AXES_DE_TAILLE.has(v))) : {};
    return {
      ...(estRacine ? racine : taille(slot.size)),
      bornes: slot.bounds,
      rotation: typeof slot.rotation === 'string' ? Math.round(Number.parseFloat(slot.rotation) * 100) / 100 : undefined,
      opacite: slot.opacity,
    };
  };
  const fluxDe = (slot: any): Flux => ({
    disposition: slot.layout,
    gap: slot.gap,
    padding: { ...surChaqueCote<Cote>(slot.padding?.y, ['top', 'bottom']), ...surChaqueCote<Cote>(slot.padding?.x, ['left', 'right']) },
    rayon: surChaqueCote<Coin>(slot.radius, COINS),
    justification: slot.justifyContent === 'flex-start' ? undefined : slot.justifyContent,
    alignement: slot.alignItems === 'flex-start' ? undefined : slot.alignItems,
  });

  const calques: Record<string, RenduDeCalque> = {};
  const adresses: Record<string, string[]> = {};
  const visiter = (slot: any, slotPath: string[], chemin: string[], estRacine: boolean) => {
    adresses[identiteDe(chemin)] = slotPath;
    const pilote = typeof slot.visibilityProp === 'string';
    if (!estRacine && pilote && proprietes[slot.visibilityProp]?.default === false) {
      calques[identiteDe(chemin)] = { visible: false };
      return;
    }
    const compose = typeof slot.composes === 'string' ? slot.composes : undefined;
    calques[identiteDe(chemin)] = elaguer<RenduDeCalque>({
      visible: true,
      couleurs: couleursDe(slotPath),
      contours: contoursDe(slotPath),
      texte: texteDe(slotPath),
      compose,
      icone: iconeDe(slotPath),
      boite: boiteDe(slot, estRacine),
      flux: compose ? undefined : fluxDe(slot),
      typographie: typographieDe(slotPath),
      effets: effetsDe(slotPath),
    }) as RenduDeCalque;
    const vus = new Map<string, number>();
    for (const enfant of slot.children ?? []) visiter(enfant, [...slotPath, enfant.slot], [...chemin, nomAvecRang(enfant.figmaLayer ?? enfant.slot, vus)], false);
  };
  visiter(vue.structure, [], [], true);
  return { variant, calques, cheminDuContrat: `variants[${(contrat.variants ?? []).indexOf(donnee)}]`, adresses };
}
