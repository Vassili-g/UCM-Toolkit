/**
 * Les références de composants : registre des systèmes, valeurs extraites,
 * gabarit, schémas et guide rendu. Les données réelles (index, fiches,
 * relevés, guides) se contrôlent dès qu'elles existent ; un guide d'essai,
 * fabriqué ici, prouve les calculs et les refus sans dépendre d'elles.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { contraste, lireHexa } from 'ucm-couleur';
import { REGISTRE_ETATS } from '@ucm-kit/core/referentiel';

import { extraireSysteme, feuillesDtcg, SYSTEMES_A_NOMS } from '../docs/references/design-systems/_outils/extraire.mjs';
import {
  ANCRES, CONTEXTE_REEL, GABARIT, aInstaller, calculerGuide, chargerIndex, chargerSystemes, ecrireReleve, etat, fichesDe,
  importsDeScene, moisEntre, relever, verifierFiches, verifierIndex, type Contexte,
} from '../docs/references/_outils/guide';

const reel = CONTEXTE_REEL;
const lireJson = (chemin: string) => JSON.parse(readFileSync(chemin, 'utf8'));
const dsDir = path.join(reel.references, 'design-systems');

/* ------------------------------------------------------------------ DTCG */

test('un nœud DTCG qui porte une valeur et des enfants donne un token et ceux de ses enfants', () => {
  const noms = feuillesDtcg({
    background: {
      $type: 'color',
      $extensions: { 'carbon.themes': { white: '{white.default}' } },
      hover: { $type: 'color', $extensions: { 'carbon.themes': { white: '{gray.10}' } } },
    },
    focus: { $type: 'color', $value: '#0f62fe' },
  }, 'semantique');
  assert.deepEqual(noms, [
    { nom: 'background', type: 'color', couche: 'semantique' },
    { nom: 'background.hover', type: 'color', couche: 'semantique' },
    { nom: 'focus', type: 'color', couche: 'semantique' },
  ]);
});

test('Carbon publie les noms que le défaut DTCG faisait perdre', () => {
  const noms = new Set(lireJson(path.join(dsDir, 'carbon', 'noms.json')).map((n: { nom: string }) => n.nom));
  for (const nom of ['background', 'focus', 'text.on.color', 'link.primary', 'button.primary']) assert.ok(noms.has(nom), nom);
  assert.equal(noms.size, 665);
});

/* ------------------------------------------------------- registre et sources */

test('le registre des systèmes nomme dix-huit références et des modes qui existent', () => {
  const systemes = chargerSystemes(reel);
  assert.equal(systemes.length, 18);
  assert.equal(new Set(systemes.map((s) => s.id)).size, 18);
  const roles = new Set(['tokens', 'composants', 'comportement', 'redaction', 'nommage']);
  for (const s of systemes) {
    assert.ok(s.roles.length > 0 && s.roles.every((r) => roles.has(r)), `${s.id} : rôles`);
    assert.equal(s.roles.includes('tokens'), s.tokens !== null, `${s.id} : le rôle tokens suit le dossier`);
    if (!s.tokens) {
      assert.equal(s.modes, null, `${s.id} : pas de modes sans tokens`);
      continue;
    }
    const noms = new Set(lireJson(path.join(reel.references, s.tokens, 'noms.json')).map((n: { nom: string }) => n.nom));
    for (const mode of [s.modes?.light, s.modes?.dark]) {
      if (mode?.page) assert.ok(noms.has(mode.page), `${s.id} : le token de page ${mode.page} n'existe pas`);
    }
  }
  const avecFiche = systemes.filter((s) => s.roles.includes('composants')).map((s) => s.id).sort();
  assert.deepEqual(avecFiche, ['ant-design', 'atlassian', 'carbon', 'fluent-2', 'material-3', 'polaris', 'radix', 'spectrum']);
  const avecTable = systemes.filter((s) => s.tableDeTokens).map((s) => s.id).sort();
  assert.deepEqual(avecTable, ['ant-design', 'carbon', 'material-3', 'spectrum']);
});

test('une source de composant est figée sans entrer dans les noms, et chaque fichier suit son SHA-256', () => {
  const sources = lireJson(path.join(dsDir, 'sources.json')) as { systeme: string; localFile: string; sha256: string; usage?: string; genere?: boolean }[];
  const composants = sources.filter((s) => s.usage === 'composant');
  assert.ok(composants.some((s) => /ButtonBase/.test(s.localFile)) && composants.some((s) => /base-button/.test(s.localFile)));
  for (const s of sources) {
    const fichier = path.join(dsDir, s.localFile);
    assert.ok(existsSync(fichier), `${s.localFile} manque`);
    assert.equal(createHash('sha256').update(readFileSync(fichier)).digest('hex'), s.sha256, s.localFile);
  }
  const noms = lireJson(path.join(dsDir, 'primer', 'noms.json')) as { nom: string }[];
  assert.ok(!noms.some((n) => /^\.|useButtonStyles|ButtonBase/.test(n.nom)));
});

/* -------------------------------------------------------------------- valeurs */

test('noms.json et valeurs.json suivent une nouvelle extraction des sources figées', () => {
  const ronde = (x: unknown) => JSON.parse(JSON.stringify(x));
  for (const systeme of SYSTEMES_A_NOMS as string[]) {
    const { noms, valeurs } = extraireSysteme(systeme);
    assert.deepEqual(ronde(noms), lireJson(path.join(dsDir, systeme, 'noms.json')), `${systeme}/noms.json`);
    const fichier = path.join(dsDir, systeme, 'valeurs.json');
    if (!valeurs?.length) {
      assert.ok(!existsSync(fichier), `${systeme}/valeurs.json n'a pas de source`);
      continue;
    }
    const lues = lireJson(fichier) as { nom: string; mode: string | null; valeur: string | null; resolue: string | null }[];
    assert.deepEqual(ronde(valeurs), lues, `${systeme}/valeurs.json`);
    const connus = new Set(noms.map((n: { nom: string }) => n.nom));
    assert.ok(lues.every((l) => connus.has(l.nom)), `${systeme} : une valeur sans nom`);
    const cles = lues.map((l) => `${l.nom}|${l.mode}`);
    assert.equal(new Set(cles).size, cles.length, `${systeme} : une ligne par nom et par mode`);
  }
});

test('Carbon résout ses alias vers la palette, en quatre thèmes, avec l’opacité à part', () => {
  const lignes = lireJson(path.join(dsDir, 'carbon', 'valeurs.json')) as { nom: string; mode: string | null; valeur: string; resolue: string | null; alpha?: number }[];
  const trouver = (nom: string, mode: string) => lignes.find((l) => l.nom === nom && l.mode === mode);
  assert.deepEqual([trouver('button.primary', 'white')?.valeur, trouver('button.primary', 'white')?.resolue], ['{blue.60}', '#0f62fe']);
  assert.equal(trouver('background', 'g100')?.resolue, '#161616');
  assert.equal(trouver('background.active', 'white')?.alpha, 0.5);
  assert.ok(lignes.every((l) => l.resolue !== null), 'tous les alias de Carbon se résolvent dans ses fichiers');
});

test('la taille des valeurs reste sous 5 Mo', () => {
  const total = readdirSync(dsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(dsDir, d.name, 'valeurs.json')))
    .reduce((n, d) => n + readFileSync(path.join(dsDir, d.name, 'valeurs.json')).length, 0);
  assert.ok(total < 5 * 1024 * 1024, `${total} octets`);
});

/* -------------------------------------------------------------------- gabarit */

test('le gabarit garde ses cinq sections dans l’ordre et une palette claire lisible', () => {
  const gabarit = readFileSync(path.join(reel.references, '_outils', 'gabarit.html'), 'utf8');
  assert.deepEqual([...gabarit.matchAll(/<section id="([a-z]+)">/g)].map((m) => m[1]), [...ANCRES]);
  assert.deepEqual([...gabarit.matchAll(/<!-- @@([a-z]+)@@ -->/g)].map((m) => m[1]), [...ANCRES]);
  assert.ok(!/<iframe|<img|https?:\/\/|<script[^>]*src=/.test(gabarit), 'le gabarit ne charge rien lui-même : seules les scènes rendues chargent leurs paquets');
  assert.match(gabarit, /color-scheme: light/);

  const palette = Object.fromEntries([...gabarit.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6});/g)].map((m) => [m[1], lireHexa(m[2])!]));
  for (const [texte, fond, seuil] of [
    ['texte', 'fond', 7], ['texte', 'surface', 7], ['texte', 'surface-haute', 7], ['discret', 'fond', 4.5], ['discret', 'surface', 4.5],
    ['discret', 'surface-haute', 4.5], ['accent', 'fond', 4.5], ['accent', 'surface-haute', 4.5], ['ok', 'surface', 4.5],
    ['alerte', 'surface', 4.5], ['erreur', 'surface', 4.5],
  ] as [string, string, number][]) {
    assert.ok(contraste(palette[texte], palette[fond]) >= seuil, `${texte} sur ${fond}`);
  }
});

/* ---------------------------------------------------------------- calculs purs */

test('les dates se comparent en mois entiers', () => {
  assert.equal(moisEntre('2026-01-10', '2027-01-09'), 11);
  assert.equal(moisEntre('2026-01-10', '2027-02-10'), 13);
});

test('une scène est rattachée aux versions déclarées de ses paquets', () => {
  const code = [
    "import { createElement as h } from 'react';",
    "import { createRoot } from 'react-dom/client';",
    "import Icone from '@scope/lib/icons/Liste';",
    "import './local.js';",
    "import 'https://exemple.test/x.js';",
  ].join('\n');
  assert.deepEqual(importsDeScene(code), ['react', 'react-dom/client', '@scope/lib/icons/Liste']);
  assert.deepEqual(aInstaller(code, ['react@19.2.0', 'react-dom@19.2.0', '@scope/lib@1.0.0']), {
    installe: ['@scope/lib@1.0.0/icons/Liste', 'react-dom@19.2.0/client', 'react@19.2.0'],
    erreurs: [],
  });
  // react-dom ne doit pas se rattacher à react, qui est un préfixe de son nom sans la barre.
  assert.deepEqual(aInstaller(code, ['react@19.2.0', '@scope/lib@1.0.0']).erreurs, ['l\'import react-dom/client ne correspond à aucun paquet déclaré']);
});

/* ------------------------------------------------------------- guide d'essai */

interface Fixture { ctx: Contexte; ecrire: (chemin: string, contenu: unknown) => void; guide: ReturnType<typeof guideDEssai> }

function fiche(systeme: string, lu: string) {
  return {
    composant: 'button',
    systeme,
    lu,
    pages: [`https://exemple.test/${systeme}/button`],
    variantes: ['primary'],
    tailles: { md: '40px' },
    anatomie: ['libellé'],
    etats: REGISTRE_ETATS.termes.slice(0, 2).map((terme) => terme.id),
    clavier: ['Entrée active le bouton.'],
    regles: ['Un seul bouton principal par zone.'],
    redaction: ['Le libellé commence par un verbe.'],
    particularites: [],
  };
}

function guideDEssai() {
  return {
    gabarit: 2,
    composant: 'button',
    date: '2026-03-01',
    resume: 'Lance une action dans la page.',
    cas: [{ id: 'repos', titre: 'Au repos' }, { id: 'long', titre: 'Libellé long', largeur: 200 }],
    galerie: [{
      systeme: 'alpha',
      composant: 'Button',
      paquets: ['lib-a@1.0.0'],
      points: ['Le libellé reste sur une ligne.', 'Le focus suit le contour.', 'Le bouton désactivé reste focalisable.'],
    }],
    absences: [{ systeme: 'beta', raison: 'Pas de paquet web publié.' }],
    comprendre: [{
      titre: 'Le bouton désactivé',
      constat: 'Deux systèmes le traitent différemment.',
      options: [
        { nom: 'Focalisable', detail: 'Le lecteur d’écran le trouve.', systemes: ['alpha'] },
        { nom: 'Hors du parcours', detail: '', systemes: ['beta'] },
      ],
      decider: 'Garder le bouton désactivé dans le parcours du clavier, ou non.',
    }],
    dessiner: {
      tableaux: [{
        titre: 'Bouton',
        colonnes: ['Principal', 'Secondaire'],
        lignes: [
          { nom: 'Repos', cellules: ['oui', 'oui'], pourquoi: 'Les deux emphases de base.' },
          { nom: 'Désactivé', cellules: ['Si le produit en a besoin', 'non'], pourquoi: 'Le secondaire se masque.' },
        ],
      }],
      proprietes: [{ nom: 'Taille', valeurs: '32 · 40 px', note: 'Deux tailles suffisent.' }],
    },
    questions: [{ question: 'UCM publie-t-il un état de chargement ?', options: ['état du registre', 'propriété booléenne'], dependDe: 'Le registre des états du kit.' }],
  };
}

const TABLE_ALPHA = {
  paquets: ['lib-a@1.0.0'],
  installe: ['lib-a@1.0.0'],
  imports: { 'lib-a': 'https://cdn.exemple.test/npm:lib-a@1.0.0/index.js' },
  feuilles: ['https://cdn.exemple.test/npm:lib-a@1.0.0/style.css'],
};

function fabriquer(): Fixture {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'references-'));
  const ecrire = (chemin: string, contenu: unknown) => {
    mkdirSync(path.dirname(path.join(dir, chemin)), { recursive: true });
    writeFileSync(path.join(dir, chemin), typeof contenu === 'string' ? contenu : `${JSON.stringify(contenu, null, 2)}\n`);
  };
  const systeme = (id: string, roles: string[]) => ({
    id, nom: id.toUpperCase(), editeur: 'Éditeur d’essai', roles, tokens: null,
    documentation: `https://exemple.test/${id}`, licences: { code: 'MIT', documentation: 'non vérifiée' }, modes: null,
  });
  ecrire('systemes.json', [systeme('alpha', ['composants']), systeme('beta', ['composants']), systeme('gamma', ['comportement'])]);
  ecrire('composants/index.json', [
    {
      id: 'button', nom: 'Bouton', definition: 'Lance une action.', voisins: ['link'],
      systemes: {
        alpha: { nom: 'Button', url: 'https://exemple.test/alpha/button' },
        beta: { nom: 'Filled', url: 'https://exemple.test/beta/button' },
        gamma: { nom: 'Button pattern', url: 'https://exemple.test/gamma/button' },
      },
    },
    { id: 'link', nom: 'Lien', definition: 'Mène ailleurs.', voisins: ['button'], systemes: {} },
  ]);
  ecrire('composants/button/alpha.json', fiche('alpha', '2026-01-10'));
  ecrire('composants/button/beta.json', fiche('beta', '2026-01-10'));
  ecrire('_outils/scenes/scene.js', 'function monter(rendre) { for (const c of CAS) rendre(c.id, document.body, () => {}); }\n');
  ecrire('_outils/scenes/button/alpha.js', "import { Bouton } from 'lib-a';\n\nmonter((cas, hote) => { hote.append(Bouton(cas)); });\n");
  ecrire('_outils/scenes/button/alpha.carte.json', TABLE_ALPHA);
  const guide = guideDEssai();
  ecrire('analyses/button.json', guide);
  return { ctx: { references: dir, racine: reel.racine }, ecrire, guide };
}

test('le guide d’essai se rend avec sa galerie, ses différences et ses variantes', () => {
  const { ctx } = fabriquer();
  const rendu = calculerGuide(ctx, 'button');
  assert.deepEqual(rendu.erreurs, []);
  const html = rendu.html!;
  assert.deepEqual([...html.matchAll(/<section id="([a-z]+)">/g)].map((m) => m[1]), [...ANCRES]);
  assert.ok(!html.includes('@@') && !html.includes('{{'));
  assert.ok(html.includes('<meta name="ucm-gabarit" content="2">'));
  // La scène est un document complet dans son cadre : table d'imports, `process`, puis les cas du guide.
  const scene = /srcdoc="([^"]*)"/.exec(html)![1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  assert.match(scene, /<script type="importmap">\{"imports":\{"lib-a":"https:\/\/cdn\.exemple\.test\/npm:lib-a@1\.0\.0\/index\.js"/);
  assert.ok(scene.includes('"https://cdn.exemple.test/npm:lib-a@1.0.0/style.css":"data:text/javascript,'), 'une feuille importée devient un module qui la lie');
  assert.ok(scene.includes('globalThis.process'));
  assert.ok(scene.includes('const CAS = [{"id":"repos","titre":"Au repos"},{"id":"long","titre":"Libellé long","largeur":200}];'));
  assert.ok(html.includes('lib-a@1.0.0'));
  assert.ok(html.includes('Pas de paquet web publié.'), 'un système sans scène garde sa carte et sa raison');
  assert.ok(html.includes('<a href="#beta">BETA</a>'), 'une option renvoie à la carte de son système');
  assert.ok(html.includes('<td class="oui">À dessiner</td>') && html.includes('<td class="si">Si le produit en a besoin</td>'));
  assert.equal(calculerGuide(ctx, 'button').html, html, 'rendu déterministe');
});

test('un guide incomplet, une scène sans table à jour ou une carte manquante sont refusés', () => {
  const sansSection = fabriquer();
  const { questions: _questions, ...incomplet } = sansSection.guide;
  sansSection.ecrire('analyses/button.json', incomplet);
  assert.ok(calculerGuide(sansSection.ctx, 'button').erreurs.some((e) => /questions/.test(e)));

  const sansScene = fabriquer();
  sansScene.ecrire('analyses/button.json', { ...sansScene.guide, galerie: [{ ...sansScene.guide.galerie[0], systeme: 'gamma' }] });
  assert.ok(calculerGuide(sansScene.ctx, 'button').erreurs.some((e) => /gamma : scène absente/.test(e)));

  const perimee = fabriquer();
  perimee.ecrire('analyses/button.json', { ...perimee.guide, galerie: [{ ...perimee.guide.galerie[0], paquets: ['lib-a@1.0.1'] }] });
  assert.ok(calculerGuide(perimee.ctx, 'button').erreurs.some((e) => /table d'imports périmée, lancer guide\.ts carte button/.test(e)));

  const enDur = fabriquer();
  enDur.ecrire('_outils/scenes/button/alpha.js', "import { Bouton } from 'lib-a';\nfeuille('https://cdn.exemple.test/npm:lib-a@0.9.0/style.css');\n");
  assert.ok(calculerGuide(enDur.ctx, 'button').erreurs.some((e) => /lib-a@0\.9\.0, absent des paquets déclarés/.test(e)));

  const oubli = fabriquer();
  oubli.ecrire('analyses/button.json', { ...oubli.guide, absences: [] });
  const erreurs = calculerGuide(oubli.ctx, 'button').erreurs;
  assert.ok(erreurs.some((e) => /beta : alias non nul dans l'index, sans scène ni raison/.test(e)), erreurs.join('\n'));
  assert.ok(erreurs.some((e) => /comprendre 1 : beta n'a pas de carte/.test(e)));

  const cellules = fabriquer();
  const t = cellules.guide.dessiner.tableaux[0];
  cellules.ecrire('analyses/button.json', { ...cellules.guide, dessiner: { ...cellules.guide.dessiner, tableaux: [{ ...t, lignes: [{ ...t.lignes[0], cellules: ['oui'] }] }] } });
  assert.ok(calculerGuide(cellules.ctx, 'button').erreurs.some((e) => /1 cellules pour 2 colonnes/.test(e)));

  const ancienne = fabriquer();
  ancienne.ecrire('composants/button/alpha.json', fiche('alpha', '2024-01-10'));
  assert.ok(calculerGuide(ancienne.ctx, 'button').erreurs.some((e) => /alpha.*plus de 12 mois/.test(e)));

  const sansAlias = fabriquer();
  sansAlias.ecrire('composants/button/gamma.json', fiche('beta', '2026-01-10'));
  assert.ok(verifierFiches(sansAlias.ctx, 'button').length > 0, 'le champ systeme doit suivre le nom du fichier');
});

test('la prose d’un guide passe le contrôle de style', () => {
  const { ctx, guide, ecrire } = fabriquer();
  ecrire('analyses/button.json', { ...guide, resume: 'Lance une action — dans la page.' });
  assert.ok(calculerGuide(ctx, 'button').erreurs.some((e) => /analyses\/button/.test(e)));
});

test('etat dit ce qui existe, ce qui manque et ce qui est ancien', () => {
  const { ctx } = fabriquer();
  assert.equal(etat(ctx, 'Zeta').trouve, false);
  const recent = etat(ctx, 'button', '2026-03-01');
  assert.equal(recent.trouve, true);
  assert.match(recent.texte, /alpha\s+composants\s+fiche lue le 2026-01-10 \(1 mois\)/);
  assert.match(recent.texte, /Relevé de tokens : aucun motif/);
  assert.match(etat(ctx, 'Filled', '2027-06-01').texte, /ANCIENNE \(16 mois\)/, 'un nom local retrouve le composant');
  assert.match(etat(ctx, 'bouton', '2026-03-01').texte, /Guide : analyses\/button\.json présent, HTML absent/);
});

/* --------------------------------------------------------- données réelles */

test('les données réelles de composants suivent leurs schémas et leurs sources', () => {
  const index = chargerIndex(reel);
  assert.deepEqual(verifierIndex(reel, index), []);
  for (const e of index) {
    assert.deepEqual(verifierFiches(reel, e.id), [], `fiches de ${e.id}`);
    const fichier = path.join(reel.references, 'composants', e.id, 'tokens.json');
    const releve = relever(reel, e.id)!;
    if (Object.keys(releve.systemes).length) {
      assert.ok(existsSync(fichier), `${e.id} : tokens.json manque, lancer guide.ts relever ${e.id}`);
      assert.equal(readFileSync(fichier, 'utf8'), ecrireReleve(releve), `${e.id} : tokens.json périmé, lancer guide.ts relever ${e.id}`);
    }
    assert.ok(fichesDe(reel, e.id).every(({ fiche }) => fiche.composant === e.id));
  }
  const dossier = path.join(reel.references, 'analyses');
  const guides = existsSync(dossier) ? readdirSync(dossier).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)) : [];
  for (const id of guides) {
    const rendu = calculerGuide(reel, id);
    assert.deepEqual(rendu.erreurs, [], `guide ${id}`);
    const html = path.join(dossier, `${id}.html`);
    assert.ok(existsSync(html), `${id}.html manque, lancer guide.ts rendre ${id}`);
    assert.equal(readFileSync(html, 'utf8'), rendu.html, `${id}.html périmé (gabarit ${GABARIT}), lancer guide.ts rendre ${id}`);
  }
});
