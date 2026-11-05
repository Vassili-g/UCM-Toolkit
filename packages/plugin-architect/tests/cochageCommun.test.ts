/**
 * Le cochage commun du mode Tokens : toutes les cases arrivent décochées, y compris une ligne qu'une relecture ajoute ; « Tout
 * cocher » et « Tout décocher » se posent sous la bande de chaque section ; un seul pied compte les cases des deux domaines ; Appliquer
 * écrit les renommages avant les corrections de structure, et un échec des renommages arrête les corrections.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat, Correction } from '../src/messages/commun';
import type { Bilan } from '../src/messages/nomenclature';

import { poserLeDom, comme, type ElementDeTest } from './domDeTest';

poserLeDom();

import { creerLaSuiteDuPied } from '../src/ui/nomenclature/suiteDuPied';
import { resumeDuPied, monterLePied, type CompteDesRenommages, type IssueDesRenommages, type PontDesRenommages, type SourceDeStructure } from '../src/ui/tokens/cochage';
import { monterLePanneauDesTokens } from '../src/ui/tokens/panneau';
import { monterLesCorrections, type CategorieDeCorrection } from '../src/ui/structure/corrections';
import { monterStructure } from '../src/ui/structure';
import type { Coquille } from '../src/ui/nomenclature/coquille';
import type { DemandeDeStructure } from '../src/messages/structure';
import { lireLesCorrections, type CorrectionsLues, type Noms } from '../src/ui/structure/lecture';
import { TEXTES } from '../src/ui/textes';

const integrite = require('../galerie/structure/integrite.cjs') as Record<'manquantes' | 'crans' | 'sansEcriture' | 'libraryEtScopes' | 'aFaire' | 'sensInconnu', readonly Constat[]>;
const { structure } = require('../galerie/structure/donnees.cjs') as { structure(demande: number): { constats: readonly Constat[]; corrections: readonly Correction[] } };
const { bilans } = require('../galerie/nomenclature/donnees.cjs') as { bilans: { travail: Bilan } };

const SANS_NOMS: Noms = { nom: () => null, cle: () => null };
const element = (): HTMLElement => document.createElement('div');
const CATEGORIES: readonly CategorieDeCorrection[] = ['manquantes', 'crans', 'modes', 'scopes'];

/** Les corrections des états de galerie, une fois par identifiant, lues comme l'écran les lit. */
function lectureDesFixtures(): CorrectionsLues {
  const parId = new Map<string, Constat>();
  const listes = [integrite.manquantes, integrite.crans, integrite.sansEcriture, integrite.libraryEtScopes, integrite.aFaire, integrite.sensInconnu];
  for (const constat of [...listes.flat(), ...structure(1).constats]) if (!parId.get(constat.id)?.correction) parId.set(constat.id, constat);
  const constats = [...parId.values()];
  return lireLesCorrections(constats.flatMap((constat) => (constat.correction ? [constat.correction] : [])), SANS_NOMS, constats);
}

const cartesDe = (lecture: CorrectionsLues, categorie: CategorieDeCorrection) => ({ manquantes: lecture.variables, crans: lecture.crans, modes: lecture.modes, scopes: lecture.scopes })[categorie];
const lignesDe = (lecture: CorrectionsLues, categorie: CategorieDeCorrection): string[] => cartesDe(lecture, categorie).flatMap((carte) => carte.lignes.map(({ id }) => id));

/** La même lecture, sans la dernière ligne de la catégorie : une carte à une ligne disparaît, une carte à plusieurs en perd une. */
function sansLaDerniereLigne(lecture: CorrectionsLues, categorie: CategorieDeCorrection): CorrectionsLues {
  const cartes = [...cartesDe(lecture, categorie)];
  const derniere = cartes[cartes.length - 1];
  if (derniere.lignes.length > 1) cartes[cartes.length - 1] = { ...derniere, lignes: derniere.lignes.slice(0, -1) } as never;
  else cartes.pop();
  const champ = { manquantes: 'variables', crans: 'crans', modes: 'modes', scopes: 'scopes' }[categorie] as keyof CorrectionsLues;
  return { ...lecture, [champ]: cartes };
}

function monterLesCorrectionsDeTest() {
  const hotes = { manquantes: element(), crans: element(), modes: element(), scopes: element() };
  const changements: number[] = [];
  const corrections = monterLesCorrections({ element: element(), hotes, auChangement: () => changements.push(corrections.idsCoches().length) });
  return { corrections, hotes, changements };
}

const casesDe = (hote: HTMLElement): ElementDeTest[] => comme(hote).querySelectorAll('.diff input').filter((caseACocher) => caseACocher.type === 'checkbox');

// ---------------------------------------------------------------------------------------------------------------------------
// Cases décochées

test('chaque correction arrive décochée, dans les quatre catégories', () => {
  const lecture = lectureDesFixtures();
  const { corrections, hotes } = monterLesCorrectionsDeTest();
  corrections.poser(lecture);
  for (const categorie of CATEGORIES) {
    const cases = casesDe(hotes[categorie]);
    assert.ok(cases.length > 0, categorie);
    assert.deepEqual(cases.filter((caseACocher) => caseACocher.checked), [], categorie);
  }
  assert.deepEqual(corrections.idsCoches(), []);
});

for (const categorie of CATEGORIES) {
  test(`une ligne que la relecture ajoute à ${categorie} arrive décochée, les lignes cochées le restent`, () => {
    const lecture = lectureDesFixtures();
    const ids = lignesDe(lecture, categorie);
    assert.ok(ids.length >= 1, categorie);
    const { corrections, hotes } = monterLesCorrectionsDeTest();
    const avant = sansLaDerniereLigne(lecture, categorie);
    corrections.poser(avant);
    const dejaLa = lignesDe(avant, categorie);
    if (dejaLa.length > 0) comme(casesDe(hotes[categorie])[0]).clic();
    const coche = dejaLa.slice(0, 1);
    assert.deepEqual(corrections.idsCoches(), coche);

    corrections.poser(lecture);
    const nouvelles = ids.filter((id) => !dejaLa.includes(id));
    assert.ok(nouvelles.length > 0, 'la relecture ajoute une ligne');
    assert.deepEqual(corrections.idsCoches(), coche, 'seule la ligne cochée à la main l’est');
    const cases = casesDe(hotes[categorie]);
    assert.equal(cases.filter((caseACocher) => caseACocher.checked).length, coche.length, 'les cases suivent les identifiants cochés');
  });
}

test('une ligne cochée qui disparaît à la relecture sort des lignes cochées', () => {
  const lecture = lectureDesFixtures();
  const { corrections } = monterLesCorrectionsDeTest();
  corrections.poser(lecture);
  corrections.toutCocher('scopes');
  const scopes = lignesDe(lecture, 'scopes');
  assert.deepEqual(corrections.idsCoches(), scopes);
  corrections.poser({ ...lecture, scopes: [] });
  assert.deepEqual(corrections.idsCoches(), []);
  corrections.poser(lecture);
  assert.deepEqual(corrections.idsCoches(), [], 'la ligne revenue arrive décochée');
});

test('Tout cocher et Tout décocher d’une catégorie ne touchent que ses lignes, et préviennent le pied à chaque geste', () => {
  const lecture = lectureDesFixtures();
  const { corrections, changements } = monterLesCorrectionsDeTest();
  corrections.poser(lecture);
  const avant = changements.length;
  corrections.toutCocher('crans');
  assert.deepEqual(corrections.idsCoches(), lignesDe(lecture, 'crans'));
  corrections.toutCocher('modes');
  assert.deepEqual(corrections.idsCoches(), [...lignesDe(lecture, 'crans'), ...lignesDe(lecture, 'modes')]);
  corrections.toutDecocher('crans');
  assert.deepEqual(corrections.idsCoches(), lignesDe(lecture, 'modes'));
  assert.equal(changements.length - avant, 3);
  corrections.toutCocher();
  assert.equal(corrections.idsCoches().length, corrections.nombre());
  corrections.toutDecocher();
  assert.deepEqual(corrections.idsCoches(), []);
});

test('les boutons d’une catégorie cochent ses lignes et se masquent quand elle n’a aucune ligne', () => {
  const lecture = lectureDesFixtures();
  const { corrections } = monterLesCorrectionsDeTest();
  corrections.poser({ ...lecture, scopes: [] });
  assert.equal(corrections.gestes.scopes.hidden, true);
  for (const categorie of ['manquantes', 'crans', 'modes'] as const) assert.equal(corrections.gestes[categorie].hidden, false, categorie);
  const [toutCocher, toutDecocher] = comme(corrections.gestes.crans).querySelectorAll('button');
  assert.equal(toutCocher.textContent, TEXTES.correctionsDuComposant.toutCocher);
  assert.equal(toutDecocher.textContent, TEXTES.correctionsDuComposant.toutDecocher);
  toutCocher.clic();
  assert.deepEqual(corrections.idsCoches(), lignesDe(lecture, 'crans'));
  toutDecocher.clic();
  assert.deepEqual(corrections.idsCoches(), []);
  corrections.poser(lecture);
  assert.equal(corrections.gestes.scopes.hidden, false);
});

// ---------------------------------------------------------------------------------------------------------------------------
// Les boutons sous la bande de la section

function monterLePanneau() {
  const racine = element();
  const nomenclature = { questions: element(), renommages: element(), remises: element() };
  const panneau = monterLePanneauDesTokens({ racine, nomenclature, auChangement() {} });
  const gestes = { noms: element(), manquantes: element(), crans: element() };
  for (const [id, hote] of Object.entries(gestes)) {
    hote.className = `gestes-${id}`;
    panneau.poserLesGestes(id as keyof typeof gestes, hote);
  }
  const lecture = lectureDesFixtures();
  const constats = [...integrite.manquantes, ...integrite.crans];
  panneau.poser({ bilan: bilans.travail, reglesRecues: 0 });
  panneau.poserLaStructure({ constats, corrections: constats.flatMap((constat) => (constat.correction ? [constat.correction] : [])), noms: SANS_NOMS });
  assert.ok(lecture.variables.length > 0);
  return { racine: comme(racine), panneau, gestes };
}

const sectionDe = (racine: ElementDeTest, id: string): ElementDeTest => comme(racine.querySelectorAll('.section-element').find((section) => section.dataset.element === id));

test('les boutons d’une section se posent juste sous sa bande, avant ses cartes', () => {
  const { racine, gestes } = monterLePanneau();
  for (const id of ['noms', 'manquantes', 'crans']) {
    const section = sectionDe(racine, id);
    assert.ok(section.children[0].classes.has('bande-element'), id);
    assert.equal(section.children[1], comme(gestes[id as keyof typeof gestes]), `${id} : les boutons suivent la bande`);
  }
});

test('une section repliée n’a pas ses boutons, et la puce Questions ne les montre pas', () => {
  const { racine, gestes } = monterLePanneau();
  comme(sectionDe(racine, 'crans').querySelector('.bande-element')).clic();
  assert.equal(sectionDe(racine, 'crans').contains(comme(gestes.crans)), false);
  comme(racine.querySelectorAll('.puce-element').find((puce) => puce.dataset.element === 'questions')).clic();
  assert.equal(racine.contains(comme(gestes.noms)), false, 'sous la puce Questions, aucune case à cocher');
  comme(racine.querySelectorAll('.puce-element').find((puce) => puce.dataset.element === 'tout')).clic();
  assert.ok(sectionDe(racine, 'noms').contains(comme(gestes.noms)));
});

// ---------------------------------------------------------------------------------------------------------------------------
// Le pied commun

const PRET = (variables: number, collections = 0, filtre: string | null = null): CompteDesRenommages => ({ etat: 'pret', variables, collections, filtre });

interface Banc {
  readonly hote: ElementDeTest;
  readonly journal: string[];
  readonly suites: ((issue: IssueDesRenommages) => void)[];
  readonly ecritures: (readonly string[])[];
  compte: CompteDesRenommages;
  groupes: number;
  occupe: boolean;
  ids: string[];
  lignes: number;
  rappels: (() => void)[];
  pied: ReturnType<typeof monterLePied>;
}

function monterLePiedDeTest(depart: { compte?: CompteDesRenommages; ids?: string[]; groupes?: number; lignes?: number } = {}): Banc {
  const hote = element();
  const banc = {
    hote: comme(hote), journal: [], suites: [], ecritures: [], rappels: [],
    compte: depart.compte ?? PRET(0), groupes: depart.groupes ?? 1, occupe: false, ids: depart.ids ?? [], lignes: depart.lignes ?? 3,
  } as unknown as Banc;
  const renommages: PontDesRenommages = {
    compte: () => banc.compte,
    groupes: () => banc.groupes,
    occupe: () => banc.occupe,
    toutCocher: () => banc.journal.push('renommages:tout-cocher'),
    toutDecocher() {},
    appliquer(suite) {
      banc.journal.push('renommages');
      banc.suites.push(suite);
    },
    abonner(rappel) {
      banc.rappels.push(rappel);
      return () => {};
    },
  };
  const source: SourceDeStructure = {
    idsCoches: () => banc.ids,
    lignes: () => banc.lignes,
    toutCocher: () => banc.journal.push('structure:tout-cocher'),
    ecrire(ids) {
      banc.journal.push('structure');
      banc.ecritures.push(ids);
    },
    relire: () => banc.journal.push('relire'),
  };
  Object.assign(banc, { pied: monterLePied({ hote, renommages, structure: source }) });
  return banc;
}

const boutonAppliquer = (banc: Banc): ElementDeTest => comme(banc.hote.querySelector('.btn-primary'));
const boutonToutCocher = (banc: Banc): ElementDeTest => comme(banc.hote.querySelector('.cocher-global'));
const resume = (banc: Banc): string => comme(banc.hote.querySelector('.corrections-resume')).textContent;

test('sans case cochée, le pied dit qu’aucune correction n’est cochée et Appliquer est inactif', () => {
  const banc = monterLePiedDeTest();
  assert.equal(resume(banc), TEXTES.correctionsDuComposant.aucuneCochee);
  assert.equal(boutonAppliquer(banc).disabled, true);
  boutonAppliquer(banc).clic();
  assert.deepEqual(banc.journal, []);
});

test('le pied compte les cases des deux domaines, et chaque domaine garde sa phrase seul', () => {
  const banc = monterLePiedDeTest({ compte: PRET(86, 1), ids: ['a', 'b', 'c'] });
  assert.equal(resume(banc), 'Appliquer renomme 86 variables et 1 collection, puis écrit 3 corrections de structure.');
  assert.equal(boutonAppliquer(banc).disabled, false);
  banc.compte = PRET(0);
  banc.rappels[0]();
  assert.equal(resume(banc), 'Appliquer écrit 3 corrections de structure.');
  banc.compte = PRET(87);
  banc.ids = [];
  banc.rappels[0]();
  assert.equal(resume(banc), '87 noms cochés');
  banc.compte = PRET(24, 0, 'Interface');
  banc.rappels[0]();
  assert.equal(resume(banc), 'Appliquer renomme 24 variables de Interface.');
});

test('le pied se recompte quand les corrections de structure changent', () => {
  const banc = monterLePiedDeTest();
  banc.ids = ['a'];
  banc.pied.recompter();
  assert.equal(resume(banc), 'Appliquer écrit 1 correction de structure.');
  assert.equal(boutonAppliquer(banc).disabled, false);
});

test('le pied est masqué quand aucun domaine n’a de case', () => {
  const banc = monterLePiedDeTest({ groupes: 0, lignes: 0 });
  assert.equal(comme(banc.hote.children[0]).hidden, true);
  banc.lignes = 2;
  banc.pied.recompter();
  assert.equal(comme(banc.hote.children[0]).hidden, false);
});

test('« Tout cocher » du pied coche les renommages puis les corrections de structure', () => {
  const banc = monterLePiedDeTest();
  boutonToutCocher(banc).clic();
  assert.deepEqual(banc.journal, ['renommages:tout-cocher', 'structure:tout-cocher']);
  assert.equal(boutonToutCocher(banc).textContent, TEXTES.correctionsDuComposant.toutCocher);
});

test('le texte de chaque cas du pied', () => {
  const texte = (noms: CompteDesRenommages, corrections: number): string => resumeDuPied(noms, corrections).map((morceau) => (typeof morceau === 'string' ? morceau : comme(morceau).textContent)).join('');
  assert.equal(texte({ etat: 'chargement' }, 4), 'Chargement des noms…');
  assert.equal(texte({ etat: 'regles-futures' }, 0).startsWith('Une version plus récente'), true);
  assert.equal(texte({ etat: 'regles-futures' }, 2), 'Appliquer écrit 2 corrections de structure.', 'les règles futures bloquent les noms, pas la structure');
  assert.equal(texte(PRET(0), 0), TEXTES.correctionsDuComposant.aucuneCochee);
});

// ---------------------------------------------------------------------------------------------------------------------------
// L'ordre des deux écritures

test('Appliquer écrit les renommages d’abord, puis les corrections de structure cochées', () => {
  const banc = monterLePiedDeTest({ compte: PRET(10), ids: ['C63:a', 'C60:b'] });
  boutonAppliquer(banc).clic();
  assert.deepEqual(banc.journal, ['renommages'], 'rien n’est envoyé à la structure avant la fin des renommages');
  assert.equal(banc.pied.enCours(), true);
  assert.equal(boutonAppliquer(banc).disabled, true);
  banc.ids = [];
  banc.suites[0]('ecrit');
  assert.deepEqual(banc.journal, ['renommages', 'structure']);
  assert.deepEqual(banc.ecritures, [['C63:a', 'C60:b']], 'les identifiants cochés au clic, pas ceux de la fin des renommages');
  assert.equal(banc.pied.enCours(), true, 'le pied attend le retour de la structure');
  banc.pied.structureRevenue();
  assert.equal(banc.pied.enCours(), false);
});

for (const issue of ['echec', 'abandon'] as const) {
  test(`une issue « ${issue} » des renommages arrête l’application : aucune correction de structure n’est envoyée`, () => {
    const banc = monterLePiedDeTest({ compte: PRET(10), ids: ['C63:a'] });
    boutonAppliquer(banc).clic();
    banc.suites[0](issue);
    assert.deepEqual(banc.journal, ['renommages']);
    assert.deepEqual(banc.ecritures, []);
    assert.equal(banc.pied.enCours(), false);
    assert.equal(boutonAppliquer(banc).disabled, false, 'les cases restent cochées : le designer peut réessayer');
    assert.equal(resume(banc), 'Appliquer renomme 10 variables, puis écrit 1 correction de structure.');
  });
}

test('sans nom coché, Appliquer n’écrit que les corrections de structure, sans passer par les renommages', () => {
  const banc = monterLePiedDeTest({ ids: ['C63:a'] });
  boutonAppliquer(banc).clic();
  assert.deepEqual(banc.journal, ['structure']);
  assert.deepEqual(banc.suites, []);
});

test('sans correction de structure cochée, Appliquer n’écrit que les renommages, relit la structure et rouvre le pied à leur fin', () => {
  const banc = monterLePiedDeTest({ compte: PRET(3) });
  boutonAppliquer(banc).clic();
  assert.deepEqual(banc.journal, ['renommages'], 'la structure n’est relue qu’après les renommages');
  banc.suites[0]('ecrit');
  assert.deepEqual(banc.journal, ['renommages', 'relire'], 'les constats gardés citent les anciens noms : la structure est relue');
  assert.deepEqual(banc.ecritures, [], 'aucune correction de structure n’est écrite');
  assert.equal(banc.pied.enCours(), false);
});

for (const issue of ['echec', 'abandon'] as const) {
  test(`une issue « ${issue} » des renommages ne relit pas la structure`, () => {
    const banc = monterLePiedDeTest({ compte: PRET(3) });
    boutonAppliquer(banc).clic();
    banc.suites[0](issue);
    assert.deepEqual(banc.journal, ['renommages']);
  });
}

test('avec des corrections de structure cochées, Appliquer les écrit et ne demande pas de relecture à part', () => {
  const banc = monterLePiedDeTest({ compte: PRET(3), ids: ['a'] });
  boutonAppliquer(banc).clic();
  banc.suites[0]('ecrit');
  assert.deepEqual(banc.journal, ['renommages', 'structure'], 'le retour de la structure relit déjà (structure/index.ts)');
});

test('Appliquer reste inactif tant que les renommages sont occupés ou que le filtre charge ses noms', () => {
  const banc = monterLePiedDeTest({ compte: PRET(3), ids: ['a'] });
  banc.occupe = true;
  banc.pied.recompter();
  assert.equal(boutonAppliquer(banc).disabled, true);
  banc.occupe = false;
  banc.compte = { etat: 'chargement' };
  banc.pied.recompter();
  assert.equal(boutonAppliquer(banc).disabled, true);
  banc.compte = PRET(3);
  banc.pied.recompter();
  assert.equal(boutonAppliquer(banc).disabled, false);
});

test('un second appui sur Appliquer pendant l’écriture n’envoie rien de plus', () => {
  const banc = monterLePiedDeTest({ compte: PRET(3), ids: ['a'] });
  boutonAppliquer(banc).clic();
  boutonAppliquer(banc).clic();
  assert.deepEqual(banc.journal, ['renommages']);
});

// ---------------------------------------------------------------------------------------------------------------------------
// Appliquer de renommages seuls, de bout en bout : le domaine structure relit après le bilan

function monterLaStructureAvecUnPont() {
  const racine = element();
  const tokens = monterLePanneauDesTokens({ racine, nomenclature: { questions: element(), renommages: element(), remises: element() }, auChangement() {} });
  const suites: ((issue: IssueDesRenommages) => void)[] = [];
  const pont: PontDesRenommages = {
    compte: () => PRET(3), groupes: () => 1, occupe: () => false, toutCocher() {}, toutDecocher() {},
    appliquer: (suite) => { suites.push(suite); },
    abonner: () => () => {},
  };
  const envoyes: DemandeDeStructure[] = [];
  monterStructure({ pied: element(), tokens, renommages: () => pont } as unknown as Coquille, { envoyer: (message) => envoyes.push(message), noms: SANS_NOMS, ouvrirLaFiche() {} });
  return { suites, envoyes, appliquer: comme(tokens.pied) };
}

test('des renommages écrits sans correction cochée envoient lire-structure : le panneau ne garde pas les anciens noms', () => {
  const { suites, envoyes, appliquer } = monterLaStructureAvecUnPont();
  assert.deepEqual(envoyes, []);
  comme(appliquer.querySelector('.btn-primary')).clic();
  assert.deepEqual(envoyes, [], 'rien n’est demandé avant la fin des renommages');
  suites[0]('ecrit');
  assert.deepEqual(envoyes, [{ type: 'lire-structure', demande: 1 }]);
});

test('un refus des renommages ne demande pas de relecture de la structure', () => {
  const { suites, envoyes, appliquer } = monterLaStructureAvecUnPont();
  comme(appliquer.querySelector('.btn-primary')).clic();
  suites[0]('echec');
  assert.deepEqual(envoyes, []);
});

// ---------------------------------------------------------------------------------------------------------------------------
// L'issue des renommages côté Nomenclature

function suiteDeTest() {
  const issues: IssueDesRenommages[] = [];
  const suite = creerLaSuiteDuPied();
  suite.attendre(7, (issue) => issues.push(issue));
  return { suite, issues };
}

test('les renommages ne sont écrits qu’au bilan qui suit la réponse application', () => {
  const { suite, issues } = suiteDeTest();
  suite.recevoirLeResultat(7, { sorte: 'application', statut: 'applique' });
  assert.deepEqual(issues, [], 'la réponse application ne suffit pas : le fichier n’est pas relu');
  suite.recevoirLeBilan(6);
  assert.deepEqual(issues, [], 'le bilan d’une autre demande ne compte pas');
  suite.recevoirLeBilan(7);
  assert.deepEqual(issues, ['ecrit']);
  suite.recevoirLeBilan(7);
  assert.deepEqual(issues, ['ecrit'], 'l’issue part une seule fois');
  assert.equal(suite.enCours(), false);
});

test('un lot partiel compte comme écrit', () => {
  const { suite, issues } = suiteDeTest();
  suite.recevoirLeResultat(7, { sorte: 'application', statut: 'partiel' });
  suite.recevoirLeBilan(7);
  assert.deepEqual(issues, ['ecrit']);
});

test('un refus donne l’échec tout de suite, et le bilan qui pourrait suivre ne change rien', () => {
  const { suite, issues } = suiteDeTest();
  suite.recevoirLeResultat(7, { sorte: 'application', statut: 'refuse' });
  assert.deepEqual(issues, ['echec']);
  suite.recevoirLeBilan(7);
  assert.deepEqual(issues, ['echec']);
});

test('une erreur de la demande, avant ou après l’écriture, donne l’échec', () => {
  const avant = suiteDeTest();
  avant.suite.recevoirUneErreur(7);
  assert.deepEqual(avant.issues, ['echec']);
  const apres = suiteDeTest();
  apres.suite.recevoirLeResultat(7, { sorte: 'application', statut: 'applique' });
  apres.suite.recevoirUneErreur(7);
  apres.suite.recevoirLeBilan(7);
  assert.deepEqual(apres.issues, ['echec'], 'une relecture en erreur arrête les corrections de structure');
});

test('une erreur d’une autre demande, ou une annulation, ne touche pas la demande en cours', () => {
  const { suite, issues } = suiteDeTest();
  suite.recevoirUneErreur(8);
  suite.recevoirLeResultat(7, { sorte: 'annulation', statut: 'refuse' });
  assert.deepEqual(issues, []);
  assert.equal(suite.enCours(), true);
});

test('une nouvelle lecture de l’écran rend l’échec de la demande en cours', () => {
  const { suite, issues } = suiteDeTest();
  suite.repartir();
  assert.deepEqual(issues, ['echec']);
  suite.repartir();
  assert.deepEqual(issues, ['echec']);
});
