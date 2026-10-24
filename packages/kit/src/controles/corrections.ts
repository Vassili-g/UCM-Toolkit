/** Propositions fondées sur une règle écrite et des faits relus. */
import { formeReconnue } from '../referentiel/reconnaissance.js';
import { cheminDansLaCollection, type CatalogueDeReference, type VariableDuCatalogue } from './catalogue.js';
import { candidatsDeLongueur } from './candidatsDeLongueur.js';
import type { Constat, Correction } from './constat.js';
import { axesDuReleve, segmentDAxe, tokensDuComposant, type AxeDuComposant } from './nommage.js';
import { layersVisiblesDuVariant, lectureManquee, liaisonsPropres, type LayerLu, type LiaisonLue, type ReleveDeComposant, type VariantLu } from './releve.js';

/**
 * Enrichit les constats avec une correction exacte ou une question non tranchée. C15 et C17 cèdent la place à C22 et C24, qui
 * portent les mêmes faits et la proposition : un même écart ne se compte qu'une fois.
 */
export function proposerLesCorrections(releve: ReleveDeComposant, catalogue: CatalogueDeReference, constats: readonly Constat[]): Constat[] {
  const nouveaux = constats.flatMap((constat) => {
    if (constat.code === 'C15') return [constatDerive(constat, 'C22')];
    if (constat.code === 'C17') return [constatDerive(constat, 'C24')];
    return [];
  });
  const gardes = constats.filter((constat) => constat.code !== 'C15' && constat.code !== 'C17');
  nouveaux.push(...constatsManquants(releve), ...constatsDeValeursEnDur(releve));
  const enrichis = [...gardes.filter((constat) => constat.code === 'C16'), ...nouveaux].map((constat) => {
    const proposition = constat.code === 'C16'
      ? corrigerAxe(constat, releve, catalogue)
      : constat.code === 'C22'
        ? corrigerAxe(constat, releve, catalogue)
        : constat.code === 'C24'
          ? corrigerRole(constat, releve, catalogue)
          : constat.code === 'C25'
            ? corrigerLiaisonManquante(constat, releve, catalogue)
            : corrigerValeurEnDur(constat, releve, catalogue);
    return proposition ? { ...constat, ...proposition } : constat;
  });
  return [...gardes.filter((constat) => constat.code !== 'C16'), ...enrichis];
}

function constatDerive(source: Constat, code: 'C22' | 'C24'): Constat {
  return { ...source, id: `${code}:${source.id}`, code, correction: undefined, question: undefined };
}

function constatsManquants(releve: ReleveDeComposant): Constat[] {
  const resultat: Constat[] = [];
  for (const variant of releve.variants) {
    for (const layer of variant.layers) {
      if (formeReconnue(layer.nom) !== 'title' || layer.type !== 'TEXT') continue;
      const peinture = layer.peintures.find((entree) => entree.visible && entree.type === 'SOLID'
        && !liaisonsPropres(layer).some((liaison) => liaison.champ === entree.champ && liaison.indice === entree.indice));
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
  const resultat: Constat[] = [];
  for (const variant of releve.variants) {
    for (const layer of layersVisiblesDuVariant(variant)) {
      if (layer.type === 'INSTANCE' && layer.parent !== null) continue;
      for (const valeur of layer.valeursEnDur) {
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

export type FamilleDeLayout = 'sizing' | 'radius' | 'stroke';

/**
 * Les familles de la collection `layout` dont C29 a besoin pour juger ce relevé, avec les filtres de C29. Une analyse qui
 * lit une library ne charge les valeurs de ces familles que pour elles.
 */
export function famillesDeLayoutAttendues(releve: ReleveDeComposant): FamilleDeLayout[] {
  const familles = new Set<FamilleDeLayout>();
  for (const constat of constatsDeValeursEnDur(releve)) {
    const famille = familleLayoutCompatible(String(constat.faits.champ));
    if (famille) familles.add(famille);
  }
  return [...familles];
}

/**
 * Une variable de la famille peut valoir la valeur lue seulement si la recherche a tout lu : une collection `layout` absente
 * ou inaccessible, ou une variable de la famille non chargée ou inaccessible, empêche de conclure.
 */
function rechercheDeLayoutComplete(catalogue: CatalogueDeReference, famille: FamilleDeLayout): boolean {
  const layouts = catalogue.collections.filter((collection) => collection.role === 'layout');
  if (layouts.length === 0 || layouts.some((collection) => collection.etat === 'inaccessible')) return false;
  const cles = new Set(layouts.map((collection) => collection.cle));
  return !catalogue.variables.some((variable) => cles.has(variable.collection) && variable.type === 'FLOAT'
    && formeReconnue(cheminDansLaCollection(variable, catalogue)[0] ?? '') === famille && variable.etat !== 'presente');
}

function familleLayoutCompatible(champ: string): FamilleDeLayout | undefined {
  if (/^(padding(Left|Right|Top|Bottom)?|gap|itemSpacing|counterAxisSpacing)$/i.test(champ)) return 'sizing';
  if (/^(cornerRadius|radius|(top|bottom)(Left|Right)Radius)$/i.test(champ)) return 'radius';
  if (/^(strokeWeight|borderWidth)$/i.test(champ)) return 'stroke';
  return undefined;
}

function corrigerAxe(constat: Constat, releve: ReleveDeComposant, catalogue: CatalogueDeReference): Pick<Constat, 'correction' | 'question'> | undefined {
  const nomToken = chaine(constat.faits.token);
  const nomAxe = chaine(constat.faits.axe);
  const variant = variantDuConstat(constat, releve);
  const layer = layerDuConstat(constat, releve);
  const liaison = layer && nomToken ? liaisonDuConstat(constat, layer, nomToken) : undefined;
  const axe = Object.entries(axesDuReleve(releve)).find(([, propriete]) => formeReconnue(propriete.nom) === formeReconnue(nomAxe ?? '')) as [AxeDuComposant, NonNullable<ReturnType<typeof axesDuReleve>[AxeDuComposant]>] | undefined;
  const token = tokensDuComposant(releve, catalogue).find((entree) => entree.variable.nom === nomToken);
  if (!nomToken || !variant || !layer || !liaison || !axe || !token) return undefined;
  const valeur = variant.valeurs[axe[1].nom];
  const segmentActuel = segmentDAxe(token, axe[0]);
  if (!valeur || !segmentActuel) return undefined;
  const segments = nomToken.split('/');
  const rang = token.lecture.findIndex((segment) => segment.role === axe[0]);
  if (rang < 0 || rang >= segments.length) return undefined;
  segments[rang] = valeur;
  const nomCible = segments.join('/');
  const candidats = catalogue.variables.filter((variable) => variable.nom === nomCible && variable.collection === liaison.variable.collection && variable.etat === 'presente');
  const etatHover = axe[0] === 'etat' && formeReconnue(valeur) === 'hover' && formeReconnue(segmentActuel) === 'default';
  if (constat.code === 'C16' && etatHover) {
    return { question: { id: constat.id, candidats: candidats.map(({ cle, nom }) => ({ cle, nom })), indice: indiceHover(releve, layer, variant.id) } };
  }
  if (candidats.length !== 1) return question(constat, candidats);
  const candidate = candidats[0];
  return { correction: correctionDeLiaison(constat, layer, liaison, candidate, `Le token reprend la valeur ${axe[1].nom} du variant.`, variant.valeurs) };
}

function corrigerRole(constat: Constat, releve: ReleveDeComposant, catalogue: CatalogueDeReference): Pick<Constat, 'correction' | 'question'> | undefined {
  const nomToken = chaine(constat.faits.token);
  const role = chaine(constat.faits.attendu);
  const layer = layerDuConstat(constat, releve);
  const liaison = layer && nomToken ? liaisonDuConstat(constat, layer, nomToken) : undefined;
  if (!nomToken || !role || !layer || !liaison) return undefined;
  const segments = nomToken.split('/');
  segments[segments.length - 1] = role;
  const candidats = catalogue.variables.filter((variable) => variable.nom === segments.join('/') && variable.collection === liaison.variable.collection && variable.etat === 'presente');
  if (candidats.length !== 1) return question(constat, candidats);
  return { correction: correctionDeLiaison(constat, layer, liaison, candidats[0], `Le rôle ${role} est attendu pour ce layer.`, axesDuVariant(constat, releve)) };
}

function corrigerLiaisonManquante(constat: Constat, releve: ReleveDeComposant, catalogue: CatalogueDeReference): Pick<Constat, 'correction' | 'question'> | undefined {
  const layer = layerDuConstat(constat, releve);
  const variant = variantDuConstat(constat, releve);
  const peinture = layer?.peintures.find((entree) => entree.visible && entree.type === 'SOLID'
    && !liaisonsPropres(layer).some((liaison) => liaison.champ === entree.champ && liaison.indice === entree.indice));
  if (!layer || !variant || !peinture) return undefined;
  const roleAttendu = layer.type === 'TEXT' ? 'foreground' : /icon/i.test(layer.nom) ? 'icon' : 'background';
  const rolesPossibles = formeReconnue(layer.nom) === 'title' ? new Set([roleAttendu, 'title']) : new Set([roleAttendu]);
  const axes = axesDuReleve(releve);
  const valeursAxes = Object.values(axes).map((propriete) => variant.valeurs[propriete.nom]).filter((valeur): valeur is string => !!valeur);
  const suffixes = [...rolesPossibles].map((role) => `/${[...valeursAxes, role].join('/')}`);
  const candidats = catalogue.variables.filter((variable) => variable.etat === 'presente' && variable.type === 'COLOR'
    && catalogue.collections.find((entree) => entree.cle === variable.collection)?.role === 'components'
    && formeReconnue(variable.nom.split('/')[0]) === formeReconnue(releve.jeu.nom)
    && formeReconnue(variable.nom.split('/')[1] ?? '') === 'color'
    && suffixes.some((suffixe) => variable.nom.endsWith(suffixe)));
  if (candidats.length !== 1) return question(constat, candidats);
  return { correction: {
    id: constat.id, sorte: 'liaison', cible: { layer: layer.id, champ: peinture.champ, indice: peinture.indice }, avant: null,
    apres: { cle: candidats[0].cle, nom: candidats[0].nom },
    aRelire: { axes: variant.valeurs, regle: `Une peinture visible reçoit un token components dont le rôle est ${roleAttendu}.`, avant: null },
  } };
}

function corrigerValeurEnDur(constat: Constat, releve: ReleveDeComposant, catalogue: CatalogueDeReference): Partial<Pick<Constat, 'correction' | 'question' | 'faits'>> | undefined {
  const layer = layerDuConstat(constat, releve);
  const champ = chaine(constat.faits.champ);
  const valeur = typeof constat.faits.valeur === 'number' ? constat.faits.valeur : undefined;
  const dure = layer?.valeursEnDur.find((entree) => entree.champ === champ && entree.valeur === valeur);
  if (!layer || !champ || valeur === undefined || !dure) return undefined;
  const familleCherchee = familleLayoutCompatible(champ);
  if (!familleCherchee) return undefined;
  if (!rechercheDeLayoutComplete(catalogue, familleCherchee)) return { faits: { ...constat.faits, recherche: 'incomplete' } };
  const candidats = candidatsDeLongueur(catalogue, familleCherchee, valeur).exacts;
  if (candidats.length !== 1) return question(constat, candidats);
  const candidate = candidats[0];
  return { correction: {
    id: constat.id, sorte: 'liaison', cible: { layer: layer.id, champ }, avant: null,
    apres: { cle: candidate.cle, nom: candidate.nom },
    aRelire: { axes: axesDuVariant(constat, releve), regle: 'La variable layout porte la même valeur numérique en pixels que la valeur lue.', avant: null },
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
function layerDuConstat(constat: Constat, releve: ReleveDeComposant): LayerLu | undefined {
  const layers = releve.variants.flatMap((variant) => variant.layers).filter((layer) => constat.layers.includes(layer.id));
  return layers.length === 1 ? layers[0] : undefined;
}
function variantDuConstat(constat: Constat, releve: ReleveDeComposant): VariantLu | undefined {
  return releve.variants.find((variant) => constat.variants.includes(variant.id));
}
function axesDuVariant(constat: Constat, releve: ReleveDeComposant): Record<string, string> {
  const variant = variantDuConstat(constat, releve);
  return variant ? { ...variant.valeurs } : {};
}
function chaine(valeur: unknown): string | undefined { return typeof valeur === 'string' && valeur.length > 0 ? valeur : undefined; }

function indiceHover(releve: ReleveDeComposant, layer: LayerLu, variantId: string): string {
  const state = Object.values(axesDuReleve(releve)).find((propriete) => formeReconnue(propriete.nom) === 'state');
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
