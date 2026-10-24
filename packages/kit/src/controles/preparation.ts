/**
 * Préparation des tokens d'un composant : les variables de `components` à créer, ce qu'elles visent dans `theme` et `layout`,
 * et les questions que le relevé ne tranche pas. Fonction pure ; l'identifiant, le stockage et la création sont ceux d'Architect.
 */
import { cranDeLaVariable, DOSSIERS, ETATS, VARIABLES_DU_THEME, type VariableDuTheme } from '../emplois/dossiers.js';
import { REGISTRE_PALETTES_COMPOSANT } from '../referentiel/architecture.js';
import { formeReconnue, termeReconnu } from '../referentiel/reconnaissance.js';
import { MODES, PROFILS, REGISTRE_ETATS, REGISTRE_ROLES, REGISTRE_STATUTS, REGISTRE_TAILLES } from '../referentiel/vocabulaire.js';
import { cheminDansLaCollection, variableDuCatalogue, type CatalogueDeReference, type VariableDuCatalogue } from './catalogue.js';
import type { Question } from './constat.js';
import { axeDePropriete, axesDuReleve, type AxeDuComposant, type ProprieteDAxe } from './nommage.js';
import { liaisonsPropres, type LayerLu, type PeintureLue, type ReleveDeComposant, type VariantLu } from './releve.js';

/** Les réponses du designer, par identifiant de question : le nom d'un candidat, ou un texte libre pour un nom de layer ou de palette. */
export type ReponsesDePreparation = Readonly<Record<string, string>>;

export interface ViseDePreparation {
  /** Le nom complet de la variable visée. */
  nom: string;
  /** Une couleur du thème : sa variable de dossier, d'où viennent les crans. */
  crans?: Record<(typeof MODES)[number], number | 'texteDesBoutons' | undefined>;
  /** Une taille de `layout` : sa valeur en pixels. */
  valeur?: number;
}

export interface LieuDePreparation { variant: string; layer: string; champ: string; indice?: number }

export interface VariableAPreparer {
  /** Le nom complet, `components/composant/famille/…`. Provisoire tant que `attend` cite une question de nom. */
  nom: string;
  type: 'COLOR' | 'FLOAT';
  /** Absent tant qu'une question reste ouverte. Le même alias vaut pour tous les modes de `components`. */
  vise: ViseDePreparation | null;
  /** `existe` : la variable existante vise déjà ce choix ; `a-remplacer` : elle diverge et le designer a répondu « remplacer ». */
  statut: 'a-creer' | 'existe' | 'a-remplacer';
  /** Les identifiants des questions ouvertes qui retiennent cette variable. */
  attend: string[];
  concerne: LieuDePreparation[];
}

/** Une taille qu’aucun token de `layout` ne vaut : elle ne devient ni variable ni question et reste en dur. */
export interface TailleSansCible {
  /** Le nom que la variable aurait porté. */
  nom: string;
  /** Le champ Figma du lieu (`width` pour la taille d'une icône). */
  champ: string;
  /** La famille de `layout` où aucun token ne vaut la valeur. */
  famille: 'sizing' | 'radius' | 'stroke' | 'icon';
  valeur: number;
  lieu: LieuDePreparation;
}

/** Une couleur qu'aucun token du thème ne vise : elle ne devient ni variable ni question et reste en dur. */
export interface CouleurSansCible {
  /** Le nom que la variable aurait porté. */
  nom: string;
  /** Le champ Figma du lieu (`fills` ou `strokes`). */
  champ: string;
  /** L'hexadécimal de la peinture, en majuscules. */
  hexa: string;
  lieu: LieuDePreparation;
}

export interface PreparationDesTokens {
  /** Les couleurs d'abord, puis les tailles. */
  variables: VariableAPreparer[];
  questions: Question[];
  /** Les tailles sans token exact, laissées en dur : Architect ne crée aucun token dans `layout`. Toujours rendu par `preparerLesTokens` ; absent d'un plan fabriqué à la main. */
  sansCible?: TailleSansCible[];
  /** Les couleurs sans token du thème pour cible, laissées en dur pour la même raison. Toujours rendu par `preparerLesTokens`. */
  couleursSansCible?: CouleurSansCible[];
}

const NOM_PAR_DEFAUT = /^(frame|group|rectangle|ellipse|vector|line|polygon|star|component|instance|section|boolean|union|subtract|intersect|exclude|image)\s*\d+$/i;
const TYPES_VECTORIELS = new Set(['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'LINE']);
const FAMILLES_DE_TAILLE = { sizing: 'sizing', radius: 'radius', stroke: 'stroke', icon: 'icon' } as const;

type Role = 'background' | 'foreground' | 'border' | 'icon';
type Famille = keyof typeof FAMILLES_DE_TAILLE;

interface Choix { nom: string; vise: ViseDePreparation }
/** Ce qu'une entrée a trouvé comme cible : un seul choix exact, plusieurs, ou aucun. */
interface Brouillon {
  nom: string; type: 'COLOR' | 'FLOAT'; choix: Choix[]; attend: string[]; concerne: LieuDePreparation;
  ordre: 'couleur' | 'taille';
  /** Pour une taille : sa mesure, d'où vient le choix. */
  taille?: Omit<TailleSansCible, 'lieu' | 'nom'>;
  /** Pour une couleur : l'hexadécimal de la peinture. */
  hexa?: string;
}

function hexaDe(couleur: PeintureLue['couleur']): string {
  if (!couleur) return '';
  const canal = (valeur: number): string => Math.round(Math.min(1, Math.max(0, valeur)) * 255).toString(16).padStart(2, '0').toUpperCase();
  return `#${canal(couleur.r)}${canal(couleur.g)}${canal(couleur.b)}`;
}

function ajouterQuestion(questions: Map<string, Question>, question: Question): void {
  if (!questions.has(question.id)) questions.set(question.id, question);
}

const segmentDe = (texte: string): string => formeReconnue(texte);

function valeurDeVariant(variant: VariantLu, propriete: ProprieteDAxe | undefined): string | undefined {
  return propriete ? variant.valeurs[propriete.nom] : undefined;
}

function moinsLeSuffixe(nom: string): string {
  return nom.split('#')[0];
}

/** La valeur en pixels d'une variable : la même dans tous ses modes, en suivant les alias. */
function valeurEnPixels(variable: VariableDuCatalogue, catalogue: CatalogueDeReference, profondeur = 0): number | undefined {
  const entrees = Object.values(variable.valeurs ?? {});
  if (!entrees.length || profondeur > 5) return undefined;
  const valeurs = entrees.map((entree) => {
    if ('valeur' in entree) return typeof entree.valeur === 'number' ? entree.valeur : undefined;
    const cible = variableDuCatalogue(catalogue, entree.alias);
    return cible === 'absente' ? undefined : valeurEnPixels(cible, catalogue, profondeur + 1);
  });
  return valeurs.every((valeur) => valeur !== undefined && valeur === valeurs[0]) ? valeurs[0] : undefined;
}

function roleDeTheme(role: Role): 'background' | 'foreground' | 'border' {
  return role === 'icon' ? 'foreground' : role;
}

export function preparerLesTokens(
  releve: ReleveDeComposant, catalogue: CatalogueDeReference, reponses: ReponsesDePreparation = {},
): PreparationDesTokens {
  const questions = new Map<string, Question>();
  const brouillons: Brouillon[] = [];
  const sansCible: TailleSansCible[] = [];
  const couleursSansCible: CouleurSansCible[] = [];
  const composant = segmentDe(releve.jeu.nom);
  const collectionDe = (role: string) => catalogue.collections.find((collection) => collection.role === role);
  const theme = collectionDe('theme');
  const layout = collectionDe('layout');

  // Axes : ceux que le nommage reconnaît, plus un axe inconnu que le designer a dit vouloir en style.
  const axes: Partial<Record<AxeDuComposant, ProprieteDAxe>> = { ...axesDuReleve(releve) };
  for (const propriete of releve.proprietes) {
    if (propriete.type !== 'VARIANT' || axeDePropriete(propriete.nom)) continue;
    const id = `axe:${propriete.nom}`;
    const reponse = reponses[id];
    if (reponse === 'oui' && !axes.style) { axes.style = propriete; continue; }
    if (reponse === 'non') continue;
    ajouterQuestion(questions, {
      id, candidats: [{ nom: 'oui' }, { nom: 'non' }],
      indice: reponse === 'oui' ? `${propriete.nom} : le composant a déjà un axe de style` : `${propriete.nom} : un token par valeur ?`,
    });
  }

  // Palettes : reconnues par le registre, ou nommées par le designer.
  const palettesDuTheme = (): { nom: string }[] => [...new Set(catalogue.variables
    .filter((variable) => variable.collection === theme?.cle && variable.nom.startsWith('theme/'))
    .map((variable) => variable.nom.split('/')[1]))].map((nom) => ({ nom }));
  const intensitesDe = (palette: string): string[] => PROFILS.filter((intensite) =>
    catalogue.variables.some((variable) => variable.collection === theme?.cle && variable.nom.startsWith(`theme/${palette}/${intensite}/`)));

  function paletteDe(valeur: string | undefined): { segment?: string; theme?: string; attend?: string } {
    if (valeur === undefined && !axes.palette) {
      const reponse = reponses['palette:-'];
      if (reponse) return { theme: reponse };
      ajouterQuestion(questions, { id: 'palette:-', candidats: palettesDuTheme(), indice: 'Le composant n’a pas d’axe de palette' });
      return { attend: 'palette:-' };
    }
    const terme = termeReconnu(REGISTRE_PALETTES_COMPOSANT, valeur ?? '');
    if (terme) return { segment: terme.id, theme: terme.id };
    const id = `palette:${valeur}`;
    const segment = segmentDe(valeur ?? '');
    if (reponses[id]) return { segment, theme: reponses[id] };
    ajouterQuestion(questions, { id, candidats: palettesDuTheme(), indice: `${axes.palette?.nom}=${valeur}` });
    return { segment, attend: id };
  }

  // Une intensité exacte par palette si le thème n'en porte qu'une ; sinon une question pour tous les statuts.
  function intensiteDe(palette: string): { intensite?: string; attend?: string } {
    if (!termeReconnu(REGISTRE_STATUTS, palette)) return {};
    const presentes = intensitesDe(palette);
    if (presentes.length === 1) return { intensite: presentes[0] };
    if ((PROFILS as readonly string[]).includes(reponses.intensite)) return { intensite: reponses.intensite };
    ajouterQuestion(questions, { id: 'intensite', candidats: PROFILS.map((nom) => ({ nom })), indice: 'Les statuts : soft ou vivid ?' });
    return { attend: 'intensite' };
  }

  // Relevé des couleurs en dur, par layer.
  interface Trouvaille { variant: VariantLu; layer: LayerLu; peinture: PeintureLue; role: Role; unite: string; attend: string[] }
  const trouvailles: Trouvaille[] = [];
  const tailles: { variant: VariantLu; layer: LayerLu; champ: string; valeur: number; attend: string[] }[] = [];

  for (const variant of releve.variants) {
    const parId = new Map(variant.layers.map((layer) => [layer.id, layer]));
    const instanceAncetre = (layer: LayerLu): LayerLu | undefined => {
      for (let parent = layer.parent ? parId.get(layer.parent) : undefined; parent; parent = parent.parent ? parId.get(parent.parent) : undefined) {
        if (parent.instanceDe) return parent;
      }
      return undefined;
    };
    for (const layer of variant.layers) {
      const nonLiees = layer.type === 'TEXT'
        ? (layer.texte?.plages ?? []).flatMap((plage) => plage.peintures
          .filter((peinture) => !plage.liaisons.some((liaison) => liaison.champ === 'fills' && (liaison.indice ?? 0) === peinture.indice)))
        : layer.peintures.filter((peinture) => !liaisonsPropres(layer).some((liaison) => !liaison.plage && liaison.champ === peinture.champ && (liaison.indice ?? 0) === peinture.indice));
      for (const peinture of nonLiees) {
        if (!peinture.visible || peinture.type !== 'SOLID') continue;
        let role: Role;
        let unite = layer.id;
        const attend: string[] = [];
        if (peinture.champ === 'strokes') role = 'border';
        else if (layer.type === 'TEXT') role = 'foreground';
        else if (TYPES_VECTORIELS.has(layer.type)) {
          const instance = instanceAncetre(layer);
          if (instance) { role = 'icon'; unite = instance.id; }
          else {
            const id = `icone:${layer.nom}`;
            const reponse = termeReconnu(REGISTRE_ROLES, reponses[id] ?? '')?.id;
            if (reponse === 'icon' || reponse === 'foreground') role = reponse;
            else {
              role = 'foreground';
              attend.push(id);
              ajouterQuestion(questions, { id, candidats: [{ nom: 'icon' }, { nom: 'foreground' }], indice: `Le layer ${layer.nom} : une icône ?` });
            }
          }
        } else role = 'background';
        trouvailles.push({ variant, layer, peinture, role, unite, attend });
      }
      for (const { champ, valeur } of layer.valeursEnDur) {
        if (valeur !== 0 && ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing', 'cornerRadius', 'strokeWeight'].includes(champ)) {
          tailles.push({ variant, layer, champ, valeur, attend: [] });
        }
      }
      // Icône : l'instance pilotée par une propriété INSTANCE_SWAP, sinon une question.
      if (layer.instanceDe && layer.valeursEnDur.some(({ champ }) => champ === 'width') && !liaisonsPropres(layer).some(({ champ }) => champ === 'width')) {
        const pilotee = layer.instanceDe.pilotee;
        const parSwap = !!pilotee && releve.proprietes.some((propriete) => propriete.type === 'INSTANCE_SWAP' && moinsLeSuffixe(propriete.nom) === moinsLeSuffixe(pilotee));
        const aDesVecteurs = variant.layers.some((enfant) => TYPES_VECTORIELS.has(enfant.type) && instanceAncetre(enfant)?.id === layer.id);
        const largeur = layer.valeursEnDur.find(({ champ }) => champ === 'width')!.valeur;
        if (parSwap) tailles.push({ variant, layer, champ: 'icon-width', valeur: largeur, attend: [] });
        else if (aDesVecteurs) {
          const id = `icone:${layer.nom}`;
          if (termeReconnu(REGISTRE_ROLES, reponses[id] ?? '')?.id === 'icon') tailles.push({ variant, layer, champ: 'icon-width', valeur: largeur, attend: [] });
          else ajouterQuestion(questions, { id, candidats: [{ nom: 'icon' }, { nom: 'foreground' }], indice: `Le layer ${layer.nom} : une icône ?` });
        }
      }
    }
  }

  // Noms d'élément : un nom par défaut de Figma, ou deux layers de même rôle dans un variant.
  const cleDeLayer = (variant: VariantLu, layer: LayerLu): string => `${variant.id}\u0000${layer.id}`;
  const aNommer = new Set<string>();
  const nomsDupliquesDansUnRole = new Set<string>();
  for (const trouvaille of trouvailles) {
    if (NOM_PAR_DEFAUT.test(trouvaille.layer.nom)) aNommer.add(cleDeLayer(trouvaille.variant, trouvaille.layer));
  }
  for (const variant of releve.variants) {
    const parRole = new Map<Role, Map<string, string>>();
    for (const trouvaille of trouvailles.filter((entree) => entree.variant === variant)) {
      const unites = parRole.get(trouvaille.role) ?? new Map<string, string>();
      unites.set(trouvaille.unite, trouvaille.layer.nom);
      parRole.set(trouvaille.role, unites);
    }
    for (const unites of parRole.values()) if (unites.size > 1) for (const nom of unites.values()) nomsDupliquesDansUnRole.add(nom);
  }
  for (const trouvaille of trouvailles) {
    if (nomsDupliquesDansUnRole.has(trouvaille.layer.nom)) aNommer.add(cleDeLayer(trouvaille.variant, trouvaille.layer));
  }
  const homonymes = new Map<string, Map<string, Set<string>>>();
  for (const trouvaille of trouvailles) {
    const parVariant = homonymes.get(trouvaille.layer.nom) ?? new Map<string, Set<string>>();
    const layers = parVariant.get(trouvaille.variant.id) ?? new Set<string>();
    layers.add(trouvaille.layer.id);
    parVariant.set(trouvaille.variant.id, layers);
    homonymes.set(trouvaille.layer.nom, parVariant);
  }
  const identiteAmbigue = new Set([...homonymes].flatMap(([nom, parVariant]) =>
    [...parVariant.values()].some((layers) => layers.size > 1) ? [nom] : []));
  const elementDe = (variant: VariantLu, layer: LayerLu): { element?: string; attend?: string } => {
    if (!aNommer.has(cleDeLayer(variant, layer))) return {};
    const id = identiteAmbigue.has(layer.nom) ? `nom:${layer.nom}:${variant.id}:${layer.id}` : `nom:${layer.nom}`;
    if (reponses[id]) return { element: segmentDe(reponses[id]) };
    const propre = NOM_PAR_DEFAUT.test(layer.nom) ? [] : [{ nom: segmentDe(layer.nom) }];
    ajouterQuestion(questions, { id, candidats: propre, indice: `Le layer ${layer.nom} : quel nom ?` });
    return { element: segmentDe(layer.nom), attend: id };
  };

  const etatDe = (variant: VariantLu): string | undefined => {
    const valeur = valeurDeVariant(variant, axes.etat);
    return valeur === undefined ? undefined : termeReconnu(REGISTRE_ETATS, valeur)?.id ?? segmentDe(valeur);
  };

  // Les valeurs de style posent chacune une question de dossier.
  const valeursDeStyle = axes.style?.valeurs ?? [];
  if (trouvailles.length) {
    for (const valeur of valeursDeStyle.length ? valeursDeStyle : ['-']) {
      const id = `dossier:${valeur}`;
      if (!DOSSIERS.includes(reponses[id] as (typeof DOSSIERS)[number])) {
        ajouterQuestion(questions, {
          id, candidats: DOSSIERS.map((nom) => ({ nom })), indice: valeur === '-' ? 'Quel dossier ?' : `${axes.style!.nom}=${valeur} : quel dossier ?`,
        });
      }
    }
  }

  const themeAvec = (nom: string): VariableDuCatalogue | undefined => {
    const variable = variableDuCatalogue(catalogue, nom, theme?.cle);
    return variable !== 'absente' && variable.type === 'COLOR' ? variable : undefined;
  };

  for (const { variant, layer, peinture, role, attend } of trouvailles) {
    const etat = etatDe(variant);
    const palette = paletteDe(valeurDeVariant(variant, axes.palette));
    const styleValeur = valeurDeVariant(variant, axes.style);
    const element = elementDe(variant, layer);
    const attendus = [...attend, ...(element.attend ? [element.attend] : []), ...(palette.attend ? [palette.attend] : [])];
    const nom = [
      'components', composant, 'color', ...(element.element ? [element.element] : []),
      ...(palette.segment ? [palette.segment] : []),
      ...(styleValeur ? [segmentDe(styleValeur)] : []),
      ...(axes.etat && etat ? [etat] : []),
      role,
    ].join('/');
    let cible: string | undefined;
    let variable: VariableDuTheme | undefined;
    if (etat === 'disabled') {
      variable = `disabled/${roleDeTheme(role)}` as VariableDuTheme;
      cible = `theme/${variable}`;
    } else if (palette.theme) {
      const dossier = reponses[`dossier:${styleValeur ?? '-'}`];
      const intensite = intensiteDe(palette.theme);
      if (intensite.attend) attendus.push(intensite.attend);
      if (!DOSSIERS.includes(dossier as (typeof DOSSIERS)[number])) attendus.push(`dossier:${styleValeur ?? '-'}`);
      else if (!intensite.attend) {
        const roleTheme = roleDeTheme(role);
        const fin = roleTheme === 'background' ? ((ETATS as readonly string[]).includes(etat ?? 'default') ? (etat ?? 'default') : undefined) : roleTheme;
        if (fin) {
          variable = `${dossier}/${fin}` as VariableDuTheme;
          cible = `theme/${palette.theme}/${intensite.intensite ? `${intensite.intensite}/` : ''}${variable}`;
        }
      }
    }
    const existe = cible !== undefined && VARIABLES_DU_THEME.includes(variable as VariableDuTheme) && themeAvec(cible);
    const choix: Choix[] = existe && variable
      ? [{ nom: cible!, vise: { nom: cible!, crans: { light: cranDeLaVariable(variable, 'light', 'normal'), dark: cranDeLaVariable(variable, 'dark', 'normal') } } }]
      : [];
    brouillons.push({
      nom, type: 'COLOR', choix, attend: attendus, concerne: { variant: variant.id, layer: layer.id, champ: peinture.champ, indice: peinture.indice },
      ordre: 'couleur', hexa: hexaDe(peinture.couleur),
    });
  }

  // Tailles : le champ donne la famille, la valeur donne le seul token qui la vaut.
  const COTES = { paddingLeft: ['padding', 'left', 'paddingRight', 'x'], paddingRight: ['padding', 'right', 'paddingLeft', 'x'], paddingTop: ['padding', 'top', 'paddingBottom', 'y'], paddingBottom: ['padding', 'bottom', 'paddingTop', 'y'] } as const;
  for (const { variant, layer, champ, valeur } of tailles) {
    let propriete: string;
    let famille: Famille;
    if (champ in COTES) {
      const [base, cote, oppose, axe] = COTES[champ as keyof typeof COTES];
      const symetrique = layer.valeursEnDur.some((autre) => autre.champ === oppose && autre.valeur === valeur);
      propriete = symetrique ? `${base}-${axe}` : `${base}-${cote}`;
      famille = 'sizing';
    } else if (champ === 'itemSpacing') { propriete = 'gap'; famille = 'sizing'; }
    else if (champ === 'cornerRadius') { propriete = 'radius'; famille = 'radius'; }
    else if (champ === 'strokeWeight') { propriete = 'border-width'; famille = 'stroke'; }
    else { propriete = 'icon-size'; famille = 'icon'; }
    const candidats = catalogue.variables.filter((variable) =>
      variable.collection === layout?.cle && variable.type === 'FLOAT' && cheminDansLaCollection(variable, catalogue)[0] === FAMILLES_DE_TAILLE[famille]
      && valeurEnPixels(variable, catalogue) === valeur);
    // Sans token exact, le lieu ne pose aucune question de nom : il reste en dur.
    const element = candidats.length > 0 ? elementDe(variant, layer) : { element: aNommer.has(cleDeLayer(variant, layer)) ? segmentDe(layer.nom) : undefined, attend: undefined };
    const taille = valeurDeVariant(variant, axes.taille);
    const nom = [
      'components', composant, 'size', ...(element.element ? [element.element] : []),
      ...(taille ? [termeReconnu(REGISTRE_TAILLES, taille)?.id ?? segmentDe(taille)] : []), propriete,
    ].join('/');
    const champDuLieu = champ === 'icon-width' ? 'width' : champ;
    const lieu = { variant: variant.id, layer: layer.id, champ: champDuLieu };
    if (candidats.length === 0) { sansCible.push({ nom, champ: champDuLieu, famille: FAMILLES_DE_TAILLE[famille], valeur, lieu }); continue; }
    brouillons.push({
      nom, type: 'FLOAT', choix: candidats.map((variable) => ({ nom: variable.nom, vise: { nom: variable.nom, valeur } })),
      attend: element.attend ? [element.attend] : [], concerne: lieu,
      ordre: 'taille', taille: { champ: champDuLieu, famille: FAMILLES_DE_TAILLE[famille], valeur },
    });
  }

  // Une variable par nom : ses entrées doivent viser le même choix, exact, sinon une question.
  const variables: VariableAPreparer[] = [];
  const parNom = new Map<string, Brouillon[]>();
  for (const brouillon of brouillons) parNom.set(brouillon.nom, [...(parNom.get(brouillon.nom) ?? []), brouillon]);
  for (const [nom, groupe] of [...parNom.entries()].sort((a, b) => (a[1][0].ordre === b[1][0].ordre ? 0 : a[1][0].ordre === 'couleur' ? -1 : 1))) {
    // Une variable ne vaut qu'une mesure : des lieux de mesures différentes sous un même nom ne la partagent pas, ils restent en dur.
    if (groupe[0].ordre === 'taille' && new Set(groupe.map((brouillon) => brouillon.taille!.valeur)).size > 1) {
      for (const brouillon of groupe) sansCible.push({ nom, ...brouillon.taille!, lieu: brouillon.concerne });
      continue;
    }
    // Une couleur dont aucun token du thème n'est la cible n'a pas de réponse possible : elle reste en dur.
    if (groupe[0].ordre === 'couleur' && groupe.every((brouillon) => brouillon.choix.length === 0 && brouillon.attend.length === 0)) {
      for (const brouillon of groupe) couleursSansCible.push({ nom, champ: brouillon.concerne.champ, hexa: brouillon.hexa ?? '', lieu: brouillon.concerne });
      continue;
    }
    const type = groupe[0].type;
    const attend = [...new Set(groupe.flatMap((brouillon) => brouillon.attend))];
    const concerne = groupe.map((brouillon) => brouillon.concerne);
    const retenu = new Map(groupe.flatMap((brouillon) => brouillon.choix).map((choix) => [choix.nom, choix]));
    const exact = !attend.length && groupe.every((brouillon) => brouillon.choix.length === 1) && retenu.size === 1;
    let vise: ViseDePreparation | null = null;
    if (exact) vise = [...retenu.values()][0].vise;
    else if (!attend.length) {
      const id = `cible:${nom}`;
      const reponse = reponses[id];
      const choisi = reponse ? retenu.get(reponse) : undefined;
      if (choisi) vise = choisi.vise;
      else {
        ajouterQuestion(questions, { id, candidats: [...retenu.values()].map((choix) => ({ nom: choix.nom })), indice: `${nom} : quel token ?` });
        attend.push(id);
      }
    }
    let statut: VariableAPreparer['statut'] = 'a-creer';
    const collectionDesComposants = collectionDe('components');
    const existante = catalogue.variables.find((variable) => variable.nom === nom && variable.collection === collectionDesComposants?.cle);
    if (vise && existante) {
      const modes = collectionDesComposants?.modes.length ? collectionDesComposants.modes.map((mode) => mode.id) : Object.keys(existante.valeurs ?? {});
      const cibleCatalogue = variableDuCatalogue(catalogue, vise.nom);
      const egale = existante.type === type && !!existante.valeurs && modes.length > 0 && modes.every((mode) => {
        const entree = existante.valeurs![mode];
        if (!entree) return false;
        if ('alias' in entree) return entree.alias === vise!.nom || (cibleCatalogue !== 'absente' && entree.alias === cibleCatalogue.cle);
        return false;
      });
      if (egale) statut = 'existe';
      else {
        const id = `existante:${nom}`;
        if (reponses[id] === 'garder') statut = 'existe';
        else if (reponses[id] === 'remplacer') statut = 'a-remplacer';
        else {
          ajouterQuestion(questions, { id, candidats: [{ nom: 'garder' }, { nom: 'remplacer' }], indice: `${nom} existe déjà et ne vise pas ${vise.nom}` });
          attend.push(id);
        }
      }
    }
    variables.push({ nom, type, vise, statut, attend, concerne });
  }
  return { variables, questions: [...questions.values()], sansCible, couleursSansCible };
}
