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
  ANCRES, CONTEXTE_REEL, CRITERES, GABARIT, calculerGuide, chargerIndex, chargerSystemes, composer, ecrireReleve, etat, fichesDe,
  lireCouleur, moisEntre, relever, verifierFiches, verifierIndex, type Contexte, type Guide,
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

test('le gabarit garde les quinze sections dans l’ordre et une palette lisible', () => {
  const gabarit = readFileSync(path.join(reel.references, '_outils', 'gabarit.html'), 'utf8');
  assert.deepEqual([...gabarit.matchAll(/<section id="([a-z]+)">/g)].map((m) => m[1]), [...ANCRES]);
  assert.deepEqual([...gabarit.matchAll(/<!-- @@([a-z]+)@@ -->/g)].map((m) => m[1]), [...ANCRES]);
  assert.deepEqual([...gabarit.matchAll(/<li><a href="#([a-z]+)">/g)].map((m) => m[1]), [...ANCRES]);
  assert.equal(ANCRES.length, 15);
  assert.ok(!/<iframe|<script|<img|https?:\/\//.test(gabarit.replace(/<html[^>]*>/, '')), 'ni iframe, ni script, ni image, ni ressource distante');

  const palette = Object.fromEntries([...gabarit.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6});/g)].map((m) => [m[1], lireHexa(m[2])!]));
  for (const [texte, fond, seuil] of [
    ['texte', 'fond', 7], ['texte', 'surface', 7], ['texte', 'surface-haute', 7], ['discret', 'fond', 4.5], ['discret', 'surface', 4.5],
    ['discret', 'surface-haute', 4.5], ['accent', 'fond', 4.5], ['accent', 'surface-haute', 4.5], ['ok', 'surface-haute', 4.5],
    ['alerte', 'surface-haute', 4.5], ['erreur', 'surface-haute', 4.5],
  ] as [string, string, number][]) {
    assert.ok(contraste(palette[texte], palette[fond]) >= seuil, `${texte} sur ${fond}`);
  }
});

/* ---------------------------------------------------------------- calculs purs */

test('les couleurs publiées se lisent, se composent et se comparent', () => {
  assert.deepEqual(lireCouleur('#0f62fe')?.rgb, [15, 98, 254]);
  assert.equal(lireCouleur('#0515240F')?.alpha, 15 / 255);
  assert.deepEqual(lireCouleur('rgba(0, 0, 0, 0.05)'), { rgb: [0, 0, 0], alpha: 0.05 });
  assert.deepEqual(lireCouleur('rgb(59, 99, 251)')?.rgb, [59, 99, 251]);
  assert.deepEqual(lireCouleur('0 0% 100%')?.rgb, [255, 255, 255]);
  assert.deepEqual(lireCouleur('hsl(0 0% 0% / 50%)'), { rgb: [0, 0, 0], alpha: 0.5 });
  assert.deepEqual(lireCouleur('oklch(1 0 0)')?.rgb, [255, 255, 255]);
  assert.deepEqual(lireCouleur('white')?.rgb, [255, 255, 255]);
  assert.equal(lireCouleur('color-mix(in srgb, red, blue)'), null);
  assert.equal(lireCouleur(null), null);
  assert.deepEqual(composer({ rgb: [0, 0, 0], alpha: 0.5 }, [255, 255, 255]), [128, 128, 128]);
  assert.equal(moisEntre('2026-01-10', '2027-01-09'), 11);
  assert.equal(moisEntre('2026-01-10', '2027-02-10'), 13);
});

/* ------------------------------------------------------------- guide d'essai */

interface Fixture { ctx: Contexte; ecrire: (chemin: string, contenu: unknown) => void; guide: Guide }

const ETATS = REGISTRE_ETATS.termes.map((t) => t.id);

function fiche(systeme: string, lu: string, avecTokens: boolean) {
  return {
    composant: 'button',
    systeme,
    lu,
    pages: [`https://exemple.test/${systeme}/button`],
    variantes: ['primary'],
    tailles: { md: '40px' },
    anatomie: ['libellé'],
    etats: ETATS.slice(0, 2),
    clavier: ['Entrée active le bouton.'],
    regles: ['Un seul bouton principal par zone.'],
    redaction: ['Le libellé commence par un verbe.'],
    particularites: [],
    ...(avecTokens ? { tokens: [
      { variante: 'primary', etat: 'default', role: 'background', token: 'btn.bg' },
      { variante: 'primary', etat: 'default', role: 'foreground', token: 'btn.fg' },
      { variante: 'primary', etat: 'default', role: 'border', token: 'btn.border' },
    ] } : {}),
  };
}

function guideDEssai(): Guide {
  const point = (texte: string, systemes: string[]) => ({ texte, systemes });
  return {
    gabarit: 1,
    composant: 'button',
    date: '2026-03-01',
    definition: { resume: 'Lance une action dans la page.', quandLUtiliser: ['Pour enregistrer ou envoyer.'], voisins: [{ id: 'link', choisirSi: 'L’élément mène à une autre page.' }] },
    anatomie: { parties: [{ nom: 'Libellé', obligatoire: true, systemes: ['alpha', 'beta'] }, { nom: 'Icône', obligatoire: false, systemes: ['alpha'] }] },
    variantes: {
      emphase: [{ nom: 'primary', locaux: { alpha: 'primary', beta: 'filled' } }],
      statut: [{ nom: 'danger', locaux: { alpha: 'danger' } }],
      tailles: [{ nom: 'md', locaux: { alpha: 'md' } }],
    },
    etats: ETATS.map((etat) => ({ etat, ceQuiChange: 'La couleur de fond change.', systemes: ['alpha', 'beta'] })),
    clavier: { touches: [{ touche: 'Entrée', effet: 'Active le bouton.', systemes: ['alpha', 'beta', 'gamma'] }], focus: [point('Le focus reste visible.', ['alpha'])], interactions: [] },
    accessibilite: {
      aria: { role: 'button', attributs: ['aria-disabled'], nomAccessible: 'Le libellé visible.' },
      criteres: Object.keys(CRITERES).map((critere) => ({ critere, sApplique: true, exigence: 'Exigence du critère.', pratique: 'Pratique relevée.' })),
    },
    redaction: { regles: [point('Le libellé commence par un verbe.', ['alpha', 'beta', 'gamma'])] },
    proposition: [
      { segments: [{ genre: 'variante', valeur: 'primary' }, { genre: 'etat', valeur: 'default' }, { genre: 'role', valeur: 'background' }], note: 'Fond au repos.' },
      { segments: [{ genre: 'variante', valeur: 'primary' }, { genre: 'etat', valeur: 'normal' }, { genre: 'role', valeur: 'background' }] },
    ],
    choix: [{ question: 'Le bouton désactivé reste-t-il focalisable ?', options: { a: 'Non.', b: 'Oui.' }, systemes: { alpha: 'a', beta: 'b' } }],
    rappels: {
      regle: [point('Un seul bouton principal par zone.', ['alpha'])], etat: [], comportement: [], accessibilite: [], redaction: [], tokens: [],
    },
    exemples: [{ idee: 'Un bouton sans fond au repos.', systeme: 'alpha', source: 'https://exemple.test/alpha/button' }],
    questions: [{ question: 'UCM publie-t-il un état de chargement ?', options: ['état du registre', 'propriété booléenne'], dependDe: 'Le registre des états du kit.' }],
  };
}

function fabriquer(): Fixture {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'references-'));
  const ecrire = (chemin: string, contenu: unknown) => {
    mkdirSync(path.dirname(path.join(dir, chemin)), { recursive: true });
    writeFileSync(path.join(dir, chemin), typeof contenu === 'string' ? contenu : `${JSON.stringify(contenu, null, 2)}\n`);
  };
  const systeme = (id: string, roles: string[], tokens: string | null, modes: unknown, tableDeTokens = false) => ({
    id, nom: id.toUpperCase(), editeur: 'Éditeur d’essai', roles, tokens, ...(tableDeTokens ? { tableDeTokens } : {}),
    documentation: `https://exemple.test/${id}`, licences: { code: 'MIT', documentation: 'non vérifiée' }, modes,
  });
  ecrire('systemes.json', [
    systeme('alpha', ['tokens', 'composants'], 'design-systems/alpha', { light: { nom: 'light', page: 'page' }, dark: { nom: 'dark', page: 'page' } }, true),
    systeme('beta', ['tokens', 'composants'], 'design-systems/beta', null),
    systeme('gamma', ['comportement'], null, null),
  ]);
  ecrire('design-systems/alpha/noms.json', ['btn.bg', 'btn.border', 'btn.fg', 'page'].map((nom) => ({ nom, type: 'color', couche: 'composant' })));
  const ligne = (nom: string, mode: string, resolue: string) => ({ nom, mode, valeur: resolue, resolue });
  ecrire('design-systems/alpha/valeurs.json', [
    ligne('btn.bg', 'dark', '#000000'), ligne('btn.bg', 'light', '#ffffff'),
    ligne('btn.border', 'dark', '#ffffff'), ligne('btn.border', 'light', '#000000'),
    ligne('btn.fg', 'dark', '#ffffff'), ligne('btn.fg', 'light', '#000000'),
    ligne('page', 'dark', '#000000'), ligne('page', 'light', '#ffffff'),
  ]);
  ecrire('design-systems/beta/noms.json', [{ nom: 'beta.btn', type: 'color', couche: null }]);
  ecrire('design-systems/sources.json', [
    { systeme: 'alpha', url: 'https://exemple.test/a', version: 'alpha@1.0.0', originalPath: 'tokens.json', localFile: 'alpha/sources/tokens.json.txt', sha256: 'a'.repeat(64), licence: 'MIT' },
  ]);
  const index = [
    {
      id: 'button', nom: 'Bouton', definition: 'Lance une action.', voisins: ['link'],
      systemes: {
        alpha: { nom: 'Button', url: 'https://exemple.test/alpha/button', motifs: ['^btn\\.'] },
        beta: { nom: 'Filled', url: 'https://exemple.test/beta/button' },
        gamma: { nom: 'Button pattern', url: 'https://exemple.test/gamma/button' },
      },
    },
    { id: 'link', nom: 'Lien', definition: 'Mène ailleurs.', voisins: ['button'], systemes: {} },
  ];
  ecrire('composants/index.json', index);
  ecrire('composants/button/alpha.json', fiche('alpha', '2026-01-10', true));
  ecrire('composants/button/beta.json', fiche('beta', '2026-01-10', false));
  ecrire('composants/button/gamma.json', fiche('gamma', '2026-01-10', false));
  const guide = guideDEssai();
  ecrire('analyses/button.json', guide);
  return { ctx: { references: dir, racine: reel.racine }, ecrire, guide };
}

test('le guide d’essai se rend avec ses comptes, ses contrastes et ses quinze sections', () => {
  const { ctx } = fabriquer();
  assert.deepEqual(verifierIndex(ctx, chargerIndex(ctx)), []);
  assert.deepEqual(verifierFiches(ctx, 'button'), []);
  const rendu = calculerGuide(ctx, 'button');
  assert.deepEqual(rendu.erreurs, []);
  const html = rendu.html!;
  assert.deepEqual([...html.matchAll(/<section id="([a-z]+)">/g)].map((m) => m[1]), [...ANCRES]);
  assert.ok(!html.includes('@@') && !html.includes('{{'));
  assert.ok(html.includes('<meta name="ucm-gabarit" content="1">'));
  // m compte les deux systèmes au rôle composants ; gamma (comportement) ne compte pas.
  assert.ok(html.includes('2 sur 2'), 'Libellé : alpha et beta');
  assert.ok(html.includes('1 sur 2'), 'Icône : alpha seul');
  assert.match(html, /Pas de tokens de composant :[^<]*(<[^>]*>)*BETA/);
  // Texte noir sur fond blanc : 21 ; fond blanc sur page blanche : 1.
  assert.ok(html.includes('texte/fond 21,00'));
  assert.ok(html.includes('fond/page 1,00'));
  assert.ok(html.includes('contour/page 21,00'));
  // Le même mode sombre, inversé.
  assert.equal(html.match(/texte\/fond 21,00/g)?.length, 2);
  // Un état hors registre ou toléré est signalé sans bloquer.
  assert.ok(rendu.alertes.some((a) => /normal est toléré, le registre dit default/.test(a)), rendu.alertes.join('\n'));
  assert.equal(calculerGuide(ctx, 'button').html, html, 'rendu déterministe');
});

test('le relevé suit les motifs de l’index et se réécrit à l’identique', () => {
  const { ctx } = fabriquer();
  const releve = relever(ctx, 'button')!;
  assert.deepEqual(Object.keys(releve.systemes), ['alpha']);
  assert.deepEqual(releve.systemes.alpha.tokens.map((t) => t.nom), ['btn.bg', 'btn.border', 'btn.fg']);
  assert.deepEqual(releve.systemes.alpha.tokens[0].valeurs, { dark: '#000000', light: '#ffffff' });
  assert.equal(releve.systemes.alpha.version, 'alpha@1.0.0');
  assert.equal(ecrireReleve(releve), ecrireReleve(relever(ctx, 'button')!));
});

test('un guide incomplet, une fiche ancienne ou un token inconnu sont refusés', () => {
  const sansSection = fabriquer();
  const { questions: _questions, ...incomplet } = sansSection.guide;
  sansSection.ecrire('analyses/button.json', incomplet);
  assert.ok(calculerGuide(sansSection.ctx, 'button').erreurs.some((e) => /questions/.test(e)));

  const sansEtat = fabriquer();
  sansEtat.ecrire('analyses/button.json', { ...sansEtat.guide, etats: sansEtat.guide.etats && [{ etat: 'default', ceQuiChange: 'Rien.', systemes: ['alpha'] }] });
  assert.ok(calculerGuide(sansEtat.ctx, 'button').erreurs.length > 0, 'les six états du registre sont exigés');

  const inconnu = fabriquer();
  inconnu.ecrire('analyses/button.json', { ...inconnu.guide, exemples: [{ idee: 'Une idée.', systeme: 'zeta', source: 'https://exemple.test/z' }] });
  assert.ok(calculerGuide(inconnu.ctx, 'button').erreurs.some((e) => /zeta/.test(e)));

  const ancienne = fabriquer();
  ancienne.ecrire('composants/button/beta.json', fiche('beta', '2024-01-10', false));
  assert.ok(calculerGuide(ancienne.ctx, 'button').erreurs.some((e) => /beta.*plus de 12 mois/.test(e)));
  ancienne.ecrire('analyses/button.json', { ...ancienne.guide, absences: [{ systeme: 'beta', raison: 'La page a changé et la relecture attend.' }] });
  const avecRaison = calculerGuide(ancienne.ctx, 'button');
  assert.deepEqual(avecRaison.erreurs, []);
  assert.ok(avecRaison.html!.includes('La page a changé et la relecture attend.'));

  const faux = fabriquer();
  faux.ecrire('composants/button/alpha.json', { ...fiche('alpha', '2026-01-10', true), tokens: [{ variante: 'primary', etat: 'default', role: 'background', token: 'btn.absent' }] });
  assert.ok(verifierFiches(faux.ctx, 'button').some((e) => /btn\.absent/.test(e)));

  const horsTable = fabriquer();
  horsTable.ecrire('design-systems/beta/noms.json', ['btn.bg', 'btn.border', 'btn.fg'].map((nom) => ({ nom, type: 'color', couche: null })));
  horsTable.ecrire('composants/button/beta.json', fiche('beta', '2026-01-10', true));
  assert.ok(verifierFiches(horsTable.ctx, 'button').some((e) => /beta n'est pas marqué tableDeTokens/.test(e)), 'table tokens réservée aux systèmes marqués');

  const sansAlias = fabriquer();
  sansAlias.ecrire('composants/button/gamma.json', fiche('beta', '2026-01-10', false));
  assert.ok(verifierFiches(sansAlias.ctx, 'button').length > 0, 'le champ systeme doit suivre le nom du fichier');
});

test('la prose d’un guide passe le contrôle de style', () => {
  const { ctx, guide, ecrire } = fabriquer();
  ecrire('analyses/button.json', { ...guide, definition: { ...(guide.definition as object), resume: 'Lance une action — dans la page.' } });
  assert.ok(calculerGuide(ctx, 'button').erreurs.some((e) => /analyses\/button/.test(e)));
});

test('etat dit ce qui existe, ce qui manque et ce qui est ancien', () => {
  const { ctx } = fabriquer();
  assert.equal(etat(ctx, 'Zeta').trouve, false);
  const recent = etat(ctx, 'button', '2026-03-01');
  assert.equal(recent.trouve, true);
  assert.match(recent.texte, /alpha\s+tokens?.*fiche lue le 2026-01-10 \(1 mois\)|alpha\s+composants\s+fiche lue le 2026-01-10 \(1 mois\)/);
  assert.match(recent.texte, /Relevé de tokens : absent/);
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
