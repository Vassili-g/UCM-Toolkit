// Écrit les maquettes de l'étude Roadmap dans ce dossier, avec la charte de page.css et les données calculées par donnees.mjs.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RACINE, donnees } from './donnees.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
export const CSS_PAGE = readFileSync(path.join(RACINE, 'docs/inventaire/page.css'), 'utf8');
const D = donnees();
export const SUJETS = {
  'Règle de blocage': { texte: '#86198f', fond: '#fae8ff' }, 'Vérification du rendu': { texte: '#155e75', fond: '#cffafe' },
  'API du kit': { texte: '#3730a3', fond: '#e0e7ff' }, 'Modules consommateurs': { texte: '#115e59', fond: '#ccfbf1' },
  'Bibliothèque de production': { texte: '#78350f', fond: '#f0e0cc' }, 'Architecture des tokens': { texte: '#5b21b6', fond: '#ede9fe' },
  'Format du contrat': { texte: '#065f46', fond: '#a7f3d0' }, Documentation: { texte: '#3f6212', fond: '#d9f99d' }, 'Outils de revue': { texte: '#075985', fond: '#bae6fd' },
};
// Seuls les champs que la maquette montre partent dans la page.
export const PISTES = D.pistes.map((p) => ({
  id: p.id, titre: p.titre, titreCourt: p.titreCourt, sujet: p.sujet, rang: p.rang, rangEffectif: p.rangEffectif, rangDuMainteneur: p.rangDuMainteneur || null,
  importance: p.importance, complexite: p.complexite.toUpperCase(), coutHumain: p.coutHumain, resume: p.resume, raisonImportance: p.raisonImportance,
  dependances: p.dependances, debloque: p.debloque, prerequisEnAttente: p.prerequisEnAttente, recherche: p.recherche || '', plan: p.plan || '',
  questions: p.questions, risques: p.risques, criteresDeFin: p.criteresDeFin, alertes: p.alertes || [], lots: p.lots, faits: p.faits,
  etat: p.etatCalcule, attente: p.attente, dernierLot: p.dernierLot,
}));

export const CSS_MAQUETTE = `
.page { max-width: 1400px; }
section.partie.large { max-width: none; }
.bandeau-maquette { margin: 0 0 18px; padding: 10px 14px; border: 1px dashed var(--doux); border-radius: 8px; font-size: .88rem; color: var(--doux); background: var(--surface-2); }
.bandeau-maquette b { color: var(--texte); }
.variante { margin: 44px 0 8px; padding: 6px 12px; border-left: 4px solid var(--violet); background: var(--violet-fond); font-weight: 700; font-size: .95rem; border-radius: 4px; }
.variante span { font-weight: 400; color: var(--doux); }
/* États calculés : couleur, signe et mot. */
.e-idee { color: var(--doux); background: var(--surface-2); } .e-idee::before { content: "○"; }
.e-recherche { color: var(--bleu); background: var(--bleu-fond); } .e-recherche::before { content: "◇"; }
.e-cours { color: var(--orange); background: var(--orange-fond); } .e-cours::before { content: "◑"; }
.e-livree { color: var(--olive); background: var(--olive-fond); } .e-livree::before { content: "✓"; }
.attend { display: inline-flex; align-items: center; gap: 4px; font-size: .78rem; font-weight: 600; padding: 1px 8px 1px 6px; border-radius: 999px; white-space: nowrap; line-height: 1.5; }
.attend.toi { color: var(--ambre); background: var(--ambre-fond); border: 1px solid #e9c46a; } .attend.toi::before { content: "?"; font-weight: 800; }
.attend.piste { color: var(--doux); background: var(--surface); border: 1px dashed #b8bec8; font-weight: 500; } .attend.piste::before { content: "⏸"; font-size: .7rem; }
.attentes { display: flex; flex-wrap: wrap; gap: 4px; }
/* Outils au-dessus de la table : un choix segmenté et un filtre. */
.rm-outils { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin: 12px 0 8px; font-size: .85rem; }
.segmente { display: inline-flex; align-items: center; gap: 0; border: 1px solid var(--trait); border-radius: 7px; overflow: hidden; }
.segmente .lib { padding: 0 10px; color: var(--doux); }
.segmente button { all: unset; cursor: pointer; padding: 4px 12px; border-left: 1px solid var(--trait); }
.segmente button[aria-pressed="true"] { background: var(--texte); color: var(--surface); font-weight: 600; }
.segmente button:focus-visible, .filtre-attente:focus-visible { outline: 2px solid var(--texte); outline-offset: 2px; }
.filtre-attente { all: unset; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; padding: 4px 12px; border: 1px solid #e9c46a; border-radius: 999px; color: var(--ambre); background: var(--surface); font-weight: 600; }
.filtre-attente[aria-pressed="true"] { background: var(--ambre-fond); box-shadow: inset 0 0 0 1px var(--ambre); }
.rm-outils .compte { margin-left: auto; color: var(--doux); }
/* La table des pistes. */
.rm { width: 100%; border-collapse: collapse; font-size: .9rem; background: var(--surface); border: 1px solid var(--trait); border-radius: 10px; overflow: hidden; }
.rm th { text-align: left; font-size: .7rem; text-transform: uppercase; letter-spacing: .06em; color: var(--doux); font-weight: 600; padding: 8px 10px; background: var(--surface-2); border-bottom: 1px solid var(--trait); white-space: nowrap; }
.rm td { padding: 8px 10px; border-bottom: 1px solid var(--trait); vertical-align: middle; }
.rm tr.groupe td { font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; color: var(--doux); font-weight: 700; padding: 14px 10px 5px; background: var(--surface); }
.rm tr.groupe td span { text-transform: none; letter-spacing: 0; font-weight: 400; margin-left: 6px; }
.rm tr.rm-ligne { cursor: pointer; }
.rm tr.rm-ligne:hover { background: #f8f9fb; }
.rm tr.rm-ligne.ouverte { background: #f8f9fb; }
.rm td.n { text-align: center; font-variant-numeric: tabular-nums; width: 44px; }
.rm .rang { font-weight: 700; }
.rm .toi-rang { display: block; margin-top: 2px; font-size: .62rem; font-weight: 700; color: var(--violet); background: var(--violet-fond); border-radius: 4px; padding: 0 3px; }
.rm-bascule { all: unset; cursor: pointer; display: inline-flex; gap: 6px; align-items: baseline; border-radius: 4px; }
.rm-bascule:focus-visible { outline: 2px solid var(--texte); outline-offset: 2px; }
.chev::before { content: "›"; display: inline-block; width: 10px; font-weight: 700; color: var(--doux); transition: transform .15s; }
[aria-expanded="true"] > .chev::before { transform: rotate(90deg); }
.rm .id { font-family: ui-monospace, Consolas, monospace; font-weight: 700; color: var(--doux); font-size: .85rem; }
.rm .titre { font-weight: 600; }
.rm .sujet { margin: 0; }
.rm .sous { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: center; margin: 3px 0 0 16px; font-size: .78rem; color: var(--doux); }
.rm .sous a { color: var(--doux); white-space: nowrap; }
.rm .sous b { color: var(--texte); }
.rm col.c-rang { width: 52px; } .rm col.c-piste { width: 280px; } .rm col.c-etat { width: 136px; } .rm col.c-lots { width: 384px; }
.rm { table-layout: fixed; }
details.lots-plus > summary { cursor: pointer; list-style: none; font-size: .82rem; color: var(--doux); padding: 2px 0; }
details.lots-plus > summary::-webkit-details-marker { display: none; }
details.lots-plus > summary::before { content: '›'; display: inline-block; width: 12px; font-weight: 700; transition: transform .15s; }
details.lots-plus[open] > summary::before { transform: rotate(90deg); }
.rm .docs a { font-size: .8rem; white-space: nowrap; margin-right: 6px; }
.rm .cout { font-weight: 700; color: var(--doux); text-align: center; }
.rm .date { color: var(--doux); font-size: .78rem; white-space: nowrap; }
/* La rangée des lots : un carré par case du plan, un écart entre deux titres « Lot N ». */
.lots { display: inline-flex; flex-wrap: nowrap; gap: 6px; align-items: center; vertical-align: middle; }
.lots .g { display: inline-flex; gap: 2px; }
.lots i { display: block; width: 9px; height: 9px; border-radius: 2px; border: 1px solid #868e9c; background: var(--surface); }
.lots i.f { background: var(--olive); border-color: var(--olive); }
.lots i.m { background: #f5c451; border-color: var(--ambre); border-radius: 50%; }
.lots i.b { background: repeating-linear-gradient(45deg, #c9ced8 0 2px, var(--surface) 2px 4px); border-color: #868e9c; }
.lots i.s { border: 2px solid var(--texte); }
.lots .nb { font-size: .75rem; color: var(--doux); font-variant-numeric: tabular-nums; margin-left: 2px; }
.legende-lots { display: flex; flex-wrap: wrap; gap: 4px 16px; align-items: center; font-size: .8rem; color: var(--doux); margin: 4px 0 10px; }
.legende-lots span { display: inline-flex; align-items: center; gap: 5px; }
.barre { display: inline-block; width: 64px; height: 6px; border-radius: 3px; background: var(--surface-2); vertical-align: middle; overflow: hidden; margin-right: 6px; }
.barre b { display: block; height: 100%; background: var(--orange); }
/* La fiche dépliée sous la ligne. */
.rm tr.rm-fiche td { background: #fbfcfd; padding: 4px 18px 16px 62px; }
.fiche-rm { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 8px 32px; }
.fiche-rm h4 { font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; color: var(--doux); margin: 12px 0 3px; }
.fiche-rm p, .fiche-rm li { font-size: .9rem; margin: 2px 0; }
.fiche-rm ul { margin: 2px 0; padding-left: 18px; }
.fiche-rm .resume { font-size: .95rem; margin-top: 12px; }
ol.lots-detail { list-style: none; padding: 0; margin: 4px 0; font-size: .86rem; }
ol.lots-detail li { display: grid; grid-template-columns: 14px 34px minmax(0, 1fr) auto; gap: 6px; align-items: baseline; padding: 2px 0; }
ol.lots-detail li .lots i { margin-top: 2px; }
ol.lots-detail .num { font-family: ui-monospace, Consolas, monospace; color: var(--doux); font-size: .8rem; }
ol.lots-detail .h { font-family: ui-monospace, Consolas, monospace; color: var(--doux); font-size: .75rem; }
ol.lots-detail li.fait .txt { color: var(--doux); }
ol.lots-detail li.m .txt { font-weight: 600; }
ol.lots-detail li.gr { display: block; font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--doux); margin-top: 6px; }
details.lots-faits > summary { cursor: pointer; list-style: none; font-size: .82rem; color: var(--doux); }
details.lots-faits > summary::-webkit-details-marker { display: none; }
details.lots-faits > summary::before { content: "›"; display: inline-block; width: 12px; font-weight: 700; transition: transform .15s; }
details.lots-faits[open] > summary::before { transform: rotate(90deg); }
.rang-bloc { margin-top: 14px; padding: 10px 12px; border: 1px solid var(--trait); border-radius: 8px; background: var(--surface); }
.rang-bloc p { margin: 0 0 6px; }
.rang-bloc .raison { color: var(--violet); }
.rang-bloc details > summary { cursor: pointer; font-size: .85rem; font-weight: 600; list-style: none; }
.rang-bloc details > summary::-webkit-details-marker { display: none; }
.rang-bloc details > summary::before { content: "›"; display: inline-block; width: 12px; transition: transform .15s; }
.rang-bloc details[open] > summary::before { transform: rotate(90deg); }
.form-rang { display: grid; gap: 8px; margin-top: 8px; font-size: .85rem; }
.form-rang select, .form-rang textarea { font: inherit; font-size: .85rem; padding: 4px 8px; border: 1px solid var(--trait); border-radius: 6px; background: var(--surface); color: var(--texte); }
.form-rang textarea { min-height: 52px; resize: vertical; }
.form-rang .copie { font-size: .8rem; color: var(--olive); }
.form-rang pre { margin: 0; white-space: pre-wrap; font: .78rem/1.5 ui-monospace, Consolas, monospace; background: var(--code); padding: 8px; border-radius: 6px; }
.livrees-rm { margin: 12px 0; font-size: .9rem; color: var(--doux); }
.livrees-rm a { color: var(--texte); }
/* Board et matrice. */
.board { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; align-items: start; }
.colonne { background: var(--surface-2); border-radius: 10px; padding: 8px; min-height: 120px; }
.colonne h3 { margin: 2px 4px 8px; font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; color: var(--doux); display: flex; justify-content: space-between; }
.colonne h3 .etat { text-transform: none; letter-spacing: 0; }
.carte-piste { display: block; width: 100%; text-align: left; font: inherit; background: var(--surface); border: 1px solid var(--trait); border-radius: 8px; padding: 8px 10px; margin: 0 0 8px; cursor: pointer; box-shadow: var(--ombre); }
.carte-piste:hover { border-color: #b8bec8; }
.carte-piste:focus-visible { outline: 2px solid var(--texte); outline-offset: 2px; }
.carte-piste .haut { display: flex; gap: 6px; align-items: center; font-size: .78rem; color: var(--doux); }
.carte-piste .haut .id { font-family: ui-monospace, Consolas, monospace; font-weight: 700; color: var(--texte); }
.carte-piste .haut .r { margin-left: auto; font-weight: 700; }
.carte-piste .t { font-weight: 600; font-size: .9rem; margin: 2px 0 4px; }
.carte-piste .lots { margin: 4px 0; flex-wrap: wrap; }
.carte-piste .attentes { margin-top: 4px; }
.matrice { width: 100%; border-collapse: separate; border-spacing: 6px; table-layout: fixed; }
.matrice th { font-size: .72rem; text-transform: uppercase; letter-spacing: .05em; color: var(--doux); text-align: left; padding: 2px 4px; }
.matrice th.lr { width: 150px; text-transform: none; letter-spacing: 0; font-size: .8rem; color: var(--texte); vertical-align: top; padding-top: 8px; }
.matrice th.lr small { display: block; color: var(--doux); font-weight: 400; }
.matrice td { background: var(--surface-2); border-radius: 8px; vertical-align: top; padding: 6px; }
.matrice td.vide { background: repeating-linear-gradient(45deg, var(--surface-2) 0 6px, var(--surface) 6px 12px); }
.matrice .carte-piste { padding: 6px 8px; margin-bottom: 6px; }
.matrice td.alerte-case { box-shadow: inset 0 0 0 2px var(--rose); }
.panneau { position: fixed; top: 0; right: 0; bottom: 0; width: 520px; background: var(--surface); border-left: 1px solid var(--trait); box-shadow: -8px 0 24px rgb(0 0 0 / .08); padding: 18px 22px; overflow-y: auto; z-index: 20; }
.panneau .fermer { position: absolute; top: 12px; right: 14px; }
.panneau .fiche-rm { grid-template-columns: 1fr; }
.panneau h3 { margin: 0 30px 4px 0; }
.panneau p > a + a, .carte-piste a + a { margin-left: 10px; }
/* Questions au mainteneur en fin de maquette. */
.questions-maquette { margin-top: 48px; }
.questions-maquette table { width: 100%; border-collapse: collapse; font-size: .88rem; }
.questions-maquette th, .questions-maquette td { text-align: left; vertical-align: top; padding: 8px 10px; border-bottom: 1px solid var(--trait); }
.questions-maquette th { font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; color: var(--doux); background: var(--surface-2); }
.questions-maquette ol { margin: 0; padding-left: 18px; }
.questions-maquette .reco { color: var(--olive); font-weight: 600; }
`;

export const NAV = `<nav class="sommaire" aria-label="Sommaire">
  <div class="titre">Inventaire UCM Toolkit</div>
  <div class="date">Généré depuis le code du dépôt</div>
  <ol>
    <li><a href="#">Le concept UCM</a></li><li><a href="#">Les outils</a></li><li><a href="#">Le parcours d'un composant</a></li>
    <li><a href="#">Les variables Figma</a></li><li><a href="#">Le contrat</a></li><li><a href="#">Ce qui est vérifié</a></li>
    <li><a href="#roadmap" class="actif">Roadmap</a></li><li><a href="#">Expliquer UCM</a></li><li><a href="#">Annexes</a></li>
  </ol>
</nav>`;

// Le script commun : rendu des lots, des attentes, de la fiche, du formulaire de rang.
const SCRIPT_COMMUN = `
var PISTES = ${JSON.stringify(PISTES)};
var SUJETS = ${JSON.stringify(SUJETS)};
var RANGS = ['Avant d’ouvrir le projet', 'Socle de la bibliothèque et verdict', 'Premiers modules', 'Vérification du rendu', 'Utile, sans urgence', 'Plus tard'];
var ETATS = { idee: ['e-idee', 'Idée'], recherche: ['e-recherche', 'Recherche faite'], 'en-cours': ['e-cours', 'En cours'], livree: ['e-livree', 'Livrée'] };
var GITHUB = 'https://github.com/Vassili-g/UCM-Toolkit/blob/main/';
function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function txt(t) { return esc(t).replace(/\`([^\`]+)\`/g, '<code>$1</code>'); }
function lien(chemin) { return GITHUB + chemin.split('/').map(encodeURIComponent).join('/'); }
function par(id) { return PISTES.filter(function (p) { return p.id === id; })[0]; }
function classeDuLot(l) { return l.fait ? 'f' : l.attend === 'mainteneur' ? 'm' : l.attend ? 'b' : l.suivante ? 's' : ''; }
function motDuLot(l) { return l.fait ? 'fait' : l.attend === 'mainteneur' ? 'attend ta décision' : l.attend ? 'attend ' + l.attend : l.suivante ? 'suivant, prêt pour un agent' : 'à faire'; }
function rangee(p) {
  if (!p.lots) return '';
  var groupes = [], courant = null;
  p.lots.forEach(function (l) { if (!courant || courant.nom !== l.groupe) { courant = { nom: l.groupe, lots: [] }; groupes.push(courant); } courant.lots.push(l); });
  return '<span class="lots" aria-label="' + p.faits + ' cases faites sur ' + p.lots.length + '">' + groupes.map(function (g) {
    return '<span class="g">' + g.lots.map(function (l) { return '<i class="' + classeDuLot(l) + '" title="' + esc(l.num + ' · ' + motDuLot(l) + ' · ' + l.texte) + '"></i>'; }).join('') + '</span>';
  }).join('') + '<span class="nb">' + p.faits + '/' + p.lots.length + '</span></span>';
}
function etatDe(p, avecCompte) {
  var e = ETATS[p.etat];
  return '<span class="etat ' + e[0] + '">' + e[1] + (avecCompte && p.lots ? ' · ' + p.faits + '/' + p.lots.length : '') + '</span>';
}
function attentes(p) {
  return '<span class="attentes">' + p.attente.map(function (a) { return '<span class="attend ' + a.genre + '" title="' + esc(a.detail) + '">' + esc(a.texte) + '</span>'; }).join('') + '</span>';
}
function sujet(p) { var c = SUJETS[p.sujet]; return '<span class="sujet" style="color:' + c.texte + ';background:' + c.fond + '">' + esc(p.sujet) + '</span>'; }
function docs(p) {
  return (p.recherche ? '<a href="' + lien(p.recherche) + '" target="_blank" rel="noopener" title="' + esc(p.recherche.split('/').pop()) + '">Recherche ↗</a>' : '') +
    (p.plan ? '<a href="' + lien(p.plan) + '" target="_blank" rel="noopener" title="' + esc(p.plan.split('/').pop()) + '">Plan ↗</a>' : '');
}
function liens(ids) { return ids.length ? ids.map(function (id) { var q = par(id); return q ? '<a href="#" data-ouvre="' + id + '">' + id + ' ' + esc(q.titreCourt) + '</a>' : id + ' (livrée)'; }).join(', ') : 'rien'; }
function listeLots(p) {
  if (!p.lots) return '';
  var faits = p.lots.filter(function (l) { return l.fait; }), reste = p.lots.filter(function (l) { return !l.fait; });
  function ligne(l, groupe) {
    return (groupe ? '<li class="gr">' + esc(groupe) + '</li>' : '') + '<li class="' + (l.fait ? 'fait' : classeDuLot(l)) + '"><span class="lots"><i class="' + classeDuLot(l) + '"></i></span><span class="num">' + esc(l.num) + '</span><span class="txt">' + txt(l.texte) + (l.attend === 'mainteneur' ? ' <span class="attend toi">ta décision</span>' : l.attend ? ' <span class="attend piste">attend ' + esc(l.attend) + '</span>' : '') + '</span><span class="h">' + (l.hashes.length ? esc(l.hashes[0]) : '') + '</span></li>';
  }
  function bloc(lots) { var g = null; return lots.map(function (l) { var t = l.groupe !== g ? l.groupe : ''; g = l.groupe; return ligne(l, t); }).join(''); }
  var groupes = [], index = {};
  reste.forEach(function (l) { if (!(l.groupe in index)) { index[l.groupe] = groupes.length; groupes.push({ nom: l.groupe, lots: [] }); } groupes[index[l.groupe]].lots.push(l); });
  var suite = groupes.map(function (g, i) {
    var ouvert = i === 0 || g.lots.some(function (l) { return l.attend === 'mainteneur'; });
    var nb = g.lots.length + (g.lots.length > 1 ? ' cases à faire' : ' case à faire');
    var m = g.lots.filter(function (l) { return l.attend === 'mainteneur'; }).length;
    if (ouvert) return '<ol class="lots-detail">' + bloc(g.lots) + '</ol>';
    return '<details class="lots-plus"><summary>' + esc(g.nom || 'Suite') + ' · ' + nb + (m ? ', dont ' + m + ' pour toi' : '') + '</summary><ol class="lots-detail">' + bloc(g.lots) + '</ol></details>';
  });
  return '<h4>Lots du plan · ' + p.faits + ' faits sur ' + p.lots.length + '</h4>' +
    (faits.length ? '<details class="lots-faits"><summary>' + faits.length + (faits.length > 1 ? ' cases faites' : ' case faite') + '</summary><ol class="lots-detail">' + bloc(faits) + '</ol></details>' : '') +
    suite.join('');
}
function blocDuRang(p) {
  var m = p.rangDuMainteneur;
  var dit = m ? '<p>Rang <b>' + m.rang + '</b>, posé par toi. <span class="raison">« ' + esc(m.raison) + ' »</span> L’agent proposait le rang ' + p.rang + '.</p>'
    : '<p>Rang <b>' + p.rang + '</b>, proposé par l’agent qui a écrit la piste. ' + txt(p.raisonImportance.split('. ')[0].replace(/\\.$/, '')) + '.</p>';
  var options = RANGS.map(function (r, i) { return '<option value="' + i + '"' + (i === p.rangEffectif ? ' selected' : '') + '>' + i + ' · ' + r + '</option>'; }).join('');
  return '<div class="rang-bloc">' + dit + '<details><summary>Changer le rang</summary><div class="form-rang" data-piste="' + p.id + '">' +
    '<label>Nouveau rang <select>' + options + '</select></label>' +
    '<label>Ta raison, pour l’agent suivant<br><textarea placeholder="Pourquoi ce rang"></textarea></label>' +
    '<span><button type="button" class="bouton copier-rang">Copier la demande pour un agent</button> <span class="copie" hidden>Copié. Colle-la dans une conversation.</span></span>' +
    '<pre hidden></pre></div></details></div>';
}
function fiche(p, avecLots) {
  var droite = '';
  if (p.lots && avecLots) droite += listeLots(p);
  else if (p.lots) droite += '<h4>Plan</h4><p>' + p.faits + ' cases faites sur ' + p.lots.length + '. <a href="' + lien(p.plan) + '" target="_blank" rel="noopener">Ouvrir le plan ↗</a></p>';
  else if (p.recherche && p.questions.length) droite += '<h4>Questions de la recherche · ' + p.questions.length + '</h4><ul>' + p.questions.map(function (q) { return '<li>' + txt(q) + '</li>'; }).join('') + '</ul><p><a href="' + lien(p.recherche) + '" target="_blank" rel="noopener">Répondre dans la recherche ↗</a></p>';
  else droite += '<h4>Finie quand</h4><ul>' + p.criteresDeFin.map(function (q) { return '<li>' + txt(q) + '</li>'; }).join('') + '</ul>';
  droite += '<h4>Dépend de</h4><p>' + liens(p.dependances) + '</p><h4>Débloque</h4><p>' + liens(p.debloque) + '</p>' + blocDuRang(p);
  var gauche = '<p class="resume">' + txt(p.resume) + '</p>' +
    (p.alertes.length ? '<h4>À régler</h4><ul>' + p.alertes.map(function (a) { return '<li>' + txt(a.texte) + '</li>'; }).join('') + '</ul>' : '') +
    '<h4>Si on ne fait pas</h4><p>' + txt(p.raisonImportance) + '</p>' +
    '<h4>Ce que ça te demande</h4><p>' + txt(p.coutHumain) + ' <span class="doux">Taille ' + p.complexite + ' en travail d’agent.</span></p>' +
    (p.risques.length ? '<h4>Risques</h4><ul>' + p.risques.map(function (r) { return '<li>' + txt(r) + '</li>'; }).join('') + '</ul>' : '');
  return '<div class="fiche-rm"><div>' + gauche + '</div><div>' + droite + '</div></div>';
}
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('.copier-rang');
  if (!b) return;
  var f = b.closest('.form-rang'), id = f.getAttribute('data-piste'), p = par(id);
  var rang = f.querySelector('select').value, raison = f.querySelector('textarea').value.trim();
  if (!raison) { f.querySelector('textarea').focus(); f.querySelector('textarea').placeholder = 'Écris une raison : l’agent suivant en a besoin.'; return; }
  var texte = 'Dans pistes.json, pose le rang ' + rang + ' sur ' + id + ' (' + p.titreCourt + ') dans rangDuMainteneur, avec ma raison : « ' + raison + ' ». Puis lance npm run vues et commite pistes.json et INVENTAIRE-UCM.html.';
  var pre = f.querySelector('pre'); pre.textContent = texte; pre.hidden = false;
  try { navigator.clipboard.writeText(texte); } catch (x) {}
  f.querySelector('.copie').hidden = false;
});
`;

const page = (titre, corps, script) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titre}</title>
<style>
${CSS_PAGE}
${CSS_MAQUETTE}
</style>
</head>
<body>
<div class="page">
${NAV}
<main>
${corps}
</main>
</div>
<script>
${SCRIPT_COMMUN}
${script}
</script>
</body>
</html>
`;

const livrees = D.pistes.filter((p) => p.etatCalcule === 'livree');
const LIGNE_LIVREES = `<p class="livrees-rm"><span class="etat e-livree">Livrées</span> ${livrees.map((p) => `<a href="#">${p.id} ${p.titreCourt}</a>`).join(', ')}. Une piste dont toutes les cases sont cochées quitte la table.</p>`;
const nbAttente = PISTES.filter((p) => p.etat !== 'livree' && p.attente.some((a) => a.genre === 'toi')).length;

export const tableauQuestions = (lignes) => `<section class="questions-maquette"><h3>Questions à trancher</h3><table><tr><th>Question</th><th>Options</th><th>Proposition</th></tr>${lignes
  .map(([q, opts, reco]) => `<tr><td>${q}</td><td><ol>${opts.map((o) => `<li>${o}</li>`).join('')}</ol></td><td class="reco">${reco}</td></tr>`)
  .join('')}</table></section>`;

// ---------- Maquette A : la table ----------
const A_SCRIPT = `
function table(racine, avecLots) {
  var etat = { groupe: 'rang', filtre: false, ouvertes: { P6: true } };
  function lignes() {
    var liste = PISTES.filter(function (p) { return p.etat !== 'livree' && (!etat.filtre || p.attente.some(function (a) { return a.genre === 'toi'; })); });
    var groupes = [];
    if (etat.groupe === 'rang') {
      [0, 1, 2, 3, 4, 5].forEach(function (r) { var l = liste.filter(function (p) { return p.rangEffectif === r; }); if (l.length) groupes.push(['Rang ' + r, RANGS[r], l]); });
    } else {
      [['en-cours', 'En cours'], ['recherche', 'Recherche faite'], ['idee', 'Idée']].forEach(function (e) { var l = liste.filter(function (p) { return p.etat === e[0]; }); if (l.length) groupes.push([e[1], l.length + (l.length > 1 ? ' pistes' : ' piste'), l]); });
    }
    var cols = avecLots ? 5 : 4;
    var h = '<colgroup><col class="c-rang"><col class="c-piste"><col class="c-etat">' + (avecLots ? '<col class="c-lots">' : '') + '<col></colgroup><tr><th class="n">Rang</th><th>Piste</th><th>État</th>' + (avecLots ? '<th>Lots du plan</th>' : '') + '<th>Ce qui attend</th></tr>';
    groupes.forEach(function (g) {
      h += '<tr class="groupe"><td colspan="' + cols + '">' + g[0] + '<span>' + g[1] + '</span></td></tr>';
      g[2].forEach(function (p) {
        var ouvert = !!etat.ouvertes[p.id];
        h += '<tr class="rm-ligne' + (ouvert ? ' ouverte' : '') + '" data-id="' + p.id + '">' +
          '<td class="n"><span class="rang">' + p.rangEffectif + '</span>' + (p.rangDuMainteneur ? '<span class="toi-rang" title="' + esc('Posé par toi. ' + p.rangDuMainteneur.raison) + '">toi</span>' : '') + '</td>' +
          '<td><button type="button" class="rm-bascule" aria-expanded="' + ouvert + '"><span class="chev" aria-hidden="true"></span><span class="id">' + p.id + '</span><span class="titre">' + esc(p.titreCourt) + '</span></button><span class="sous">' + sujet(p) + '<span title="Taille en travail d’agent">taille <b>' + p.complexite + '</b></span>' + docs(p) + '</span></td>' +
          '<td>' + etatDe(p, !avecLots) + '</td>' +
          (avecLots ? '<td>' + rangee(p) + '</td>' : '') +
          '<td>' + attentes(p) + '</td></tr>';
        h += '<tr class="rm-fiche"' + (ouvert ? '' : ' hidden') + '><td colspan="' + cols + '">' + fiche(p, avecLots) + '</td></tr>';
      });
    });
    racine.querySelector('table.rm').innerHTML = h;
    racine.querySelector('.compte').textContent = liste.length + ' pistes à venir';
  }
  racine.addEventListener('click', function (e) {
    var s = e.target.closest('.segmente button');
    if (s) { etat.groupe = s.getAttribute('data-groupe'); racine.querySelectorAll('.segmente button').forEach(function (b) { b.setAttribute('aria-pressed', b === s); }); lignes(); return; }
    var f = e.target.closest('.filtre-attente');
    if (f) { etat.filtre = !etat.filtre; f.setAttribute('aria-pressed', etat.filtre); lignes(); return; }
    var o = e.target.closest('[data-ouvre]');
    if (o) { e.preventDefault(); etat.ouvertes[o.getAttribute('data-ouvre')] = true; lignes(); return; }
    if (e.target.closest('a, .rm-fiche, select, textarea, button:not(.rm-bascule)')) return;
    var tr = e.target.closest('tr.rm-ligne');
    if (tr) { var id = tr.getAttribute('data-id'); etat.ouvertes[id] = !etat.ouvertes[id]; lignes(); }
  });
  lignes();
}
table(document.getElementById('roadmap-a1'), false);
table(document.getElementById('roadmap-a2'), true);
`;
const outils = `<div class="rm-outils">
    <div class="segmente" role="group" aria-label="Grouper les pistes"><span class="lib">Grouper par</span><button type="button" data-groupe="rang" aria-pressed="true">Rang</button><button type="button" data-groupe="etat" aria-pressed="false">État</button></div>
    <button type="button" class="filtre-attente" aria-pressed="false">Attend ta décision <b>${nbAttente}</b></button>
    <span class="compte"></span>
  </div>`;
const LEGENDE = `<div class="legende-lots"><span><span class="lots"><i class="f"></i></span>fait</span><span><span class="lots"><i class="m"></i></span>attend ta décision</span><span><span class="lots"><i class="b"></i></span>attend une autre piste</span><span><span class="lots"><i class="s"></i></span>suivant, prêt pour un agent</span><span><span class="lots"><i></i></span>à faire</span><span>Le survol d’un carré donne la case du plan.</span></div>`;
const intro = `<h2><span class="num">7</span>Roadmap</h2>
  <p class="defini">Calculé depuis <code>pistes.json</code> et le plan de chaque piste, dans <code>docs/notes/Recherches/</code>.</p>
  <p class="intro">Chaque ligne est une piste à venir, rangée par rang. Son état et ses lots viennent de son plan à chaque génération de la page. Un clic sur la ligne ouvre sa fiche.</p>`;
const A = page('Roadmap, maquette A', `
<div class="bandeau-maquette"><b>Maquette A, la table calculée.</b> Données réelles du dépôt, calculées par <code>maquettes/donnees.mjs</code>. Deux versions l’une sous l’autre, pour comparer. A1 n’affiche pas les lots. A2 ajoute une rangée de carrés par piste. La fiche de P6 est ouverte. Le rang de P17 montre un rang posé par le mainteneur, tiré de sa note dans <code>decisions.json</code>.</div>
<div class="variante">A1 · Sans les lots <span>l’avancement tient dans l’étiquette d’état</span></div>
<section class="partie large" id="roadmap-a1">
  ${intro}
  ${outils}
  <table class="rm"></table>
  ${LIGNE_LIVREES}
</section>
<div class="variante">A2 · Avec les lots <span>une rangée de carrés, un carré par case du plan</span></div>
<section class="partie large" id="roadmap-a2">
  ${intro}
  ${outils}
  ${LEGENDE}
  <table class="rm"></table>
  ${LIGNE_LIVREES}
</section>
${tableauQuestions([
  ['Les lots dans la table', ['A1, l’état seul, « En cours · 6/28 »', 'A2, la rangée de carrés', 'A2 seulement dans la fiche, A1 dans la table'], 'A2. Le lot qui attend ta décision se voit sans ouvrir la fiche.'],
  ['L’ordre par défaut', ['Par rang, le choix « État » regroupe autrement', 'Par état, les pistes en cours en tête', 'Par rang, avec les pistes en cours en tête de chaque rang'], 'Par rang, avec le choix segmenté.'],
  ['Changer un rang', ['Copier une demande pour un agent, qui écrit pistes.json et commite', 'Un petit serveur local lancé par npm run inventaire écrit pistes.json', 'Tu modifies pistes.json à la main'], 'Copier une demande. Aucune API de fichier, aucun serveur.'],
  ['Le graphe des dépendances', ['Le retirer, « Dépend de » et « Débloque » restent dans la fiche', 'Le garder replié sous la table', 'Le remplacer par la colonne « Ce qui attend »'], 'Le retirer. La colonne « Ce qui attend » nomme le prérequis qui bloque.'],
  ['Les décisions « On fait » et la note', ['Les retirer, le rang du mainteneur les remplace', 'Garder « On ne fait pas » pour écarter une piste, avec une raison', 'Les garder'], 'Garder seulement « Écarter », avec une raison, dans le même bloc que le rang.'],
])}
`, A_SCRIPT);

// ---------- Maquette B : la board calculée ----------
const panneauScript = `
var panneau = document.getElementById('panneau');
function ouvrirPanneau(id) {
  var p = par(id);
  panneau.innerHTML = '<button type="button" class="bouton fermer">Fermer</button><h3><span class="mono doux">' + p.id + '</span> ' + esc(p.titre) + '</h3><p>' + sujet(p) + ' ' + etatDe(p, false) + ' ' + rangee(p) + '</p><p>' + docs(p) + '</p>' + fiche(p, true);
  panneau.hidden = false;
}
document.addEventListener('click', function (e) {
  var c = e.target.closest('.carte-piste, [data-ouvre]');
  if (c) { e.preventDefault(); ouvrirPanneau(c.getAttribute('data-id') || c.getAttribute('data-ouvre')); return; }
  if (e.target.closest('.fermer')) panneau.hidden = true;
});
function carte(p) {
  return '<button type="button" class="carte-piste" data-id="' + p.id + '"><span class="haut"><span class="id">' + p.id + '</span>' + sujet(p) + '<span class="r" title="Rang">R' + p.rangEffectif + (p.rangDuMainteneur ? ' · toi' : '') + '</span><span>' + p.complexite + '</span></span>' +
    '<span class="t" style="display:block">' + esc(p.titreCourt) + '</span>' + rangee(p) + attentes(p) + '</button>';
}
`;
const B_SCRIPT = `${panneauScript}
var COLS = [['idee', 'Idée', 'Ni recherche ni plan'], ['recherche', 'Recherche faite', 'Une recherche, pas de plan'], ['en-cours', 'En cours', 'Un plan, des cases à cocher'], ['livree', 'Livrée', 'Toutes les cases cochées']];
document.getElementById('board').innerHTML = COLS.map(function (c) {
  var l = PISTES.filter(function (p) { return p.etat === c[0]; });
  return '<div class="colonne"><h3><span class="etat ' + ETATS[c[0]][0] + '">' + c[1] + '</span><span>' + l.length + '</span></h3><p class="doux" style="font-size:.78rem;margin:-4px 4px 8px">' + c[2] + '</p>' + l.map(carte).join('') + '</div>';
}).join('');
`;
const B = page('Roadmap, maquette B', `
<div class="bandeau-maquette"><b>Maquette B, la board calculée.</b> Quatre colonnes que le générateur remplit depuis le dépôt. Aucune carte ne se déplace à la main. Dans chaque colonne, les cartes suivent le rang. Un clic sur une carte ouvre la fiche à droite.</div>
<section class="partie large" id="roadmap">
  ${intro.replace('Chaque ligne est une piste à venir, rangée par rang.', 'Chaque carte est une piste, rangée dans la colonne de son état.').replace('sur la ligne', 'sur la carte')}
  ${LEGENDE}
  <div class="board" id="board"></div>
</section>
<aside class="panneau" id="panneau" hidden></aside>
${tableauQuestions([
  ['La forme', ['Board calculée, comme ici', 'Table de la maquette A', 'Matrice rang et état de la maquette C'], 'Table A. La board range d’abord par état et noie le rang dans la colonne.'],
  ['La colonne « Livrée »', ['La garder, avec les deux pistes livrées', 'La remplacer par une ligne sous la board'], 'Une ligne sous la board. Une colonne pour deux cartes prend un quart de la largeur.'],
])}
`, B_SCRIPT);

// ---------- Maquette C : la matrice rang et état ----------
const C_SCRIPT = `${panneauScript}
var COLS = [['idee', 'Idée'], ['recherche', 'Recherche faite'], ['en-cours', 'En cours']];
var h = '<tr><th class="lr"></th>' + COLS.map(function (c) { return '<th><span class="etat ' + ETATS[c[0]][0] + '">' + c[1] + '</span></th>'; }).join('') + '</tr>';
[0, 1, 2, 3, 4, 5].forEach(function (r) {
  h += '<tr><th class="lr">Rang ' + r + '<small>' + RANGS[r] + '</small></th>' + COLS.map(function (c) {
    var l = PISTES.filter(function (p) { return p.rangEffectif === r && p.etat === c[0]; });
    var alerte = r <= 1 && c[0] === 'idee' && l.length;
    return '<td class="' + (l.length ? '' : 'vide') + (alerte ? ' alerte-case' : '') + '"' + (alerte ? ' title="Priorité haute, rien de commencé"' : '') + '>' + l.map(carte).join('') + '</td>';
  }).join('') + '</tr>';
});
document.getElementById('matrice').innerHTML = h;
`;
const C = page('Roadmap, maquette C', `
<div class="bandeau-maquette"><b>Maquette C, la matrice rang et état.</b> Une ligne par rang, une colonne par état calculé. Une piste de rang 0 ou 1 encore à l’état d’idée est entourée de rose. Les pistes livrées sont sous la matrice.</div>
<section class="partie large" id="roadmap">
  ${intro.replace('Chaque ligne est une piste à venir, rangée par rang.', 'Chaque carte est une piste à venir, placée selon son rang et son état.').replace('sur la ligne', 'sur la carte')}
  ${LEGENDE}
  <table class="matrice" id="matrice"></table>
  ${LIGNE_LIVREES}
</section>
<aside class="panneau" id="panneau" hidden></aside>
${tableauQuestions([
  ['La forme', ['Matrice, comme ici', 'Table de la maquette A', 'Board de la maquette B'], 'Table A, avec le cadre rose de la matrice repris dans la table : une piste de rang 0 ou 1 sans recherche reçoit l’attente « À lancer ».'],
  ['Le repère « priorité haute, rien de commencé »', ['Le garder', 'Le retirer'], 'Le garder. Il montre P1 et P17 aujourd’hui.'],
])}
`, C_SCRIPT);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
writeFileSync(path.join(ICI, 'maquette-A-table.html'), A);
writeFileSync(path.join(ICI, 'maquette-B-board.html'), B);
writeFileSync(path.join(ICI, 'maquette-C-matrice.html'), C);
console.log('maquettes écrites', PISTES.length, 'pistes,', nbAttente, 'attendent le mainteneur');
}
