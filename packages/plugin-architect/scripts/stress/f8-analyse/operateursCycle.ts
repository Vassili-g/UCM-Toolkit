/**
 * Les opérateurs de cycle de vie du stress test F9 (section 3.4 du plan) : annulation (An, 37 cas), péremption (Pe, 39), demandes
 * concurrentes (Oc, 25), prélecture (Pr, 25), identité (Id, 11) et provisoire (Pv, 13).
 *
 * Chaque frontière de phase est un point de passage nommé : un lecteur (`sujet`, `releve`, `bibliotheques`, `catalogue`, `moteur`,
 * `regles`, `dependances`, `ignores`), la réception du provisoire, ou le rang d'une cession du budget de calcul dans la phase annoncée
 * par le dernier message de progression (`Seance.surCession`). Les cas lancent leurs demandes sans les attendre quand la suite en
 * dépend, pour que la concurrence reste déterministe.
 *
 * Oracle : P18 à P24 du plan. Une annulation rend `annulee` sans constat, ne retient ni correction ni modèle ni entrée de session, libère
 * la place et laisse la demande suivante se servir ; une lecture qui lève rend `arretee` une seule fois ; une péremption se dit une
 * fois avec sa cause ; une demande refusée pour `occupe` se voit et ne change rien à l'opération en cours ; une prélecture ne parle
 * jamais à l'interface.
 */
import { prendreLaPlaceDUneEcriture, annulerLaPrelecture } from '../../../src/sandbox/analyse';
import { traiterAvec as traiterLesCorrections } from '../../../src/sandbox/corrections';
import { creerLaPrelecture, BORNE_DE_LA_RELANCE_MS, RELANCE_DES_LIBRARIES_MS } from '../../../src/sandbox/prelecture';
import type { PluginMessage } from '../../../src/messages';
import { Registre, type CasF8, type SortieDeCas } from './cas';
import { lever, type Passage, type Plan } from './injecteur';
import {
  ajouterUneSeance, ajouterUnCasNonConstructible, chargerLInterface, etatApres, jouerSeance, MOTEUR_PARTIEL, sansConstatsDuKit,
  observationDe, photoDe, sondeDesCessions, type Attente, type CasDeSeance, type NomDEvenement, type OptionsDeSeance, type Seance,
} from './seance';

const H13 = 'hypothèse 13 de 6.1 (le statut final ignore les lectures refusées ; AAA devient AA sans le dire)';
const H20 = 'hypothèse 20 de 6.1 (`occupe` ne dit rien et met l’écriture à `null`)';
const H19 = 'hypothèse 19 de 6.1 (le panneau périmé remplace la liste par une note)';
const E38 = 'E-38';
const E39 = 'E-39';
const N71 = 'N-71';

const agir = (passage: Passage, quand: 'avant' | 'apres', faire: () => void | Promise<void>, appel = 1): Plan => ({ [passage]: [{ quand, action: { action: 'appeler', faire }, appel }] });

// ---------------------------------------------------------------------------------------------------------------------------
// An : annulation

interface Frontiere {
  readonly nom: string;
  readonly passage?: readonly [Passage, 'avant' | 'apres'];
  readonly cession?: readonly ['controles' | 'corrections', 'premiere' | 'derniere' | 'finale'];
  readonly provisoire?: true;
}

const FRONTIERES: readonly Frontiere[] = [
  { nom: 'sujet', passage: ['sujet', 'avant'] },
  { nom: 'relevé en cours', passage: ['releve', 'avant'] },
  { nom: 'relevé fini', passage: ['releve', 'apres'] },
  { nom: 'libraries en cours', passage: ['bibliotheques', 'avant'] },
  { nom: 'catalogue', passage: ['catalogue', 'avant'] },
  { nom: 'première famille de contrôles', cession: ['controles', 'premiere'] },
  { nom: 'dernière famille de contrôles', cession: ['controles', 'derniere'] },
  { nom: 'ignorés', passage: ['ignores', 'avant'] },
  { nom: 'provisoire envoyé', provisoire: true },
  { nom: 'dépendances', passage: ['dependances', 'avant'] },
  { nom: 'moteur', passage: ['moteur', 'avant'] },
  { nom: 'règles', passage: ['regles', 'avant'] },
  { nom: 'corrections', cession: ['corrections', 'premiere'] },
  { nom: 'cession finale', cession: ['corrections', 'finale'] },
];

function operateursAn(r: Registre): void {
  for (const mode of ['identite', 'demande'] as const) {
    for (const frontiere of FRONTIERES) {
      const libelle = `annulation ${mode === 'identite' ? 'par identité' : 'par numéro de demande'} à la frontière « ${frontiere.nom} »`;
      if (mode === 'identite' && frontiere.nom === 'sujet') {
        ajouterUnCasNonConstructible(r, 'An', libelle, 'l’identité n’existe qu’après la lecture du sujet : l’interface annule par numéro de demande tant qu’elle ne l’a pas reçue');
        continue;
      }
      ajouterUneSeance(r, 'An', {
        description: libelle, relations: [],
        options: {
          avecUnModele: true,
          ...(frontiere.cession ? { avecCessions: true } : {}),
          ...(frontiere.passage ? { plan: (s: Seance) => agir(frontiere.passage![0], frontiere.passage![1], () => s.annuler(mode)) } : {}),
        },
        flux: async (s) => {
          if (frontiere.cession) {
            const [phase, position] = frontiere.cession;
            const sonde = await sondeDesCessions();
            const rang = position === 'premiere' ? 1 : phase === 'controles' ? sonde.controles : sonde.corrections;
            s.surCession(phase, rang, position === 'finale' ? () => { setTimeout(() => { void s.annuler(mode); }, 0); } : () => s.annuler(mode));
          }
          if (frontiere.provisoire) s.surMessage.push((m) => { if (m.type === 'analyse-provisoire') void s.annuler(mode); });
          await s.demander();
          s.photo('apres');
          s.desarmer();
          await s.demander();
        },
        attente: { statuts: ['annulee', 'complete'] },
        ...(['règles', 'corrections', 'cession finale'].includes(frontiere.nom) ? { rattachement: N71 } : {}),
        plus: (sortie) => {
          const apres = photoDe(sortie, 'apres');
          const messages: string[] = [];
          if (apres.entree || apres.corrections || apres.modeles > 0) messages.push(`retenu après l’annulation : entrée de session ${apres.entree}, corrections ${apres.corrections}, modèles ${apres.modeles}`);
          if (apres.place !== null) messages.push(`la place reste prise après l’annulation (${String(apres.place)})`);
          if (apres.constatsParFinal[0] !== 0) messages.push(`le message annulee porte ${apres.constatsParFinal[0]} constat(s)`);
          return messages;
        },
      });
    }
  }

  const sansEffet = (description: string, flux: CasDeSeance['flux'], attente: Attente, plus?: CasDeSeance['plus'], options?: OptionsDeSeance): void =>
    ajouterUneSeance(r, 'An', { description, flux, attente, relations: [], ...(options ? { options } : {}), ...(plus ? { plus } : {}) });
  sansEffet('annulation après le final', async (s) => { await s.demander(); await s.annuler('identite'); },
    { statuts: ['complete'], retenue: true }, undefined);
  sansEffet('annulation d’une identité périmée, pendant la seconde analyse', async (s) => {
    await s.demander();
    s.drapeaux.ancienne = true;
    await s.demander();
  }, { statuts: ['complete', 'complete'], retenue: true }, undefined, {
    adaptateurs: [(_b, lecteurs, s) => ({ ...lecteurs, releve: async (...args) => { if (s.drapeaux.ancienne && !s.drapeaux.fait) { s.drapeaux.fait = true; await s.demander({ type: 'annuler-analyse', analyse: s.messages.find((m): m is Extract<PluginMessage, { type: 'analyse-commencee' }> => m.type === 'analyse-commencee')!.analyse }); } return lecteurs.releve(...args); } })],
  });
  sansEffet('annulation d’une identité périmée, après la seconde analyse', async (s) => {
    await s.demander();
    const premiere = s.identiteCourante()!;
    await s.demander();
    await s.demander({ type: 'annuler-analyse', analyse: premiere });
  }, { statuts: ['complete', 'complete'], retenue: true });
  sansEffet('annulation sans analyse', async (s) => { await s.demander({ type: 'annuler-analyse', demande: 1 }); await s.demander({ type: 'annuler-analyse' }); },
    { statuts: [], libre: true, retenue: false }, (sortie) => (observationDe(sortie).types.length === 0 ? [] : [`${observationDe(sortie).types.length} message(s) pour une annulation sans analyse`]));
  sansEffet('annulation deux fois', async (s) => { await s.demander(); },
    { statuts: ['annulee'] }, undefined, { plan: (s) => agir('releve', 'avant', async () => { await s.annuler('identite'); await s.annuler('identite'); }) });

  const immediate = (description: string, mode: 'identite' | 'demande', passage: Passage): void =>
    ajouterUneSeance(r, 'An', {
      description, relations: [],
      options: { plan: (s) => agir(passage, 'avant', () => s.annuler(mode)) },
      flux: async (s) => {
        s.surMessage.push((m) => { if (m.type === 'analyse' && m.statut === 'annulee') setTimeout(() => { s.garder(s.demander()); }, 0); });
        await s.demander();
        await new Promise((fin) => setTimeout(fin, 5));
      },
      attente: { statuts: ['annulee', 'complete'], occupes: 0, retenue: true },
      plus: (sortie) => (observationDe(sortie).constatsParFinal[0] === 0 && observationDe(sortie).provisoires === 1 ? [] : [`la première analyse laisse ${observationDe(sortie).provisoires - 1} provisoire(s) de trop ou des constats`]),
    });
  immediate('annulation par identité au relevé, suivie d’une demande immédiate', 'identite', 'releve');
  immediate('annulation par numéro de demande au sujet, suivie d’une demande immédiate', 'demande', 'sujet');

  ajouterUneSeance(r, 'An', {
    description: 'annulation de la prélecture par un événement : elle s’arrête sans rien dire, puis une analyse est servie',
    relations: [],
    options: { plan: (s) => agir('releve', 'avant', () => { s.evenement('noeud'); }) },
    flux: async (s) => {
      await s.demander({ type: 'analyser', origine: 'prelecture' });
      s.photo('apres');
      s.desarmer();
      s.monter();
      await s.demander();
    },
    attente: { statuts: ['complete'], occupes: 0 },
    plus: (sortie) => {
      const apres = photoDe(sortie, 'apres');
      return [...(apres.types.length > 0 ? [`la prélecture a parlé : ${apres.types.join(', ')}`] : []), ...(apres.entree || apres.modeles > 0 ? ['la prélecture annulée a promu son entrée ou son modèle'] : [])];
    },
  });
  ajouterUneSeance(r, 'An', {
    description: 'annulation du designer par numéro de demande pendant une prélecture : la prélecture n’a pas de demande, elle continue en silence et promeut',
    relations: [],
    options: { plan: (s) => agir('releve', 'avant', () => s.annuler('demande', 1)) },
    flux: async (s) => { await s.demander({ type: 'analyser', origine: 'prelecture' }); },
    attente: { statuts: [], occupes: 0, entree: true },
    plus: (sortie) => (observationDe(sortie).types.length === 0 ? [] : [`la prélecture a parlé : ${observationDe(sortie).types.join(', ')}`]),
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// Pe : péremption

const EVENEMENTS: readonly NomDEvenement[] = ['noeud', 'hors-inventaire', 'style', 'autre-jeu', 'variant', 'page', 'ecriture', 'annulation', 'suppression'];
const LIBELLES: Readonly<Record<NomDEvenement, string>> = {
  noeud: 'changement d’un nœud de l’inventaire', 'hors-inventaire': 'changement hors inventaire', style: 'changement de style', 'autre-jeu': 'sélection d’un autre jeu',
  variant: 'sélection d’un variant du même jeu', page: 'changement de page', ecriture: 'écriture du plugin', annulation: 'Ctrl+Z', suppression: 'suppression du sujet',
};
/** La cause que l'analyse ouverte rend pour chaque événement ; `null` : l'événement ne la touche pas. */
const CAUSE: Readonly<Record<NomDEvenement, string | null>> = {
  noeud: 'document', 'hors-inventaire': null, style: 'document', 'autre-jeu': 'selection', variant: null, page: 'document', ecriture: 'ecriture', annulation: 'document', suppression: 'document',
};

function operateursPe(r: Registre): void {
  const phases: ReadonlyArray<readonly ['avant l’ouverture' | 'relevé' | 'moteur' | 'après le final', Passage | null]> = [['avant l’ouverture', 'sujet'], ['relevé', 'releve'], ['moteur', 'moteur'], ['après le final', null]];
  for (const evenement of EVENEMENTS) {
    for (const [phase, passage] of phases) {
      const cause = CAUSE[evenement];
      // Avant l'ouverture, aucune analyse n'est courante : seuls les événements rejoués à l'ouverture, avec l'inventaire, la périment.
      const avant = passage === 'sujet';
      const rejoue = ['noeud', 'style', 'annulation', 'suppression'].includes(evenement);
      const ambigu = avant && (evenement === 'autre-jeu' || evenement === 'page');
      const perimes = avant ? (rejoue ? ['document'] : []) : cause ? [cause] : [];
      ajouterUneSeance(r, 'Pe', {
        description: `${LIBELLES[evenement]} ${passage === null ? 'après le final' : `pendant la phase « ${phase} »`}`, relations: [],
        ...(ambigu ? { question: 'à trancher' } : {}),
        options: passage === null ? {} : { plan: (s) => agir(passage, 'avant', () => { s.evenement(evenement); }) },
        flux: async (s) => { await s.demander(); if (passage === null) s.evenement(evenement); },
        attente: {
          statuts: ['complete'],
          ...(avant && evenement === 'ecriture' ? {} : { perimes }),
          ...(passage === null && cause ? { ecran: { dit: [/a changé|Actualis/i], dansLeTexte: true, sectionsAuMoins: 1 } } : {}),
        },
        plus: avant && evenement === 'ecriture' ? (sortie) => (observationDe(sortie).perimes.length === 1 ? [] : [`${observationDe(sortie).perimes.length} message(s) perime, attendu 1`]) : undefined,
        ...(passage === null && cause ? { rattachement: `${H19} ; ${E38}` } : {}),
      });
    }
  }
  ajouterUneSeance(r, 'Pe', {
    description: 'changement d’un nœud de l’inventaire pendant le provisoire', relations: [],
    flux: async (s) => { s.surMessage.push((m) => { if (m.type === 'analyse-provisoire') s.evenement('noeud'); }); await s.demander(); },
    attente: { statuts: ['complete'], provisoires: 1, perimes: ['document'] },
  });
  ajouterUneSeance(r, 'Pe', {
    description: 'changement d’un nœud de l’inventaire pendant une écriture du plugin qui tient la place', relations: [],
    flux: async (s) => {
      await s.demander();
      const place = await prendreLaPlaceDUneEcriture(s.identiteCourante()!);
      s.evenement('noeud');
      if ('liberer' in place) place.liberer();
    },
    attente: { statuts: ['complete'], perimes: ['document'] },
  });
  ajouterUneSeance(r, 'Pe', {
    description: 'journal débordé : 5 001 changements hors inventaire pendant le relevé, l’analyse se périme ou se relit (le journal a perdu des changements)', relations: [],
    options: { plan: (s) => agir('releve', 'avant', () => { s.evenementsHorsInventaire(5001); }) },
    question: 'à trancher', attente: { statuts: ['complete'], perimes: ['document'] },
    plus: (sortie) => (observationDe(sortie).interrompue && observationDe(sortie).aRelire ? [] : [`journal débordé sans couverture interrompue (interrompue ${observationDe(sortie).interrompue}, à relire ${observationDe(sortie).aRelire})`]),
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// Oc : demandes concurrentes

const demandeSuivante = (s: Seance, plus: Record<string, unknown> = {}): void => { s.garder(s.demander({ type: 'analyser', demande: ++s.numero, ...plus } as never)); };

function operateursOc(r: Registre): void {
  const phases: ReadonlyArray<readonly [string, Passage]> = [['le sujet', 'sujet'], ['le relevé', 'releve'], ['le catalogue', 'catalogue'], ['le moteur', 'moteur'], ['les règles', 'regles']];
  for (const [libelle, passage] of phases) {
    ajouterUneSeance(r, 'Oc', {
      description: `deuxième analyse demandée pendant ${libelle} : retour \`occupe\`, la première finit`, relations: [],
      options: { plan: (s) => agir(passage, 'avant', () => { demandeSuivante(s); }) },
      attente: { statuts: ['complete'], occupes: 1, retenue: true },
      plus: (sortie) => (observationDe(sortie).types.filter((t) => t === 'analyse-commencee').length === 1 ? [] : ['la demande refusée a ouvert une seconde analyse']),
    });
  }

  const identiteDEcriture = { sujet: 'Button', generation: 999 };
  const ecritures = { lot: async () => ({ ecrites: [], sautees: [] }), selectionner: async () => undefined };
  ajouterUneSeance(r, 'Oc', {
    description: 'analyse demandée pendant une écriture', relations: [],
    flux: async (s) => { const place = await prendreLaPlaceDUneEcriture(identiteDEcriture); await s.demander(); if ('liberer' in place) place.liberer(); },
    attente: { statuts: [], occupes: 1, libre: true },
    plus: (sortie) => (observationDe(sortie).types.includes('analyse-commencee') ? ['l’analyse a pris la place d’une écriture'] : []),
  });
  ajouterUneSeance(r, 'Oc', {
    description: 'écriture demandée pendant une analyse : refusée, l’analyse finit', relations: [],
    options: { plan: (s) => agir('releve', 'avant', async () => { s.drapeaux.ecritureRefusee = 'occupe' in (await prendreLaPlaceDUneEcriture(identiteDEcriture)); }) },
    attente: { statuts: ['complete'], retenue: true },
    plus: (sortie) => ((sortie.donnees as { refusee?: boolean }).refusee === true ? [] : ['l’écriture a pris la place pendant une analyse']),
    extra: (s) => ({ refusee: s.drapeaux.ecritureRefusee }),
  });
  ajouterUneSeance(r, 'Oc', {
    description: 'deux écritures : la seconde est refusée', relations: [],
    flux: async (s) => {
      const premiere = await prendreLaPlaceDUneEcriture(identiteDEcriture);
      const seconde = await prendreLaPlaceDUneEcriture(identiteDEcriture);
      s.drapeaux.secondeRefusee = 'occupe' in seconde;
      if ('liberer' in premiere) premiere.liberer();
      if ('liberer' in seconde) seconde.liberer();
    },
    attente: { statuts: [] }, extra: (s) => ({ refusee: s.drapeaux.secondeRefusee }),
    plus: (sortie) => ((sortie.donnees as { refusee?: boolean }).refusee === true ? [] : ['la seconde écriture a pris la place']),
  });
  ajouterUneSeance(r, 'Oc', {
    description: 'modèle demandé pendant une analyse : `occupe`', relations: [],
    options: { plan: (s) => agir('releve', 'avant', async () => { await traiterLesCorrections(ecritures)({ type: 'servir-de-modele', analyse: s.identiteCourante()!, variant: 'x' }, s.contexte); }) },
    attente: { statuts: ['complete'], occupes: 1, retenue: true },
  });
  ajouterUnCasNonConstructible(r, 'Oc', 'analyse demandée pendant un modèle', '`servirDeModele` ne cède la main nulle part entre la prise et la libération de la place : aucune analyse ne s’y glisse');

  ajouterUneSeance(r, 'Oc', {
    description: 'demande sur une analyse périmée : elle est annulée et la demande est servie', relations: [],
    options: { plan: (s) => agir('releve', 'avant', async () => { s.evenement('noeud'); demandeSuivante(s); }) },
    attente: { statuts: ['annulee', 'complete'], occupes: 0, retenue: true },
    rattachement: E39,
  });
  ajouterUneSeance(r, 'Oc', {
    description: 'demande sur une analyse périmée pendant une écriture : l’écriture garde la place, `occupe` visible', relations: [],
    flux: async (s) => {
      await s.demander();
      s.evenement('noeud');
      const place = await prendreLaPlaceDUneEcriture(s.identiteCourante()!);
      await s.demander();
      s.photo('pendant');
      if ('liberer' in place) place.liberer();
    },
    attente: { statuts: ['complete'], occupes: 1 },
    plus: (sortie) => (photoDe(sortie, 'pendant').place === 'ecriture' ? [] : [`la place n’est plus à l’écriture pendant la demande (${String(photoDe(sortie, 'pendant').place)})`]),
    rattachement: E39,
  });
  ajouterUneSeance(r, 'Oc', {
    description: 'Actualiser demandé pendant une analyse : `occupe`', relations: [],
    options: { plan: (s) => agir('releve', 'avant', () => { demandeSuivante(s, { intention: 'actualiser' }); }) },
    attente: { statuts: ['complete'], occupes: 1 },
  });
  ajouterUneSeance(r, 'Oc', {
    description: 'prélecture demandée pendant une analyse : silence, ni `occupe` ni message', relations: [],
    options: { plan: (s) => agir('releve', 'avant', () => { s.garder(s.demander({ type: 'analyser', origine: 'prelecture' })); }) },
    attente: { statuts: ['complete'], occupes: 0 },
    plus: (sortie) => (observationDe(sortie).types.filter((t) => t === 'analyse-commencee').length === 1 ? [] : ['la prélecture a ouvert une analyse devant l’interface']),
  });
  ajouterUneSeance(r, 'Oc', {
    description: 'analyse demandée pendant une prélecture : la prélecture devient l’analyse du clic', relations: [],
    options: { plan: (s) => agir('sujet', 'apres', () => { demandeSuivante(s); }) },
    flux: async (s) => { await s.demander({ type: 'analyser', origine: 'prelecture' }); },
    attente: { statuts: ['complete'], occupes: 0, retenue: true },
  });
  ajouterUneSeance(r, 'Oc', {
    description: 'Actualiser demandé pendant une prélecture : elle s’arrête et la demande est servie', relations: [],
    options: { plan: (s) => agir('releve', 'avant', () => { demandeSuivante(s, { intention: 'actualiser' }); }) },
    flux: async (s) => { await s.demander({ type: 'analyser', origine: 'prelecture' }); },
    attente: { statuts: ['complete'], occupes: 0, retenue: true },
  });
  ajouterUnCasNonConstructible(r, 'Oc', 'capture demandée pendant une prélecture', '`capturerSiDemande` lit l’arbre Figma entier (`capture.ts`), que le double du banc ne porte pas');

  interfaceOc(r);

  const trois = (description: string, cadence: (s: Seance) => Promise<void>, attente: Attente): void =>
    ajouterUneSeance(r, 'Oc', {
      description: `trois demandes à la suite, ${description}`, relations: [], flux: cadence, attente,
      plus: (sortie) => {
        const { generations } = observationDe(sortie);
        return generations.every((g, i) => i === 0 || g > generations[i - 1]) ? [] : [`générations ${generations.join(', ')} : elles doivent croître`];
      },
    });
  trois('chacune attendue', async (s) => { await s.demander(); await s.demander(); await s.demander(); }, { statuts: ['complete', 'complete', 'complete'], occupes: 0 });
  trois('chacune lancée au tour de macrotâche suivant', async (s) => {
    for (let rang = 0; rang < 3; rang += 1) { await s.demander(); await new Promise((fin) => setTimeout(fin, 0)); }
  }, { statuts: ['complete', 'complete', 'complete'], occupes: 0 });
  trois('lancées toutes ensemble : les deux dernières reçoivent `occupe`', async (s) => { s.garder(s.demander()); s.garder(s.demander()); s.garder(s.demander()); }, { statuts: ['complete'], occupes: 2 });
}

/**
 * Les cinq cas « côté interface » : `occupe` ne change rien à l'opération en cours. Un Analyser ou un Actualiser refusé porte `demande`
 * (B7) et laisse l'écriture affichée ; un refus d'écriture n'en porte pas et fait tomber le verrou, car rien n'a été écrit.
 */
function interfaceOc(r: Registre): void {
  const identite = { sujet: 'Alert', generation: 3 };
  const final = { type: 'analyse', analyse: identite, statut: 'complete', constats: [], lecture: null, variants: [{ id: '1', nom: 'Alert' }], sansTokens: false } as unknown as PluginMessage;
  const commencee = { type: 'analyse-commencee', analyse: identite } as PluginMessage;
  const cas = (description: string, deroule: (ui: Awaited<ReturnType<typeof chargerLInterface>>) => unknown, juger: (etat: Record<string, unknown> & { analyse: Record<string, unknown> | null }) => string[], rattachement?: string): void => {
    r.ajouter('Oc', {
      description: `côté interface : ${description}`, relations: [], ...(rattachement ? { rattachement } : {}),
      jouer: async (): Promise<SortieDeCas> => ({ constats: [], donnees: { etat: await deroule(await chargerLInterface()) } }),
      verifier: (sortie) => juger((sortie.donnees as { etat: Record<string, unknown> & { analyse: Record<string, unknown> | null } }).etat),
    });
  };
  const ecritureEnCours = (ui: Awaited<ReturnType<typeof chargerLInterface>>) => {
    const etat = ui.etatInitial();
    ui.recevoir(etat, final);
    ui.noterLEnvoi(etat, ['a'], 1);
    return etat;
  };
  cas('`occupe` pendant une écriture : l’écriture affichée continue', (ui) => { const etat = ecritureEnCours(ui); ui.recevoir(etat, { type: 'occupe', analyse: identite, demande: 2 }); return etat; },
    (etat) => (etat.analyse?.ecriture === null ? ['`occupe` a mis `ecriture` à null alors que l’écriture continue'] : []), H20);
  cas('`occupe` pendant un calcul : l’analyse reste en cours', (ui) => { const etat = ui.etatInitial(); ui.recevoir(etat, commencee); ui.recevoir(etat, { type: 'occupe', analyse: identite }); return etat; },
    (etat) => (etat.analyse?.statut === 'en-cours' ? [] : [`statut ${String(etat.analyse?.statut)}, attendu en-cours`]));
  cas('`occupe` d’une identité inconnue : ignoré', (ui) => { const etat = ecritureEnCours(ui); ui.recevoir(etat, { type: 'occupe', analyse: { sujet: 'Autre', generation: 9 } }); return etat; },
    (etat) => (etat.analyse?.ecriture === null ? ['`occupe` d’une autre identité a touché l’écriture affichée'] : []));
  cas('`occupe` sans analyse retenue : aucun effet, aucune exception', (ui) => { const etat = ui.etatInitial(); ui.recevoir(etat, { type: 'occupe', analyse: identite }); return etat; },
    (etat) => (etat.analyse === null ? [] : ['`occupe` a ouvert une analyse']));
  cas('`occupe` deux fois pendant une écriture : l’écriture affichée continue', (ui) => { const etat = ecritureEnCours(ui); ui.recevoir(etat, { type: 'occupe', analyse: identite, demande: 2 }); ui.recevoir(etat, { type: 'occupe', analyse: identite, demande: 3 }); return etat; },
    (etat) => (etat.analyse?.ecriture === null ? ['`occupe` a mis `ecriture` à null alors que l’écriture continue'] : []), H20);
}

// ---------------------------------------------------------------------------------------------------------------------------
// Pr : prélecture

function operateursPr(r: Registre): void {
  const prelecture = (flux: NonNullable<CasDeSeance['flux']>): NonNullable<CasDeSeance['flux']> => flux;
  const silence = (sortie: SortieDeCas, apres = 'avant'): string[] => {
    const obs = (sortie.donnees as { photos: Record<string, ReturnType<typeof observationDe>> }).photos[apres];
    return obs && obs.types.length > 0 ? [`l’interface a reçu ${obs.types.join(', ')} avant le clic`] : [];
  };
  const clicPendant = (passage: Passage, quand: 'avant' | 'apres'): void =>
    ajouterUneSeance(r, 'Pr', {
      description: `clic Analyser pendant la prélecture, phase « ${passage} »`, relations: [],
      options: { plan: (s) => agir(passage, quand, () => { s.photo('avant'); demandeSuivante(s); }) },
      flux: prelecture(async (s) => { await s.demander({ type: 'analyser', origine: 'prelecture' }); }),
      attente: { statuts: ['complete'], occupes: 0, retenue: true }, plus: (sortie) => silence(sortie),
    });
  clicPendant('sujet', 'apres');
  clicPendant('releve', 'avant');
  clicPendant('catalogue', 'avant');
  clicPendant('moteur', 'avant');
  ajouterUneSeance(r, 'Pr', {
    description: 'Actualiser pendant la prélecture : elle s’arrête sans rien dire, puis la demande est servie', relations: [],
    options: { plan: (s) => agir('releve', 'avant', () => { s.photo('avant'); demandeSuivante(s, { intention: 'actualiser' }); }) },
    flux: async (s) => { await s.demander({ type: 'analyser', origine: 'prelecture' }); },
    attente: { statuts: ['complete'], occupes: 0, retenue: true }, plus: (sortie) => silence(sortie),
  });
  ajouterUnCasNonConstructible(r, 'Pr', 'capture pendant la prélecture', '`capturerSiDemande` lit l’arbre Figma entier (`capture.ts`), que le double du banc ne porte pas');

  const ecriturePendant = (passage: Passage, quand: 'avant' | 'apres'): void =>
    ajouterUneSeance(r, 'Pr', {
      description: `écriture demandée pendant la prélecture, phase « ${passage} » : elle prend la place sans \`occupe\`, la prélecture s’arrête en silence`, relations: [],
      options: { plan: (s) => agir(passage, quand, () => { s.garder((async () => { const place = await prendreLaPlaceDUneEcriture({ sujet: 'Button', generation: 999 }); s.drapeaux.ecritureAvecLaPlace = 'liberer' in place; if ('liberer' in place) place.liberer(); })()); }) },
      flux: async (s) => { await s.demander({ type: 'analyser', origine: 'prelecture' }); },
      attente: { statuts: [], occupes: 0, retenue: false },
      extra: (s) => ({ ecritureAvecLaPlace: s.drapeaux.ecritureAvecLaPlace }),
      plus: (sortie) => [
        ...((sortie.donnees as { ecritureAvecLaPlace?: boolean }).ecritureAvecLaPlace === true ? [] : ['l’écriture n’a pas obtenu la place']),
        ...(observationDe(sortie).types.length > 0 ? [`la prélecture a parlé : ${observationDe(sortie).types.join(', ')}`] : []),
      ],
    });
  ecriturePendant('sujet', 'apres');
  ecriturePendant('releve', 'avant');
  ecriturePendant('moteur', 'avant');

  const evenementPendant = (passage: Passage): void =>
    ajouterUneSeance(r, 'Pr', {
      description: `événement du document pendant la prélecture, phase « ${passage} » : elle s’arrête sans promouvoir`, relations: [],
      options: { plan: (s) => agir(passage, 'avant', () => { s.evenement('noeud'); }) },
      flux: async (s) => { await s.demander({ type: 'analyser', origine: 'prelecture' }); },
      attente: { statuts: [], occupes: 0, retenue: false, modeles: 0 },
      plus: (sortie) => (observationDe(sortie).types.length > 0 ? [`la prélecture a parlé : ${observationDe(sortie).types.join(', ')}`] : []),
    });
  for (const passage of ['sujet', 'releve', 'catalogue', 'moteur', 'regles'] as const) evenementPendant(passage);

  ajouterUneSeance(r, 'Pr', {
    description: 'seconde prélecture demandée pendant l’annulation de la première : elle attend la fin de la première', relations: [],
    options: { plan: (s) => agir('releve', 'avant', () => { annulerLaPrelecture(); s.garder(s.demander({ type: 'analyser', origine: 'prelecture' })); }) },
    flux: async (s) => { await s.demander({ type: 'analyser', origine: 'prelecture' }); },
    attente: { statuts: [], occupes: 0, entree: true },
    plus: (sortie) => (observationDe(sortie).types.length > 0 ? [`une prélecture a parlé : ${observationDe(sortie).types.join(', ')}`] : []),
  });
  ajouterUneSeance(r, 'Pr', {
    description: 'entrée de session utilisable : la prélecture ne lit rien', relations: [],
    flux: async (s) => { await s.demander(); s.photo('avant'); await s.demander({ type: 'analyser', origine: 'prelecture' }); },
    attente: { statuts: ['complete'], occupes: 0 },
    plus: (sortie) => (observationDe(sortie).passages.filter((p) => p.startsWith('releve:')).length === 1 ? [] : [`${observationDe(sortie).passages.filter((p) => p.startsWith('releve:')).length} lectures du relevé, attendu 1`]),
  });
  ajouterUneSeance(r, 'Pr', {
    description: 'analyse non périmée affichée : la prélecture ne lit rien', relations: [],
    flux: async (s) => { await s.demander(); await s.demander({ type: 'analyser', origine: 'prelecture' }); },
    attente: { statuts: ['complete'], occupes: 0 },
    plus: (sortie) => (observationDe(sortie).passages.filter((p) => p.startsWith('sujet:')).length === 1 ? [] : [`${observationDe(sortie).passages.filter((p) => p.startsWith('sujet:')).length} lectures du sujet, attendu 1`]),
  });
  ajouterUneSeance(r, 'Pr', {
    description: 'analyse périmée affichée : la prélecture lit et promeut en silence', relations: [],
    flux: async (s) => { await s.demander(); s.evenement('noeud'); s.photo('avant'); await s.demander({ type: 'analyser', origine: 'prelecture' }); },
    attente: { statuts: ['complete'], occupes: 0, entree: true, perimes: ['document'] },
    plus: (sortie) => (observationDe(sortie).types.filter((t) => t === 'analyse-commencee').length === 1 ? [] : ['la prélecture a ouvert une analyse devant l’interface']),
  });

  const importEvite: NonNullable<OptionsDeSeance['adaptateurs']>[number] = (_b, lecteurs) => ({
    ...lecteurs,
    catalogue: async (releve, jeton, contexte, cooperation, libraries, inventaires, options) => {
      if (options?.sansImport) options.importsEvites?.(1);
      return lecteurs.catalogue(releve, jeton, contexte, cooperation, libraries, inventaires, options);
    },
  });
  ajouterUneSeance(r, 'Pr', {
    description: 'import évité par la prélecture, sans clic : elle ne promeut rien', relations: [],
    options: { adaptateurs: [importEvite] },
    flux: async (s) => { await s.demander({ type: 'analyser', origine: 'prelecture' }); },
    attente: { statuts: [], occupes: 0, retenue: false },
    plus: (sortie) => (observationDe(sortie).types.length > 0 ? [`la prélecture a parlé : ${observationDe(sortie).types.join(', ')}`] : []),
  });
  ajouterUneSeance(r, 'Pr', {
    description: 'import évité par la prélecture, puis clic : le clic ne prend pas la prélecture et relit', relations: [],
    options: { adaptateurs: [importEvite], plan: (s) => agir('moteur', 'avant', () => { demandeSuivante(s); }) },
    flux: async (s) => { await s.demander({ type: 'analyser', origine: 'prelecture' }); },
    attente: { statuts: ['complete'], occupes: 0, retenue: true },
    plus: (sortie) => (observationDe(sortie).passages.filter((p) => p.startsWith('catalogue:')).length >= 2 ? [] : ['le catalogue n’a pas été relu avec ses imports pour le clic']),
  });

  relancesDesLibraries(r);

  for (const partielle of [false, true]) {
    ajouterUneSeance(r, 'Pr', {
      description: `prélecture promue, puis clic : l’analyse ${partielle ? 'partielle' : 'complète'} est la même qu’à froid`, relations: [],
      options: { adaptateurs: partielle ? [MOTEUR_PARTIEL] : [] },
      flux: async (s) => { await s.demander({ type: 'analyser', origine: 'prelecture' }); s.photo('avant'); await s.demander(); },
      attente: { statuts: [partielle ? 'partielle' : 'complete'], occupes: 0, ...(partielle ? {} : { retenue: true }) },
      extra: async (s) => {
        const froide = await jouerSeance({ adaptateurs: partielle ? [MOTEUR_PARTIEL] : [] }, async (f) => { await f.demander(); });
        return { froide: observationDe(froide).codes.slice().sort().join(',') + `|${observationDe(froide).statut}` };
      },
      plus: (sortie) => {
        const o = observationDe(sortie);
        const apres = `${o.codes.slice().sort().join(',')}|${o.statut}`;
        return apres === (sortie.donnees as { froide: string }).froide ? [] : ['l’analyse après prélecture diffère de l’analyse à froid'];
      },
      rattachement: undefined,
    });
  }
}

/** La relance des libraries (`prelecture.ts`) : elle se tait pendant une prélecture et une écriture, et s'arrête 2 minutes après la sélection. */
function relancesDesLibraries(r: Registre): void {
  const monter = (operation: 'prelecture' | 'ecriture' | null) => {
    let maintenant = 0;
    const attentes: Array<{ rappel: () => void; a: number }> = [];
    let relances = 0;
    const prelecture = creerLaPrelecture({
      aUnSujet: () => true, lancer: async () => {}, annuler() {}, operationEnCours: () => operation, analysesDuDesigner: () => 0,
      relancerLesLibraries: async () => { relances += 1; },
      planifier: (rappel, ms) => { const entree = { rappel, a: maintenant + ms }; attentes.push(entree); return () => { const rang = attentes.indexOf(entree); if (rang >= 0) attentes.splice(rang, 1); }; },
      maintenant: () => maintenant,
    });
    prelecture.surSelection();
    const avancer = (ms: number): void => {
      const fin = maintenant + ms;
      for (;;) {
        const suivante = attentes.filter((entree) => entree.a <= fin).sort((a, b) => a.a - b.a)[0];
        if (!suivante) break;
        attentes.splice(attentes.indexOf(suivante), 1);
        maintenant = suivante.a;
        suivante.rappel();
      }
      maintenant = fin;
    };
    return { avancer, relances: () => relances };
  };
  const cas = (description: string, deroule: () => number, voulu: (n: number) => boolean, dit: string): void => {
    r.ajouter('Pr', {
      description: `relance des libraries : ${description}`, relations: [],
      jouer: async (): Promise<SortieDeCas> => ({ constats: [], donnees: { relances: deroule() } }),
      verifier: (sortie) => (voulu((sortie.donnees as { relances: number }).relances) ? [] : [`${(sortie.donnees as { relances: number }).relances} relance(s) : ${dit}`]),
    });
  };
  cas('pendant une prélecture, aucune relance', () => { const m = monter('prelecture'); m.avancer(30_000); return m.relances(); }, (n) => n === 0, 'attendu aucune');
  cas('pendant une écriture, aucune relance', () => { const m = monter('ecriture'); m.avancer(30_000); return m.relances(); }, (n) => n === 0, 'attendu aucune');
  r.ajouter('Pr', {
    description: 'relance des libraries : toutes les 5 s jusqu’à 2 minutes après la sélection, puis plus aucune', relations: [],
    jouer: async (): Promise<SortieDeCas> => {
      const m = monter(null);
      m.avancer(BORNE_DE_LA_RELANCE_MS);
      const avant = m.relances();
      m.avancer(60_000);
      return { constats: [], donnees: { avant, apres: m.relances() - avant, pas: RELANCE_DES_LIBRARIES_MS } };
    },
    verifier: (sortie) => {
      const { avant, apres } = sortie.donnees as { avant: number; apres: number };
      return [...(avant >= 1 ? [] : ['aucune relance avant la borne de 2 minutes']), ...(apres === 0 ? [] : [`${apres} relance(s) après la borne de 2 minutes`])];
    },
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// Id : identité

function operateursId(r: Registre): void {
  const ident = (generation: number, sujet = 'Alert') => ({ sujet, generation });
  const variants = [{ id: '1', nom: 'Alert' }];
  const message = (type: string, generation: number, plus: Record<string, unknown> = {}): PluginMessage => (
    { type, analyse: ident(generation), ...(type === 'analyse' ? { statut: 'complete', constats: [], lecture: null, variants, sansTokens: false } : {}), ...(type === 'analyse-provisoire' ? { constats: [], ignores: [], lecture: null, variants } : {}), ...plus } as unknown as PluginMessage);
  const cas = (description: string, messages: readonly PluginMessage[], juger: (etat: { analyse: { identite: { generation: number }; statut: string; perimee: boolean; progression: unknown } | null }) => string[]): void => {
    r.ajouter('Id', {
      description, relations: [],
      jouer: async (): Promise<SortieDeCas> => {
        const ui = await chargerLInterface();
        const etat = ui.etatInitial();
        for (const m of messages) ui.recevoir(etat, m);
        return { constats: [], donnees: { etat } };
      },
      verifier: (sortie) => juger((sortie.donnees as { etat: never }).etat),
    });
  };
  const courante = [message('analyse-commencee', 2), message('analyse', 2)];
  const inchangee = (etat: { analyse: { identite: { generation: number }; statut: string; perimee: boolean } | null }): string[] =>
    (etat.analyse?.identite.generation === 2 && etat.analyse.statut === 'complete' && !etat.analyse.perimee ? [] : [`l’état a changé : génération ${String(etat.analyse?.identite.generation)}, statut ${String(etat.analyse?.statut)}, périmée ${String(etat.analyse?.perimee)}`]);
  cas('final tardif d’une analyse précédente', [...courante, message('analyse', 1, { statut: 'partielle' })], inchangee);
  cas('provisoire tardif d’une analyse précédente', [...courante, message('analyse-provisoire', 1)], inchangee);
  cas('`perime` tardif d’une analyse précédente', [...courante, message('perime', 1, { cause: 'document' })], inchangee);
  cas('progression tardive d’une analyse précédente', [...courante, message('analyse-en-cours', 1, { variantsLus: 1, variantsTotal: 2 })], inchangee);
  cas('`analyse-commencee` de génération égale', [...courante, message('analyse-commencee', 2)], inchangee);
  cas('`analyse-commencee` de génération inférieure', [...courante, message('analyse-commencee', 1)], inchangee);
  cas('final sans `analyse-commencee`', [message('analyse', 4)], (etat) => (etat.analyse?.identite.generation === 4 && etat.analyse.statut === 'complete' ? [] : ['le final seul n’ouvre pas l’analyse']));
  cas('provisoire sans `analyse-commencee`', [message('analyse-provisoire', 4)], (etat) => (etat.analyse?.identite.generation === 4 && etat.analyse.statut === 'provisoire' ? [] : ['le provisoire seul n’ouvre pas l’analyse']));

  ajouterUneSeance(r, 'Id', {
    description: 'sujets A, B puis A : trois analyses aux générations croissantes, une entrée de session par sujet', relations: [],
    options: { adaptateurs: [(b, lecteurs, s) => ({ ...lecteurs, sujet: async (contexte) => { const sujet = await lecteurs.sujet(contexte); return sujet ? { ...sujet, cle: s.drapeaux.sujetB ? 'Alert' : 'Button' } : sujet; } })] },
    flux: async (s) => { await s.demander(); s.drapeaux.sujetB = true; await s.demander(); s.drapeaux.sujetB = false; await s.demander(); },
    attente: { statuts: ['complete', 'complete', 'complete'] },
    plus: (sortie) => {
      const o = observationDe(sortie);
      const croissantes = o.generations.every((g, i) => i === 0 || g > o.generations[i - 1]);
      return croissantes ? [] : [`générations ${o.generations.join(', ')} : elles doivent croître`];
    },
    extra: (s) => ({ sujets: s.messages.flatMap((m) => (m.type === 'analyse' ? [m.analyse.sujet] : [])) }),
  });
  ajouterUneSeance(r, 'Id', {
    description: 'sujets A, B puis A : chaque message porte le sujet de son analyse', relations: [],
    options: { adaptateurs: [(b, lecteurs, s) => ({ ...lecteurs, sujet: async (contexte) => { const sujet = await lecteurs.sujet(contexte); return sujet ? { ...sujet, cle: s.drapeaux.sujetB ? 'Alert' : 'Button' } : sujet; } })] },
    flux: async (s) => { await s.demander(); s.drapeaux.sujetB = true; await s.demander(); s.drapeaux.sujetB = false; await s.demander(); },
    attente: { statuts: ['complete', 'complete', 'complete'] },
    extra: (s) => ({ sujets: s.messages.flatMap((m) => (m.type === 'analyse' ? [m.analyse.sujet] : [])) }),
    plus: (sortie) => {
      const sujets = (sortie.donnees as { sujets: string[] }).sujets;
      return JSON.stringify(sujets) === JSON.stringify(['Button', 'Alert', 'Button']) ? [] : [`sujets ${sujets.join(', ')}, attendu Button, Alert, Button`];
    },
  });
  ajouterUneSeance(r, 'Id', {
    description: 'sujets A, B puis A : l’interface retient la dernière identité et la dernière seulement', relations: [],
    options: { adaptateurs: [(b, lecteurs, s) => ({ ...lecteurs, sujet: async (contexte) => { const sujet = await lecteurs.sujet(contexte); return sujet ? { ...sujet, cle: s.drapeaux.sujetB ? 'Alert' : 'Button' } : sujet; } })] },
    flux: async (s) => { await s.demander(); s.drapeaux.sujetB = true; await s.demander(); s.drapeaux.sujetB = false; await s.demander(); },
    attente: { statuts: ['complete', 'complete', 'complete'] },
    extra: async (s) => {
      const ui = await chargerLInterface();
      const etat = ui.etatInitial();
      for (const m of s.messages) if (['analyse-commencee', 'analyse-en-cours', 'analyse-provisoire', 'analyse', 'perime', 'occupe', 'ignores'].includes(m.type)) ui.recevoir(etat, m);
      return { derniere: (etat.analyse as unknown as { identite: { sujet: string; generation: number } } | null)?.identite };
    },
    plus: (sortie) => {
      const derniere = (sortie.donnees as { derniere?: { sujet: string; generation: number } }).derniere;
      const voulue = observationDe(sortie).generations[2];
      return derniere?.sujet === 'Button' && derniere.generation === voulue ? [] : [`l’interface retient ${JSON.stringify(derniere)}, attendu Button et la génération ${voulue}`];
    },
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// Pv : provisoire

function operateursPv(r: Registre): void {
  ajouterUneSeance(r, 'Pv', {
    description: 'provisoire normal : un seul avant le final', relations: [],
    attente: { statuts: ['complete'], provisoires: 1 },
    plus: (sortie) => {
      const { types } = observationDe(sortie);
      return types.indexOf('analyse-provisoire') < types.lastIndexOf('analyse') ? [] : ['le provisoire ne précède pas le final'];
    },
  });
  ajouterUneSeance(r, 'Pv', {
    description: 'provisoire annulé avant : aucun provisoire', relations: [],
    options: { plan: (s) => agir('releve', 'avant', () => s.annuler('identite')) },
    attente: { statuts: ['annulee'], provisoires: 0, retenue: false },
  });
  ajouterUneSeance(r, 'Pv', {
    description: 'provisoire arrêté après : le moteur lève, un provisoire puis une seule arrêtée', relations: [],
    options: { plan: lever('moteur') }, attente: { statuts: ['arretee'], provisoires: 1, bloquant: true, retenue: false },
  });
  ajouterUneSeance(r, 'Pv', {
    description: 'provisoire avec ignorés illisibles : le provisoire part, le final est partiel', relations: [],
    options: { plan: lever('ignores') }, attente: { statut: 'partielle', provisoires: 1 }, rattachement: H13,
  });
  ajouterUneSeance(r, 'Pv', {
    description: 'provisoire sans constat : il part quand même, une seule fois', relations: [],
    options: { adaptateurs: [sansConstatsDuKit] },
    attente: { provisoires: 1 },
  });
  ajouterUneSeance(r, 'Pv', {
    description: 'le final garde les identifiants du provisoire', relations: [],
    attente: { statuts: ['complete'], provisoires: 1 },
    extra: (s) => ({ ids: s.messages.flatMap((m) => (m.type === 'analyse-provisoire' ? m.constats.map((c) => c.id) : [])) }),
    plus: (sortie) => {
      const finaux = new Set(observationDe(sortie).constats.map((c) => c.id));
      const perdus = (sortie.donnees as { ids: string[] }).ids.filter((id) => !finaux.has(id));
      return perdus.length === 0 ? [] : [`${perdus.length} constat(s) du provisoire absents du final : ${perdus.slice(0, 3).join(', ')}`];
    },
  });
  ajouterUneSeance(r, 'Pv', {
    description: 'final tardif après péremption : l’interface le refuse et garde les constats du provisoire sans les rendre applicables', relations: [],
    flux: async (s) => { s.surMessage.push((m) => { if (m.type === 'analyse-provisoire') s.evenement('noeud'); }); await s.demander(); },
    attente: { statuts: ['complete'], provisoires: 1, perimes: ['document'] },
    extra: async (s) => {
      const ui = await chargerLInterface();
      const etat = await etatApres(s.messages);
      return { applicable: ui.analyseApplicable(etat.analyse), statut: etat.analyse?.statut, constats: etat.analyse?.tous.length };
    },
    plus: (sortie) => {
      const { applicable, statut } = sortie.donnees as { applicable: boolean; statut: string };
      return [...(applicable ? ['le final tardif rend l’analyse périmée applicable'] : []), ...(statut === 'provisoire' ? [] : [`statut ${statut} après un final tardif, attendu provisoire`])];
    },
  });

  const verrou = (description: string, messages: (identite: { sujet: string; generation: number }) => PluginMessage[], attendu: boolean): void => {
    r.ajouter('Pv', {
      description: `verrou de l’interface : ${description}`, relations: [],
      jouer: async (): Promise<SortieDeCas> => {
        const ui = await chargerLInterface();
        const etat = ui.etatInitial();
        for (const m of messages({ sujet: 'Alert', generation: 1 })) ui.recevoir(etat, m);
        return { constats: [], donnees: { applicable: ui.analyseApplicable(etat.analyse) } };
      },
      verifier: (sortie) => ((sortie.donnees as { applicable: boolean }).applicable === attendu ? [] : [`analyseApplicable ${String((sortie.donnees as { applicable: boolean }).applicable)}, attendu ${attendu}`]),
    });
  };
  const variants = [{ id: '1', nom: 'Alert' }];
  verrou('aucune écriture tant que l’analyse est en cours', (analyse) => [{ type: 'analyse-commencee', analyse }], false);
  verrou('aucune écriture pendant le provisoire', (analyse) => [{ type: 'analyse-commencee', analyse }, { type: 'analyse-provisoire', analyse, constats: [], ignores: [], lecture: null as never, variants }], false);
  verrou('aucune écriture sur un provisoire périmé', (analyse) => [{ type: 'analyse-commencee', analyse }, { type: 'analyse-provisoire', analyse, constats: [], ignores: [], lecture: null as never, variants }, { type: 'perime', analyse, cause: 'document' }], false);

  const attenteProvisoire = (description: string, options: OptionsDeSeance, attente: Attente, interdits: readonly string[], rattachement?: string): void =>
    ajouterUneSeance(r, 'Pv', {
      description, options, relations: [], attente, codesJuges: interdits, ...(rattachement ? { rattachement } : {}),
      extra: (s) => ({ codesDuProvisoire: s.messages.flatMap((m) => (m.type === 'analyse-provisoire' ? m.constats.map((c) => c.code) : [])) }),
      plus: (sortie) => (sortie.donnees as { codesDuProvisoire: string[] }).codesDuProvisoire.filter((code) => interdits.includes(code)).map((code) => `le provisoire porte ${code}, que le moteur et les règles produisent`),
    });
  attenteProvisoire('provisoire avec règles refusées : aucun C43 ni C45 dans le provisoire', { plan: lever('regles') }, { statut: 'partielle', provisoires: 1, sansCodes: ['C43', 'C45'] }, ['C43', 'C45'], H13);
  attenteProvisoire('provisoire avec moteur partiel : aucun point du moteur dans le provisoire', { adaptateurs: [MOTEUR_PARTIEL] }, { statut: 'partielle', provisoires: 1 }, ['C43', 'C44', 'C45', 'C30', 'C41']);
  attenteProvisoire('provisoire avec moteur arrêté : le provisoire part, une seule arrêtée', { plan: lever('moteur') }, { statuts: ['arretee'], provisoires: 1, bloquant: true }, ['C43', 'C44', 'C45']);
}

// ---------------------------------------------------------------------------------------------------------------------------

export function operateursCycle(): CasF8[] {
  const registre = new Registre('F9');
  operateursAn(registre);
  operateursPe(registre);
  operateursOc(registre);
  operateursPr(registre);
  operateursId(registre);
  operateursPv(registre);
  return registre.cas;
}

