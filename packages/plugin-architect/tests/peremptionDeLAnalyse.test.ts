/** La surveillance de l'analyse : écoute ouverte avant la lecture du sujet, événements gardés jusqu'à l'inventaire, couverture portée. */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import type { CatalogueDeReference, ReleveDeComposant } from '@ucm-kit/core/controles';
import type { Couverture } from 'ucm-plugin-socle/src/composant/analyse/faits';
import type { ResultatSansPublication } from 'ucm-plugin-socle/src/composant/contract/exportComponent';

import type { PluginMessage } from '../src/messages';
import type { IdentiteDAnalyse } from '../src/messages/commun';
import {
  analyseARelire, analyseCourante, couvertureDeLAnalyse, couvertureInterrompue, curseurDeLAnalyse, ecritureDepuisLAnalyse, journalDesChangements, perimerApresUneEcriture, reinitialiserLAnalyse, surChangementDeStyle, surInterruptionDePage, surChangementDuDocument, traiter, traiterAvec, type Lecteurs, type SujetAAnalyser,
} from '../src/sandbox/analyse';
import type { Contexte } from '../src/sandbox/contexte';
import { creerLeSuivi, type PageSuivable } from '../src/sandbox/contexte';
import { atelierDeCalques } from './figmaDeTest';

const catalogueVide: CatalogueDeReference = { version: 1, library: null, collections: [], variables: [] };
const moteur = async (): Promise<ResultatSansPublication> => ({ etat: 'calculee', interne: { warnings: [], parties: new Map(), localisations: new Map(), couverture: { etat: 'complete' } } as never });
const complete: Couverture = { instances: 'descendues', complete: true };

const releve = (): ReleveDeComposant => ({
  version: 1, jeu: { cle: 'Alert', id: 'jeu', nom: 'Alert' }, proprietes: [],
  variants: [{ id: 'v', nom: 'Alert défaut', valeurs: {}, layers: [], modesEffectifs: {} }],
  lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
});

interface Banc {
  readonly contexte: Contexte;
  readonly envoyes: PluginMessage[];
  /** Les appels à `surveillerLeDocument` et aux lecteurs, dans l'ordre. */
  readonly journal: string[];
}

function banc(pagesNonEcoutees: readonly string[] = []): Banc {
  const envoyes: PluginMessage[] = [];
  const journal: string[] = [];
  let appels = 0;
  const contexte: Contexte = {
    figma: { root: { getSharedPluginData: () => '' } } as unknown as PluginAPI,
    envoyer: (message) => envoyes.push(message),
    // Seul le second appel, celui du sujet résolu, dit les pages que Figma refuse.
    surveillerLeDocument: () => { appels += 1; journal.push('surveiller'); return appels === 1 ? [] : pagesNonEcoutees; },
  };
  return { contexte, envoyes, journal };
}

function lecteurs(b: Banc, options: { sujet?: (contexte: Contexte) => void; releve?: (contexte: Contexte) => void; couverture?: Couverture } = {}): Lecteurs {
  return {
    async sujet(contexte) {
      b.journal.push('sujet');
      options.sujet?.(contexte);
      return { cle: 'Alert', noeud: { id: 'jeu' } as never, noeuds: ['jeu', 'v', 'calque'], admis: ['jeu', 'v'], ...(options.couverture ? { couverture: options.couverture } : {}) } satisfies SujetAAnalyser;
    },
    async releve(_sujet, _jeton, contexte) {
      options.releve?.(contexte);
      return { statut: 'lu', releve: releve() };
    },
    async catalogue() { return catalogueVide; },
    moteur,
  };
}

const types = (b: Banc) => b.envoyes.map((message) => message.type);
const perimes = (b: Banc) => b.envoyes.filter((message): message is Extract<PluginMessage, { type: 'perime' }> => message.type === 'perime');

beforeEach(() => reinitialiserLAnalyse());

test('l’écoute précède la lecture du sujet, puis le sujet abonne sa page', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  assert.deepEqual(b.journal, ['surveiller', 'sujet', 'surveiller']);
});

test('un événement reçu pendant la lecture du sujet, sur un nœud de l’inventaire, périme l’analyse après analyse-commencee', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete, sujet: (contexte) => surChangementDuDocument(['calque'], contexte) }))({ type: 'analyser' }, b.contexte);
  const analyse = analyseCourante() as IdentiteDAnalyse;
  assert.deepEqual(perimes(b), [{ type: 'perime', analyse, cause: 'document' }]);
  assert.ok(types(b).indexOf('analyse-commencee') < types(b).indexOf('perime'), 'l’interface ignore une péremption qui précède l’analyse qu’elle vise');
});

test('un événement reçu pendant la lecture du sujet, hors de l’inventaire, ne périme rien', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete, sujet: (contexte) => surChangementDuDocument(['ailleurs'], contexte) }))({ type: 'analyser' }, b.contexte);
  assert.deepEqual(perimes(b), []);
});

test('un événement émis pendant le relevé périme l’analyse, un événement hors inventaire non', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete, releve: (contexte) => { surChangementDuDocument(['ailleurs'], contexte); surChangementDuDocument(['v'], contexte); } }))({ type: 'analyser' }, b.contexte);
  assert.deepEqual(perimes(b).map((message) => message.cause), ['document']);
});

test('les événements gardés ne passent pas à l’analyse suivante, ni après l’inventaire', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete, sujet: (contexte) => surChangementDuDocument(['calque'], contexte) }))({ type: 'analyser' }, b.contexte);
  assert.equal(perimes(b).length, 1);
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  assert.equal(perimes(b).length, 1, 'la seconde analyse ne rejoue pas l’événement de la première');
  surChangementDuDocument(['ailleurs'], b.contexte);
  assert.equal(perimes(b).length, 1, 'un nœud hors inventaire est ignoré une fois l’inventaire connu');
  surChangementDuDocument(['calque'], b.contexte);
  assert.equal(perimes(b).length, 2);
});

test('un stylechange périme l’analyse courante : elle ne sait pas quels styles ses lecteurs ont lus', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  surChangementDeStyle([], b.contexte);
  assert.deepEqual(perimes(b), [], 'aucun changement, aucune péremption');
  surChangementDeStyle([{ type: 'STYLE_PROPERTY_CHANGE', id: 'S:1', properties: ['fontSize'] }], b.contexte);
  assert.deepEqual(perimes(b).map((message) => message.cause), ['document']);
});

test('un stylechange reçu avant l’inventaire est rejoué, puis la garde se ferme', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete, sujet: () => surChangementDeStyle([{ type: 'STYLE_DELETE', id: 'S:1' }], b.contexte) }))({ type: 'analyser' }, b.contexte);
  assert.deepEqual(perimes(b).map((message) => message.cause), ['document']);
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  assert.equal(perimes(b).length, 1, 'la seconde analyse ne rejoue pas le changement de la première');
});

test('un stylechange sans analyse courante ne périme rien', () => {
  const b = banc();
  surChangementDeStyle([{ type: 'STYLE_CREATE', id: 'S:1' }], b.contexte);
  assert.deepEqual(perimes(b), []);
});

const sousLeVariant = (id: string, type = 'CREATE') => ({ type, id, node: { id, parent: { id: 'v', parent: { id: 'jeu', parent: null } } } });

test('un calque créé sous un variant périme l’analyse, alors que son identifiant est hors de l’inventaire', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  surChangementDuDocument([{ type: 'CREATE', id: 'ailleurs', node: { id: 'ailleurs', parent: { id: 'autre-page', parent: null } } }], b.contexte);
  assert.deepEqual(perimes(b), [], 'un calque créé hors du jeu ne périme pas');
  surChangementDuDocument([sousLeVariant('neuf')], b.contexte);
  assert.deepEqual(perimes(b).map((message) => message.cause), ['document']);
});

test('un changement à portée inconnue périme l’analyse', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  surChangementDuDocument([{ type: 'REORDER', id: 'x' }], b.contexte);
  assert.deepEqual(perimes(b).map((message) => message.cause), ['document']);
});

test('un événement retardé, après la fin de l’analyse ou après sa péremption, entre au journal', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  const analyse = analyseCourante() as IdentiteDAnalyse;
  const curseur = curseurDeLAnalyse(analyse) as number;
  const journal = journalDesChangements()!;
  surChangementDuDocument(['ailleurs'], b.contexte);
  assert.deepEqual(journal.depuis(curseur).map((entree) => entree.id), ['ailleurs'], 'hors inventaire : journalisé sans périmer');
  assert.deepEqual(perimes(b), []);
  surChangementDuDocument(['calque'], b.contexte);
  assert.equal(perimes(b).length, 1);
  surChangementDuDocument(['retard'], b.contexte);
  assert.deepEqual(journal.depuis(curseur).map((entree) => entree.id), ['ailleurs', 'calque', 'retard'], 'après la péremption aussi');
  assert.equal(perimes(b).length, 1, 'la péremption reste notifiée une fois');
});

test('une série de mutations après la première péremption est journalisée en entier, dans l’ordre', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  const curseur = curseurDeLAnalyse(analyseCourante() as IdentiteDAnalyse) as number;
  surChangementDuDocument(['calque'], b.contexte);
  surChangementDuDocument([sousLeVariant('c1'), sousLeVariant('c2', 'PROPERTY_CHANGE')], b.contexte);
  surChangementDeStyle([{ type: 'STYLE_PROPERTY_CHANGE', id: 'S:1', properties: ['fontSize'] }], b.contexte);
  surChangementDuDocument([{ type: 'DELETE', id: 'c1', node: { id: 'c1', removed: true } }], b.contexte);
  const entrees = journalDesChangements()!.depuis(curseur);
  assert.deepEqual(entrees.map((entree) => `${entree.nature}:${entree.type}:${entree.id}`), [
    'noeud:PROPERTY_CHANGE:calque', 'noeud:CREATE:c1', 'noeud:PROPERTY_CHANGE:c2', 'style:STYLE_PROPERTY_CHANGE:S:1', 'noeud:DELETE:c1',
  ]);
  assert.deepEqual(entrees.map((entree) => entree.parent), [null, 'v', 'v', null, null]);
  assert.equal(perimes(b).length, 1);
});

test('le journal survit à l’analyse suivante, et le curseur d’une analyse date du début de sa demande', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  const premier = curseurDeLAnalyse(analyseCourante() as IdentiteDAnalyse) as number;
  surChangementDuDocument(['ailleurs'], b.contexte);
  await traiterAvec(lecteurs(b, { couverture: complete, sujet: (contexte) => surChangementDuDocument(['pendant'], contexte) }))({ type: 'analyser' }, b.contexte);
  const second = curseurDeLAnalyse(analyseCourante() as IdentiteDAnalyse) as number;
  assert.deepEqual(journalDesChangements()!.depuis(premier).map((entree) => entree.id), ['ailleurs', 'pendant']);
  assert.deepEqual(journalDesChangements()!.depuis(second).map((entree) => entree.id), ['pendant'], 'les changements reçus pendant la demande suivent son curseur');
});

/** Inscrit une création au journal sans la juger : une création vue sous un variant périme l'analyse, donc seul le journal la montre à la suppression. */
const inscrireSansJuger = (id: string, parent: string | null): void => {
  journalDesChangements()!.enregistrer([{ nature: 'noeud', type: 'CREATE', id, ...(parent === null ? {} : { node: { id, parent: { id: parent, parent: null } } }) }]);
};
const suppression = (id: string) => ({ type: 'DELETE', id, node: { id, removed: true } });

test('la suppression d’un calque créé après l’analyse sous un variant périme l’analyse, son identifiant étant hors de l’inventaire', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  inscrireSansJuger('neuf', 'v');
  surChangementDuDocument([suppression('neuf')], b.contexte);
  assert.deepEqual(perimes(b).map((message) => message.cause), ['document']);
});

test('le déplacement hors du variant d’un calque créé après l’analyse périme l’analyse', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  inscrireSansJuger('neuf', 'v');
  surChangementDuDocument([{ type: 'PROPERTY_CHANGE', id: 'neuf', properties: ['parent'], node: { id: 'neuf', parent: { id: 'ailleurs', parent: null } } }], b.contexte);
  assert.equal(perimes(b).length, 1);
});

test('une suppression ailleurs ne périme pas l’analyse, qu’elle soit vue ou non', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  inscrireSansJuger('autre', 'cadre-externe');
  surChangementDuDocument([suppression('autre'), suppression('jamais-vu')], b.contexte);
  assert.deepEqual(perimes(b), []);
});

test('la suppression d’un nœud apparu sans parent lisible depuis le curseur périme l’analyse', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  inscrireSansJuger('fantome', null);
  surChangementDuDocument([suppression('fantome')], b.contexte);
  assert.equal(perimes(b).length, 1);
});

test('un journal débordé depuis le curseur de l’analyse rend toute portée inconnue : l’analyse est périmée', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  const curseur = curseurDeLAnalyse(analyseCourante() as IdentiteDAnalyse) as number;
  surChangementDuDocument(Array.from({ length: 5001 }, (_, rang) => `ailleurs-${rang}`), b.contexte);
  assert.equal(journalDesChangements()!.debordeDepuis(curseur), true);
  assert.deepEqual(perimes(b), [], 'le débordement se constate au changement suivant');
  surChangementDuDocument(['ailleurs'], b.contexte);
  assert.equal(perimes(b).length, 1);
});

test('chaque demande d’analyse oublie le journal d’avant l’analyse précédente', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  surChangementDuDocument(['ancien'], b.contexte);
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  surChangementDuDocument(['recent'], b.contexte);
  assert.deepEqual(journalDesChangements()!.depuis(0).map((entree) => entree.id), ['ancien', 'recent'], 'l’analyse précédente retient encore « ancien »');
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  assert.deepEqual(journalDesChangements()!.depuis(0).map((entree) => entree.id), ['recent'], 'la troisième demande retire ce qui précède la deuxième analyse');
});

interface PageDeTest extends PageSuivable { readonly id: string }
const pageDeTest = (id: string): PageDeTest => ({ id, on() {}, off() {} });

/** Un banc dont la page courante se pilote et dont le suivi réel signale ses arrêts d'écoute au journal. */
function bancAvecPages(depart: PageDeTest) {
  const envoyes: PluginMessage[] = [];
  let page = depart;
  let contexte!: Contexte;
  const suivi = creerLeSuivi<PageDeTest>(() => page, () => {}, (arretee, raison) => surInterruptionDePage(arretee.id, raison, contexte));
  contexte = {
    figma: { root: { getSharedPluginData: () => '' }, get currentPage() { return page; } } as unknown as PluginAPI,
    envoyer: (message) => envoyes.push(message),
    surveillerLeDocument: (sujet) => suivi.surveiller(sujet as unknown as PageDeTest | undefined).map((nonEcoutee) => nonEcoutee.id),
  };
  const b: Banc = { contexte, envoyes, journal: [] };
  return { b, aller(cible: PageDeTest) { page = cible; suivi.recalculer(); } };
}

test('retour sur une page : ce qui a changé pendant son absence est manqué, la couverture de l’analyse de cette page est interrompue', async () => {
  const A = pageDeTest('A');
  const B = pageDeTest('B');
  const { b, aller } = bancAvecPages(A);
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  const analyseA = analyseCourante() as IdentiteDAnalyse;
  const curseurA = curseurDeLAnalyse(analyseA) as number;
  const pagesDeA = ['A'];
  assert.equal(couvertureInterrompue(analyseA), false);
  aller(B);
  assert.deepEqual(perimes(b).map((message) => message.cause), ['document'], 'la page de l’analyse n’est plus écoutée');
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  aller(A);
  assert.deepEqual(journalDesChangements()!.couvertureDepuis(curseurA, pagesDeA), { etat: 'interrompue', raisons: ['page-quittee'] }, 'aucun événement n’est arrivé');
  assert.deepEqual(journalDesChangements()!.couvertureDepuis(curseurA, ['Z']), { etat: 'continue' });
});

test('une page restée écoutée garde la couverture continue', async () => {
  const A = pageDeTest('A');
  const { b } = bancAvecPages(A);
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  const analyse = analyseCourante() as IdentiteDAnalyse;
  surChangementDuDocument(['ailleurs'], b.contexte);
  assert.equal(couvertureInterrompue(analyse), false);
  assert.equal(analyseARelire(analyse), false);
  assert.deepEqual(perimes(b), []);
});

test('un journal débordé interrompt la couverture de l’analyse, donc elle est à relire', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  const analyse = analyseCourante() as IdentiteDAnalyse;
  surChangementDuDocument(Array.from({ length: 5001 }, (_, rang) => `ailleurs-${rang}`), b.contexte);
  assert.equal(analyseARelire(analyse), true);
  assert.deepEqual(journalDesChangements()!.couvertureDepuis(curseurDeLAnalyse(analyse) as number, []), { etat: 'interrompue', raisons: ['journal-deborde'] });
});

test('une analyse arrêtée avant son inventaire ne garde aucun événement', async () => {
  const b = banc();
  const arret: Lecteurs = { ...lecteurs(b), sujet: async () => { throw new Error('sujet illisible'); } };
  await traiterAvec(arret)({ type: 'analyser' }, b.contexte);
  surChangementDuDocument(['calque'], b.contexte);
  assert.deepEqual(perimes(b), [], 'l’analyse vide n’a aucun nœud');
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  assert.deepEqual(perimes(b), []);
});

test('une couverture complète ne demande pas de relecture', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  const analyse = analyseCourante() as IdentiteDAnalyse;
  assert.deepEqual(couvertureDeLAnalyse(analyse), complete);
  assert.equal(analyseARelire(analyse), false);
});

test('un trou de lecture rend l’analyse à relire, et les nœuds lus restent surveillés', async () => {
  const b = banc();
  const trouee: Couverture = { instances: 'descendues', complete: false, trous: [{ type: 'enfants', noeud: 'jeu', raison: 'leve', message: 'nœud supprimé' }] };
  await traiterAvec(lecteurs(b, { couverture: trouee }))({ type: 'analyser' }, b.contexte);
  const analyse = analyseCourante() as IdentiteDAnalyse;
  assert.deepEqual(couvertureDeLAnalyse(analyse), trouee);
  assert.equal(analyseARelire(analyse), true);
  surChangementDuDocument(['v'], b.contexte);
  assert.equal(perimes(b).length, 1);
});

test('un sujet sans couverture déclarée est une couverture inconnue : relecture obligatoire', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b))({ type: 'analyser' }, b.contexte);
  const analyse = analyseCourante() as IdentiteDAnalyse;
  assert.deepEqual(couvertureDeLAnalyse(analyse), { instances: 'descendues', complete: false, trous: [] });
  assert.equal(analyseARelire(analyse), true);
});

test('une page que Figma ne laisse pas écouter est un trou de la couverture', async () => {
  const b = banc(['0:7']);
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  const analyse = analyseCourante() as IdentiteDAnalyse;
  assert.deepEqual(couvertureDeLAnalyse(analyse), { instances: 'descendues', complete: false, trous: [{ type: 'page-non-ecoutee', page: '0:7' }] });
  assert.equal(analyseARelire(analyse), true);
});

test('une analyse qui n’est plus la courante est à relire', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  const premiere = analyseCourante() as IdentiteDAnalyse;
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  assert.equal(couvertureDeLAnalyse(premiere), null);
  assert.equal(analyseARelire(premiere), true);
});

test('un children qui lève sur le jeu laisse l’analyse continuer avec une couverture à relire', async () => {
  const a = atelierDeCalques();
  const variant = a.calque('variant', 'COMPONENT', { name: 'Etat=Repos' });
  const jeu = a.calque('jeu', 'COMPONENT_SET', {
    name: 'Alert', key: 'cle-jeu',
    get children(): never { throw new Error('nœud supprimé'); },
    findAll: () => [variant],
  });
  const envoyes: PluginMessage[] = [];
  const figma = { currentPage: { selection: [jeu] }, root: { documentColorProfile: 'SRGB', getSharedPluginData: () => '' } };
  const contexte: Contexte = { figma: figma as never, envoyer: (message) => envoyes.push(message), surveillerLeDocument() {} };
  await traiter({ type: 'analyser' }, contexte);
  const analyse = analyseCourante() as IdentiteDAnalyse;
  assert.equal(analyse.sujet, 'cle-jeu', 'le sujet se résout malgré le trou');
  const couverture = couvertureDeLAnalyse(analyse) as Couverture;
  assert.equal(couverture.complete, false);
  assert.deepEqual(couverture.complete ? [] : couverture.trous, [{ type: 'enfants', noeud: 'jeu', raison: 'leve', message: 'nœud supprimé' }]);
  assert.equal(analyseARelire(analyse), true);
  surChangementDuDocument(['variant'], contexte);
  assert.equal(envoyes.filter((message) => message.type === 'perime').length, 1, 'les nœuds que findAll a rendus restent surveillés');
});

/* 8.8 : écritures, Ctrl+Z et imports. */

const curseurCourant = (): number => curseurDeLAnalyse(analyseCourante() as IdentiteDAnalyse) as number;

test('une écriture entre au journal avec le sujet entier pour portée, même si son événement Figma n’arrive pas', async () => {
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete }))({ type: 'analyser' }, b.contexte);
  const analyse = analyseCourante() as IdentiteDAnalyse;
  assert.equal(ecritureDepuisLAnalyse(analyse), false);
  assert.equal(analyseARelire(analyse), false);
  perimerApresUneEcriture(b.contexte);
  assert.deepEqual(journalDesChangements()!.depuis(curseurCourant()).map((entree) => [entree.nature, entree.origine]), [['ecriture', 'ecriture']]);
  assert.equal(ecritureDepuisLAnalyse(analyse), true);
  assert.equal(analyseARelire(analyse), true);
  assert.deepEqual(perimes(b).map((message) => message.cause), ['ecriture']);
});

test('une écriture sans analyse courante entre aussi au journal', () => {
  const b = banc();
  perimerApresUneEcriture(b.contexte, 'configuration');
  assert.deepEqual(journalDesChangements()!.depuis(0).map((entree) => [entree.nature, entree.origine]), [['ecriture', 'configuration']]);
  assert.deepEqual(perimes(b), []);
});

test('une correction puis Ctrl+Z : l’écriture périme, l’annulation arrive comme un changement du sujet et périme l’analyse faite entre les deux', async () => {
  const b = banc();
  const lire = lecteurs(b, { couverture: complete });
  await traiterAvec(lire)({ type: 'analyser' }, b.contexte);
  perimerApresUneEcriture(b.contexte);
  assert.equal(perimes(b).length, 1);
  // Une analyse faite après l'écriture, avant l'annulation : son curseur dépasse l'écriture.
  await traiterAvec(lire)({ type: 'analyser' }, b.contexte);
  const analyse = analyseCourante() as IdentiteDAnalyse;
  assert.equal(ecritureDepuisLAnalyse(analyse), false, 'l’écriture précède le curseur de cette analyse');
  assert.equal(perimes(b).length, 1);
  surChangementDuDocument([{ type: 'PROPERTY_CHANGE', id: 'calque', node: { id: 'calque', parent: { id: 'v', parent: null } } }], b.contexte);
  assert.equal(perimes(b).length, 2, 'le Ctrl+Z périme l’analyse suivante');
  assert.deepEqual(journalDesChangements()!.depuis(curseurCourant()).map((entree) => entree.id), ['calque']);
});

test('un import de variable fait par l’analyse ne périme rien, un changement externe pendant l’analyse la périme', async () => {
  const importees: string[] = [];
  const importer = async (cle: string): Promise<void> => { importees.push(cle); };
  // Figma n'émet ni nodechange ni stylechange pour un import de variable : rien à exempter, rien ne périme.
  const b = banc();
  await traiterAvec(lecteurs(b, { couverture: complete, releve: () => { void importer('k1'); } }))({ type: 'analyser' }, b.contexte);
  assert.deepEqual(importees, ['k1']);
  assert.deepEqual(perimes(b), []);
  assert.equal(ecritureDepuisLAnalyse(analyseCourante() as IdentiteDAnalyse), false);
  const externe = banc();
  await traiterAvec(lecteurs(externe, { couverture: complete, releve: (contexte) => { void importer('k2'); surChangementDuDocument(['calque'], contexte); } }))({ type: 'analyser' }, externe.contexte);
  assert.equal(perimes(externe).length, 1);
});
