/**
 * Le domaine `preparation` : préparer les tokens d'un composant dans le fichier des composants, ranger et échanger la préparation,
 * créer ses variables dans le fichier des tokens, puis lier les layers au retour.
 *
 * `preparer` lit le relevé de l'analyse `analyse` et le catalogue de la library, et rend le plan du kit (`preparerLesTokens`) ; avec
 * `ranger` et aucune question ouverte, il range la préparation dans `figma.clientStorage` (`preparations.ts`). Une analyse périmée
 * ou remplacée ne produit rien (`analyse-perimee`). Hors UCM, rien ne se prépare, ne se crée ni ne se lie.
 *
 * `creer-variables` écrit par `ecriture/variables.ts`, sous la place d'écriture : une autre opération en cours rend `occupe`. Après
 * une écriture, l'analyse éventuelle est périmée. `lier-preparation` ne s'ouvre que sur le composant dont la clé de jeu est celle
 * de la préparation (`autre-composant` sinon) ; il retient les liaisons dans l'analyse, et `appliquer-corrections` les écrit par
 * `ecrireLeLot`. `lire-texte` envoie aussi `regles-recues` quand le texte porte des règles.
 */
import { preparerLesTokens, type CatalogueDeReference } from '@ucm-kit/core/controles';
import { formeReconnue } from '@ucm-kit/core/referentiel';
import { lireLesLibraries, type PortDeBibliotheque } from 'ucm-plugin-socle/src/bibliotheque';

import { catalogueDuFichier, chargerLesValeurs, lireLeCatalogueDeLibrary } from '../catalogue';
import { lireLaLibraryRangee } from '../ecriture/configuration';
import { creerLesVariables, type OptionsDeCreation, type ResultatDeCreation } from '../ecriture/variables';
import { lireLesVariables } from '../lecture';
import type { DemandeDePreparation, MessageDePreparation, PreparationVue } from '../messages/preparation';
import {
  COUCHE_DES_COMPOSANTS, COUCHE_DES_COULEURS, COUCHE_DES_TAILLES, identifiantDePreparation, liaisonsDeLaPreparation, lireLeTexte, lireLesPreparations, preparationDuPlan, rangerUnePreparation,
  reglesRecuesDeLaPreparation, retirerUnePreparation, texteDeLaPreparation, trouverUnePreparation,
  type PortDeStockage, type PreparationRangee, type SourceDePreparation,
} from '../preparations';
import {
  correctionsDeLAnalyse, fixerUneCorrection, perimerApresUneEcriture, prendreLaPlaceDUneEcriture, releveDeLAnalyse,
} from './analyse';
import { liaisonsRetenues } from './bibliotheque';
import { lireLaDeclaration } from './commun';
import { libraryDeReference } from './configuration';
import type { Contexte, Traiter } from './contexte';
import { portDeLecture } from './lectureDeFigma';

export const TYPES: readonly DemandeDePreparation['type'][] = [
  'preparer', 'lire-preparations', 'lire-texte', 'creer-variables', 'abandonner-preparation', 'copier-preparation', 'lier-preparation',
];

type Releve = NonNullable<ReturnType<typeof releveDeLAnalyse>>;
type MessagePlan = Extract<MessageDePreparation, { type: 'plan-de-preparation' }>;
type MessageLiaisons = Extract<MessageDePreparation, { type: 'liaisons-preparees' }>;

/** Les lectures et les écritures du domaine : le sandbox donne celles de Figma, les tests des doubles. */
export interface Acces {
  /** Le catalogue du plan : theme, layout et components, valeurs chargées pour ce qui sert ; `null` quand rien ne se lit. */
  catalogue(contexte: Contexte, releve: Releve): Promise<CatalogueDeReference | null>;
  /** La clé de chaque variable de `components` que la library publiée porte, par nom ; `null` quand la library ne se lit pas. */
  publiees(contexte: Contexte): Promise<ReadonlyMap<string, string> | null>;
  creer(preparation: PreparationRangee, options: OptionsDeCreation): Promise<ResultatDeCreation>;
  /** Le fichier ouvert : son nom et sa clé servie par Figma, `null` quand elle ne l'est pas. */
  fichier(contexte: Contexte): { nom: string; cle: string | null };
  identifiant(): string;
  maintenant(): string;
}

/** Les noms de la library choisie, sans valeur ; `null` quand elle ne se lit pas. */
async function libraryLue({ figma }: Contexte): Promise<CatalogueDeReference | null> {
  try {
    const lecture = await lireLesLibraries(figma as unknown as PortDeBibliotheque);
    if (lecture.etat !== 'lue') return null;
    const choisie = libraryDeReference(lecture.collections, liaisonsRetenues(), lireLaLibraryRangee(figma));
    if (choisie === null) return null;
    const catalogue = await lireLeCatalogueDeLibrary(figma as unknown as PortDeBibliotheque, choisie);
    return catalogue.etat === 'lu' ? catalogue.catalogue : null;
  } catch {
    return null;
  }
}

const ACCES_DE_FIGMA: Acces = {
  async catalogue(contexte, releve) {
    const { figma } = contexte;
    const nommes = await libraryLue(contexte);
    if (nommes) {
      // Les tailles se comparent en pixels, et une variable du composant se compare à ses cibles : on n'importe que celles-là.
      const prefixe = `components/${formeReconnue(releve.jeu.nom)}/`;
      const roles = new Map(nommes.collections.map((collection) => [collection.cle, collection.role] as const));
      const cles = nommes.variables
        .filter((variable) => roles.get(variable.collection) === COUCHE_DES_TAILLES || (roles.get(variable.collection) === COUCHE_DES_COMPOSANTS && variable.nom.startsWith(prefixe)))
        .map((variable) => variable.cle);
      return (await chargerLesValeurs(portDeLecture(figma), nommes, cles)).catalogue;
    }
    // Sans library, le fichier ouvert porte lui-même theme, layout et components.
    const port = portDeLecture(figma);
    const locales = await port.getLocalVariablesAsync();
    const lues = await lireLesVariables(port, locales.map((variable) => variable.id), { annulee: () => false });
    if (!lues) return null;
    return catalogueDuFichier({ collections: [...lues.collections.values()], variables: [...lues.variables.values()] }, lireLaDeclaration(figma) === 'ucm' ? 'ucm' : 'libre');
  },
  async publiees(contexte) {
    const nommes = await libraryLue(contexte);
    if (!nommes) return null;
    const composants = new Set(nommes.collections.filter((collection) => collection.role === COUCHE_DES_COMPOSANTS).map((collection) => collection.cle));
    return new Map(nommes.variables.filter((variable) => composants.has(variable.collection)).map((variable) => [variable.nom, variable.cle] as const));
  },
  creer: (preparation, options) => creerLesVariables(preparation, options),
  fichier: ({ figma }) => ({ nom: figma.root.name, cle: typeof figma.fileKey === 'string' && figma.fileKey !== '' ? figma.fileKey : null }),
  identifiant: () => identifiantDePreparation(),
  maintenant: () => new Date().toISOString(),
};

const stockageDe = (contexte: Contexte): PortDeStockage => contexte.figma.clientStorage;

/** Une préparation rangée telle que l'interface la voit. */
export function vueDeLaPreparation(preparation: PreparationRangee): PreparationVue {
  return {
    id: preparation.id, source: preparation.source, creeLe: preparation.creeLe, regles: preparation.regles,
    variables: preparation.variables.map(({ layers, ...reste }) => ({ ...reste, layers: layers.length, etat: preparation.etats?.[reste.nom] ?? 'a-creer' })),
  };
}

async function envoyerLesPreparations(contexte: Contexte, nouvelle?: string): Promise<void> {
  const preparations = (await lireLesPreparations(stockageDe(contexte))).map(vueDeLaPreparation);
  contexte.envoyer({ type: 'preparations', preparations, ...(nouvelle === undefined ? {} : { nouvelle }) });
}

async function preparer(demande: Extract<DemandeDePreparation, { type: 'preparer' }>, acces: Acces, contexte: Contexte): Promise<void> {
  const { analyse } = demande;
  const rendre = (plan: MessagePlan['plan'], refus: MessagePlan['refus']): void => contexte.envoyer({ type: 'plan-de-preparation', analyse, plan, refus });
  const releve = correctionsDeLAnalyse(analyse) === null ? null : releveDeLAnalyse(analyse);
  if (!releve) return rendre(null, 'analyse-perimee');
  if (lireLaDeclaration(contexte.figma) !== 'ucm') return rendre(null, 'hors-ucm');
  let catalogue: CatalogueDeReference | null;
  try { catalogue = await acces.catalogue(contexte, releve); } catch { catalogue = null; }
  // Une lecture longue peut laisser passer une écriture ou une autre sélection : l'analyse est relue avant de répondre.
  if (correctionsDeLAnalyse(analyse) === null) return rendre(null, 'analyse-perimee');
  if (!catalogue) return rendre(null, 'library-illisible');
  if (!catalogue.collections.some((collection) => collection.role === COUCHE_DES_COULEURS)) return rendre(null, 'sans-cibles');

  const plan = preparerLesTokens(releve, catalogue, demande.reponses);
  if (demande.ranger !== true) return rendre(plan, null);
  const fichier = acces.fichier(contexte);
  const source: SourceDePreparation = { fichier: fichier.nom, cleDuFichier: fichier.cle, jeu: { cle: analyse.sujet, nom: releve.jeu.nom } };
  const modes = catalogue.collections.find((collection) => collection.role === COUCHE_DES_COMPOSANTS)?.modes.map((mode) => mode.nom) ?? [];
  const preparation = preparationDuPlan(plan, { id: acces.identifiant(), creeLe: acces.maintenant(), source, modes });
  if (!preparation) return rendre(plan, plan.variables.length === 0 ? 'rien-a-preparer' : 'questions-ouvertes');
  if (!await rangerUnePreparation(stockageDe(contexte), preparation)) return rendre(plan, 'rangement-impossible');
  await envoyerLesPreparations(contexte, preparation.id);
}

async function lireUnTexte(texte: string, contexte: Contexte): Promise<void> {
  const lue = lireLeTexte(texte);
  if (!lue.lue) {
    contexte.envoyer({ type: 'texte-refuse', motif: lue.motif, ...(lue.champ === undefined ? {} : { champ: lue.champ }) });
    return;
  }
  if (!await rangerUnePreparation(stockageDe(contexte), lue.preparation)) {
    contexte.envoyer({ type: 'texte-refuse', motif: 'rangement-impossible' });
    return;
  }
  await envoyerLesPreparations(contexte, lue.preparation.id);
  const regles = reglesRecuesDeLaPreparation(lue.preparation);
  if (regles.length > 0) contexte.envoyer({ type: 'regles-recues', regles });
}

async function creer(demande: Extract<DemandeDePreparation, { type: 'creer-variables' }>, acces: Acces, contexte: Contexte): Promise<void> {
  const rendre = (resume: Partial<Extract<MessageDePreparation, { type: 'variables-creees' }>>): void => contexte.envoyer({
    type: 'variables-creees', preparation: demande.preparation, creees: 0, gardees: 0, sautees: 0, remplacees: 0, divergentes: [], echecs: [], journal: true, refus: null, collections: [], ...resume,
  });
  const preparation = await trouverUnePreparation(stockageDe(contexte), demande.preparation);
  if (!preparation) return rendre({ refus: 'introuvable' });
  const place = prendreLaPlaceDUneEcriture({ sujet: 'preparation', generation: 0 });
  if ('occupe' in place) return rendre({ refus: 'occupe' });
  let ecrit = false;
  try {
    let resultat: ResultatDeCreation;
    try {
      resultat = await acces.creer(preparation, { collection: demande.collection, reponses: demande.reponses });
    } catch {
      // Le lot a pu écrire avant de lever : l'analyse se périme, et la reprise relit le fichier.
      ecrit = true;
      rendre({ sautees: preparation.variables.length, refus: 'lecture' });
      return;
    }
    ecrit = resultat.creees + resultat.remplacees > 0;
    if (resultat.refus === null) await rangerUnePreparation(stockageDe(contexte), { ...preparation, etats: resultat.etats });
    rendre({
      creees: resultat.creees, gardees: resultat.gardees, sautees: resultat.sautees, remplacees: resultat.remplacees,
      divergentes: resultat.divergentes, echecs: resultat.echecs, journal: resultat.journal, refus: resultat.refus, collections: resultat.collections,
    });
    await envoyerLesPreparations(contexte);
  } finally {
    place.liberer();
    if (ecrit) perimerApresUneEcriture(contexte);
  }
}

async function lier(demande: Extract<DemandeDePreparation, { type: 'lier-preparation' }>, acces: Acces, contexte: Contexte): Promise<void> {
  const { analyse, preparation: id } = demande;
  const rendre = (refus: MessageLiaisons['refus'], liaisons?: ReturnType<typeof liaisonsDeLaPreparation>): void => contexte.envoyer({
    type: 'liaisons-preparees', analyse, preparation: id, corrections: liaisons?.corrections ?? [], enAttente: liaisons?.enAttente ?? [], ecartees: liaisons?.ecartees ?? 0, refus,
  });
  const preparation = await trouverUnePreparation(stockageDe(contexte), id);
  if (!preparation) return rendre('introuvable');
  const releve = correctionsDeLAnalyse(analyse) === null ? null : releveDeLAnalyse(analyse);
  if (!releve) return rendre('analyse-perimee');
  if (preparation.source.jeu.cle !== analyse.sujet) return rendre('autre-composant');
  if (lireLaDeclaration(contexte.figma) !== 'ucm') return rendre('hors-ucm');
  let publiees: ReadonlyMap<string, string> | null;
  try { publiees = await acces.publiees(contexte); } catch { publiees = null; }
  if (correctionsDeLAnalyse(analyse) === null) return rendre('analyse-perimee');
  if (!publiees) return rendre('library-illisible');
  const liaisons = liaisonsDeLaPreparation(preparation, releve, publiees);
  for (const correction of liaisons.corrections) fixerUneCorrection(analyse, correction.id, correction);
  rendre(null, liaisons);
}

/** Le traitement du domaine sur des accès donnés. */
export function traiterAvec(acces: Acces): Traiter<DemandeDePreparation> {
  return async (demande, contexte) => {
    switch (demande.type) {
      case 'preparer':
        await preparer(demande, acces, contexte);
        return;
      case 'lire-preparations':
        await envoyerLesPreparations(contexte);
        return;
      case 'lire-texte':
        await lireUnTexte(demande.texte, contexte);
        return;
      case 'creer-variables':
        await creer(demande, acces, contexte);
        return;
      case 'abandonner-preparation':
        await retirerUnePreparation(stockageDe(contexte), demande.preparation);
        await envoyerLesPreparations(contexte);
        return;
      case 'copier-preparation': {
        const preparation = await trouverUnePreparation(stockageDe(contexte), demande.preparation);
        if (preparation) contexte.envoyer({ type: 'preparation-texte', preparation: preparation.id, texte: texteDeLaPreparation(preparation) });
        else await envoyerLesPreparations(contexte);
        return;
      }
      case 'lier-preparation':
        await lier(demande, acces, contexte);
        return;
    }
  };
}

export const traiter = traiterAvec(ACCES_DE_FIGMA);
