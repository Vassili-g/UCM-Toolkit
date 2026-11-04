/**
 * Le panneau de l'onglet Constats du mode Tokens, monté sur un DOM réduit avec les données des états de galerie : le sommaire (Tout, une
 * puce par catégorie qui a des cartes, Questions), une section repliable par catégorie, les catégories tenues en fin de liste, les
 * conteneurs de cartes attachés dans la section ouverte, et le retour à Tout quand le choix n'a plus de carte.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { PluginMessage } from '../src/messages';
import type { Releve } from '../src/modele';

import { poserLeDom, comme, type ElementDeTest } from './domDeTest';

poserLeDom();

import { lireLesCategories } from '../src/ui/tokens/categories';
import { monterLePanneauDesTokens, SEUIL_DE_REPLI, type PanneauDesTokens, type StructureLue } from '../src/ui/tokens/panneau';
import type { Bilan } from '../src/messages/nomenclature';
import { TEXTES_TOKENS } from '../src/ui/textes/tokens';

interface EtatDeGalerie {
  readonly id: string;
  readonly atteinte: readonly { readonly message?: PluginMessage }[];
}

const { ETATS } = require('../galerie/etats/structure.cjs') as { ETATS: readonly EtatDeGalerie[] };

/** Le bilan de Nomenclature et les constats d'un état de galerie, avec les noms de son relevé. */
function lireUnEtat(id: string): { bilan: Bilan | null; structure: StructureLue } {
  const etat = ETATS.find((candidat) => candidat.id === id);
  assert.ok(etat, id);
  let bilan: Bilan | null = null;
  let constats: StructureLue['constats'] = [];
  let corrections: StructureLue['corrections'] = [];
  let releve: Releve | null = null;
  for (const { message } of etat.atteinte) {
    if (message?.type === 'bilan') bilan = message.bilan;
    if (message?.type === 'structure') ({ constats, corrections } = message);
    if (message?.type === 'releve') releve = message.releve;
  }
  const collections = new Map(releve?.collections.map(({ id: cle, nom }) => [cle, nom]));
  const noms = new Map(releve?.variables.map(({ id: cle, nom, collection }) => [cle, `${collections.get(collection)}/${nom}`]));
  return {
    bilan,
    structure: { constats, corrections, noms: { nom: (cle) => noms.get(cle) ?? null, cle: (nom) => [...noms].find(([, entier]) => entier === nom)?.[0] ?? null } },
  };
}

interface Banc {
  readonly panneau: PanneauDesTokens;
  readonly racine: ElementDeTest;
  readonly nomenclature: { readonly questions: HTMLElement; readonly renommages: HTMLElement; readonly remises: HTMLElement };
  changements: number;
}

function monter(id: string): Banc & { donnees: ReturnType<typeof lireUnEtat> } {
  const donnees = lireUnEtat(id);
  const racine = element();
  const nomenclature = { questions: element(), renommages: element(), remises: element() };
  const banc = { racine: lu(racine), nomenclature, changements: 0, donnees } as Banc & { donnees: typeof donnees };
  const panneau = monterLePanneauDesTokens({ racine, nomenclature, auChangement: () => { banc.changements += 1; } });
  Object.assign(banc, { panneau });
  panneau.poser({ bilan: donnees.bilan, reglesRecues: 0 });
  panneau.poserLaStructure(donnees.structure);
  return banc;
}

const puces = (banc: Banc): ElementDeTest[] => banc.racine.querySelectorAll('.puce-element');
const sections = (banc: Banc): ElementDeTest[] => banc.racine.querySelectorAll('.section-element');
const identifiants = (elements: readonly ElementDeTest[]): string[] => elements.map((element) => element.dataset.element);
const nombre = (element: ElementDeTest): string => comme(element.querySelector('.nombre')).textContent;

const ORDRE = ['noms', 'manquantes', 'crans', 'alias', 'modes', 'valeurs', 'couches', 'types', 'rangement', 'scopes'];
/** Le faux élément que le panneau reçoit, typé comme le vrai. */
const element = (): HTMLElement => document.createElement('div');
/** Le faux élément que les assertions lisent. */
const lu = (vrai: HTMLElement): ElementDeTest => comme(vrai);

test('Tout compte les cartes, chaque catégorie qui en a prend une puce, puis Questions ferme le sommaire', () => {
  const banc = monter('t-structure');
  const categories = lireLesCategories({ nomenclature: banc.donnees.bilan, ...banc.donnees.structure, partielle: false });
  const avecCartes = categories.filter(({ nombre: n }) => n > 0);
  const questions = categories.reduce((somme, { cartes }) => somme + cartes.filter(({ estUneQuestion }) => estUneQuestion).length, 0);
  assert.ok(questions > 0);
  assert.deepEqual(identifiants(puces(banc)), ['tout', ...avecCartes.map(({ id }) => id), 'questions']);
  const total = avecCartes.reduce((somme, { nombre: n }) => somme + n, 0);
  assert.equal(banc.panneau.total(), total);
  assert.deepEqual(puces(banc).map(nombre), [String(total), ...avecCartes.map(({ nombre: n }) => String(n)), String(questions)]);
  const [tout, ...autres] = puces(banc);
  assert.equal(tout.getAttribute('aria-pressed'), 'true');
  assert.ok(autres.every((puce) => puce.getAttribute('aria-pressed') === 'false'));
  assert.equal(tout.querySelector('.signe'), null, 'Tout n’a pas de signe');
  const signeDeLaPuceQuestions = comme(autres[autres.length - 1].querySelector('.signe'));
  assert.equal(signeDeLaPuceQuestions.classes.has('signe-teinte-tokens'), false, 'le signe question reste gris');
  for (const puce of autres.slice(0, -1)) assert.ok(comme(puce.querySelector('.signe')).classes.has('signe-teinte-tokens'), puce.dataset.element);
});

test('une section par catégorie qui a des cartes, dans l’ordre, puis les catégories tenues', () => {
  const banc = monter('t-structure');
  const categories = lireLesCategories({ nomenclature: banc.donnees.bilan, ...banc.donnees.structure, partielle: false });
  const avecCartes = categories.filter(({ nombre: n }) => n > 0).map(({ id }) => id);
  const tenues = categories.filter(({ tenue }) => tenue).map(({ id }) => id);
  assert.ok(tenues.length > 0);
  assert.deepEqual(identifiants(sections(banc)), [...avecCartes, ...tenues]);
  assert.deepEqual(avecCartes, ORDRE.filter((id) => (avecCartes as string[]).includes(id)), 'les sections suivent l’ordre des dix catégories');
  for (const section of sections(banc)) {
    const bande = comme(section.querySelector('.bande-element'));
    const enCartes = (avecCartes as string[]).includes(section.dataset.element);
    assert.equal(bande.classes.has('tenue'), !enCartes, section.dataset.element);
    assert.equal(comme(bande.querySelector('.signe')).classes.has('signe-teinte-tokens'), enCartes, section.dataset.element);
    if (enCartes) assert.equal(nombre(bande), String(categories.find(({ id }) => id === section.dataset.element)!.nombre));
  }
});

test('les conteneurs de cartes sont attachés dans la section ouverte, et une bande repliée les détache', () => {
  const banc = monter('t-structure');
  const alias = lu(banc.panneau.hote('alias'));
  const sectionDe = (id: string): ElementDeTest => comme(sections(banc).find((section) => section.dataset.element === id));
  assert.ok(sectionDe('alias').contains(alias));
  assert.ok(sectionDe('noms').contains(lu(banc.nomenclature.questions)));
  assert.ok(sectionDe('noms').contains(lu(banc.nomenclature.renommages)));
  const bande = comme(sectionDe('alias').querySelector('.bande-element'));
  assert.equal(bande.getAttribute('aria-expanded'), 'true');
  bande.clic();
  assert.equal(comme(sectionDe('alias').querySelector('.bande-element')).getAttribute('aria-expanded'), 'false');
  assert.equal(sectionDe('alias').contains(alias), false);
  comme(sectionDe('alias').querySelector('.bande-element')).clic();
  assert.ok(sectionDe('alias').contains(alias));
});

test('une puce de catégorie isole sa section, et Questions isole les cartes qui posent une question', () => {
  const banc = monter('t-structure');
  const puce = (id: string): ElementDeTest => comme(puces(banc).find((candidate) => candidate.dataset.element === id));
  const avant = banc.changements;
  puce('valeurs').clic();
  assert.equal(banc.panneau.choix(), 'valeurs');
  assert.deepEqual(identifiants(sections(banc)), ['valeurs']);
  assert.equal(puce('valeurs').getAttribute('aria-pressed'), 'true');
  assert.equal(banc.changements, avant + 1, 'la coquille relit son compte');
  puce('questions').clic();
  assert.equal(banc.panneau.choix(), 'questions');
  const categories = lireLesCategories({ nomenclature: banc.donnees.bilan, ...banc.donnees.structure, partielle: false });
  assert.deepEqual(identifiants(sections(banc)), categories.filter(({ cartes }) => cartes.some(({ estUneQuestion }) => estUneQuestion)).map(({ id }) => id));
  assert.ok(lu(banc.panneau.hote('valeurs')).classes.has('filtre-questions'));
  const noms = comme(sections(banc).find((section) => section.dataset.element === 'noms'));
  assert.equal(noms.contains(lu(banc.nomenclature.renommages)), false, 'sous Questions, Noms ne montre que ses questions');
  assert.ok(noms.contains(lu(banc.nomenclature.questions)));
  puce('tout').clic();
  assert.equal(lu(banc.panneau.hote('valeurs')).classes.has('filtre-questions'), false);
});

test('un choix qui n’a plus de carte revient à Tout', () => {
  const banc = monter('t-structure');
  comme(puces(banc).find((puce) => puce.dataset.element === 'valeurs')).clic();
  assert.equal(banc.panneau.choix(), 'valeurs');
  banc.panneau.poserLaStructure({ ...banc.donnees.structure, constats: [], corrections: [] });
  assert.equal(banc.panneau.choix(), 'tout');
  assert.equal(comme(puces(banc)[0]).getAttribute('aria-pressed'), 'true');
});

test('tant que la structure n’est pas lue, seules les catégories de Noms se comptent, et aucune n’est tenue', () => {
  const donnees = lireUnEtat('t-structure');
  const racine = element();
  const nomenclature = { questions: element(), renommages: element(), remises: element() };
  const panneau = monterLePanneauDesTokens({ racine, nomenclature, auChangement() {} });
  panneau.poser({ bilan: donnees.bilan, reglesRecues: 0 });
  assert.deepEqual(identifiants(lu(racine).querySelectorAll('.section-element')), ['noms']);
  assert.equal(lu(racine).querySelectorAll('.bande-element.tenue').length, 0);
  assert.equal(panneau.total(), lireLesCategories({ nomenclature: donnees.bilan, constats: [], corrections: [], noms: donnees.structure.noms, partielle: true })[0].nombre);
});

test('les règles reçues du mode Composant s’ajoutent aux questions de Noms', () => {
  const banc = monter('t-structure');
  const avant = Number(nombre(comme(puces(banc).find((puce) => puce.dataset.element === 'questions'))));
  const total = banc.panneau.total();
  banc.panneau.poser({ bilan: banc.donnees.bilan, reglesRecues: 2 });
  assert.equal(Number(nombre(comme(puces(banc).find((puce) => puce.dataset.element === 'questions')))), avant + 2);
  assert.equal(banc.panneau.total(), total + 2);
});

test('les noms accessibles disent le nombre de constats ou de questions', () => {
  assert.equal(TEXTES_TOKENS.nomDeLaPuce('Crans', 1), 'Crans, 1 constat');
  assert.equal(TEXTES_TOKENS.nomDeLaPuce('Crans', 3), 'Crans, 3 constats');
  assert.equal(TEXTES_TOKENS.nomDeLaPuceDesQuestions('Questions', 2), 'Questions, 2 questions');
  assert.equal(TEXTES_TOKENS.nomDeLOngletConstats(1), 'Constats, 1 constat');
});

/** Le bilan de travail de la galerie : 3 questions, 4 renommages, 1 question remise à plus tard et 2 autres pistes. */
const { bilans } = require('../galerie/nomenclature/donnees.cjs') as { bilans: { travail: Bilan } };

/** Le bilan de travail, rallongé à `total` renommages. */
function bilanDeRenommages(total: number): Bilan {
  const [modele] = bilans.travail.groupes;
  return { ...bilans.travail, groupes: Array.from({ length: total }, (_, rang) => ({ ...modele, cle: `terme:t${rang}`, avant: `t${rang}` })) };
}

function monterAvec(bilan: Bilan): Banc {
  const racine = element();
  const nomenclature = { questions: element(), renommages: element(), remises: element() };
  const banc = { racine: lu(racine), nomenclature, changements: 0 } as Banc;
  const panneau = monterLePanneauDesTokens({ racine, nomenclature, auChangement: () => { banc.changements += 1; } });
  Object.assign(banc, { panneau });
  panneau.poser({ bilan, reglesRecues: 0 });
  return banc;
}

const sectionDeNoms = (banc: Banc): ElementDeTest => comme(sections(banc).find((section) => section.dataset.element === 'noms'));
const corpsDe = (section: ElementDeTest): ElementDeTest[] => section.children.filter((enfant) => !enfant.classes.has('bande-element'));

test('la section Noms montre les questions, puis les renommages, puis les questions remises et les autres pistes', () => {
  const banc = monterAvec(bilans.travail);
  const { questions, renommages, remises } = banc.nomenclature;
  assert.deepEqual(corpsDe(sectionDeNoms(banc)), [lu(questions), lu(renommages), lu(remises)]);
  assert.equal(questions.hidden, false);
  assert.equal(renommages.hidden, false);
  assert.equal(remises.hidden, false);
});

test('sans question remise ni autre piste, le conteneur des remises se cache ; sans renommage, celui des renommages', () => {
  const banc = monterAvec({ ...bilans.travail, plusTard: [], autresPistes: 0 });
  assert.deepEqual(corpsDe(sectionDeNoms(banc)), [lu(banc.nomenclature.questions), lu(banc.nomenclature.renommages)]);
  const sansRenommage = monterAvec({ ...bilans.travail, groupes: [] });
  assert.deepEqual(corpsDe(sectionDeNoms(sansRenommage)), [lu(sansRenommage.nomenclature.questions), lu(sansRenommage.nomenclature.remises)]);
});

test('la puce Questions garde les questions et les remises, et retire les renommages', () => {
  const banc = monterAvec(bilans.travail);
  comme(puces(banc).find((puce) => puce.dataset.element === 'questions')).clic();
  assert.deepEqual(corpsDe(sectionDeNoms(banc)), [lu(banc.nomenclature.questions), lu(banc.nomenclature.remises)]);
});

test('Noms arrive repliée au-delà de 20 cartes, et ouverte à 20', () => {
  const ouverte = monterAvec(bilanDeRenommages(17));
  assert.equal(ouverte.panneau.total(), 20);
  assert.equal(comme(sectionDeNoms(ouverte).querySelector('.bande-element')).getAttribute('aria-expanded'), 'true');
  assert.ok(corpsDe(sectionDeNoms(ouverte)).length > 0);
  const repliee = monterAvec(bilanDeRenommages(18));
  assert.equal(repliee.panneau.total(), 21);
  assert.equal(SEUIL_DE_REPLI, 20);
  assert.equal(comme(sectionDeNoms(repliee).querySelector('.bande-element')).getAttribute('aria-expanded'), 'false');
  assert.deepEqual(corpsDe(sectionDeNoms(repliee)), [], 'aucun conteneur dans la section repliée');
  assert.equal(nombre(comme(sectionDeNoms(repliee).querySelector('.bande-element'))), '21', 'la bande garde le compte');
});

test('une section Noms longue se déplie par sa bande et se replie de même', () => {
  const banc = monterAvec(bilanDeRenommages(18));
  comme(sectionDeNoms(banc).querySelector('.bande-element')).clic();
  const section = sectionDeNoms(banc);
  assert.equal(comme(section.querySelector('.bande-element')).getAttribute('aria-expanded'), 'true');
  assert.deepEqual(corpsDe(section), [lu(banc.nomenclature.questions), lu(banc.nomenclature.renommages), lu(banc.nomenclature.remises)]);
  comme(section.querySelector('.bande-element')).clic();
  assert.deepEqual(corpsDe(sectionDeNoms(banc)), []);
});

test('une section Noms longue se déplie par sa puce, et une nouvelle lecture ne rouvre pas ce que le designer a replié', () => {
  const banc = monterAvec(bilanDeRenommages(18));
  comme(puces(banc).find((puce) => puce.dataset.element === 'noms')).clic();
  assert.equal(banc.panneau.choix(), 'noms');
  const section = sectionDeNoms(banc);
  assert.equal(comme(section.querySelector('.bande-element')).getAttribute('aria-expanded'), 'true');
  assert.deepEqual(corpsDe(section), [lu(banc.nomenclature.questions), lu(banc.nomenclature.renommages), lu(banc.nomenclature.remises)]);
  comme(puces(banc).find((puce) => puce.dataset.element === 'tout')).clic();
  assert.deepEqual(corpsDe(sectionDeNoms(banc)), [], 'revenu à Tout, la section est restée repliée');
  banc.panneau.poser({ bilan: bilanDeRenommages(19), reglesRecues: 0 });
  assert.deepEqual(corpsDe(sectionDeNoms(banc)), [], 'une nouvelle lecture garde le choix pris');
});

test('les états de galerie montrent les questions en tête de Noms, et Noms longue repliée', () => {
  const montrerLEtat = (id: string): Banc => {
    const donnees = lireUnEtat(id);
    const banc = monterAvec(donnees.bilan!);
    banc.panneau.poserLaStructure(donnees.structure);
    return banc;
  };
  const constats = montrerLEtat('t-constats');
  assert.deepEqual(corpsDe(sectionDeNoms(constats)).slice(0, 2), [lu(constats.nomenclature.questions), lu(constats.nomenclature.renommages)]);
  assert.equal(comme(sectionDeNoms(constats).querySelector('.bande-element')).getAttribute('aria-expanded'), 'true');
  const longue = montrerLEtat('t-constats-noms-longue');
  assert.equal(nombre(comme(sectionDeNoms(longue).querySelector('.bande-element'))), '27');
  assert.equal(comme(sectionDeNoms(longue).querySelector('.bande-element')).getAttribute('aria-expanded'), 'false');
  assert.deepEqual(corpsDe(sectionDeNoms(longue)), []);
  const autres = sections(longue).filter((section) => section.dataset.element !== 'noms');
  assert.ok(autres.some((section) => comme(section.querySelector('.bande-element')).getAttribute('aria-expanded') === 'true'), 'les sections courtes restent ouvertes');
});
