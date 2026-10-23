/**
 * Les journaux rangés dans les données partagées : le lot complet ou rien, le journal des noms et celui de structure sans effet
 * l'un sur l'autre, et les trois sortes de lignes de structure (scopes, cible d'alias par mode, création).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CLE_JOURNAL_DE_STRUCTURE, cleDeStructure, effacerLeJournalDeStructure, journaliserLesCreations, lireLeJournalDeStructure,
  nettoyer, nettoyerLeJournalDeStructure, preparerLeJournalDeStructure, ranger, rangerLeJournalDeStructure, retirer,
  type LigneDeStructure, type PortDeRegles,
} from '../src/ecriture/journal';
import { CLE_JOURNAL, lireLeStockage, lireLesRegles } from '../src/nomenclature/regles';

/** Un stockage en mémoire ; `refuser` fait lever l'écriture des clés qu'il retient. */
function stockageEnMemoire(refuser: (cle: string) => boolean = () => false) {
  const donnees = new Map<string, string>();
  const port: PortDeRegles = {
    cles: () => [...donnees.keys()],
    lire: (cle) => donnees.get(cle) ?? '',
    ecrire: (cle, texte) => {
      if (refuser(cle)) throw new Error('Figma refuse');
      donnees.set(cle, texte);
    },
    effacer: (cle) => { donnees.delete(cle); },
  };
  return { donnees, port };
}

const scopes: LigneDeStructure = { sorte: 'scopes', variable: 'V:1', nom: 'success/surface/default', avant: ['TEXT_FILL'], apres: ['FRAME_FILL', 'SHAPE_FILL'] };
const alias: LigneDeStructure = { sorte: 'alias-de-mode', variable: 'V:2', nom: 'success/surface/default', mode: 'C:1:dark', avant: 'V:8', apres: 'V:9' };
const creation: LigneDeStructure = { sorte: 'creation', variable: 'V:3', nom: 'button/size/md', collection: 'C:2' };

test('scopes : la ligne se range puis se relit telle quelle', () => {
  const { port } = stockageEnMemoire();
  const lot = rangerLeJournalDeStructure(port, { heure: '2026-10-23T10:00:00.000Z', lignes: [scopes] }, 'lot1');
  assert.ok(lot);
  assert.deepEqual(lireLeJournalDeStructure(port), { heure: '2026-10-23T10:00:00.000Z', lignes: [scopes] });
});

test('scopes : une ligne sans liste de scopes rend le journal illisible', () => {
  const { port, donnees } = stockageEnMemoire();
  rangerLeJournalDeStructure(port, { heure: 'h', lignes: [scopes] }, 'lot1');
  const entree = JSON.parse(donnees.get(cleDeStructure('lot1', 0))!);
  entree.lignes[0].apres = 'FRAME_FILL';
  donnees.set(cleDeStructure('lot1', 0), JSON.stringify(entree));
  assert.equal(lireLeJournalDeStructure(port), undefined);
});

test('cible d’alias par mode : la ligne garde le mode, l’alias d’avant et l’alias écrit', () => {
  const { port } = stockageEnMemoire();
  rangerLeJournalDeStructure(port, { heure: 'h', lignes: [alias] }, 'lot1');
  assert.deepEqual(lireLeJournalDeStructure(port)?.lignes, [alias]);
});

test('cible d’alias par mode : une ligne sans mode rend le journal illisible', () => {
  const { port, donnees } = stockageEnMemoire();
  rangerLeJournalDeStructure(port, { heure: 'h', lignes: [alias] }, 'lot1');
  const entree = JSON.parse(donnees.get(cleDeStructure('lot1', 0))!);
  delete entree.lignes[0].mode;
  donnees.set(cleDeStructure('lot1', 0), JSON.stringify(entree));
  assert.equal(lireLeJournalDeStructure(port), undefined);
});

test('création : B8 journalise les variables créées, le lot précédent est remplacé', () => {
  const { port, donnees } = stockageEnMemoire();
  rangerLeJournalDeStructure(port, { heure: 'h', lignes: [scopes] }, 'ancien');
  const rendu = journaliserLesCreations(port, [{ variable: 'V:3', nom: 'button/size/md', collection: 'C:2' }], { heure: () => 'h2', lot: () => 'neuf' });
  assert.equal(rendu, true);
  assert.deepEqual(lireLeJournalDeStructure(port), { heure: 'h2', lignes: [creation] });
  assert.deepEqual([...donnees.keys()].sort(), [CLE_JOURNAL_DE_STRUCTURE, cleDeStructure('neuf', 0)].sort());
});

test('création : un fichier qui refuse le journal rend faux et garde le journal d’avant', () => {
  const { port } = stockageEnMemoire((cle) => cle.startsWith('journal-structure:neuf'));
  rangerLeJournalDeStructure(port, { heure: 'h', lignes: [scopes] }, 'ancien');
  const rendu = journaliserLesCreations(port, [{ variable: 'V:3', nom: 'button/size/md', collection: 'C:2' }], { lot: () => 'neuf' });
  assert.equal(rendu, false);
  assert.deepEqual(lireLeJournalDeStructure(port)?.lignes, [scopes]);
});

test('un lot trop gros se découpe en plusieurs entrées et se relit entier', () => {
  const { port, donnees } = stockageEnMemoire();
  const lignes: LigneDeStructure[] = Array.from({ length: 12 }, (_, rang) => ({ ...creation, variable: `V:${rang}` }));
  const prepare = preparerLeJournalDeStructure({ heure: 'h', lignes }, 'lot1', 400);
  assert.ok(prepare && prepare.entrees.length > 1);
  for (const { cle, texte } of [...prepare.entrees, prepare.reference]) port.ecrire(cle, texte);
  assert.deepEqual(lireLeJournalDeStructure(port)?.lignes, lignes);
  donnees.delete(cleDeStructure('lot1', 1));
  assert.equal(lireLeJournalDeStructure(port), undefined, 'une entrée manquante rend le journal illisible');
});

test('une ligne qui ne tient pas seule dans une entrée : le journal n’est pas préparé', () => {
  assert.equal(preparerLeJournalDeStructure({ heure: 'h', lignes: [creation] }, 'lot1', 50), undefined);
});

test('un lot dont la référence ne s’écrit pas efface ses entrées et laisse le journal d’avant', () => {
  let refus = false;
  const { port, donnees } = stockageEnMemoire((cle) => refus && cle === CLE_JOURNAL_DE_STRUCTURE);
  rangerLeJournalDeStructure(port, { heure: 'h', lignes: [scopes] }, 'lot1');
  refus = true;
  assert.equal(rangerLeJournalDeStructure(port, { heure: 'h2', lignes: [alias] }, 'lot2'), undefined);
  assert.equal(donnees.get(cleDeStructure('lot2', 0)), undefined);
  assert.deepEqual(lireLeJournalDeStructure(port)?.lignes, [scopes]);
});

test('sans lot sauvegardé, la lecture rend undefined ; une référence illisible aussi', () => {
  const { port } = stockageEnMemoire();
  assert.equal(lireLeJournalDeStructure(port), undefined);
  port.ecrire(CLE_JOURNAL_DE_STRUCTURE, 'pas du json');
  assert.equal(lireLeJournalDeStructure(port), undefined);
});

test('le nettoyage garde les clés demandées et efface la référence avant les entrées', () => {
  const { port } = stockageEnMemoire();
  rangerLeJournalDeStructure(port, { heure: 'h', lignes: [scopes] }, 'lot1');
  const ecritures = effacerLeJournalDeStructure(port.cles());
  assert.equal(ecritures[0]!.cle, CLE_JOURNAL_DE_STRUCTURE);
  assert.equal(ecritures.length, 2);
  const lot2 = rangerLeJournalDeStructure(port, { heure: 'h2', lignes: [alias] }, 'lot2')!;
  nettoyerLeJournalDeStructure(port, lot2.cles);
  assert.deepEqual(port.cles().slice().sort(), [CLE_JOURNAL_DE_STRUCTURE, cleDeStructure('lot2', 0)].sort());
});

test('le journal de structure ne touche pas aux règles ni au journal des noms, et inversement', () => {
  const { port } = stockageEnMemoire();
  const noms = ranger(port, { heure: 'h', renommages: [{ type: 'variable', id: 'V:1', ancienNom: 'a', nouveauNom: 'b' }] }, 'lotnoms');
  assert.ok(noms);
  rangerLeJournalDeStructure(port, { heure: 'h', lignes: [scopes, alias, creation] }, 'lotstructure');
  const regles = lireLesRegles(lireLeStockage(port));
  assert.equal(regles.journal?.renommages.length, 1);
  assert.deepEqual(regles.futures, []);
  nettoyer(port, noms.cles);
  assert.equal(lireLeJournalDeStructure(port)?.lignes.length, 3, 'nettoyer les noms laisse le journal de structure');
  nettoyerLeJournalDeStructure(port, new Set());
  assert.equal(lireLesRegles(lireLeStockage(port)).journal?.renommages.length, 1, 'effacer la structure laisse le journal des noms');
});

test('retirer remet la référence du journal des noms d’avant et efface les entrées du lot', () => {
  const { port } = stockageEnMemoire();
  const premier = ranger(port, { heure: 'h', renommages: [{ type: 'variable', id: 'V:1', ancienNom: 'a', nouveauNom: 'b' }] }, 'lot1')!;
  const avant = port.lire(CLE_JOURNAL);
  const second = ranger(port, { heure: 'h2', renommages: [{ type: 'variable', id: 'V:2', ancienNom: 'c', nouveauNom: 'd' }] }, 'lot2')!;
  assert.equal(second.referenceAvant, avant);
  retirer(port, second);
  assert.equal(port.lire(CLE_JOURNAL), avant);
  assert.ok(premier.entrees.every((cle) => port.lire(cle) !== ''));
  assert.ok(second.entrees.every((cle) => port.lire(cle) === ''));
});
