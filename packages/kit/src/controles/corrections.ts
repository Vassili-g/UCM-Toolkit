/** Propositions fondées sur une règle écrite et des faits relus. */
import type { Collection } from '../referentiel/architecture.js';
import { formeReconnue } from '../referentiel/reconnaissance.js';
import { collectionParCle, type CatalogueDeReference, type VariableDuCatalogue } from './catalogue.js';
import { candidatDeLongueurParEtapes, classerLesCandidatsParEtapes, type CandidatDeLongueur } from './candidatsDeLongueur.js';
import type { Constat, Correction } from './constat.js';
import { axesDuReleve, axesDuReleveParEtapes, estDuComposant, memeValeurDAxe, segmentDAxe, tokensDuComposant, tokensDuComposantParEtapes, type AxeDuComposant, type TokenDuComposant } from './nommage.js';
import { layersVisiblesDuVariant, lectureManquee, type LayerLu, type LiaisonLue, type ReleveDeComposant, type VariantLu } from './releve.js';

/**
 * Enrichit les constats avec une correction exacte ou une question non tranchée. C15 et C17 cèdent la place à C22 et C24, qui
 * portent les mêmes faits et la proposition : un même écart ne se compte qu'une fois.
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
  for (const constat of [...gardes.filter((entree) => entree.code === 'C16'), ...nouveaux]) {
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
  return [...gardes.filter((constat) => constat.code !== 'C16'), ...enrichis];
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
  couleursDuComposant(): Generator<void, readonly VariableDuCatalogue[]>;
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
  let couleurs: VariableDuCatalogue[] | undefined;
  let lus: boolean | undefined;
  return {
    layers, variants, variablesParNom,
    axes: () => (axes ??= axesDuReleve(releve)),
    axesParEtapes: () => axesDuReleveParEtapes(releve),
    tokens: () => tokensDuComposantParEtapes(releve, catalogue),
    // Cède toutes les 256 variables parcourues ; le cache n'est rangé qu'à la fin, donc construit une fois pour tous les calques.
    couleursDuComposant: function* () {
      if (couleurs === undefined) {
        const lues: VariableDuCatalogue[] = [];
        let parcourues = 0;
        for (const variable of catalogue.variables) {
          parcourues += 1;
          if (parcourues % 256 === 0) yield;
          if (variable.etat === 'presente' && variable.type === 'COLOR'
            && collectionParCle(catalogue, variable.collection)?.role === 'components'
            && estDuComposant(variable.nom, releve.jeu.nom)
            && formeReconnue(variable.nom.split('/')[1] ?? '') === 'color') lues.push(variable);
        }
        couleurs = lues;
      }
      return couleurs;
    },
    tokensDeTailleLus: () => (lus ??= collectionDesComposantsLue(catalogue)),
  };
}

/** Les variables de ce nom, dans la collection donnée, présentes, dans l'ordre du catalogue. */
function presentesDeLaCollection(index: IndexDeCorrection, nom: string, collection: string): VariableDuCatalogue[] {
  return (index.variablesParNom.get(nom) ?? []).filter((variable) => variable.collection === collection && variable.etat === 'presente');
}

function* constatsManquantsParEtapes(releve: ReleveDeComposant): Generator<void, Constat[]> {
  const resultat: Constat[] = [];
  for (const variant of releve.variants) {
    for (const layer of variant.layers) {
      yield;
      if (formeReconnue(layer.nom) !== 'title' || layer.type !== 'TEXT') continue;
      const peinture = yield* premierePeintureSansLiaison(layer);
      if (!peinture) continue;
      resultat.push({
        id: `C25:${variant.id}:${layer.id}:${peinture.champ}:${peinture.indice}`, code: 'C25', type: 'corriger', famille: 'liaisons',
        variants: [variant.id], layers: [layer.id], faits: { calque: layer.nom, champ: peinture.champ, indice: peinture.indice },
      });
    }
  }
  return resultat;
}

/**
 * C29 ne juge que les longueurs que le designer a écrites. La largeur et la hauteur du relevé viennent de la boîte calculée
 * (hug, fill) : rien ne prouve qu'une taille soit fixée, donc aucune n'est jugée. Un zéro n'est pas une taille à lier, un layer
 * masqué ne se voit pas, et une valeur d'instance vient de son maître. Un champ dont la lecture a échoué n'est pas un constat.
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
    for (const layer of layersVisiblesDuVariant(variant)) {
      yield;
      if (layer.type === 'INSTANCE' && layer.parent !== null) continue;
      for (const valeur of layer.valeursEnDur) {
        yield;
        if (!familleLayoutCompatible(valeur.champ) || valeur.valeur === 0 || lectureManquee(releve, layer.id, valeur.champ)) continue;
        resultat.push({
          id: `C29:${variant.id}:${layer.id}:${valeur.champ}:${valeur.valeur}`, code: 'C29', type: 'corriger', famille: 'tailles',
          variants: [variant.id], layers: [layer.id], faits: { calque: layer.nom, champ: valeur.champ, valeur: valeur.valeur },
        });
      }
    }
  }
  return resultat;
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
  segments[rang] = valeur;
  const nomCible = segments.join('/');
  const candidats = presentesDeLaCollection(index, nomCible, liaison.variable.collection);
  const etatHover = axe[0] === 'etat' && formeReconnue(valeur) === 'hover' && formeReconnue(segmentActuel) === 'default';
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

/** Cède toutes les 256 peintures et liaisons parcourues ; une liaison de surcharge ne lie pas la peinture du layer. */
function* premierePeintureSansLiaison(layer: LayerLu): Generator<void, LayerLu['peintures'][number] | undefined> {
  let parcourues = 0;
  for (const peinture of layer.peintures) {
    parcourues += 1;
    if (parcourues % 256 === 0) yield;
    if (!peinture.visible || peinture.type !== 'SOLID') continue;
    let liee = false;
    for (const liaison of layer.liaisons) {
      parcourues += 1;
      if (parcourues % 256 === 0) yield;
      if (liaison.surcharge || liaison.champ !== peinture.champ || liaison.indice !== peinture.indice) continue;
      liee = true;
      break;
    }
    if (!liee) return peinture;
  }
  return undefined;
}

function* corrigerLiaisonManquante(constat: Constat, releve: ReleveDeComposant, catalogue: CatalogueDeReference, index: IndexDeCorrection): Generator<void, Pick<Constat, 'correction' | 'question'> | undefined> {
  const layer = layerDuConstat(constat, index);
  const variant = variantDuConstat(constat, index);
  const peinture = layer ? yield* premierePeintureSansLiaison(layer) : undefined;
  if (!layer || !variant || !peinture) return undefined;
  const roleAttendu = layer.type === 'TEXT' ? 'foreground' : /icon/i.test(layer.nom) ? 'icon' : 'background';
  const rolesPossibles = formeReconnue(layer.nom) === 'title' ? new Set([roleAttendu, 'title']) : new Set([roleAttendu]);
  const axes = yield* index.axesParEtapes();
  const valeursAxes = Object.values(axes).map((propriete) => variant.valeurs[propriete.nom]).filter((valeur): valeur is string => !!valeur);
  const suffixes = [...rolesPossibles].map((role) => `/${[...valeursAxes, role].join('/')}`);
  const couleurs = yield* index.couleursDuComposant();
  const candidats: VariableDuCatalogue[] = [];
  let parcourues = 0;
  for (const variable of couleurs) {
    parcourues += 1;
    if (parcourues % 256 === 0) yield;
    if (suffixes.some((suffixe) => variable.nom.endsWith(suffixe))) candidats.push(variable);
  }
  if (candidats.length !== 1) {
    const choix: { cle: string; nom: string }[] = [];
    for (const candidat of candidats) {
      parcourues += 1;
      if (parcourues % 256 === 0) yield;
      choix.push({ cle: candidat.cle, nom: candidat.nom });
    }
    return { question: { id: constat.id, candidats: choix } };
  }
  return { correction: {
    id: constat.id, sorte: 'liaison', cible: { layer: layer.id, champ: peinture.champ, indice: peinture.indice }, avant: null,
    apres: { cle: candidats[0].cle, nom: candidats[0].nom },
    aRelire: { axes: variant.valeurs, regle: `Une peinture visible reçoit un token components dont le rôle est ${roleAttendu}.`, avant: null },
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
  const state = Object.values(index.axes()).find((propriete) => formeReconnue(propriete.nom) === 'state');
  if (!state) return 'Aucun autre variant State=hover n’a été lu.';
  let total = 0;
  let avecTokenHover = 0;
  for (const variant of releve.variants) {
    if (variant.id === variantId) continue;
    if (formeReconnue(variant.valeurs[state.nom] ?? '') !== 'hover') continue;
    const homonyme = variant.layers.find((candidate) => formeReconnue(candidate.nom) === formeReconnue(layer.nom));
    if (!homonyme) continue;
    total += 1;
    if (homonyme.liaisons.some((liaison) => liaison.variable.nom.split('/').some((segment) => formeReconnue(segment) === 'hover'))) avecTokenHover += 1;
  }
  return `${avecTokenHover} des ${total} variants State=hover emploient un token hover.`;
}
