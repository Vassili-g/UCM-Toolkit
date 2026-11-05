/**
 * Les opérateurs de dégradation des peintures sans token (U1 à U4, constat C25) des stress tests F3, et les gestes de construction
 * que les opérateurs de modèle (`operateursModele.ts`) et de thème (`operateursTheme.ts`) réutilisent : ajouter un layer, poser une
 * peinture, délier une liaison, retirer un token.
 *
 * L'oracle suit Q-06, Q-F3-1 et Q-F3-2 : toute peinture unie visible et d'opacité non nulle, sur un layer visible ou masqué hors
 * instance imbriquée, sans liaison de cette peinture donne un C25, quel que soit le type du layer. Le token proposé vient des rôles
 * que la table de `mapping.ts` admet pour le layer (fond `background`, trait `border` ou `foreground`, icône `icon` ou `foreground`,
 * texte et plage `foreground` ou `text`, layer nommé `Ring` son seul rôle). Une correction n'est
 * exacte que si un seul token de ces rôles porte les valeurs d'axe du variant ; sinon l'oracle attend une question sans candidat
 * présélectionné. Un cas « candidat unique » retire donc du catalogue les tokens des autres rôles admis.
 */
import type { LayerLu, LiaisonLue, PeintureLue } from '../../../src/controles/index.js';
import type { ConstatAttendu } from '../commun/types.js';
import type { LiaisonAttendue, NomDeLayer, RoleDeCouleur } from './carte.js';
import { construireLeComposant, GRAINE_PAR_DEFAUT, type AxeDeSpec, type ComposantDeBase } from './composantDeBase.js';
import {
  attendu, axeDeSegment, CIBLES, Degradation, jetonCouleur, liaisonDeCible, Registre, variableLue,
  type CasDeComposant, type NomDeCible, type ResultatDeCas,
} from './operateursAxes.js';

/** Le seul code que les opérateurs U jugent : les autres codes que la dégradation fait sortir relèvent d'autres opérateurs. */
const CODES_DE_U: readonly string[] = ['C25'];

// ---------------------------------------------------------------------------------------------------------------------------
// Gestes de construction

export function peintureUnie(champ: 'fills' | 'strokes', indice = 0, changements: Partial<PeintureLue> = {}): PeintureLue {
  return { champ, indice, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: { r: 0.2, g: 0.4, b: 0.8, a: 1 }, ...changements };
}

/** Comme `Registre.ajouter`, avec les codes que l'opérateur juge au lieu de ceux de L, R et K. */
export function ajouterAvecCodes(registre: Registre, operateur: string, degradation: Degradation, resultat: ResultatDeCas, codes: readonly string[]): void {
  const rang = registre.cas.length;
  registre.ajouter(operateur, degradation, resultat);
  registre.cas[rang] = { ...registre.cas[rang], codesJuges: codes };
}

export interface SpecDeLayer {
  readonly nom: string;
  readonly type: string;
  /** Absent : sous `Root`. `null` : racine d'un second arbre dans le variant. */
  readonly parent?: string | null;
  readonly visible?: boolean;
  readonly peintures?: readonly PeintureLue[];
}

/** Ajoute un layer au variant, avec ses peintures et sans liaison ; la carte de la base ne le connaît pas. */
export function ajouterUnLayer(degradation: Degradation, variant: string, spec: SpecDeLayer): LayerLu {
  const lu = degradation.releve.variants.find((entree) => entree.id === variant);
  if (!lu) throw new Error(`Variant ${variant} absent du relevé`);
  const racine = degradation.carte.variants.find((entree) => entree.id === variant)?.layers.Root ?? null;
  const layer: LayerLu = {
    id: `${variant}x${lu.layers.length}`, nom: spec.nom, type: spec.type, parent: spec.parent === undefined ? racine : spec.parent,
    visible: spec.visible ?? true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 16, hauteur: 16 },
    peintures: [...(spec.peintures ?? [])], liaisons: [], valeursEnDur: [],
    ...(spec.type === 'TEXT' ? { texte: { style: 'Label/Medium', plages: [] } } : {}),
  };
  degradation.inserer(lu.layers, layer);
  degradation.zones.push({ variant, layer: layer.id, champ: spec.peintures?.[0]?.champ ?? 'fills' });
  return layer;
}

/** Lie la peinture `champ[indice]` d'un layer ajouté à la variable. */
export function lierLaPeinture(degradation: Degradation, variant: string, layer: LayerLu, champ: 'fills' | 'strokes', variable: Parameters<typeof variableLue>[0], indice = 0): LiaisonLue {
  const liaison: LiaisonLue = { champ, indice, porteur: layer.id, variable: variableLue(variable) };
  degradation.inserer(layer.liaisons, liaison);
  degradation.zones.push({ variant, layer: layer.id, champ });
  return liaison;
}

/** Retire la liaison du layer et de la plage de texte qui la porte : la peinture reste en dur. */
export function delier(degradation: Degradation, attendue: LiaisonAttendue): void {
  const liaison = degradation.liaison(attendue);
  const layer = degradation.releve.variants.find((entree) => entree.id === attendue.variant)!.layers.find((entree) => entree.id === attendue.layer)!;
  degradation.retirer(layer.liaisons, liaison);
  for (const plage of layer.texte?.plages ?? []) if (plage.liaisons.includes(liaison)) degradation.retirer(plage.liaisons, liaison);
  degradation.zones.push({ variant: attendue.variant, layer: attendue.layer, champ: attendue.champ });
}

/** Délie la cible nommée du variant et rend son layer. */
export function delierLaCible(degradation: Degradation, variant: string, cible: NomDeCible): LayerLu | undefined {
  const attendue = liaisonDeCible(degradation.carte, variant, cible);
  if (!attendue) return undefined;
  delier(degradation, attendue);
  return degradation.layer(variant, CIBLES[cible].layer);
}

/** Retire du catalogue le token de ce rôle pour ce variant, s'il existe. */
export function retirerLeToken(degradation: Degradation, variant: string, role: RoleDeCouleur): void {
  const lu = degradation.carte.variants.find((entree) => entree.id === variant)!;
  const jeton = jetonCouleur(degradation.carte, lu, role);
  if (jeton) degradation.retirer(degradation.catalogue.variables, degradation.variable(jeton.cle));
}

// ---------------------------------------------------------------------------------------------------------------------------
// Rôles et candidats

export type RoleDeTable = 'background' | 'border' | 'icon' | 'foreground' | 'ring';

/** Les rôles que la table admet en plus du premier : ils comptent comme candidats, donc un cas « unique » les retire. */
const ROLES_ALTERNATIFS: Readonly<Record<RoleDeTable, readonly RoleDeCouleur[]>> = {
  background: [], border: ['foreground'], icon: ['foreground'], foreground: ['text'], ring: [],
};

/** Prépare le catalogue : un seul token candidat pour ce rôle, ou aucun. */
export function preparerLesCandidats(degradation: Degradation, variant: string, role: RoleDeTable, avecCandidat: boolean): void {
  for (const autre of ROLES_ALTERNATIFS[role]) retirerLeToken(degradation, variant, autre);
  if (!avecCandidat) retirerLeToken(degradation, variant, role);
}

/** Le C25 attendu : une correction vers le token du rôle pour ce variant s'il est le seul candidat, sinon une question sans candidat. */
export function attenduC25(degradation: Degradation, variant: string, layer: LayerLu, champ: 'fills' | 'strokes', role: RoleDeTable, avecCandidat: boolean, plageDebut?: number): ConstatAttendu {
  const lieu = { variant, layer: layer.id, champ, ...(plageDebut === undefined ? {} : { plageDebut }), token: '' };
  const jeton = jetonCouleur(degradation.carte, degradation.carte.variants.find((entree) => entree.id === variant)!, role)!;
  return avecCandidat ? attendu('C25', 'correction', lieu, { apres: { cle: jeton.cle, nom: jeton.nom } }) : attendu('C25', 'question', lieu, { candidats: [] });
}

// ---------------------------------------------------------------------------------------------------------------------------
// U1 : un type de layer par cas

interface TypeDePeinture {
  readonly libelle: string;
  readonly role: RoleDeTable;
  readonly champ: 'fills' | 'strokes';
  /** Pose la peinture en dur et rend le layer qui la porte, ou `undefined` si le profil n'a pas ce layer. */
  readonly poser: (degradation: Degradation, variant: string) => LayerLu | undefined;
  /** La peinture est celle d'une plage de texte : le constat porte le début de cette plage. */
  readonly plage?: true;
  /** Q-F3-2 : l'instance est une frontière, aucun C25 pour son fond. */
  readonly sansC25?: true;
}

const nouveauSeul = (nom: string, type: string, champ: 'fills' | 'strokes' = 'fills') =>
  (degradation: Degradation, variant: string): LayerLu => ajouterUnLayer(degradation, variant, { nom, type, peintures: [peintureUnie(champ)] });

const avecLeLayer = (nom: NomDeLayer, action: (degradation: Degradation, layer: LayerLu) => void) =>
  (degradation: Degradation, variant: string): LayerLu | undefined => {
    if (!degradation.carte.variants.find((entree) => entree.id === variant)?.layers[nom]) return undefined;
    const layer = degradation.layer(variant, nom);
    action(degradation, layer);
    degradation.zones.push({ variant, layer: layer.id, champ: 'fills' });
    return layer;
  };

const TYPES_DE_PEINTURE: readonly TypeDePeinture[] = [
  { libelle: 'fond de Root (FRAME)', role: 'background', champ: 'fills', poser: (d, v) => delierLaCible(d, v, 'fond') },
  { libelle: 'trait de Root (FRAME)', role: 'border', champ: 'strokes', poser: (d, v) => delierLaCible(d, v, 'trait') },
  { libelle: 'fond de Ring (RECTANGLE)', role: 'ring', champ: 'fills', poser: avecLeLayer('Ring', (d, layer) => d.inserer(layer.peintures, peintureUnie('fills'))) },
  { libelle: 'fond de Dot (ELLIPSE)', role: 'background', champ: 'fills', poser: nouveauSeul('Dot', 'ELLIPSE') },
  { libelle: 'fond de Icon (VECTOR nommé icon)', role: 'icon', champ: 'fills', poser: (d, v) => delierLaCible(d, v, 'icone') },
  { libelle: 'fond de Shape (VECTOR nommé autrement)', role: 'background', champ: 'fills', poser: nouveauSeul('Shape', 'VECTOR') },
  { libelle: 'fond de Union (BOOLEAN_OPERATION)', role: 'background', champ: 'fills', poser: nouveauSeul('Union', 'BOOLEAN_OPERATION') },
  { libelle: 'texte title (TEXT)', role: 'foreground', champ: 'fills', poser: nouveauSeul('title', 'TEXT') },
  { libelle: 'texte Label (TEXT)', role: 'foreground', champ: 'fills', poser: avecLeLayer('Label', (d, layer) => d.inserer(layer.peintures, peintureUnie('fills'))) },
  { libelle: 'plage de texte de Label', role: 'foreground', champ: 'fills', poser: (d, v) => delierLaCible(d, v, 'texte'), plage: true },
  { libelle: 'fond de Glyph (INSTANCE)', role: 'background', champ: 'fills', poser: avecLeLayer('Glyph', (d, layer) => d.inserer(layer.peintures, peintureUnie('fills'))), sansC25: true },
];

// ---------------------------------------------------------------------------------------------------------------------------
// U3 et U4 : ordres de propriétés et écritures de valeurs

type RoleDeSegment = 'palette' | 'style' | 'taille' | 'etat';

/** Les cinq ordres de propriétés de U3, par rôle de segment : grammaire, inverse, State en tête, Size en tête, galerie Button. */
const ORDRES_DE_PROPRIETES: readonly (readonly [libelle: string, ordre: readonly RoleDeSegment[]])[] = [
  ['grammaire', ['palette', 'style', 'taille', 'etat']],
  ['inverse', ['etat', 'taille', 'style', 'palette']],
  ['State en tête', ['etat', 'palette', 'style', 'taille']],
  ['Size en tête', ['taille', 'palette', 'style', 'etat']],
  ['galerie Button', ['style', 'palette', 'etat', 'taille']],
];

function reordonner(base: ComposantDeBase, ordre: readonly RoleDeSegment[]): ComposantDeBase {
  const axes: AxeDeSpec[] = [];
  for (const role of ordre) {
    const axe = axeDeSegment(base.carte, role);
    const spec = axe && base.spec.axes.find((entree) => entree.nom === axe.propriete);
    if (spec) axes.push(spec);
  }
  for (const spec of base.spec.axes) if (!axes.includes(spec)) axes.push(spec);
  return construireLeComposant({ ...base.spec, axes });
}

/** Les trois rôles de U3 : le fond de Root, un texte title, le trait de Root. */
const ROLES_DE_U3: readonly (readonly [libelle: string, role: RoleDeTable, champ: 'fills' | 'strokes', poser: TypeDePeinture['poser']])[] = [
  ['fond', 'background', 'fills', (d, v) => delierLaCible(d, v, 'fond')],
  ['texte', 'foreground', 'fills', nouveauSeul('title', 'TEXT')],
  ['trait', 'border', 'strokes', (d, v) => delierLaCible(d, v, 'trait')],
];

export function operateursPeinture(base: ComposantDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeComposant[] {
  const registre = new Registre(base, graine);
  const carte = base.carte;

  // U1. Une peinture unie en dur par type de layer, avec un candidat unique puis sans candidat : 11 × 2.
  for (const type of TYPES_DE_PEINTURE) {
    for (const avecCandidat of [true, false]) {
      const variant = registre.tirer('U1', carte.variants);
      const degradation = new Degradation(base);
      const layer = type.poser(degradation, variant.id);
      if (!layer) continue;
      preparerLesCandidats(degradation, variant.id, type.role, avecCandidat);
      ajouterAvecCodes(registre, 'U1', degradation, {
        description: `U1 : ${type.libelle} du variant ${variant.nom}, peinture en dur, ${avecCandidat ? 'un candidat' : 'aucun candidat'}`,
        attendus: type.sansC25 ? [] : [attenduC25(degradation, variant.id, layer, type.champ, type.role, avecCandidat, type.plage ? liaisonDeCible(degradation.carte, variant.id, 'texte')?.plage?.debut : undefined)],
      }, CODES_DE_U);
    }
  }

  // U2. Témoins : une peinture qu'aucune règle de Q-06 ne juge, puis deux layers masqués que Q-F3-1 fait juger comme les autres.
  // Le layer porté est un TEXT nommé title.
  const temoin = (libelle: string, poser: (degradation: Degradation, variant: string) => LayerLu | void, jugee = false): void => {
    const variant = registre.tirer('U2', carte.variants);
    const degradation = new Degradation(base);
    const layer = poser(degradation, variant.id);
    ajouterAvecCodes(registre, 'U2', degradation, {
      description: `U2 : ${libelle}, variant ${variant.nom}`,
      attendus: jugee && layer ? [attendu('C25', 'a-faire', { variant: variant.id, layer: layer.id, champ: 'fills', token: '' })] : [],
    }, CODES_DE_U);
  };
  const titre = (degradation: Degradation, variant: string, peinture: PeintureLue, changements: Partial<SpecDeLayer> = {}): LayerLu =>
    ajouterUnLayer(degradation, variant, { nom: 'title', type: 'TEXT', peintures: [peinture], ...changements });
  temoin('peinture masquée', (d, v) => { titre(d, v, peintureUnie('fills', 0, { visible: false })); });
  temoin('peinture d\'opacité nulle', (d, v) => { titre(d, v, peintureUnie('fills', 0, { opacite: 0 })); });
  temoin('peinture en dégradé', (d, v) => { titre(d, v, peintureUnie('fills', 0, { type: 'GRADIENT_LINEAR' })); });
  temoin('peinture en image', (d, v) => { titre(d, v, peintureUnie('fills', 0, { type: 'IMAGE' })); });
  temoin('peinture liée', (d, v) => {
    const jeton = jetonCouleur(d.carte, d.carte.variants.find((entree) => entree.id === v)!, 'foreground')!;
    lierLaPeinture(d, v, titre(d, v, peintureUnie('fills')), 'fills', d.variable(jeton.cle));
  });
  // Une peinture dont seule la surcharge de l'instance est liée : le fond d'une instance imbriquée appartient à son composant principal.
  if (carte.variants[0].layers.Glyph) {
    temoin('peinture de surcharge sur Glyph', (d, v) => { d.inserer(d.layer(v, 'Glyph').peintures, peintureUnie('fills')); d.zones.push({ variant: v, layer: d.layer(v, 'Glyph').id, champ: 'fills' }); });
  }
  temoin('lecture mixte', (d, v) => {
    const layer = titre(d, v, peintureUnie('fills'));
    d.inserer(d.releve.lecture.manquees, { layer: layer.id, champ: 'fills', motif: 'peintures mixtes ou illisibles' });
  });
  temoin('layer masqué (jugé, Q-F3-1)', (d, v) => titre(d, v, peintureUnie('fills'), { visible: false }), true);
  temoin('ancêtre masqué (jugé, Q-F3-1)', (d, v) => {
    const enveloppe = ajouterUnLayer(d, v, { nom: 'Wrap', type: 'FRAME', visible: false });
    return titre(d, v, peintureUnie('fills'), { parent: enveloppe.id });
  }, true);

  // U3. Cinq ordres de propriétés × fond, texte, trait : le token proposé ne dépend pas de l'ordre des axes du jeu.
  for (const [libelleDOrdre, ordre] of ORDRES_DE_PROPRIETES) {
    const reordonnee = reordonner(base, ordre);
    for (const [libelleDuRole, role, champ, poser] of ROLES_DE_U3) {
      const variant = registre.tirer('U3', reordonnee.carte.variants);
      const degradation = new Degradation(reordonnee);
      const layer = poser(degradation, variant.id);
      if (!layer) continue;
      preparerLesCandidats(degradation, variant.id, role, true);
      ajouterAvecCodes(registre, 'U3', degradation, {
        description: `U3 : ${libelleDuRole}, ordre ${libelleDOrdre} (${reordonnee.spec.axes.map((axe) => axe.nom).join(', ')}), variant ${variant.nom}`,
        attendus: [attenduC25(degradation, variant.id, layer, champ, role, true)],
      }, CODES_DE_U);
    }
  }

  // U4. Choix du candidat.
  const cibleDeU4 = (operateurBase: ComposantDeBase) => {
    const variant = registre.tirer('U4', operateurBase.carte.variants);
    return { variant, degradation: new Degradation(operateurBase) };
  };
  const nomAvecElement = (nom: string, element: string): string => { const segments = nom.split('/'); segments.splice(2, 0, element); return segments.join('/'); };
  const tokenDe = (degradation: Degradation, variant: string, role: RoleDeCouleur) =>
    degradation.variable(jetonCouleur(degradation.carte, degradation.carte.variants.find((entree) => entree.id === variant)!, role)!.cle);
  const finir = (degradation: Degradation, description: string, attendus: ConstatAttendu[]): void =>
    ajouterAvecCodes(registre, 'U4', degradation, { description, attendus }, CODES_DE_U);
  const textePlein = (degradation: Degradation, variant: string): LayerLu => {
    const layer = degradation.layer(variant, 'Label');
    degradation.inserer(layer.peintures, peintureUnie('fills'));
    degradation.zones.push({ variant, layer: layer.id, champ: 'fills' });
    return layer;
  };
  {
    // 1. Le seul token du texte est celui de l'élément Icon : il ne nomme pas le layer, donc pas de correction.
    const { variant, degradation } = cibleDeU4(base);
    const layer = textePlein(degradation, variant.id);
    retirerLeToken(degradation, variant.id, 'text');
    const foreground = tokenDe(degradation, variant.id, 'foreground');
    degradation.fixer(foreground, 'nom', nomAvecElement(foreground.nom, 'icon'));
    finir(degradation, `U4 : le texte Label du variant ${variant.nom} n'a que le token de l'élément icon`, [attendu('C25', 'a-faire', { variant: variant.id, layer: layer.id, champ: 'fills', token: '' })]);
  }
  {
    // 2. Même cas pour le fond de Root.
    const { variant, degradation } = cibleDeU4(base);
    const layer = delierLaCible(degradation, variant.id, 'fond')!;
    const fond = tokenDe(degradation, variant.id, 'background');
    degradation.fixer(fond, 'nom', nomAvecElement(fond.nom, 'icon'));
    finir(degradation, `U4 : le fond de Root du variant ${variant.nom} n'a que le token de l'élément icon`, [attendu('C25', 'a-faire', { variant: variant.id, layer: layer.id, champ: 'fills', token: '' })]);
  }
  {
    // 3. Le texte n'a que le rôle text : un candidat admis par la table.
    const { variant, degradation } = cibleDeU4(base);
    const layer = textePlein(degradation, variant.id);
    retirerLeToken(degradation, variant.id, 'foreground');
    finir(degradation, `U4 : le texte Label du variant ${variant.nom} n'a que le rôle text`, [attendu('C25', 'correction', { variant: variant.id, layer: layer.id, champ: 'fills', token: '' }, { apres: jetonApres(degradation, variant.id, 'text') })]);
  }
  {
    // 4. Foreground et text présents : deux candidats, une question qui ne présélectionne rien.
    const { variant, degradation } = cibleDeU4(base);
    const layer = textePlein(degradation, variant.id);
    const noms = [tokenDe(degradation, variant.id, 'foreground').nom, tokenDe(degradation, variant.id, 'text').nom];
    finir(degradation, `U4 : le texte Label du variant ${variant.nom} a les rôles foreground et text`, [attendu('C25', 'question', { variant: variant.id, layer: layer.id, champ: 'fills', token: '' }, { candidats: noms })]);
  }
  // 5 et 6. Le variant écrit Hover ou Default, le token hover ou rest.
  const etat = axeDeSegment(carte, 'etat');
  const specEtat = etat && base.spec.axes.find((axe) => axe.nom === etat.propriete);
  if (specEtat) {
    const ecritures: readonly (readonly [libelle: string, valeur: string, ecrire: ComposantDeBase['spec']['ecritureDesValeurs']])[] = [
      ['Hover', 'Hover', undefined], ['Default', 'Default', (propriete, valeur) => (propriete === specEtat.nom && valeur === 'Default' ? 'rest' : valeur.toLowerCase())],
    ];
    for (const [libelle, valeur, ecrire] of ecritures) {
      const axes: AxeDeSpec[] = base.spec.axes.map((axe) => (axe === specEtat ? { ...axe, valeurs: ['Default', 'Hover', 'Disabled'] } : axe));
      const construit = construireLeComposant({ ...base.spec, axes, ...(ecrire ? { ecritureDesValeurs: ecrire } : {}) });
      // La fonction d'écriture a servi à nommer les tokens ; la spec garde le reste, parce que `structuredClone` ne copie pas une fonction.
      const ecriteDeLEtat: ComposantDeBase = { ...construit, spec: { ...construit.spec, ecritureDesValeurs: undefined } };
      const candidats = ecriteDeLEtat.carte.variants.filter((entree) => entree.valeurs[etat.propriete] === valeur);
      const variant = registre.tirer('U4', candidats);
      const degradation = new Degradation(ecriteDeLEtat);
      const layer = delierLaCible(degradation, variant.id, 'fond')!;
      finir(degradation, `U4 : variant ${variant.nom} avec l'état ${libelle}, token écrit ${ecrire ? 'rest' : 'hover'}`, [attenduC25(degradation, variant.id, layer, 'fills', 'background', true)]);
    }
  }
  return registre.cas;
}

function jetonApres(degradation: Degradation, variant: string, role: RoleDeCouleur): { cle: string; nom: string } {
  const jeton = jetonCouleur(degradation.carte, degradation.carte.variants.find((entree) => entree.id === variant)!, role)!;
  return { cle: jeton.cle, nom: jeton.nom };
}
