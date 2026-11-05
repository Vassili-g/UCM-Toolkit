/** Propositions fondées sur une règle écrite et des faits relus. */
import type { Collection } from '../referentiel/architecture.js';
import { estLAxeDEtats, formeReconnue } from '../referentiel/reconnaissance.js';
import { modeDuThemeReconnu } from '../referentiel/theme.js';
import { collectionParCle, type CatalogueDeReference, type VariableDuCatalogue } from './catalogue.js';
import { candidatDeLongueurParEtapes, classerLesCandidatsParEtapes, EGALITE_EN_PIXELS, type CandidatDeLongueur } from './candidatsDeLongueur.js';
import type { Constat, Correction } from './constat.js';
import { axesDuReleve, axesDuReleveParEtapes, estLaFamilleCouleur, etatReconnu, memeValeurDAxe, roleDuToken, segmentDAxe, segmentEcritPourLaValeur, tokenVautPourLeLayer, tokensDuComposant, tokensDuComposantParEtapes, type AxeDuComposant, type TokenDuComposant } from './nommage.js';
import { rolesAdmisDuLayer } from './mapping.js';
import { lectureManquee, peintureVisible, type LayerLu, type LiaisonLue, type PeintureLue, type ReleveDeComposant, type VariantLu } from './releve.js';

/**
 * Enrichit les constats avec une correction exacte ou une question non tranchée. C15 et C17 cèdent la place à C22 et C24, qui
 * portent les mêmes faits et la proposition : un même écart ne se compte qu'une fois. Une liaison qui se trompe sur plusieurs segments
 * (palette et état, palette et rôle) reçoit une seule carte, qui vise le token corrigeant tous les segments (Q-F3-12) ; un C21 ou un C59 sur la
 * même liaison se taisent quand cette carte propose le token (Q-F3-16).
 */
export function proposerLesCorrections(releve: ReleveDeComposant, catalogue: CatalogueDeReference, constats: readonly Constat[]): Constat[] {
  const calcul = proposerLesCorrectionsParEtapes(releve, catalogue, constats);
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

/** La voie coopérative reprend exactement le calcul de la voie synchrone : une étape par entrée d'index et par constat enrichi. */
export function* proposerLesCorrectionsParEtapes(releve: ReleveDeComposant, catalogue: CatalogueDeReference, constats: readonly Constat[]): Generator<void, Constat[]> {
  const index = yield* indexerLeReleve(releve, catalogue);
  const nouveaux: Constat[] = [];
  for (const constat of constats) {
    if (constat.code === 'C15') nouveaux.push(constatDerive(constat, 'C22'));
    if (constat.code === 'C17') nouveaux.push(constatDerive(constat, 'C24'));
    yield;
  }
  const gardes = constats.filter((constat) => constat.code !== 'C15' && constat.code !== 'C17');
  nouveaux.push(...(yield* constatsManquantsParEtapes(releve)), ...(yield* constatsDeValeursEnDurParEtapes(releve)));
  const enrichis: Constat[] = [];
  const aEnrichir = [...gardes.filter((entree) => entree.code === 'C16'), ...nouveaux];
  const compagnons = ecartsDeLaMemeLiaison(aEnrichir);
  const fusions = new Map<Constat, Pick<Constat, 'correction' | 'question' | 'faits'>>();
  const absorbes = new Set<Constat>();
  for (const [chef, autres] of compagnons) {
    const ensemble = yield* corrigerEnsemble(chef, autres, releve, index);
    if (!ensemble) continue;
    fusions.set(chef, ensemble);
    for (const autre of autres) absorbes.add(autre);
  }
  for (const constat of aEnrichir) {
    if (absorbes.has(constat)) continue;
    const ensemble = fusions.get(constat);
    if (ensemble) {
      enrichis.push({ ...constat, ...ensemble });
      yield;
      continue;
    }
    const proposition = constat.code === 'C16'
      ? yield* corrigerAxe(constat, releve, catalogue, index)
      : constat.code === 'C22'
        ? yield* corrigerAxe(constat, releve, catalogue, index)
        : constat.code === 'C24'
          ? corrigerRole(constat, releve, catalogue, index)
          : constat.code === 'C25'
            ? yield* corrigerLiaisonManquante(constat, releve, catalogue, index)
            : yield* corrigerValeurEnDur(constat, releve, catalogue, index);
    enrichis.push(proposition ? { ...constat, ...proposition } : constat);
    yield;
  }
  const tailles = yield* constatsDeTailleSelonLeMode(index, catalogue);
  const corriges = new Set(enrichis.filter((constat) => constat.correction && LIAISON_A_SEGMENTS.includes(constat.code)).map(cleSansIndice));
  return [...gardes.filter((constat) => constat.code !== 'C16' && !(CONSTATS_QUI_CEDENT.includes(constat.code) && corriges.has(cleSansIndice(constat)))), ...enrichis, ...tailles];
}

/** Les constats d'une liaison qui cèdent à la carte d'un segment faux : l'écart à la majorité (C21) et le texte de surface sans fond (C59). */
const CONSTATS_QUI_CEDENT: readonly string[] = ['C21', 'C59'];

/** Les constats qui jugent les segments du nom du token lié, dans l'ordre du nom : axes (C22), état (C16), rôle (C24). */
const LIAISON_A_SEGMENTS: readonly string[] = ['C22', 'C16', 'C24'];

/** La liaison que le constat vise : variant, layer, surcharge, champ, indice ou plage, et nom du token. */
function cleDeLiaison(constat: Constat): string {
  const f = constat.faits;
  return [cleSansIndice(constat), f.indice ?? '', f.plageDebut ?? '', f.plageFin ?? ''].join('|');
}

/** La clé que C21 et C59 partagent avec les autres constats : ils ne portent ni indice ni plage, et nomment le token par `nom` ou `variable` au lieu de `token`. */
function cleSansIndice(constat: Constat): string {
  const f = constat.faits;
  return [constat.variants[0], constat.layers[0], f.surcharge ?? '', f.champ, f.token ?? f.nom ?? f.variable].join('|');
}

/** Le segment du nom du token que le constat juge : le rôle pour C24, sinon l'axe. */
function segmentJuge(constat: Constat): string { return constat.code === 'C24' ? 'role' : String(constat.faits.axe); }

/**
 * Pour le constat de chaque liaison à plusieurs segments faux qui précède les autres dans le nom du token, ces autres constats. Le nom
 * place les axes (C22) avant l'état (C16), et l'état avant le rôle (C24) ; la carte reprend le code du premier.
 */
function ecartsDeLaMemeLiaison(constats: readonly Constat[]): Map<Constat, Constat[]> {
  const groupes = new Map<string, Constat[]>();
  for (const constat of constats) {
    if (!LIAISON_A_SEGMENTS.includes(constat.code)) continue;
    const cle = cleDeLiaison(constat);
    const groupe = groupes.get(cle);
    // Deux constats du même segment (le même axe, ou le rôle) ne corrigent pas deux segments : ils gardent chacun leur carte.
    if (groupe) { if (!groupe.some((autre) => segmentJuge(autre) === segmentJuge(constat))) groupe.push(constat); }
    else groupes.set(cle, [constat]);
  }
  const resultat = new Map<Constat, Constat[]>();
  const rang = (constat: Constat): number => LIAISON_A_SEGMENTS.indexOf(constat.code);
  for (const groupe of groupes.values()) {
    if (groupe.length < 2) continue;
    const ordonne = [...groupe].sort((a, b) => rang(a) - rang(b));
    resultat.set(ordonne[0], ordonne.slice(1));
  }
  return resultat;
}

/**
 * Une seule carte pour une liaison dont plusieurs segments sont faux : le nom visé remplace chaque segment par la valeur du variant ou
 * par le rôle attendu. Un seul token présent donne la correction, sinon une question. `autresEcarts` nomme les segments que les autres
 * constats auraient corrigés. Rend `undefined` quand un des constats ne se relit pas : chacun garde alors sa carte.
 */
function* corrigerEnsemble(constat: Constat, autres: readonly Constat[], releve: ReleveDeComposant, index: IndexDeCorrection): Generator<void, Pick<Constat, 'correction' | 'question' | 'faits'> | undefined> {
  const nomToken = chaine(constat.faits.token);
  const variant = variantDuConstat(constat, index);
  const layer = layerDuConstat(constat, index);
  const liaison = layer && nomToken ? liaisonDuConstat(constat, layer, nomToken) : undefined;
  const tokens = yield* index.tokens();
  const token = tokens.find((entree) => entree.variable.nom === nomToken);
  if (!nomToken || !variant || !layer || !liaison || !token) return undefined;
  const segments = nomToken.split('/');
  const axes = index.axes();
  const noms: string[] = [];
  let versHover = false;
  for (const ecart of [constat, ...autres]) {
    if (ecart.code === 'C24') {
      const role = chaine(ecart.faits.attendu);
      if (!role) return undefined;
      segments[segments.length - 1] = role;
      noms.push(`rôle ${role}`);
      continue;
    }
    const nomAxe = chaine(ecart.faits.axe);
    const axe = Object.entries(axes).find(([, propriete]) => formeReconnue(propriete.nom) === formeReconnue(nomAxe ?? '')) as [AxeDuComposant, NonNullable<ReturnType<typeof axesDuReleve>[AxeDuComposant]>] | undefined;
    const valeur = axe && variant.valeurs[axe[1].nom];
    const segmentActuel = axe && segmentDAxe(token, axe[0]);
    const rang = axe ? token.lecture.findIndex((segment) => segment.role === axe[0]) : -1;
    if (!axe || !valeur || !segmentActuel || rang < 0 || rang >= segments.length) return undefined;
    segments[rang] = segmentEcritPourLaValeur(tokens, rang, axe[0], valeur);
    noms.push(`${axe[1].nom}=${valeur}`);
    if (axe[0] === 'etat' && etatReconnu(valeur) === 'hover' && etatReconnu(segmentActuel) === 'default') versHover = true;
  }
  const candidats = presentesDeLaCollection(index, segments.join('/'), liaison.variable.collection);
  const faits = { ...constat.faits, autresEcarts: noms.slice(1).join(', ') };
  if (versHover) return { faits, question: { id: constat.id, candidats: candidats.map(({ cle, nom }) => ({ cle, nom })), indice: indiceHover(releve, index, layer, variant.id) } };
  if (candidats.length !== 1) return { faits, ...question(constat, candidats) };
  return { faits, correction: correctionDeLiaison(constat, layer, liaison, candidats[0], `Le token reprend ${noms.join(' et ')} du variant.`, variant.valeurs) };
}

function constatDerive(source: Constat, code: 'C22' | 'C24'): Constat {
  return { ...source, id: `${code}:${source.id}`, code, correction: undefined, question: undefined };
}

/**
 * Ce que les corrections relisent à chaque constat, construit une fois par appel : les layers et variants par identifiant,
 * les variables du catalogue par nom, et les résultats de `axesDuReleve` et `tokensDuComposant`, qui ne dépendent que du
 * relevé et du catalogue. Le relevé et le catalogue ne changent pas pendant l'appel.
 */
interface IndexDeCorrection {
  readonly layers: ReadonlyMap<string, readonly LayerLu[]>;
  readonly variants: ReadonlyMap<string, { variant: VariantLu; rang: number }>;
  readonly variablesParNom: ReadonlyMap<string, readonly VariableDuCatalogue[]>;
  axes(): ReturnType<typeof axesDuReleve>;
  axesParEtapes(): Generator<void, ReturnType<typeof axesDuReleve>>;
  tokens(): Generator<void, ReturnType<typeof tokensDuComposant>>;
  /** Les candidats de C25 par variant, rôles admis et forme du nom du layer : deux layers qui partagent ces trois valeurs partagent leurs candidats. */
  readonly candidatsDeCouleur: Map<string, VariableDuCatalogue[]>;
  /** Le catalogue permet de conclure qu'aucun token de `components` ne manque à la recherche de C29. */
  tokensDeTailleLus(): boolean;
}

function* indexerLeReleve(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Generator<void, IndexDeCorrection> {
  const layers = new Map<string, LayerLu[]>();
  const variants = new Map<string, { variant: VariantLu; rang: number }>();
  for (const [rang, variant] of releve.variants.entries()) {
    if (!variants.has(variant.id)) variants.set(variant.id, { variant, rang });
    for (const layer of variant.layers) {
      const memes = layers.get(layer.id);
      if (memes) memes.push(layer);
      else layers.set(layer.id, [layer]);
      yield;
    }
    yield;
  }
  const variablesParNom = new Map<string, VariableDuCatalogue[]>();
  for (const variable of catalogue.variables) {
    const memes = variablesParNom.get(variable.nom);
    if (memes) memes.push(variable);
    else variablesParNom.set(variable.nom, [variable]);
    yield;
  }
  let axes: ReturnType<typeof axesDuReleve> | undefined;
  let lus: boolean | undefined;
  return {
    layers, variants, variablesParNom, candidatsDeCouleur: new Map(),
    axes: () => (axes ??= axesDuReleve(releve)),
    axesParEtapes: () => axesDuReleveParEtapes(releve),
    tokens: () => tokensDuComposantParEtapes(releve, catalogue),
    tokensDeTailleLus: () => (lus ??= collectionDesComposantsLue(catalogue)),
  };
}

/** Les variables de ce nom, dans la collection donnée, présentes, dans l'ordre du catalogue. */
function presentesDeLaCollection(index: IndexDeCorrection, nom: string, collection: string): VariableDuCatalogue[] {
  return (index.variablesParNom.get(nom) ?? []).filter((variable) => variable.collection === collection && variable.etat === 'presente');
}

/**
 * C25 juge toute peinture unie visible d'un layer qu'aucune liaison ne lie, quel que soit son type, y compris sur un layer masqué ou
 * sous un ancêtre masqué (Q-F3-1) : le constat dit alors que le layer est masqué. Il saute le fond d'une instance imbriquée, dont la
 * peinture vient de son composant principal (Q-F3-2), la peinture d'opacité nulle et le champ dont la lecture a échoué (N-12).
 */
function* constatsManquantsParEtapes(releve: ReleveDeComposant): Generator<void, Constat[]> {
  const resultat: Constat[] = [];
  for (const variant of releve.variants) {
    const masques = masquesDuVariant(variant);
    for (const layer of variant.layers) {
      yield;
      if (layer.type === 'INSTANCE' && layer.parent !== null) continue;
      const peintures = yield* peinturesSansLiaison(releve, layer);
      for (const { peinture, plage } of peintures) {
        const lieu = plage ? `p${plage.debut}-${plage.fin}` : String(peinture.indice);
        resultat.push({
          id: `C25:${variant.id}:${layer.id}:${peinture.champ}:${lieu}`, code: 'C25', type: 'corriger', famille: 'liaisons',
          variants: [variant.id], layers: [layer.id],
          faits: {
            calque: layer.nom, champ: peinture.champ,
            ...(plage ? { plageDebut: plage.debut, plageFin: plage.fin } : { indice: peinture.indice }),
            ...faitsDeMasquage(masques.get(layer.id)),
          },
        });
      }
    }
  }
  return resultat;
}

/** Comment un layer est masqué : par lui-même, ou par l'ancêtre le plus proche qui l'est. Absent : le layer se voit. */
type Masquage = { readonly par: 'layer' } | { readonly par: 'ancetre'; readonly ancetre: string };

/** Le masquage de chaque layer masqué du variant. Un parent absent du variant ne masque pas ; un cycle de `parent` s'arrête au premier layer revu. */
function masquesDuVariant(variant: VariantLu): Map<string, Masquage> {
  const parId = new Map(variant.layers.map((layer) => [layer.id, layer]));
  const masques = new Map<string, Masquage>();
  for (const layer of variant.layers) {
    if (!layer.visible) { masques.set(layer.id, { par: 'layer' }); continue; }
    const vus = new Set([layer.id]);
    let parent = layer.parent === null ? undefined : parId.get(layer.parent);
    while (parent && !vus.has(parent.id)) {
      if (!parent.visible) { masques.set(layer.id, { par: 'ancetre', ancetre: parent.nom }); break; }
      vus.add(parent.id);
      parent = parent.parent === null ? undefined : parId.get(parent.parent);
    }
  }
  return masques;
}

/** Les faits qui disent au designer que le layer est masqué (Q-F3-1) : `masque` vaut `layer` ou `ancetre`, et `ancetre` nomme alors le parent masqué. */
function faitsDeMasquage(masquage: Masquage | undefined): Record<string, string> {
  if (!masquage) return {};
  return masquage.par === 'layer' ? { masque: 'layer' } : { masque: 'ancetre', ancetre: masquage.ancetre };
}

interface PeintureASuivre { peinture: PeintureLue; plage?: { debut: number; fin: number } }

/** Cède toutes les 256 peintures et liaisons parcourues ; une liaison de surcharge ne lie pas la peinture du layer. */
function* peinturesSansLiaison(releve: ReleveDeComposant, layer: LayerLu): Generator<void, PeintureASuivre[]> {
  const trouvees: PeintureASuivre[] = [];
  let parcourues = 0;
  const jugee = (peinture: PeintureLue): boolean => peinture.type === 'SOLID' && peintureVisible(peinture) && !lectureManquee(releve, layer.id, peinture.champ);
  const liee = function* (peinture: PeintureLue, plage?: { debut: number; fin: number }): Generator<void, boolean> {
    for (const liaison of layer.liaisons) {
      parcourues += 1;
      if (parcourues % 256 === 0) yield;
      if (liaison.surcharge || liaison.champ !== peinture.champ) continue;
      if (plage ? liaison.plage?.debut === plage.debut && liaison.plage.fin === plage.fin : liaison.indice === peinture.indice) return true;
    }
    return false;
  };
  for (const peinture of layer.peintures) {
    parcourues += 1;
    if (parcourues % 256 === 0) yield;
    if (jugee(peinture) && !(yield* liee(peinture))) trouvees.push({ peinture });
  }
  for (const plage of layer.texte?.plages ?? []) {
    for (const peinture of plage.peintures) {
      parcourues += 1;
      if (parcourues % 256 === 0) yield;
      const debutFin = { debut: plage.debut, fin: plage.fin };
      if (jugee(peinture) && !(yield* liee(peinture, debutFin))) trouvees.push({ peinture, plage: debutFin });
    }
  }
  return trouvees;
}

/**
 * C29 ne juge que les longueurs que le designer a écrites. La largeur et la hauteur du relevé viennent de la boîte calculée
 * (hug, fill) : rien ne prouve qu'une taille soit fixée, donc aucune n'est jugée. Un zéro n'est pas une taille à lier, et une valeur
 * d'instance vient de son maître. Un layer masqué ou sous un ancêtre masqué est jugé comme un autre, et le constat le dit (Q-F3-1).
 * Un champ dont la lecture a échoué n'est pas un constat.
 */
function constatsDeValeursEnDur(releve: ReleveDeComposant): Constat[] {
  const calcul = constatsDeValeursEnDurParEtapes(releve);
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

function* constatsDeValeursEnDurParEtapes(releve: ReleveDeComposant): Generator<void, Constat[]> {
  const resultat: Constat[] = [];
  for (const variant of releve.variants) {
    const masques = masquesDuVariant(variant);
    for (const layer of variant.layers) {
      yield;
      if (layer.type === 'INSTANCE' && layer.parent !== null) continue;
      for (const valeur of layer.valeursEnDur) {
        yield;
        if (!familleLayoutCompatible(valeur.champ) || valeur.valeur === 0 || lectureManquee(releve, layer.id, valeur.champ)) continue;
        resultat.push({
          id: `C29:${variant.id}:${layer.id}:${valeur.champ}:${valeur.valeur}`, code: 'C29', type: 'corriger', famille: 'tailles',
          variants: [variant.id], layers: [layer.id], faits: { calque: layer.nom, champ: valeur.champ, valeur: valeur.valeur, ...faitsDeMasquage(masques.get(layer.id)) },
        });
      }
    }
  }
  return resultat;
}

/**
 * Un token de taille du composant garde la même valeur en Light et en Dark (Q-F3-14). Un token dont les deux valeurs, alias suivis,
 * diffèrent de plus de 1e-6 px est une erreur à signaler : deux réponses sont possibles (garder la valeur de Light ou celle de Dark),
 * donc le constat ne porte ni correction ni question. Un mode qui ne se résout pas en nombre, une variable non chargée ou une
 * collection sans mode Light ou sans mode Dark ne prouvent rien.
 */
function* constatsDeTailleSelonLeMode(index: IndexDeCorrection, catalogue: CatalogueDeReference): Generator<void, Constat[]> {
  const constats: Constat[] = [];
  // Pas de `yield*` dans la source d'un `for…of` : QuickJS compile mal cette forme (nomenclatureSandboxQuickjs.test.ts).
  const tokens = yield* index.tokens();
  for (const token of tokens) {
    yield;
    if (!token.lecture.some((segment) => segment.role === 'famille' && segment.terme === 'size')) continue;
    const { variable } = token;
    if (variable.type !== 'FLOAT' || variable.etat !== 'presente') continue;
    const modes = collectionParCle(catalogue, variable.collection)?.modes ?? [];
    const clair = modes.find((mode) => modeDuThemeReconnu(mode.nom) === 'light');
    const sombre = modes.find((mode) => modeDuThemeReconnu(mode.nom) === 'dark');
    if (!clair || !sombre) continue;
    const { parMode } = yield* candidatDeLongueurParEtapes(catalogue, variable);
    const valeurClair = parMode[clair.id];
    const valeurSombre = parMode[sombre.id];
    if (valeurClair === undefined || valeurSombre === undefined || Math.abs(valeurClair - valeurSombre) <= EGALITE_EN_PIXELS + 1e-9) continue;
    constats.push({
      id: `C63:${variable.cle}:taille-selon-le-mode`, code: 'C63', type: 'corriger', famille: 'tailles', variants: [], layers: [],
      faits: { genre: 'taille-selon-le-mode', variable: variable.nom, cle: variable.cle, modeClair: clair.nom, valeurClair, modeSombre: sombre.nom, valeurSombre },
    });
  }
  return constats;
}

type FamilleDeLayout = 'sizing' | 'radius' | 'stroke';

function familleLayoutCompatible(champ: string): FamilleDeLayout | undefined {
  if (/^(padding(Left|Right|Top|Bottom)?|gap|itemSpacing|counterAxisSpacing)$/i.test(champ)) return 'sizing';
  if (/^(cornerRadius|radius|(top|bottom)(Left|Right)Radius)$/i.test(champ)) return 'radius';
  if (/^(strokeWeight|borderWidth)$/i.test(champ)) return 'stroke';
  return undefined;
}

/**
 * Les propriétés de `components` (registre `proprietes-composant`) dont un token peut porter la valeur d'un champ. Un champ
 * sans propriété pour le dire (`counterAxisSpacing` : le registre ne connaît pas le sens du second axe) n'a pas de candidat.
 * `padding`, qui vaut les quatre côtés, n'est pas un candidat d'un seul côté.
 */
const PROPRIETES_PAR_CHAMP: Readonly<Record<string, readonly string[]>> = {
  strokeweight: ['border-width'], borderwidth: ['border-width'],
  cornerradius: ['radius'], radius: ['radius'],
  topleftradius: ['radius'], toprightradius: ['radius'], bottomleftradius: ['radius'], bottomrightradius: ['radius'],
  itemspacing: ['gap'], gap: ['gap'],
  paddingleft: ['padding-left', 'padding-x'], paddingright: ['padding-right', 'padding-x'],
  paddingtop: ['padding-top', 'padding-y'], paddingbottom: ['padding-bottom', 'padding-y'],
};

export function proprietesDeComposantDuChamp(champ: string): readonly string[] {
  return PROPRIETES_PAR_CHAMP[champ.toLowerCase()] ?? [];
}

/** La collection `components` existe et se lit : sans elle, l'absence d'un token ne prouve rien. */
function collectionDesComposantsLue(catalogue: CatalogueDeReference): boolean {
  const collections = catalogue.collections.filter((collection) => collection.role === 'components');
  return collections.length > 0 && collections.every((collection) => collection.etat !== 'inaccessible');
}

/**
 * Les tokens de taille du composant qui peuvent lier ce champ de ce layer dans ce variant, sans regarder leur valeur. Un
 * segment d'axe du token doit valoir celui du variant ; un token sans segment pour un axe vaut pour toutes ses valeurs. Un
 * segment d'élément doit nommer le layer. Un token dont le nom ne se lit pas ne se départage pas : il n'est pas retenu.
 */
function* tokensDeTailleDuLayer(index: IndexDeCorrection, layer: LayerLu, variant: VariantLu | undefined, champ: string): Generator<void, TokenDuComposant[]> {
  const proprietes = proprietesDeComposantDuChamp(champ);
  if (proprietes.length === 0) return [];
  const tokens = yield* index.tokens();
  const retenus: TokenDuComposant[] = [];
  for (const token of tokens) {
    yield;
    if (token.variable.type !== 'FLOAT') continue;
    const propriete = token.lecture.find((segment) => segment.role === 'propriete');
    if (!propriete?.terme || !proprietes.includes(propriete.terme)) continue;
    let compatible = true;
    for (const segment of token.lecture) {
      yield;
      if (segment.role === 'element') {
        if (formeReconnue(segment.segment) !== formeReconnue(layer.nom)) { compatible = false; break; }
        continue;
      }
      if (segment.role !== 'palette' && segment.role !== 'style' && segment.role !== 'taille' && segment.role !== 'etat') continue;
      const axes = yield* index.axesParEtapes();
      const axe = axes[segment.role];
      const valeur = axe && variant?.valeurs[axe.nom];
      if (!valeur || !memeValeurDAxe(segment.role, segment.segment, valeur)) { compatible = false; break; }
    }
    if (compatible) retenus.push(token);
  }
  return retenus;
}

/**
 * Les clés des tokens de `components` du composant que C29 peut proposer pour ce relevé. Une analyse qui lit une library n'en
 * charge les valeurs que pour eux : un token lié nulle part n'est pas chargé autrement.
 */
export function clesDesTokensDeTailleAttendus(releve: ReleveDeComposant, catalogue: CatalogueDeReference): string[] {
  const proprietes = new Set(constatsDeValeursEnDur(releve).flatMap((constat) => proprietesDeComposantDuChamp(String(constat.faits.champ))));
  if (proprietes.size === 0) return [];
  return tokensDuComposant(releve, catalogue, { types: ['FLOAT'] })
    .filter((token) => proprietes.has(token.lecture.find((segment) => segment.role === 'propriete')?.terme ?? ''))
    .map((token) => token.variable.cle);
}

function* corrigerAxe(constat: Constat, releve: ReleveDeComposant, catalogue: CatalogueDeReference, index: IndexDeCorrection): Generator<void, Pick<Constat, 'correction' | 'question'> | undefined> {
  const nomToken = chaine(constat.faits.token);
  const nomAxe = chaine(constat.faits.axe);
  const variant = variantDuConstat(constat, index);
  const layer = layerDuConstat(constat, index);
  const liaison = layer && nomToken ? liaisonDuConstat(constat, layer, nomToken) : undefined;
  const axe = Object.entries(index.axes()).find(([, propriete]) => formeReconnue(propriete.nom) === formeReconnue(nomAxe ?? '')) as [AxeDuComposant, NonNullable<ReturnType<typeof axesDuReleve>[AxeDuComposant]>] | undefined;
  const tokens = yield* index.tokens();
  const token = tokens.find((entree) => entree.variable.nom === nomToken);
  if (!nomToken || !variant || !layer || !liaison || !axe || !token) return undefined;
  const valeur = variant.valeurs[axe[1].nom];
  const segmentActuel = segmentDAxe(token, axe[0]);
  if (!valeur || !segmentActuel) return undefined;
  const segments = nomToken.split('/');
  const rang = token.lecture.findIndex((segment) => segment.role === axe[0]);
  if (rang < 0 || rang >= segments.length) return undefined;
  segments[rang] = segmentEcritPourLaValeur(tokens, rang, axe[0], valeur);
  const nomCible = segments.join('/');
  const candidats = presentesDeLaCollection(index, nomCible, liaison.variable.collection);
  const etatHover = axe[0] === 'etat' && etatReconnu(valeur) === 'hover' && etatReconnu(segmentActuel) === 'default';
  if (constat.code === 'C16' && etatHover) {
    return { question: { id: constat.id, candidats: candidats.map(({ cle, nom }) => ({ cle, nom })), indice: indiceHover(releve, index, layer, variant.id) } };
  }
  if (candidats.length !== 1) return question(constat, candidats);
  const candidate = candidats[0];
  return { correction: correctionDeLiaison(constat, layer, liaison, candidate, `Le token reprend la valeur ${axe[1].nom} du variant.`, variant.valeurs) };
}

function corrigerRole(constat: Constat, releve: ReleveDeComposant, catalogue: CatalogueDeReference, index: IndexDeCorrection): Pick<Constat, 'correction' | 'question'> | undefined {
  const nomToken = chaine(constat.faits.token);
  const role = chaine(constat.faits.attendu);
  const layer = layerDuConstat(constat, index);
  const liaison = layer && nomToken ? liaisonDuConstat(constat, layer, nomToken) : undefined;
  if (!nomToken || !role || !layer || !liaison) return undefined;
  const segments = nomToken.split('/');
  segments[segments.length - 1] = role;
  const candidats = presentesDeLaCollection(index, segments.join('/'), liaison.variable.collection);
  if (candidats.length !== 1) return question(constat, candidats);
  return { correction: correctionDeLiaison(constat, layer, liaison, candidats[0], `Le rôle ${role} est attendu pour ce layer.`, axesDuVariant(constat, index)) };
}

/**
 * Les rôles que la table de `mapping.ts` admet pour la peinture sont les candidats : un token de `components` qui se lit, dont le rôle
 * est l'un d'eux, dont chaque segment d'axe vaut celui du variant, et dont l'élément éventuel nomme le layer. Un token qui ne se lit
 * pas ne se départage pas. Un seul candidat donne une correction, sinon une question sans réponse cochée (N-11, E-25).
 */
function* corrigerLiaisonManquante(constat: Constat, releve: ReleveDeComposant, catalogue: CatalogueDeReference, index: IndexDeCorrection): Generator<void, Pick<Constat, 'correction' | 'question'> | undefined> {
  const layer = layerDuConstat(constat, index);
  const variant = variantDuConstat(constat, index);
  const champ = chaine(constat.faits.champ);
  const indice = typeof constat.faits.indice === 'number' ? constat.faits.indice : undefined;
  const debut = typeof constat.faits.plageDebut === 'number' ? constat.faits.plageDebut : undefined;
  const fin = typeof constat.faits.plageFin === 'number' ? constat.faits.plageFin : undefined;
  if (!layer || !variant || (champ !== 'fills' && champ !== 'strokes')) return undefined;
  const plage = debut !== undefined && fin !== undefined ? { debut, fin } : undefined;
  const roles = rolesAdmisDuLayer(layer, champ, plage);
  if (!roles) return undefined;
  const cleDeCache = JSON.stringify([variant.id, roles, formeReconnue(layer.nom)]);
  let candidats = index.candidatsDeCouleur.get(cleDeCache);
  if (!candidats) {
    candidats = [];
    const axes = yield* index.axesParEtapes();
    const tokens = yield* index.tokens();
    let parcourus = 0;
    for (const token of tokens) {
      parcourus += 1;
      if (parcourus % 256 === 0) yield;
      const { variable } = token;
      if (variable.type !== 'COLOR' || variable.etat !== 'presente' || token.lecture.length === 0) continue;
      if (!estLaFamilleCouleur(variable.nom.split('/')[1] ?? '')) continue;
      const role = roleDuToken(token);
      if (!role || !roles.includes(role)) continue;
      if (tokenVautPourLeLayer(token, axes, variant, layer.nom)) candidats.push(variable);
    }
    index.candidatsDeCouleur.set(cleDeCache, candidats);
  }
  if (candidats.length !== 1) {
    const choix: { cle: string; nom: string }[] = [];
    for (const candidat of candidats) {
      if (choix.length % 256 === 255) yield;
      choix.push({ cle: candidat.cle, nom: candidat.nom });
    }
    return { question: { id: constat.id, candidats: choix } };
  }
  return { correction: {
    id: constat.id, sorte: 'liaison',
    cible: { layer: layer.id, champ, ...(plage ? { plage } : { indice: indice ?? 0 }) },
    avant: null, apres: { cle: candidats[0].cle, nom: candidats[0].nom },
    aRelire: { axes: variant.valeurs, regle: `Une peinture visible reçoit un token components dont le rôle est ${roles[0]}${roles.length > 1 ? ` ou ${roles.slice(1).join(', ')}` : ''}.`, avant: null },
  } };
}

function* corrigerValeurEnDur(constat: Constat, releve: ReleveDeComposant, catalogue: CatalogueDeReference, index: IndexDeCorrection): Generator<void, Partial<Pick<Constat, 'correction' | 'question' | 'faits'>> | undefined> {
  const layer = layerDuConstat(constat, index);
  const champ = chaine(constat.faits.champ);
  const valeur = typeof constat.faits.valeur === 'number' ? constat.faits.valeur : undefined;
  const dure = layer?.valeursEnDur.find((entree) => entree.champ === champ && entree.valeur === valeur);
  if (!layer || !champ || valeur === undefined || !dure) return undefined;
  if (proprietesDeComposantDuChamp(champ).length === 0) return undefined;
  // Un layer ne se lie qu'aux tokens de son composant : `layout` n'est jamais un candidat, même d'une valeur exacte.
  const possibles = yield* tokensDeTailleDuLayer(index, layer, variantDuConstat(constat, index), champ);
  if (!index.tokensDeTailleLus()) return { faits: { ...constat.faits, recherche: 'incomplete' } };
  for (const { variable } of possibles) {
    yield;
    if (variable.etat !== 'presente') return { faits: { ...constat.faits, recherche: 'incomplete' } };
  }
  const candidats: CandidatDeLongueur[] = [];
  for (const { variable } of possibles) {
    yield;
    candidats.push(yield* candidatDeLongueurParEtapes(catalogue, variable));
  }
  const { exacts, proches } = yield* classerLesCandidatsParEtapes(candidats, valeur);
  if (exacts.length === 0 && proches.length > 0) {
    // Un token proche change le rendu : le designer choisit, rien n'est proposé comme correction.
    return {
      faits: { ...constat.faits, proche: 1 },
      question: { id: constat.id, candidats: proches.map(({ variable, valeur: cible }) => ({ cle: variable.cle, nom: variable.nom, valeur: cible })) },
    };
  }
  // Sans token exact ni proche, le constat reste seul : la préparation propose de créer le token.
  if (exacts.length === 0) return undefined;
  if (exacts.length > 1) {
    const choix: { cle: string; nom: string }[] = [];
    for (const variable of exacts) {
      yield;
      choix.push({ cle: variable.cle, nom: variable.nom });
    }
    return { question: { id: constat.id, candidats: choix } };
  }
  const candidate = exacts[0];
  return { correction: {
    id: constat.id, sorte: 'liaison', cible: { layer: layer.id, champ }, avant: null,
    apres: { cle: candidate.cle, nom: candidate.nom, collection: collectionParCle(catalogue, candidate.collection)?.nom, valeur },
    aRelire: { axes: axesDuVariant(constat, index), regle: 'Le token du composant porte la même valeur numérique en pixels que la valeur lue.', avant: null, valeur },
  } };
}

function correctionDeLiaison(constat: Constat, layer: LayerLu, liaison: LiaisonLue, variable: VariableDuCatalogue, regle: string, axes: Record<string, string>): Correction {
  return {
    id: constat.id, sorte: 'liaison',
    // Une liaison posée par une surcharge s'écrit sur le layer de l'instance qu'elle peint.
    cible: { layer: liaison.surcharge?.id ?? layer.id, champ: liaison.champ, ...(liaison.indice === undefined ? {} : { indice: liaison.indice }), ...(liaison.plage ? { plage: liaison.plage } : {}), variable: liaison.variable.cle },
    // `avant` porte le nom lu : l'écriture d'Architect le compare au nom de la variable encore liée.
    avant: liaison.variable.nom, apres: { cle: variable.cle, nom: variable.nom },
    aRelire: { axes, regle, avant: liaison.variable.nom },
  };
}

function question(constat: Constat, candidats: readonly VariableDuCatalogue[]): Pick<Constat, 'question'> {
  return { question: { id: constat.id, candidats: candidats.map(({ cle, nom }) => ({ cle, nom })) } };
}
function liaisonDuConstat(constat: Constat, layer: LayerLu, nomToken: string): LiaisonLue | undefined {
  const champ = chaine(constat.faits.champ);
  if (!champ) return undefined;
  const indice = typeof constat.faits.indice === 'number' ? constat.faits.indice : undefined;
  const debut = typeof constat.faits.plageDebut === 'number' ? constat.faits.plageDebut : undefined;
  const fin = typeof constat.faits.plageFin === 'number' ? constat.faits.plageFin : undefined;
  const surcharge = chaine(constat.faits.surcharge);
  return layer.liaisons.find((liaison) => liaison.variable.nom === nomToken && liaison.champ === champ
    && liaison.indice === indice && liaison.surcharge?.id === surcharge
    && liaison.plage?.debut === debut && liaison.plage?.fin === fin);
}
/** Un seul layer porte l'identifiant : deux layers de même identifiant ne se départagent pas. */
function layerDuConstat(constat: Constat, index: IndexDeCorrection): LayerLu | undefined {
  const layers = [...new Set(constat.layers)].flatMap((id) => index.layers.get(id) ?? []);
  return layers.length === 1 ? layers[0] : undefined;
}
/** Le premier variant du relevé que le constat nomme. */
function variantDuConstat(constat: Constat, index: IndexDeCorrection): VariantLu | undefined {
  let premier: { variant: VariantLu; rang: number } | undefined;
  for (const id of constat.variants) {
    const trouve = index.variants.get(id);
    if (trouve && (!premier || trouve.rang < premier.rang)) premier = trouve;
  }
  return premier?.variant;
}
function axesDuVariant(constat: Constat, index: IndexDeCorrection): Record<string, string> {
  const variant = variantDuConstat(constat, index);
  return variant ? { ...variant.valeurs } : {};
}
function chaine(valeur: unknown): string | undefined { return typeof valeur === 'string' && valeur.length > 0 ? valeur : undefined; }

function indiceHover(releve: ReleveDeComposant, index: IndexDeCorrection, layer: LayerLu, variantId: string): string {
  const state = Object.values(index.axes()).find((propriete) => estLAxeDEtats(propriete.nom));
  if (!state) return 'Aucun autre variant State=hover n’a été lu.';
  let total = 0;
  let avecTokenHover = 0;
  for (const variant of releve.variants) {
    if (variant.id === variantId) continue;
    if (etatReconnu(variant.valeurs[state.nom] ?? '') !== 'hover') continue;
    const homonyme = variant.layers.find((candidate) => formeReconnue(candidate.nom) === formeReconnue(layer.nom));
    if (!homonyme) continue;
    total += 1;
    if (homonyme.liaisons.some((liaison) => liaison.variable.nom.split('/').some((segment) => etatReconnu(segment) === 'hover'))) avecTokenHover += 1;
  }
  return `${avecTokenHover} des ${total} variants State=hover emploient un token hover.`;
}
