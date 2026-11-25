/**
 * Tient le registre des briques de la chaîne UCM : chaque règle de structure refuse un registre fabriqué qui la viole, les calculs
 * (états, dépendances, traits et puces du kit, versions, nombres) suivent le dépôt, et la sortie ne s'écarte de celle de A3 que par
 * les écarts listés un par un.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import * as module from '../docs/inventaire/chaine/briques';
import { BRIQUES, JAUGES, NOMBRES_ECRITS, PUCES_DU_KIT, ZONES } from '../docs/inventaire/chaine/briques';
import type { Brique, DonneeDeTrait, DonneesDeTrait, Reception } from '../docs/inventaire/chaine/briques';
import {
  controlerLeRegistre, controlerLesNombresEcrits, controlerLesPuces, donneesDeLaChaine, donneesDuTrait, etatsDesCartes, referencesDuDepot, teinteDuTrait,
  type ReferencesDuRegistre, type RegistreDeLaChaine,
} from '../docs/inventaire/chaine/calculs';

const racine = path.resolve(__dirname, '..');
const references = referencesDuDepot();
const registre: RegistreDeLaChaine = { zones: ZONES, briques: BRIQUES, jauges: JAUGES, nombres: NOMBRES_ECRITS };

/** Le registre du dépôt, avec une carte remplacée par sa version modifiée. */
function avec(id: string, changement: Partial<Brique>): RegistreDeLaChaine {
  return { ...registre, briques: BRIQUES.map((b) => (b.id === id ? { ...b, ...changement } : b)) };
}

function sansPropriete(brique: Brique, ...noms: (keyof Brique)[]): Brique {
  const copie: Record<string, unknown> = { ...brique };
  for (const nom of noms) delete copie[nom];
  return copie as unknown as Brique;
}

/** Les références du dépôt, avec des pistes de plus rangées parmi les terminées : un `pistes.json` fabriqué. */
function avecTerminees(...pistes: string[]): ReferencesDuRegistre {
  return { ...references, terminees: new Set([...references.terminees, ...pistes]) };
}

const brique = (id: string): Brique => BRIQUES.find((b) => b.id === id)!;

test('le registre du dépôt tient toutes les règles de structure', () => {
  assert.deepEqual(controlerLeRegistre(registre, references), []);
});

test('le registre ne déclare ni MARQUES ni KIT, et aucune carte ne porte etat, auj ni deps', () => {
  assert.equal('MARQUES' in module, false);
  assert.equal('KIT' in module, false);
  for (const b of BRIQUES) for (const champ of ['etat', 'auj', 'deps']) assert.equal(champ in b, false, `${b.id} porte ${champ}`);
});

test('un registre qui porte etat, auj, deps, MARQUES ou KIT est refusé', () => {
  for (const champ of ['etat', 'auj', 'deps']) {
    const erreurs = controlerLeRegistre(avec('palettes', { [champ]: champ === 'auj' ? true : champ === 'deps' ? [] : 'livre' } as Partial<Brique>), references);
    assert.ok(erreurs.some((e) => e.startsWith('palettes :') && e.includes(champ)), `${champ} : ${erreurs.join(' | ')}`);
  }
  for (const table of ['MARQUES', 'KIT']) {
    const erreurs = controlerLeRegistre({ ...registre, [table]: {} } as RegistreDeLaChaine, references);
    assert.ok(erreurs.some((e) => e.includes(table)), `${table} : ${erreurs.join(' | ')}`);
  }
});

/** Les différences que la sortie calculée a avec celle de A3, une par champ ; le rendu lit les deux sans les distinguer. */
function differencesAvecA3(): string[] {
  const aplatir = (donnees: ReturnType<typeof donneesDeLaChaine>): Map<string, string> => {
    const lignes = new Map<string, string>();
    for (const noeud of donnees.NOEUDS) for (const [champ, valeur] of Object.entries(noeud)) lignes.set(`NOEUDS ${noeud.id} ${champ}`, JSON.stringify(valeur));
    for (const [i, zone] of donnees.ZONES.entries()) lignes.set(`ZONES ${i}`, JSON.stringify(zone));
    lignes.set('LEGENDES', JSON.stringify(donnees.LEGENDES));
    lignes.set('LIENS', JSON.stringify(donnees.LIENS));
    for (const [source, cible, puces] of donnees.KIT) lignes.set(`KIT ${source}>${cible}`, JSON.stringify(puces));
    for (const [id, marques] of Object.entries(donnees.MARQUES)) lignes.set(`MARQUES ${id}`, JSON.stringify(marques));
    lignes.set('GARANTIES', JSON.stringify(donnees.GARANTIES));
    return lignes;
  };
  const attendu = JSON.parse(readFileSync(path.join(racine, 'tests/fixtures/chaine-donnees-a3.json'), 'utf8')) as ReturnType<typeof donneesDeLaChaine>;
  const avant = aplatir(attendu);
  const apres = aplatir(JSON.parse(JSON.stringify(donneesDeLaChaine())) as ReturnType<typeof donneesDeLaChaine>);
  return [...new Set([...avant.keys(), ...apres.keys()])].sort().filter((cle) => avant.get(cle) !== apres.get(cle)).map((cle) => `${cle} : ${avant.get(cle) ?? 'absent'} -> ${apres.get(cle) ?? 'absent'}`);
}

test('donneesDeLaChaine() ne s\'écarte de la sortie de A3 que par les écarts attendus, un par un', () => {
  // Une version publiée a avancé depuis A3 : le type de la carte la lit dans package.json.
  const versions = [
    'NOEUDS kit type : "npm · 0.18.1" -> "npm · 0.18.3"',
    'NOEUDS padapt type : "npm · 0.3.2" -> "npm · 0.3.4"',
    'NOEUDS pcli type : "npm · 0.4.2" -> "npm · 0.4.4"',
  ];
  // Les puces d'un trait du kit viennent des imports de `src/` : l'Exporter importe aussi `controles`, la CLI ni `emplois` ni `controles`,
  // Palettes ni `emplois` (le moteur le fait), l'adaptateur `referentiel`, le linter la seule porte `modules`, Architect `format`.
  // Le kit envoie aussi à ucm-couleur et à plugin-socle, qui déclarent `@ucm-kit/core` dans leur package.json.
  const traitsDuKit = [
    'KIT kit>architect : ["architecture","theme","controles"] -> ["format","architecture","theme","controles"]',
    'KIT kit>exporter : ["format","architecture"] -> ["format","architecture","controles"]',
    'KIT kit>linter : ["controles","modules"] -> ["modules"]',
    'KIT kit>moteur : absent -> ["architecture","theme"]',
    'KIT kit>padapt : ["format"] -> ["format","architecture"]',
    'KIT kit>palettes : ["architecture","theme"] -> ["format","architecture"]',
    'KIT kit>pcli : ["format","theme","controles"] -> ["format","architecture"]',
    'KIT kit>socle : absent -> ["format","architecture","controles"]',
  ];
  // Les dépendances viennent des `dependencies` des package.json (le kit, le moteur, le socle, le paquet de l'adaptateur), des paquets
  // que cite un module, et des traits `requis`. Le rendu ajoute encore les siennes : ces ajouts ne changent aucun état.
  const dependances = [
    'NOEUDS adaptateur deps : ["contrat"] -> ["contrat","kit"]',
    'NOEUDS architect deps : absent -> ["kit","moteur","socle"]',
    'NOEUDS cli deps : ["exporter"] -> ["exporter","kit"]',
    'NOEUDS exporter deps : absent -> ["kit","socle"]',
    'NOEUDS implementer deps : ["contrat"] -> ["contrat","pimpl","pcli"]',
    'NOEUDS linter deps : ["contrat"] -> ["contrat","kit","padapt"]',
    'NOEUDS padapt deps : absent -> ["kit"]',
    'NOEUDS palettes deps : absent -> ["kit","moteur","socle"]',
    'NOEUDS pcli deps : absent -> ["kit"]',
    'NOEUDS pimpl deps : absent -> ["kit"]',
    'NOEUDS rendu deps : ["storybook"] -> ["storybook","kit"]',
    'NOEUDS sante deps : ["cli","storybook"] -> ["storybook","cli"]',
    'NOEUDS storybook deps : ["contrat"] -> ["contrat","kit"]',
  ];
  assert.deepEqual(differencesAvecA3(), [...traitsDuKit, ...dependances, ...versions].sort());
});

test('une carte d\'outil, de module, de paquet ou la note sans produit ni piste est refusée', () => {
  for (const [id, genre] of [['palettes', 'outil'], ['linter', 'module'], ['kit', 'paquet'], ['verrou', 'note']] as const) {
    const fabrique = { ...registre, briques: BRIQUES.map((b) => (b.id === id ? sansPropriete(brique(id), 'produit', 'piste') : b)) };
    const erreurs = controlerLeRegistre(fabrique, references);
    assert.ok(erreurs.some((e) => e.startsWith(`${id} :`) && e.includes(genre)), `${genre} ${id} : ${erreurs.join(' | ')}`);
  }
});

test('un fichier ou un geste qui nomme un produit ou une piste est refusé', () => {
  assert.ok(controlerLeRegistre(avec('contrat', { piste: 'P11' }), references).some((e) => e.startsWith('contrat :')));
  assert.ok(controlerLeRegistre(avec('composants', { produit: 'exporter' }), references).some((e) => e.startsWith('composants :')));
});

test('un produit absent de PRODUITS est refusé', () => {
  const fabrique = avec('palettes', { produit: 'inconnu' as Brique['produit'] });
  assert.ok(controlerLeRegistre(fabrique, references).some((e) => e.includes('absent de PRODUITS')));
});

test('une piste citée par une carte, absente de pistes.json, est refusée', () => {
  const erreurs = controlerLeRegistre(avec('linter', { piste: 'P9999' }), references);
  assert.ok(erreurs.some((e) => e.startsWith('linter :') && e.includes('P9999')), erreurs.join(' | '));
});

test('une piste citée par une pièce, absente de pistes.json, est refusée', () => {
  const fabrique = avec('exporter', { pieces: [...brique('exporter').pieces!, { texte: 'Pièce fabriquée', piste: 'P9998' }] });
  const erreurs = controlerLeRegistre(fabrique, references);
  assert.ok(erreurs.some((e) => e.includes('P9998') && e.includes('Pièce fabriquée')), erreurs.join(' | '));
});

test('un recoit.de inconnu est refusé', () => {
  const cli = brique('cli');
  const erreurs = controlerLeRegistre(avec('cli', { recoit: [...cli.recoit!, { de: 'fantome', rang: 99, donnee: 'contrats' }] }), references);
  assert.ok(erreurs.some((e) => e.includes('fantome')), erreurs.join(' | '));
});

test('un vers de mode inconnu est refusé', () => {
  const architect = brique('architect');
  const modes = { ...architect.modes!, variables: { ...architect.modes!.variables, vers: 'fantome' } };
  const erreurs = controlerLeRegistre(avec('architect', { modes }), references);
  assert.ok(erreurs.some((e) => e.includes('fantome')), erreurs.join(' | '));
});

test('un identifiant de JAUGES inconnu est refusé', () => {
  const fabrique = { ...registre, jauges: [{ nom: 'Jauge fabriquée', par: ['palettes', 'fantome'] }] };
  const erreurs = controlerLeRegistre(fabrique, references);
  assert.ok(erreurs.some((e) => e.includes('Jauge fabriquée') && e.includes('fantome')), erreurs.join(' | '));
});

test('une carte qui sort de sa zone est refusée, largeur comprise', () => {
  const zone = ZONES.find((z) => z.id === 'repository')!;
  // Un fichier mesure 170 px : placé à 1 px près du bord droit, son origine est dans la zone mais sa largeur dépasse.
  const fichier = zone.x + zone.w - 169;
  const largeur = controlerLeRegistre(avec('contrat', { x: fichier }), references);
  assert.ok(largeur.some((e) => e.startsWith('contrat :') && e.includes('sort de la zone')), largeur.join(' | '));
  const justeDedans = controlerLeRegistre(avec('contrat', { x: zone.x + zone.w - 170 }), references);
  assert.deepEqual(justeDedans, []);
  // Un paquet large mesure 360 px, un paquet ordinaire 180.
  const toolkit = ZONES.find((z) => z.id === 'toolkit')!;
  assert.ok(controlerLeRegistre(avec('kit', { x: toolkit.x + toolkit.w - 359 }), references).some((e) => e.startsWith('kit :')));
  assert.deepEqual(controlerLeRegistre(avec('kit', { x: toolkit.x + toolkit.w - 360 }), references), []);
  assert.ok(controlerLeRegistre(avec('moteur', { x: toolkit.x + toolkit.w - 179 }), references).some((e) => e.startsWith('moteur :')));
  // Au-dessus ou en dessous de la zone.
  assert.ok(controlerLeRegistre(avec('palettes', { y: 5000 }), references).some((e) => e.startsWith('palettes :')));
});

test('une couche dont une collection manque à COLLECTIONS est refusée', () => {
  const architecture = brique('architecture');
  const couches = architecture.couches!.map((c, i) => (i === 0 ? { ...c, collections: [...c.collections, 'inconnue'] } : c));
  const erreurs = controlerLeRegistre(avec('architecture', { couches }), references);
  assert.ok(erreurs.some((e) => e.includes('inconnue') && e.includes('COLLECTIONS')), erreurs.join(' | '));
});

// ---------- Les états ----------

test('l\'état d\'une carte se calcule : un produit est disponible, une carte de piste suit ses pièces, le linter est en partie', () => {
  const etats = etatsDesCartes(registre, references);
  for (const b of BRIQUES.filter((b) => b.produit !== undefined)) assert.equal(etats.get(b.id), 'livre', b.id);
  assert.equal(etats.get('exporter'), 'livre', 'les pièces de l\'Exporter ne changent pas l\'état d\'un produit');
  assert.equal(etats.get('linter'), 'partie');
  for (const id of ['implementer', 'rendu', 'storybook', 'sante', 'verrou', 'pimpl']) assert.equal(etats.get(id), 'venir', id);
  for (const id of ['composants', 'contrat', 'tokensjson', 'code', 'developpement']) assert.equal(etats.has(id), false, `${id} est un fichier ou un geste`);
});

test('la pièce de l\'Implementer qui décrit le chemin d\'aujourd\'hui ne compte pas dans l\'état de la carte', () => {
  const implementer = brique('implementer');
  assert.ok(implementer.pieces!.some((p) => p.chemin === true && p.preuve !== undefined));
  assert.equal(etatsDesCartes(registre, references).get('implementer'), 'venir');
  const comptee = { ...implementer, pieces: implementer.pieces!.map((p) => ({ ...p, chemin: undefined })) as Brique['pieces'] };
  assert.equal(etatsDesCartes({ briques: [comptee] }, references).get('implementer'), 'partie');
});

test('« Aujourd\'hui » active exactement les cartes disponibles', () => {
  const etats = etatsDesCartes(registre, references);
  for (const noeud of donneesDeLaChaine().NOEUDS) {
    assert.equal(noeud.etat, etats.get(noeud.id), noeud.id);
    assert.equal(noeud.auj, noeud.etat === undefined ? undefined : noeud.etat === 'livre', noeud.id);
  }
});

test('une carte à venir dont la piste est terminée devient disponible, et le registre doit alors nommer le produit', () => {
  const fabriquees = avecTerminees('P17', 'P26');
  const etats = etatsDesCartes(registre, fabriquees);
  assert.equal(etats.get('verrou'), 'livre');
  assert.equal(etats.get('linter'), 'livre');
  const erreurs = controlerLeRegistre(registre, fabriquees);
  assert.ok(erreurs.some((e) => e.startsWith('verrou :') && e.includes('P17') && e.includes('terminée')), erreurs.join(' | '));
  assert.ok(erreurs.some((e) => e.startsWith('linter :') && e.includes('P26')), erreurs.join(' | '));
});

test('une pièce dont la piste est terminée, sans preuve, est refusée', () => {
  const erreurs = controlerLeRegistre(registre, avecTerminees('P23'));
  assert.ok(erreurs.some((e) => e.startsWith('exporter :') && e.includes('Choix des collections exportées') && e.includes('terminée')), erreurs.join(' | '));
});

test('une pièce sans preuve ni piste, ou avec les deux, est refusée', () => {
  const pieces = [{ texte: 'Sans rien' }, { texte: 'Les deux', piste: 'P8', preuve: { commande: 'check' } }];
  const erreurs = controlerLeRegistre(avec('cli', { pieces }), references);
  assert.ok(erreurs.some((e) => e.includes('Sans rien')) && erreurs.some((e) => e.includes('Les deux')), erreurs.join(' | '));
});

test('une preuve absente du code est refusée', () => {
  for (const preuve of [
    { commande: 'inexistante' },
    { export: { porte: 'modules', nom: 'nomInconnu' } },
    { export: { porte: 'porteInconnue', nom: 'preparerControle' } },
    { produit: 'cli', ecrit: 'planches' },
    { fichierDuConsommateur: 'ucm-fantome' },
  ] as const) {
    const erreurs = controlerLeRegistre(avec('cli', { pieces: [{ texte: 'Pièce fabriquée', preuve }] }), references);
    assert.ok(erreurs.some((e) => e.includes('Pièce fabriquée') && e.includes('absente du code')), `${JSON.stringify(preuve)} : ${erreurs.join(' | ')}`);
  }
});

// ---------- Les paquets, les versions et les nombres ----------

test('un paquet ou une porte du kit cités par une carte et inconnus sont refusés', () => {
  assert.ok(controlerLeRegistre(avec('linter', { paquets: ['fantome'] }), references).some((e) => e.includes('fantome')));
  assert.ok(controlerLeRegistre(avec('pimpl', { portes: ['fantome'] }), references).some((e) => e.includes('fantome')));
});

test('le type d\'une carte de paquet vient de package.json : version publiée ou « Paquet privé »', () => {
  const types = new Map(donneesDeLaChaine().NOEUDS.map((n) => [n.id, n.type]));
  const version = (dossier: string) => JSON.parse(readFileSync(path.join(racine, 'packages', dossier, 'package.json'), 'utf8')).version as string;
  assert.equal(types.get('kit'), `npm · ${version('kit')}`);
  assert.equal(types.get('pcli'), `npm · ${version('cli')}`);
  assert.equal(types.get('padapt'), `npm · ${version('adapter-typescript')}`);
  assert.equal(types.get('moteur'), 'Paquet privé');
  assert.equal(types.get('socle'), 'Paquet privé');
  for (const id of ['kit', 'pcli', 'padapt', 'moteur', 'socle']) assert.equal(brique(id).type, undefined, `${id} déclare son type`);
});

test('un texte qui contient une version x.y.z est refusé', () => {
  const erreurs = controlerLeRegistre(avec('kit', { phrase: 'Publié en 0.18.3.' }), references);
  assert.ok(erreurs.some((e) => e.startsWith('kit :') && e.includes('version')), erreurs.join(' | '));
});

test('un nombre écrit hors d\'un calcul et hors de NOMBRES_ECRITS est refusé', () => {
  const erreurs = controlerLeRegistre(avec('kit', { phrase: 'Douze règles et 12 portes.' }), references);
  assert.ok(erreurs.some((e) => e.startsWith('kit :') && e.includes('12')), erreurs.join(' | '));
  assert.deepEqual(controlerLeRegistre(avec('kit', { phrase: 'Testé sur 360 teintes.' }), references), []);
  const sansNombres = controlerLeRegistre({ ...registre, nombres: [] }, references);
  // L'adaptateur lit sa taille par le trou {{taille-typescript}} : seul le moteur écrit encore un nombre en clair.
  assert.ok(sansNombres.some((e) => e.startsWith('moteur :') && e.includes('360')), sansNombres.join(' | '));
  const zone = controlerLeRegistre({ ...registre, zones: ZONES.map((z) => (z.kit ? { ...z, qui: '6 paquets.' } : z)) }, references);
  assert.ok(zone.some((e) => e.includes('6')), zone.join(' | '));
});

test('les nombres des textes viennent du calcul : collections, thème, garanties, seuils, paquets', () => {
  const noeuds = new Map(donneesDeLaChaine().NOEUDS.map((n) => [n.id, n]));
  assert.ok(noeuds.get('architecture')!.phrase!.includes(`${references.valeurs.collections} collections`));
  assert.ok(noeuds.get('architect')!.modes!.variables.fait.some((f) => f.includes(`${references.valeurs.theme} tokens`)));
  assert.ok(noeuds.get('palettes')!.fait!.some((f) => f.includes(`${references.valeurs.garanties} paires`) && f.includes(references.valeurs['rapport-texte']) && f.includes(references.valeurs['rapport-graphique'])));
  assert.equal(donneesDeLaChaine().ZONES.find((z) => z.kit)!.qui.startsWith(`${BRIQUES.filter((b) => b.genre === 'paquet').length} paquets`), true);
  assert.equal(references.valeurs.collections, '7');
  assert.equal(references.valeurs['rapport-texte'], '4,5:1');
});

test('un nombre de NOMBRES_ECRITS que sa source ne porte pas est refusé', () => {
  assert.deepEqual(controlerLesNombresEcrits(NOMBRES_ECRITS), []);
  const erreurs = controlerLesNombresEcrits([
    { nombre: '361', source: 'packages/couleur/tests/ancrageDeplace.test.ts' },
    { nombre: '1', source: 'node_modules/typescript' },
    { nombre: '5', source: 'fichier/absent.txt' },
  ]);
  assert.equal(erreurs.length, 3, erreurs.join(' | '));
});

// ---------- Les traits et les puces du kit ----------

test('chaque porte de exports du kit appartient à une seule puce', () => {
  assert.deepEqual(controlerLesPuces(PUCES_DU_KIT, references.portesDuKit), []);
  const sansControles = PUCES_DU_KIT.map((puce) => ({ ...puce, portes: puce.portes.filter((porte) => porte !== 'controles') }));
  assert.ok(controlerLesPuces(sansControles, references.portesDuKit).some((e) => e.includes('controles') && e.includes('aucune puce')));
  const doublon = PUCES_DU_KIT.map((puce) => (puce.id === 'modules' ? { ...puce, portes: [...puce.portes, 'format'] } : puce));
  assert.ok(controlerLesPuces(doublon, references.portesDuKit).some((e) => e.includes('format') && e.includes('2 puces')));
  const fantome = PUCES_DU_KIT.map((puce) => (puce.id === 'modules' ? { ...puce, portes: [...puce.portes, 'fantome'] } : puce));
  assert.ok(controlerLesPuces(fantome, references.portesDuKit).some((e) => e.includes('fantome')));
});

test('la porte protocoles va sous la puce « Architecture des tokens »', () => {
  assert.equal(PUCES_DU_KIT.find((puce) => puce.portes.includes('protocoles'))!.libelle, 'Architecture des tokens');
});

test('le kit envoie ses puces à ucm-couleur et à plugin-socle, le linter ne reçoit que modules', () => {
  const liens = donneesDeLaChaine().KIT;
  const puces = (cible: string) => liens.find(([source, destination]) => source === 'kit' && destination === cible)?.[2];
  assert.deepEqual(puces('moteur'), ['architecture', 'theme']);
  assert.deepEqual(puces('socle'), ['format', 'architecture', 'controles']);
  assert.deepEqual(puces('linter'), ['modules']);
  assert.equal(liens.some(([source, cible]) => source === 'kit' && cible === 'implementer'), false);
});

test('les paquets d\'une carte du flux viennent des dependencies ou du champ paquets', () => {
  const { MARQUES } = donneesDeLaChaine();
  assert.deepEqual(MARQUES.palettes, ['core', 'couleur', 'socle']);
  assert.deepEqual(MARQUES.exporter, ['core', 'socle']);
  assert.deepEqual(MARQUES.architecture, ['core']);
  assert.deepEqual(MARQUES.cli, ['cli']);
  assert.deepEqual(MARQUES.implementer, ['implementer', 'cli']);
  assert.deepEqual(MARQUES.developpement, ['cli', 'adapter']);
  assert.equal('moteur' in MARQUES, false);
});

// ---------- Les traits : la donnée, la source, la cible et la teinte ----------

/** Le registre du dépôt, avec les traits reçus d'une carte remplacés. */
function avecTraits(id: string, recoit: readonly Reception[]): RegistreDeLaChaine {
  return avec(id, { recoit });
}

test('un trait dont la source n\'écrit pas sa donnée est refusé, d\'après PRODUITS pour un produit', () => {
  // L'Exporter n'écrit pas de rapport.
  const erreurs = controlerLeRegistre(avecTraits('cli', [{ de: 'exporter', rang: 5, donnee: 'rapports' }]), references);
  assert.ok(erreurs.some((e) => e.startsWith('cli :') && e.includes('exporter') && e.includes('rapports') && e.includes('n\'écrit pas')), erreurs.join(' | '));
});

test('un trait dont la source n\'écrit pas sa donnée est refusé, d\'après le registre pour un module', () => {
  const sansEcrit = { ...registre, briques: BRIQUES.map((b) => (b.id === 'rendu' ? { ...b, ecrit: [] } : b)) };
  const erreurs = controlerLeRegistre(sansEcrit, references);
  assert.ok(erreurs.some((e) => e.startsWith('sante :') && e.includes('rendu') && e.includes('n\'écrit pas')), erreurs.join(' | '));
});

test('un trait dont la cible ne lit pas sa donnée est refusé, d\'après PRODUITS pour un produit et le registre pour le reste', () => {
  // La CLI écrit la configuration que Storybook ne lit pas ; l'Exporter ne lit pas de code.
  const module = controlerLeRegistre(avecTraits('storybook', [{ de: 'cli', rang: 13, donnee: 'configuration' }]), references);
  assert.ok(module.some((e) => e.startsWith('storybook :') && e.includes('ne lit pas')), module.join(' | '));
  const produit = controlerLeRegistre(avecTraits('exporter', [{ de: 'cli', rang: 3, donnee: 'implementation' }]), references);
  assert.ok(produit.some((e) => e.startsWith('exporter :') && e.includes('implementation') && e.includes('ne lit pas')), produit.join(' | '));
});

test('un trait qui porte plusieurs données est refusé dès qu\'une seule manque à la source', () => {
  const erreurs = controlerLeRegistre(avecTraits('cli', [{ de: 'exporter', rang: 5, donnee: ['contrats', 'rapports'] }]), references);
  assert.equal(erreurs.filter((e) => e.startsWith('cli :')).length, 1, erreurs.join(' | '));
  assert.ok(erreurs.some((e) => e.includes('rapports') && e.includes('exporter')));
});

test('une exigence sans trait est contrôlée comme un trait', () => {
  const recoit = brique('adaptateur').recoit!.map((r) => ('sansTrait' in r ? { ...r, donnee: 'planches' as const } : r));
  const erreurs = controlerLeRegistre(avec('adaptateur', { recoit }), references);
  assert.ok(erreurs.some((e) => e.startsWith('adaptateur :') && e.includes('planches')), erreurs.join(' | '));
});

test('un mode d\'outil dont la carte n\'écrit pas la donnée de sa cible est refusé', () => {
  const architect = brique('architect');
  // Architect n'écrit ni code ni rapport : un mode vers le code ou vers la CLI n'a pas de donnée à lui remettre.
  for (const vers of ['code', 'cli']) {
    const modes = { ...architect.modes!, variables: { ...architect.modes!.variables, vers } };
    const erreurs = controlerLeRegistre(avec('architect', { modes }), references);
    assert.ok(erreurs.some((e) => e.startsWith('architect :') && e.includes(`alimente ${vers}`)), `${vers} : ${erreurs.join(' | ')}`);
  }
  const sansEcrit = controlerLeRegistre(avec('implementer', { ecrit: [] }), references);
  assert.ok(sansEcrit.some((e) => e.startsWith('implementer :') && e.includes('mode')), sansEcrit.join(' | '));
  assert.deepEqual(Object.values(brique('implementer').modes!).map((m) => m.vers), ['developpement', 'adaptateur']);
});

test('chaque mode d\'Architect vise la carte de la donnée qu\'Architect écrit', () => {
  const modes = brique('architect').modes!;
  assert.deepEqual(Object.fromEntries(Object.entries(modes).map(([nom, mode]) => [nom, brique(mode.vers).donnee])), { variables: 'variables', composant: 'composants' });
});

test('aide et hebergement servent aux trois traits que la recherche nomme, et à eux seuls', () => {
  const portes: string[] = [];
  for (const b of BRIQUES) for (const r of b.recoit ?? []) for (const d of donneesDuTrait(r.donnee)) if (d === 'aide' || d === 'hebergement') portes.push(`${r.de}>${b.id}:${d}`);
  assert.deepEqual(portes.sort(), ['adaptateur>cli:hebergement', 'linter>developpement:aide', 'storybook>sante:hebergement']);
  for (const [de, cible, donnee] of [['exporter', 'cli', 'aide'], ['linter', 'cli', 'aide'], ['storybook', 'rendu', 'hebergement'], ['cli', 'adaptateur', 'hebergement']] as const) {
    const erreurs = controlerLeRegistre(avecTraits(cible, [...brique(cible).recoit!, { de, rang: 99, donnee }]), references);
    assert.ok(erreurs.some((e) => e.startsWith(`${cible} :`) && e.includes(donnee) && e.includes('réservée')), `${de}>${cible} : ${erreurs.join(' | ')}`);
  }
  // Un des trois traits ne porte que la donnée qui lui est réservée.
  const echange = brique('developpement').recoit!.map((r) => (r.de === 'linter' ? { ...r, donnee: 'hebergement' as const } : r));
  const erreurs = controlerLeRegistre(avecTraits('developpement', echange), references);
  assert.ok(erreurs.some((e) => e.startsWith('developpement :') && e.includes('réservée')), erreurs.join(' | '));
});

test('un registre qui porte une teinte est refusé, et la teinte se calcule depuis la donnée', () => {
  const recoit = brique('architecture').recoit!.map((r) => ({ ...r, teinte: 'code' }) as unknown as Reception);
  const erreurs = controlerLeRegistre(avecTraits('architecture', recoit), references);
  assert.ok(erreurs.some((e) => e.startsWith('architecture :') && e.includes('teinte')), erreurs.join(' | '));
  for (const b of BRIQUES) for (const r of b.recoit ?? []) assert.equal('teinte' in r, false, `${b.id} < ${r.de}`);
  const table: [DonneesDeTrait, string][] = [
    ['contrats', 'contrat'], ['tokens-dtcg', 'tokens'], ['implementation', 'code'], ['rapports', 'rapport'],
    ['variables', 'neutre'], ['composants', 'neutre'], ['aide', 'neutre'], ['hebergement', 'neutre'],
    [['contrats', 'tokens-dtcg'], 'neutre'], [['contrats', 'contrats'], 'contrat'],
  ];
  for (const [donnee, teinte] of table) assert.equal(teinteDuTrait(donnee), teinte, JSON.stringify(donnee));
});

test('chaque trait dessiné prend la teinte de sa donnée', () => {
  const { LIENS } = donneesDeLaChaine();
  const attendues = new Map<string, string>();
  for (const b of BRIQUES) for (const r of b.recoit ?? []) if (!('sansTrait' in r)) attendues.set(`${r.de}>${b.id}`, teinteDuTrait(r.donnee));
  assert.equal(LIENS.length, attendues.size);
  for (const [source, cible, , teinte] of LIENS) assert.equal(teinte, attendues.get(`${source}>${cible}`), `${source}>${cible}`);
  const teinte = (cle: string) => LIENS.find(([source, cible]) => `${source}>${cible}` === cle)![3];
  assert.equal(teinte('exporter>cli'), 'neutre');
  assert.equal(teinte('cli>tokensjson'), 'tokens');
  assert.equal(teinte('rendu>cli'), 'rapport');
  assert.equal(teinte('developpement>adaptateur'), 'code');
});

test('la donnée de chaque carte de fichier ou de dessin est celle que le plan nomme', () => {
  const donnees: Record<string, DonneeDeTrait> = { tokensjson: 'tokens-dtcg', contrat: 'contrats', code: 'implementation', architecture: 'variables', composants: 'composants' };
  for (const [id, donnee] of Object.entries(donnees)) assert.equal(brique(id).donnee, donnee, id);
});
