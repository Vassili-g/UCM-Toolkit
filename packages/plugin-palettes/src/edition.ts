/**
 * Les modifications qu'une saisie du designer fait à une palette, sans rien
 * ranger : le rangement suit la fin du geste (D-D).
 */
import {
  BORNES_DES_CRANS_LIBRES,
  BORNES_DES_REGLAGES,
  DERIVE_MAXIMALE,
  PROFILS,
  aUnReglageDuPorteur,
  aUneIntensite,
  ajusterPartsGrises,
  arrondir,
  boutsDe,
  cleDuPorteur,
  departDe,
  ecrireHexa,
  lireHexa,
  partsDesProfils,
  prereglageTailwind,
  profilAutomatique,
  profilPorteur,
  referenceReglee,
  rgb8VersOklch,
  type Derive,
  type DeriveRangee,
  type Palette,
  type ParProfil,
  type Profil,
  type Recette,
  type Reglages,
  type Rgb8,
} from 'ucm-couleur';

/** Un hexa de six chiffres, avec ou sans dièse. */
export const MOTIF_HEXA = /^#?[0-9a-f]{6}$/i;

/**
 * La palette avec la référence `couleur`, sans `originale` : une dérive
 * d'origine `tailwind` suit le préréglage recalculé sur elle ([ENT-01]), une
 * dérive `libre` ou `constante` reste telle quelle.
 */
function poserReference(recette: Recette, palette: Palette, couleur: Rgb8): Palette {
  const prereglage = prereglageTailwind(rgb8VersOklch(couleur), boutsDe(recette), recette.derives, recette.seuils.chromaGrise);
  const suivre = (derive: DeriveRangee): DeriveRangee =>
    derive.origine === 'tailwind' ? { ...prereglage, origine: 'tailwind' } : derive;
  const { originale: _originale, ...sansOriginale } = palette;
  return {
    ...sansOriginale,
    reference: ecrireHexa(couleur),
    derive: { ...palette.derive, soft: suivre(palette.derive.soft), vivid: suivre(palette.derive.vivid) },
  };
}

/**
 * La palette avec une nouvelle référence ([ENT-01]) : le designer repart
 * d'une couleur neuve. Elle retire `originale` et tous les réglages de la
 * carte (Z10.5), et les parts `grise` se posent ou se retirent selon elle
 * ([ENT-09]). Rend `null` pour un hexa qui ne se lit pas.
 */
export function changerReference(recette: Recette, palette: Palette, saisie: string): Palette | null {
  if (!MOTIF_HEXA.test(saisie.trim())) return null;
  const couleur = lireHexa(saisie.trim().startsWith('#') ? saisie.trim() : `#${saisie.trim()}`);
  if (!couleur) return null;
  const { reglages: _reglages, ...sansReglages } = poserReference(recette, palette, couleur);
  return ajusterPartsGrises(recette, sansReglages);
}

/** La couleur de référence d'avant le premier réglage : `originale`, ou la référence d'une palette jamais réglée. */
export function originaleDe(palette: Palette): string {
  return palette.originale ?? palette.reference;
}

/** Les valeurs réglables d'une palette : teinte et clarté par profil, et la part d'une palette à une intensité. */
export interface ValeursReglees {
  readonly teinte: ParProfil;
  readonly clarte: ParProfil;
  readonly part?: number;
}

/** Les valeurs réglées d'une palette, zéro compris quand rien n'est rangé. */
export function valeursDe(palette: Palette): ValeursReglees {
  const { teinte = {}, clarte = {}, part } = palette.reglages ?? {};
  return part === undefined ? { teinte, clarte } : { teinte, clarte, part };
}

/** Une valeur par profil sans zéro ; `null` quand il n'en reste aucune. */
function sansZero(valeurs: ParProfil): ParProfil | null {
  const gardees = PROFILS.filter((profil) => valeurs[profil] !== undefined && valeurs[profil] !== 0);
  return gardees.length === 0 ? null : Object.fromEntries(gardees.map((profil) => [profil, valeurs[profil]]));
}

/**
 * Pose des valeurs réglées sur une palette (Z10.5, « Les gestes ») : zéros
 * retirés, porteur figé à deux intensités sans palette de base, `originale`
 * et `depart` posés au premier réglage du porteur, la référence tirée du
 * départ par `referenceReglee`, puis les parts grises recalculées.
 * `porteur` remplace le porteur d'avant, quand le geste en change ; `base`
 * est celle de la palette rendue.
 */
function appliquerLesReglages(
  recette: Recette,
  avant: Palette,
  valeurs: ValeursReglees,
  options: { porteur?: Profil; base?: Profil } = {},
): Palette {
  const porteur = options.porteur ?? cleDuPorteur(recette, avant);
  // Une base passée à `undefined` la retire : seule une clé absente garde celle d'avant.
  const base = 'base' in options ? options.base : avant.base;
  const une = aUneIntensite(avant);
  const teinte = sansZero(valeurs.teinte);
  const clarte = sansZero(valeurs.clarte);
  const part = une ? valeurs.part : undefined;
  const reglages: { -readonly [K in keyof Reglages]: Reglages[K] } = {};
  if (teinte) reglages.teinte = teinte;
  if (clarte) reglages.clarte = clarte;
  if (part !== undefined) reglages.part = part;
  const aDesReglages = Object.keys(reglages).length > 0;
  if (aDesReglages && !une && !base) reglages.porteur = porteur;

  const duPorteur = part !== undefined || teinte?.[porteur] !== undefined || clarte?.[porteur] !== undefined;
  const avaitDuPorteur = aUnReglageDuPorteur(recette, avant);
  let originale = avant.originale;
  let depart = avant.reglages?.depart;
  if (duPorteur && !avaitDuPorteur) {
    // Une référence ajustée avant la version 5 garde ses octets comme départ, et son originale.
    if (!originale) originale = avant.reference;
    else if (originale.toUpperCase() !== avant.reference.toUpperCase()) depart = avant.reference;
  }
  const couleurDeDepart = lireHexa(avaitDuPorteur || duPorteur ? (depart ?? originale ?? avant.reference) : avant.reference) ?? departDe(recette, avant);
  let reference: string;
  if (duPorteur) {
    reference = ecrireHexa(referenceReglee(couleurDeDepart, teinte?.[porteur] ?? 0, clarte?.[porteur] ?? 0, part, recette.gamut));
    if (depart) reglages.depart = depart.toUpperCase();
  } else {
    reference = ecrireHexa(couleurDeDepart);
    if (originale?.toUpperCase() === reference) originale = undefined;
  }

  const { reglages: _reglages, originale: _originale, base: _base, ...reste } = avant;
  return ajusterPartsGrises(recette, {
    ...reste,
    reference,
    ...(base ? { base } : {}),
    ...(originale ? { originale: originale.toUpperCase() } : {}),
    ...(aDesReglages ? { reglages } : {}),
  });
}

/** Ce qu'un geste de la carte vise : un profil, ou les deux ensemble. Une palette à une intensité se règle sous `vivid`. */
export type CibleDuReglage = Profil | 'deux';

/**
 * Pose `valeur` sur la cible : un profil la prend, bornée ; « Les deux »
 * déplacent les deux profils du même écart, depuis la valeur du porteur, et
 * s'arrêtent quand l'un atteint sa borne.
 */
function poserSurLaCible(valeurs: ParProfil, porteur: Profil, cible: CibleDuReglage, valeur: number, bas: number, haut: number, decimales: number): ParProfil {
  const borner = (x: number): number => arrondir(Math.min(haut, Math.max(bas, x)), decimales) + 0;
  if (cible !== 'deux') return { ...valeurs, [cible]: borner(valeur) };
  const [soft, vivid] = [valeurs.soft ?? 0, valeurs.vivid ?? 0];
  const voulu = valeur - (valeurs[porteur] ?? 0);
  const ecart = Math.min(haut - Math.max(soft, vivid), Math.max(bas - Math.min(soft, vivid), voulu));
  return { soft: borner(soft + ecart), vivid: borner(vivid + ecart) };
}

/** La teinte d'un profil, ou des deux, en degrés depuis le départ, bornée à ±30° (Z10.5). */
export function reglerTeinte(recette: Recette, palette: Palette, cible: CibleDuReglage, valeur: number): Palette {
  const valeurs = valeursDe(palette);
  const { teinte } = BORNES_DES_REGLAGES;
  const suivantes = poserSurLaCible(valeurs.teinte, cleDuPorteur(recette, palette), aUneIntensite(palette) ? 'vivid' : cible, valeur, -teinte, teinte, 2);
  return appliquerLesReglages(recette, palette, { ...valeurs, teinte: suivantes });
}

/** Le décalage de clarté d'un profil, ou des deux, borné à [−0,05, +0,02] (Z10.5) ; celui du porteur déplace la référence. */
export function reglerClarte(recette: Recette, palette: Palette, cible: CibleDuReglage, valeur: number): Palette {
  const valeurs = valeursDe(palette);
  const { clarte } = BORNES_DES_REGLAGES;
  const suivantes = poserSurLaCible(valeurs.clarte, cleDuPorteur(recette, palette), aUneIntensite(palette) ? 'vivid' : cible, valeur, clarte.bas, clarte.haut, 3);
  return appliquerLesReglages(recette, palette, { ...valeurs, clarte: suivantes });
}

/**
 * La saturation (Z10.5). À une intensité, la part de la référence, qui la
 * récrit. À deux, la part d'un profil, bornée pour que Soft ne dépasse pas
 * Vivid, ou les deux parts du même écart ; elles passent au designer
 * ([ENT-09]) et ne déplacent pas la référence.
 */
export function reglerSaturation(recette: Recette, palette: Palette, cible: CibleDuReglage, valeur: number): Palette {
  const bornee = arrondir(Math.min(1, Math.max(0, valeur)), 3) + 0;
  if (aUneIntensite(palette)) return appliquerLesReglages(recette, palette, { ...valeursDe(palette), part: bornee });
  const parts = partsDesProfils(recette, palette);
  const porteur = profilPorteur(recette, palette);
  if (cible === 'deux') {
    const ecart = Math.min(1 - parts.vivid, Math.max(-parts.soft, bornee - parts[porteur]));
    return { ...palette, parts: { soft: arrondir(parts.soft + ecart, 3) + 0, vivid: arrondir(parts.vivid + ecart, 3) + 0, origine: 'designer' } };
  }
  const limitee = cible === 'soft' ? Math.min(bornee, parts.vivid) : Math.max(bornee, parts.soft);
  return { ...palette, parts: { ...parts, [cible]: limitee, origine: 'designer' } };
}

/**
 * « Rétablir » la saturation (Z10.6) : à une intensité, la référence reprend
 * celle de son départ ; à deux, les parts reprennent celles de la recette.
 */
export function retablirLaSaturation(recette: Recette, palette: Palette): Palette {
  if (!aUneIntensite(palette)) return reprendreLesParts(recette, palette);
  const { teinte, clarte } = valeursDe(palette);
  return appliquerLesReglages(recette, palette, { teinte, clarte });
}

/**
 * « Revenir à l'originale » (Z10.5) : l'originale redevient la référence, sa
 * dérive Tailwind recalculée ; `originale`, `depart` et les réglages du
 * porteur se retirent, ceux de l'autre profil restent, mesurés depuis le
 * même départ.
 */
export function revenirALOriginale(recette: Recette, palette: Palette): Palette {
  const originale = palette.originale ? lireHexa(palette.originale) : null;
  if (!originale) return palette;
  const porteur = cleDuPorteur(recette, palette);
  const { teinte, clarte } = valeursDe(palette);
  const sansLePorteur = (valeurs: ParProfil): ParProfil => ({ ...valeurs, [porteur]: undefined });
  const { reglages: _reglages, ...sansReglages } = poserReference(recette, palette, originale);
  return appliquerLesReglages(recette, sansReglages, { teinte: sansLePorteur(teinte), clarte: sansLePorteur(clarte) }, { porteur });
}

/** La palette avec un nouveau nom ; un nom vide retire la clé, et la palette s'affiche sous son hexa. */
export function renommer(palette: Palette, nom: string): Palette {
  const { nom: _ancien, ...sansNom } = palette;
  return nom.trim() === '' ? sansNom : { ...sansNom, nom };
}

/**
 * Un identifiant de palette neuf (D-K) : `p-` et huit chiffres hexadécimaux
 * tirés par `tirer`, qui rend un entier de 32 bits. Le hasard vient de
 * l'interface ; le moteur reste sans hasard. Un tirage déjà pris se refait.
 */
export function nouvelIdentifiant(recette: Recette, tirer: () => number): string {
  const pris = new Set(recette.palettes.map((palette) => palette.id));
  for (;;) {
    const id = `p-${(tirer() >>> 0).toString(16).padStart(8, '0')}`;
    if (!pris.has(id)) return id;
  }
}

/**
 * Une palette neuve de référence `saisie`, au préréglage Tailwind, profils
 * liés, à une intensité ou à deux ([ENT-14]). Rend `null` pour un hexa qui
 * ne se lit pas.
 */
export function nouvellePalette(recette: Recette, id: string, saisie: string, intensites: 1 | 2): Palette | null {
  const nulle: DeriveRangee = { clair: 0, sombre: 0, origine: 'tailwind' };
  const vierge: Palette = { id, reference: '#000000', derive: { lien: true, soft: nulle, vivid: nulle } };
  return changerReference(recette, intensites === 1 ? { ...vierge, intensites: 1 } : vierge, saisie);
}

/**
 * La palette à une ou deux intensités ([ENT-14]). Passer à une retire la
 * palette de base et les parts propres, et garde la dérive de l'intensité qui
 * portait la référence, liée ; passer à deux rend Soft et Vivid, parts grises
 * posées s'il le faut. Une palette libre n'a pas ce choix : elle reste telle
 * quelle.
 */
export function choisirLesIntensites(recette: Recette, palette: Palette, nombre: 1 | 2): Palette {
  if (palette.crans !== undefined || aUneIntensite(palette) === (nombre === 1)) return palette;
  return nombre === 2 ? versDeuxIntensites(recette, palette) : versUneIntensite(recette, palette);
}

/**
 * Deux intensités depuis une : `part` se retire et la référence se récrit
 * sans elle, depuis son départ ; le porteur se classe sur la nouvelle
 * référence, et les réglages de la rampe unique se rangent sous lui (Z10.5).
 */
function versDeuxIntensites(recette: Recette, palette: Palette): Palette {
  const { teinte, clarte } = valeursDe(palette);
  // La référence se récrit sans `part`, encore à une intensité.
  const sansPart = appliquerLesReglages(recette, palette, { teinte, clarte }, { porteur: 'vivid' });
  // Le porteur se classe sur la nouvelle référence, sans réglage qui le fige.
  const { intensites: _intensites, reglages, ...deux } = sansPart;
  const porteur = profilAutomatique(recette, deux);
  const sous = (valeurs: ParProfil): ParProfil => (valeurs.vivid === undefined ? {} : { [porteur]: valeurs.vivid });
  const valeurs = { teinte: sous(teinte), clarte: sous(clarte) };
  // Les réglages, rangés sous le porteur, gardent leur départ : la référence ne change plus.
  const avant: Palette = reglages ? { ...deux, reglages: { ...reglages, ...valeurs, porteur } } : deux;
  return appliquerLesReglages(recette, avant, valeurs, { porteur });
}

/**
 * Une intensité depuis deux : les réglages du porteur se rangent sous
 * `vivid`, ceux de l'autre et `porteur` se retirent, la dérive du porteur
 * se garde, liée ; la référence ne change pas (Z10.5).
 */
function versUneIntensite(recette: Recette, palette: Palette): Palette {
  const porteur = profilPorteur(recette, palette);
  const porteuse = palette.derive[porteur];
  const { teinte, clarte } = valeursDe(palette);
  const { base: _base, parts: _parts, ...sansProfil } = palette;
  const une: Palette = { ...sansProfil, derive: { lien: true, soft: porteuse, vivid: porteuse }, intensites: 1 };
  return appliquerLesReglages(recette, une, { teinte: { vivid: teinte[porteur] }, clarte: { vivid: clarte[porteur] } }, { porteur: 'vivid' });
}

/** La recette avec la palette ajoutée en dernier. */
export function ajouter(recette: Recette, palette: Palette): Recette {
  return { ...recette, palettes: [...recette.palettes, palette] };
}

/** Une copie de la palette, sous un autre identifiant et un autre nom, placée juste après elle. */
export function dupliquer(recette: Recette, id: string, nouvelId: string, nom: string): Recette {
  const rang = recette.palettes.findIndex((palette) => palette.id === id);
  if (rang < 0) return recette;
  const copie: Palette = { ...recette.palettes[rang], id: nouvelId, nom };
  const palettes = [...recette.palettes];
  palettes.splice(rang + 1, 0, copie);
  return { ...recette, palettes };
}

/** La palette avancée d'un rang (`1`) ou reculée (`-1`) dans l'ordre d'affichage ; rien aux bouts. */
export function deplacer(recette: Recette, id: string, sens: -1 | 1): Recette {
  const rang = recette.palettes.findIndex((palette) => palette.id === id);
  const cible = rang + sens;
  if (rang < 0 || cible < 0 || cible >= recette.palettes.length) return recette;
  const palettes = [...recette.palettes];
  [palettes[rang], palettes[cible]] = [palettes[cible], palettes[rang]];
  return { ...recette, palettes };
}

/**
 * La recette sans la palette. Son cadre reste sur la planche, et la planche le
 * signalera orphelin ([ENT-03]).
 */
export function supprimer(recette: Recette, id: string): Recette {
  return { ...recette, palettes: recette.palettes.filter((palette) => palette.id !== id) };
}

/**
 * Le préréglage Tailwind d'une palette, sur le relevé de la recette (section
 * 6.5), calculé sur son départ (Z10.5) : les gestes de la carte ne le
 * déplacent pas.
 */
export function prereglageDe(recette: Recette, palette: Palette): Derive {
  return prereglageTailwind(rgb8VersOklch(departDe(recette, palette)), boutsDe(recette), recette.derives, recette.seuils.chromaGrise);
}

/**
 * L'origine que deux angles méritent ([DER-11]) : `tailwind` s'ils valent le
 * préréglage, `constante` s'ils valent zéro, `libre` sinon. Les angles se
 * comparent arrondis au centième, comme ils se rangent ([MOT-27]).
 */
export function origineDe(recette: Recette, palette: Palette, derive: Derive): DeriveRangee['origine'] {
  const tailwind = prereglageDe(recette, palette);
  if (derive.clair === tailwind.clair && derive.sombre === tailwind.sombre) return 'tailwind';
  if (derive.clair === 0 && derive.sombre === 0) return 'constante';
  return 'libre';
}

/** Les profils qu'un réglage touche : les deux quand ils sont liés ([DER-12]). */
export function profilsTouches(palette: Palette, profil: Profil): readonly Profil[] {
  return palette.derive.lien ? PROFILS : [profil];
}

function poserDerive(recette: Recette, palette: Palette, profils: readonly Profil[], derive: Derive): Palette {
  const rangee: DeriveRangee = {
    clair: arrondir(Math.max(-DERIVE_MAXIMALE, Math.min(DERIVE_MAXIMALE, derive.clair)), 2) + 0,
    sombre: arrondir(Math.max(-DERIVE_MAXIMALE, Math.min(DERIVE_MAXIMALE, derive.sombre)), 2) + 0,
    origine: 'libre',
  };
  const avecOrigine = { ...rangee, origine: origineDe(recette, palette, rangee) };
  const suivante = { ...palette.derive };
  for (const cible of profils) suivante[cible] = avecOrigine;
  return { ...palette, derive: suivante };
}

/**
 * La palette dont un bout de la dérive prend `angle` ([DER-07], [DER-08]),
 * borné à ±90° et arrondi au centième ([MOT-27]), pour le profil réglé, ou les
 * deux quand ils sont liés.
 */
export function reglerBout(recette: Recette, palette: Palette, profil: Profil, bout: 'clair' | 'sombre', angle: number): Palette {
  const actuelle = palette.derive[profil];
  return poserDerive(recette, palette, profilsTouches(palette, profil), { ...actuelle, [bout]: angle });
}

/** La palette dont les deux dérives prennent un préréglage ([DER-11]) : Tailwind, ou 0° et 0°. */
export function appliquerPrereglage(recette: Recette, palette: Palette, profil: Profil, prereglage: 'tailwind' | 'constante'): Palette {
  const derive = prereglage === 'tailwind' ? prereglageDe(recette, palette) : { clair: 0, sombre: 0 };
  return poserDerive(recette, palette, profilsTouches(palette, profil), derive);
}

/** Délier garde les deux dérives telles quelles ; lier aligne soft sur vivid ([DER-12]). */
export function lierLesProfils(palette: Palette, lien: boolean): Palette {
  const { soft, vivid } = palette.derive;
  return { ...palette, derive: { lien, soft: lien ? vivid : soft, vivid } };
}

/** La recette où la palette d'identifiant `palette.id` est remplacée. */
export function remplacerPalette(recette: Recette, palette: Palette): Recette {
  return { ...recette, palettes: recette.palettes.map((candidate) => (candidate.id === palette.id ? palette : candidate)) };
}

/**
 * La palette dont un profil prend une part propre ([ENT-09]), rangée au
 * millième (E3). Ses parts passent au designer : l'autre profil garde la part
 * qu'il employait, et la configuration ne les touche plus.
 */
export function poserPart(recette: Recette, palette: Palette, profil: Profil, part: number): Palette {
  // Une palette à une intensité prend la part de sa référence : elle n'a pas de part propre ([ENT-14]).
  if (aUneIntensite(palette)) return palette;
  const employees = partsDesProfils(recette, palette);
  return { ...palette, parts: { ...employees, [profil]: arrondir(part, 3), origine: 'designer' } };
}

/** La palette sans parts propres : elle reprend celles de la recette, ou des parts grises si sa référence l'est. */
export function reprendreLesParts(recette: Recette, palette: Palette): Palette {
  const { parts: _retirees, ...sansParts } = palette;
  return ajusterPartsGrises(recette, sansParts);
}

/**
 * La palette avec sa palette de base ([ENT-11]) : `auto` retire le choix, Soft
 * ou Vivid force le profil porteur. Forcer un profil retire les intensités du
 * designer, pour que le profil forcé prenne celle de la référence ; les parts
 * grises restent. Un glisser d'intensité ensuite rend la main au designer
 * sans changer de profil porteur.
 */
export function choisirLaBase(recette: Recette, palette: Palette, choix: 'auto' | Profil): Palette {
  if (aUneIntensite(palette)) return palette;
  const { base: _ancienne, ...sansBase } = palette;
  if (!palette.reglages) {
    if (choix === 'auto') return sansBase;
    if (sansBase.parts?.origine !== 'designer') return { ...sansBase, base: choix };
    const { parts: _retirees, ...sansParts } = sansBase;
    return { ...sansParts, base: choix };
  }
  // Avec des réglages (Z10.5) : « Auto » fige le porteur d'avant ; un profil devient la base, et la référence suit ses réglages.
  const porteur = choix === 'auto' ? profilPorteur(recette, palette) : choix;
  const avant = choix === 'auto' || sansBase.parts?.origine !== 'designer' ? palette : (({ parts: _retirees, ...sansParts }) => sansParts)(palette);
  return appliquerLesReglages(recette, avant, valeursDe(palette), { porteur, base: choix === 'auto' ? undefined : choix });
}

/**
 * Passe une palette en palette libre (W6.5), sur la liste commune bornée à
 * treize numéros admis : le designer retire ensuite ce qu'il ne veut pas. Une
 * palette libre n'a ni base (conception W6) ni choix des intensités
 * ([ENT-14]) : retirer la base rend les parts communes à une base forcée.
 */
export function passerEnLibre(recette: Recette, palette: Palette): Palette {
  if (palette.crans !== undefined) return palette;
  // Une palette libre porte deux intensités : une palette à une intensité y passe d'abord, ses réglages repliés (Z10.5).
  if (aUneIntensite(palette)) return passerEnLibre(recette, versDeuxIntensites(recette, palette));
  const porteur = profilPorteur(recette, palette);
  if (palette.base && palette.reglages) {
    // Sans base, les réglages figent le porteur que la base désignait.
    const { base: _base, ...sansBase } = palette;
    return passerEnLibre(recette, { ...sansBase, reglages: { ...palette.reglages, porteur } });
  }
  const { base: _retiree, intensites: _intensites, ...sansBase } = palette;
  return ajusterPartsGrises(recette, { ...sansBase, crans: cransLibresParDefaut(recette) });
}

/** Les numéros qu'une palette libre reçoit en sortant du modèle : ceux de la liste commune que les bornes admettent. */
export function cransLibresParDefaut(recette: Recette): number[] {
  const { premier, dernier, pas, nombre } = BORNES_DES_CRANS_LIBRES;
  return recette.crans.filter((cran) => cran % pas === 0 && cran >= premier && cran <= dernier).slice(0, nombre[1]);
}

/**
 * Rend une palette libre au modèle du design system : elle suit de nouveau la
 * liste commune, à une intensité, le choix par défaut de la création
 * ([ENT-14]). Ses parts propres partent avec le choix des intensités.
 */
export function revenirAuModele(recette: Recette, palette: Palette): Palette {
  const { crans: _retiree, ...commune } = palette;
  return versUneIntensite(recette, commune);
}

/**
 * Ajoute ou retire un numéro d'une palette libre, dans l'ordre croissant. Un
 * geste qui sortirait des bornes, moins de quatre ou plus de treize numéros,
 * rend la palette telle quelle : l'interface désactive la puce avant.
 */
export function basculerNuance(palette: Palette, numero: number): Palette {
  if (palette.crans === undefined) return palette;
  const { nombre } = BORNES_DES_CRANS_LIBRES;
  const present = palette.crans.includes(numero);
  const crans = present ? palette.crans.filter((cran) => cran !== numero) : [...palette.crans, numero].sort((a, b) => a - b);
  return crans.length < nombre[0] || crans.length > nombre[1] ? palette : { ...palette, crans };
}

