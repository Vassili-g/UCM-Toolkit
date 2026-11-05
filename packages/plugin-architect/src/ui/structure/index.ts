/**
 * Le domaine `structure` de l'interface : il demande au sandbox les constats et les corrections de structure, ignore une réponse dont la
 * demande est remplacée, puis range leurs cartes dans les sections de l'onglet Constats (`tokens/panneau.ts`) : les constats à régler
 * dans Figma et les corrections de variables manquantes, de crans, de modes et de scopes, chacun dans le conteneur de sa catégorie.
 * Toutes les cases arrivent décochées. Le pied commun de l'onglet (`tokens/cochage.ts`) compte les cases cochées des renommages et des
 * corrections de structure ; Appliquer envoie d'abord les renommages, puis les corrections de structure ce module envoie ici.
 * Le panneau tire le compte de l'onglet des cartes que ce module lui livre.
 * Le lien « Télécharger le rapport d'analyse » est au pied des onglets (`rapport.ts`) ; il joint la durée du rendu mesurée ici.
 */
import type { DemandeDeStructure, EchecDeLecture, IgnoresDeStructure, MessageDeStructure } from '../../messages/structure';
import type { Constat, Correction } from '../../messages/commun';
import type { Coquille } from '../nomenclature/coquille';
import { QUESTIONS } from '../tokens/panneau';
import { creerAlerte } from 'ucm-plugin-socle/src/ui/Alerte';
import { TEXTES } from '../textes';
import { monterLePied } from '../tokens/cochage';
import { monterAFaire } from './aFaire';
import { poserLesMorceaux } from './carte';
import { monterLesCorrections } from './corrections';
import { GROUPES, lireLInformationDuTheme, lireLesConstats, lireLesCorrections, type GroupeDeConstat, type Noms } from './lecture';
import { creerLesMesuresDuPanneau, monterLeRapportDeTokens } from './rapport';

export interface OptionsDeStructure {
  readonly envoyer: (message: DemandeDeStructure) => void;
  /** Le relevé courant, lu au moment du rendu : une variable se retrouve par sa clé ou par son nom entier. */
  readonly noms: Noms;
  /** Montre une variable dans l'explorateur, fiche ouverte. */
  readonly ouvrirLaFiche: (cle: string) => void;
  /** Demande au sandbox les mesures du mode Tokens ; absent, le lien du rapport ne se monte pas. */
  readonly preparerLeRapport?: (auRetour: (mesures: string | null) => void) => void;
  readonly telecharger?: (nom: string, contenu: string, type: string) => void;
  readonly maintenant?: () => Date;
  /** Appelée après le rendu de chaque réponse `structure` retenue, que ce soit la lecture d'un Actualiser ou celle d'un Ignorer. */
  readonly apresLaStructure?: () => void;
  /** L'horloge du rendu, en millisecondes. */
  readonly horloge?: () => number;
}

export interface Structure {
  /** Range la taille du message `releve`, reçu par l'application : le rapport la joint. */
  noterLaTaille(message: 'releve', octets: number): void;
  /** Demande une nouvelle lecture ; la réponse d'une demande plus ancienne est ignorée. */
  demander(): void;
  recevoir(message: MessageDeStructure): void;
}

export function monterStructure(coquille: Coquille, { envoyer, noms, ouvrirLaFiche, preparerLeRapport, telecharger, maintenant, apresLaStructure, horloge = () => globalThis.performance?.now() ?? Date.now() }: OptionsDeStructure): Structure {
  const mesures = creerLesMesuresDuPanneau();
  const rapport = preparerLeRapport
    ? monterLeRapportDeTokens({ preparer: preparerLeRapport, mesures, ...(telecharger ? { telecharger } : {}), ...(maintenant ? { maintenant } : {}) })
    : null;
  if (rapport) coquille.pied.append(rapport.element);
  /** Les demandes de ce domaine se numérotent à part : prendre un numéro du compteur de l'application décalerait celui de la vue composant. */
  let compteur = 0;
  const nouvelleDemande = (): number => (compteur += 1);
  let demande: number | null = null;
  let demandeDApplication: number | null = null;
  /** Les lignes du dernier lot envoyé : la ligne verte du résultat en tire la demande de publier la library. */
  let envoyees: readonly string[] = [];
  let recu: { readonly constats: readonly Constat[]; readonly corrections: readonly Correction[]; readonly ignores: IgnoresDeStructure; readonly echec?: EchecDeLecture } | null = null;

  /** Un geste d'Ignorer prend un numéro neuf : la réponse est la relecture de la structure, et celle d'une lecture plus ancienne est laissée. */
  const demanderAvec = (message: (numero: number) => DemandeDeStructure): void => {
    demande = nouvelleDemande();
    envoyer(message(demande));
  };
  const { tokens } = coquille;
  /**
   * Chaque catégorie a un conteneur que le panneau attache dans sa section ; dedans, un sous-conteneur par module (`display: contents`),
   * les corrections d'abord. Les modules y remplacent leurs cartes sans toucher à celles de l'autre.
   */
  const sousHote = (categorie: Parameters<typeof tokens.hote>[0]): HTMLElement => {
    const sous = document.createElement('div');
    sous.className = 'structure-groupe';
    tokens.hote(categorie).append(sous);
    return sous;
  };
  const hotesDeCorrections = { manquantes: sousHote('manquantes'), crans: sousHote('crans'), modes: sousHote('modes'), scopes: sousHote('scopes') };
  const hotesDAFaire = Object.fromEntries(GROUPES.map((groupe) => [groupe, sousHote(groupe)])) as Record<GroupeDeConstat, HTMLElement>;
  /** Les listes longues ne gardent que les cartes à question sous la puce Questions du sommaire. */
  const questionsSeules = (): boolean => tokens.choix() === QUESTIONS;
  const aFaire = monterAFaire(hotesDAFaire, tokens.ignores, ({ nom, cle }) => {
    const cible = cle ?? noms.cle(nom);
    if (cible !== null) ouvrirLaFiche(cible);
  }, {
    ignorerPourLaPalette: (constat) => demanderAvec((numero) => ({ type: 'ignorer-constat-de-structure', demande: numero, constat })),
    ignorerDansLeFichier: (role) => demanderAvec((numero) => ({ type: 'ignorer-role', demande: numero, role })),
    nePlusIgnorerLeConstat: (constat) => demanderAvec((numero) => ({ type: 'retablir-constat-de-structure', demande: numero, constat })),
    nePlusIgnorerLeRole: (role) => demanderAvec((numero) => ({ type: 'retablir-role', demande: numero, role })),
    fusionner(constat, garder) {
      envoyees = [constat];
      demandeDApplication = nouvelleDemande();
      envoyer({ type: 'fusionner-variables', demande: demandeDApplication, constat, garder });
    },
  }, questionsSeules);
  const hoteDuResultat = document.createElement('div');
  hoteDuResultat.className = 'page-stack';
  let recompter = (): void => {};
  const corrections = monterLesCorrections({ element: hoteDuResultat, hotes: hotesDeCorrections, auChangement: () => recompter(), questionsSeules });
  for (const categorie of Object.keys(hotesDeCorrections) as (keyof typeof hotesDeCorrections)[]) tokens.poserLesGestes(categorie, corrections.gestes[categorie]);
  /** L'information de QV-4 : en tête du mode Tokens, avant la ligne verte du résultat. */
  const hoteDeLInformation = document.createElement('div');
  hoteDeLInformation.className = 'page-stack';
  hoteDeLInformation.hidden = true;
  /** L'échec de la lecture (E4.2) : l'alerte tient la place du « tout est bon » que des listes vides laisseraient croire. */
  const hoteDeLEchec = document.createElement('div');
  hoteDeLEchec.className = 'page-stack';
  hoteDeLEchec.hidden = true;
  tokens.haut.append(hoteDeLEchec, hoteDeLInformation, hoteDuResultat);
  const pied = monterLePied({
    hote: tokens.pied,
    renommages: coquille.renommages(),
    structure: {
      idsCoches: corrections.idsCoches,
      lignes: corrections.nombre,
      toutCocher: () => corrections.toutCocher(),
      relire: demander,
      ecrire(ids) {
        envoyees = ids;
        demandeDApplication = nouvelleDemande();
        envoyer({ type: 'appliquer-structure', demande: demandeDApplication, ids });
      },
    },
  });
  recompter = pied.recompter;

  function rendre(): void {
    const constats = recu ? lireLesConstats(recu.constats, noms) : null;
    const questions = new Set(recu?.constats.filter((constat) => constat.question).map(({ id }) => id));
    aFaire.poser(constats, recu ? { constats: lireLesConstats(recu.ignores.constats, noms), roles: recu.ignores.roles } : undefined, questions);
    corrections.poser(recu ? lireLesCorrections(recu.corrections, noms, recu.constats) : null);
    const information = recu ? lireLInformationDuTheme(recu.constats) : null;
    hoteDeLInformation.hidden = information === null;
    if (information === null) hoteDeLInformation.replaceChildren();
    else {
      const phrase = document.createDocumentFragment();
      poserLesMorceaux(phrase, information.phrase);
      hoteDeLInformation.replaceChildren(creerAlerte('info', { texte: phrase, meta: information.statut }));
    }
    const echec = recu?.echec;
    hoteDeLEchec.hidden = echec === undefined;
    if (echec === undefined) hoteDeLEchec.replaceChildren();
    else hoteDeLEchec.replaceChildren(creerAlerte('verifier', { texte: TEXTES.lectureDeStructureEchouee[echec] }));
    tokens.poserLaStructure(recu ? { constats: recu.constats, corrections: recu.corrections, noms, partielle: echec !== undefined } : null);
  }

  function demander(): void {
    demande = nouvelleDemande();
    envoyer({ type: 'lire-structure', demande });
  }

  return {
    noterLaTaille: (message, octets) => mesures.noterLaTaille(message, octets),
    demander,
    recevoir(message) {
      if (message.type === 'structure') {
        if (message.demande !== demande) return;
        mesures.noterLaTaille('structure', JSON.stringify(message).length);
        const debut = horloge();
        recu = { constats: message.constats, corrections: message.corrections, ignores: message.ignores, ...(message.echec ? { echec: message.echec } : {}) };
        rendre();
        mesures.noterLeRendu(horloge() - debut);
        rapport?.poser(true);
        apresLaStructure?.();
        return;
      }
      if (message.demande !== demandeDApplication) return;
      demandeDApplication = null;
      corrections.appliquee(envoyees, message.ecrites, message.sautees, message.sansAnnulation);
      pied.structureRevenue();
      demander();
    },
  };
}
