// Maquette A2 v2 de la Roadmap, après le retour du mainteneur : avancement en tag, lots dans la fiche seulement, « Prio », « En attente »,
// changement de prio minimal, « Écarter » dans le même sélecteur. Écrit maquette-A2-v2.html dans ce dossier.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CSS_MAQUETTE, CSS_PAGE, NAV, PISTES, SUJETS, tableauQuestions } from './generer-maquettes.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
// Les alertes quittent pistes.json (question 8, proposition par défaut) : la ligne ne les compte plus.
const DONNEES = PISTES.map((p) => ({ ...p, attente: p.attente.filter((a) => !/alerte/.test(a.texte)) }));
const nbAttente = DONNEES.filter((p) => p.etat !== 'livree' && p.attente.some((a) => a.genre === 'toi')).length;
const livrees = DONNEES.filter((p) => p.etat === 'livree');

const CSS_V2 = `
.rm col.c-rang { width: 64px; } .rm col.c-piste { width: 420px; } .rm col.c-etat { width: 210px; }
.tag-avance { display: inline-block; margin-left: 6px; padding: 0 6px; border: 1px solid var(--trait); border-radius: 4px; font: 600 .74rem/1.5 ui-monospace, Consolas, monospace; color: var(--texte); background: var(--surface); vertical-align: middle; }
.prio-toi { display: inline-block; width: 7px; height: 7px; margin-left: 4px; border-radius: 50%; background: var(--violet); vertical-align: 3px; }
.rm-outils .compte .prio-toi { margin: 0 4px 0 10px; vertical-align: 1px; }
.fiche-rm .lots { flex-wrap: wrap; }
.legende-fiche { display: flex; flex-wrap: wrap; gap: 2px 12px; font-size: .74rem; color: var(--doux); margin: 4px 0 6px; }
.legende-fiche span { display: inline-flex; align-items: center; gap: 4px; }
.prio-form { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--trait); font-size: .85rem; }
.prio-form label { font-weight: 600; }
.prio-form select, .prio-form input { font: inherit; font-size: .85rem; height: 30px; box-sizing: border-box; padding: 0 8px; border: 1px solid var(--trait); border-radius: 6px; background: var(--surface); color: var(--texte); }
.prio-form select { width: 150px; }
.prio-form input { flex: 1 1 120px; min-width: 0; }
.prio-form .copier-prio { min-width: 136px; text-align: center; }
.prio-form .copier-prio.fait { color: var(--olive); border-color: var(--olive); font-weight: 600; }
.prio-form { flex-wrap: nowrap; }
.prio-form .bouton { height: 30px; }
.prio-form .bouton:disabled { color: var(--doux); cursor: default; background: var(--surface-2); }
.prio-posee { margin: 12px 0 0; font-size: .85rem; color: var(--violet); }
.prio-posee .prio-toi { margin: 0 6px 0 0; vertical-align: 1px; }
`;

const SCRIPT = `
var PISTES = ${JSON.stringify(DONNEES)};
var SUJETS = ${JSON.stringify(SUJETS)};
var PRIOS = ['Avant d’ouvrir le projet', 'Socle de la bibliothèque et verdict', 'Premiers modules', 'Vérification du rendu', 'Utile, sans urgence', 'Plus tard'];
var ETATS = { idee: ['e-idee', 'Idée'], recherche: ['e-recherche', 'Recherche faite'], 'en-cours': ['e-cours', 'En cours'], livree: ['e-livree', 'Livrée'] };
var GITHUB = 'https://github.com/Vassili-g/UCM-Toolkit/blob/main/';
function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function txt(t) { return esc(t).replace(/\`([^\`]+)\`/g, '<code>$1</code>'); }
function lien(chemin) { return GITHUB + chemin.split('/').map(encodeURIComponent).join('/'); }
function par(id) { return PISTES.filter(function (p) { return p.id === id; })[0]; }
function classeDuLot(l) { return l.fait ? 'f' : l.attend === 'mainteneur' ? 'm' : l.attend ? 'b' : l.suivante ? 's' : ''; }
function motDuLot(l) { return l.fait ? 'fait' : l.attend === 'mainteneur' ? 'attend ta décision' : l.attend ? 'attend ' + l.attend : l.suivante ? 'suivant, prêt pour un agent' : 'à faire'; }
function rangee(p) {
  var groupes = [], courant = null;
  p.lots.forEach(function (l) { if (!courant || courant.nom !== l.groupe) { courant = { nom: l.groupe, lots: [] }; groupes.push(courant); } courant.lots.push(l); });
  return '<span class="lots">' + groupes.map(function (g) {
    return '<span class="g">' + g.lots.map(function (l) { return '<i class="' + classeDuLot(l) + '" title="' + esc(l.num + ' · ' + motDuLot(l) + ' · ' + l.texte) + '"></i>'; }).join('') + '</span>';
  }).join('') + '</span>';
}
function sujet(p) { var c = SUJETS[p.sujet]; return '<span class="sujet" style="color:' + c.texte + ';background:' + c.fond + '">' + esc(p.sujet) + '</span>'; }
function docs(p) {
  return (p.recherche ? '<a href="' + lien(p.recherche) + '" target="_blank" rel="noopener" title="' + esc(p.recherche.split('/').pop()) + '">Recherche ↗</a>' : '') +
    (p.plan ? '<a href="' + lien(p.plan) + '" target="_blank" rel="noopener" title="' + esc(p.plan.split('/').pop()) + '">Plan ↗</a>' : '');
}
function attentes(p) {
  return '<span class="attentes">' + p.attente.map(function (a) { return '<span class="attend ' + a.genre + '" title="' + esc(a.detail) + '">' + esc(a.texte) + '</span>'; }).join('') + '</span>';
}
function liens(ids) { return ids.length ? ids.map(function (id) { var q = par(id); return q ? '<a href="#" data-ouvre="' + id + '">' + id + ' ' + esc(q.titreCourt) + '</a>' : id + ' (livrée)'; }).join(', ') : 'rien'; }
function listeLots(p) {
  var faits = p.lots.filter(function (l) { return l.fait; }), reste = p.lots.filter(function (l) { return !l.fait; });
  function ligne(l, groupe) {
    return (groupe ? '<li class="gr">' + esc(groupe) + '</li>' : '') + '<li class="' + (l.fait ? 'fait' : classeDuLot(l)) + '"><span class="lots"><i class="' + classeDuLot(l) + '"></i></span><span class="num">' + esc(l.num) + '</span><span class="txt">' + txt(l.texte) + (l.attend === 'mainteneur' ? ' <span class="attend toi">ta décision</span>' : l.attend ? ' <span class="attend piste">attend ' + esc(l.attend) + '</span>' : '') + '</span><span class="h">' + (l.hashes.length ? esc(l.hashes[0]) : '') + '</span></li>';
  }
  function bloc(lots) { var g = null; return lots.map(function (l) { var t = l.groupe !== g ? l.groupe : ''; g = l.groupe; return ligne(l, t); }).join(''); }
  var groupes = [], index = {};
  reste.forEach(function (l) { if (!(l.groupe in index)) { index[l.groupe] = groupes.length; groupes.push({ nom: l.groupe, lots: [] }); } groupes[index[l.groupe]].lots.push(l); });
  var suite = groupes.map(function (g, i) {
    var m = g.lots.filter(function (l) { return l.attend === 'mainteneur'; }).length;
    if (i === 0 || m) return '<ol class="lots-detail">' + bloc(g.lots) + '</ol>';
    return '<details class="lots-plus"><summary>' + esc(g.nom || 'Suite') + ' · ' + g.lots.length + (g.lots.length > 1 ? ' cases à faire' : ' case à faire') + '</summary><ol class="lots-detail">' + bloc(g.lots) + '</ol></details>';
  });
  return '<h4>Lots du plan · ' + p.faits + '/' + p.lots.length + '</h4>' + rangee(p) +
    '<div class="legende-fiche"><span><span class="lots"><i class="f"></i></span>fait</span><span><span class="lots"><i class="m"></i></span>ta décision</span><span><span class="lots"><i class="b"></i></span>attend une piste</span><span><span class="lots"><i class="s"></i></span>suivant</span><span><span class="lots"><i></i></span>à faire</span></div>' +
    (faits.length ? '<details class="lots-faits"><summary>' + faits.length + (faits.length > 1 ? ' cases faites' : ' case faite') + '</summary><ol class="lots-detail">' + bloc(faits) + '</ol></details>' : '') +
    suite.join('');
}
// Le changement de prio : un sélecteur (les six prios et « Écartée »), un champ d'une ligne, un bouton.
function formPrio(p) {
  var m = p.rangDuMainteneur;
  var options = PRIOS.map(function (r, i) { return '<option value="' + i + '"' + (i === p.rangEffectif ? ' selected' : '') + '>' + i + ' · ' + r + '</option>'; }).join('') + '<option value="ecartee">Écartée</option>';
  return (m ? '<p class="prio-posee"><span class="prio-toi"></span>Prio posée par toi. « ' + esc(m.raison) + ' »</p>' : '') +
    '<div class="prio-form" data-piste="' + p.id + '"><label for="prio-' + p.id + '">Prio</label><select id="prio-' + p.id + '">' + options + '</select>' +
    '<input type="text" placeholder="Pourquoi ?" aria-label="Pourquoi cette prio">' +
    '<button type="button" class="bouton copier-prio" aria-live="polite" disabled>Copier pour l’agent</button></div>';
}
function fiche(p) {
  var droite = '';
  if (p.lots) droite += listeLots(p);
  else if (p.recherche && p.questions.length) droite += '<h4>Questions de la recherche · ' + p.questions.length + '</h4><ul>' + p.questions.map(function (q) { return '<li>' + txt(q) + '</li>'; }).join('') + '</ul>';
  else droite += '<h4>Finie quand</h4><ul>' + p.criteresDeFin.map(function (q) { return '<li>' + txt(q) + '</li>'; }).join('') + '</ul>';
  droite += '<h4>Dépend de</h4><p>' + liens(p.dependances) + '</p><h4>Débloque</h4><p>' + liens(p.debloque) + '</p>';
  var gauche = '<p class="resume">' + txt(p.resume) + '</p>' +
    '<h4>Si on ne fait pas</h4><p>' + txt(p.raisonImportance) + '</p>' +
    '<h4>Ce que ça te demande</h4><p>' + txt(p.coutHumain) + '</p>' +
    (p.risques.length ? '<h4>Risques</h4><ul>' + p.risques.map(function (r) { return '<li>' + txt(r) + '</li>'; }).join('') + '</ul>' : '') + formPrio(p);
  return '<div class="fiche-rm"><div>' + gauche + '</div><div>' + droite + '</div></div>';
}
var racine = document.getElementById('roadmap');
var etat = { groupe: 'prio', filtre: false, ouvertes: { P6: true, P17: true } };
function etatDe(p) {
  var e = ETATS[p.etat];
  return '<span class="etat ' + e[0] + '">' + e[1] + '</span>' + (p.lots ? '<span class="tag-avance" title="Cases cochées du plan">' + p.faits + '/' + p.lots.length + '</span>' : '');
}
function lignes() {
  var liste = PISTES.filter(function (p) { return p.etat !== 'livree' && (!etat.filtre || p.attente.some(function (a) { return a.genre === 'toi'; })); });
  var groupes = [];
  if (etat.groupe === 'prio') {
    [0, 1, 2, 3, 4, 5].forEach(function (r) { var l = liste.filter(function (p) { return p.rangEffectif === r; }); if (l.length) groupes.push(['Prio ' + r, PRIOS[r], l]); });
  } else {
    [['en-cours', 'En cours'], ['recherche', 'Recherche faite'], ['idee', 'Idée']].forEach(function (e) { var l = liste.filter(function (p) { return p.etat === e[0]; }); if (l.length) groupes.push([e[1], l.length + (l.length > 1 ? ' pistes' : ' piste'), l]); });
  }
  var h = '<colgroup><col class="c-rang"><col class="c-piste"><col class="c-etat"><col></colgroup><tr><th class="n">Prio</th><th>Piste</th><th>État</th><th>En attente</th></tr>';
  groupes.forEach(function (g) {
    h += '<tr class="groupe"><td colspan="4">' + g[0] + '<span>' + g[1] + '</span></td></tr>';
    g[2].forEach(function (p) {
      var ouvert = !!etat.ouvertes[p.id], m = p.rangDuMainteneur;
      h += '<tr class="rm-ligne' + (ouvert ? ' ouverte' : '') + '" data-id="' + p.id + '">' +
        '<td class="n"><span class="rang">' + p.rangEffectif + '</span>' + (m ? '<span class="prio-toi" title="' + esc('Prio posée par toi. ' + m.raison) + '" aria-label="Prio posée par toi"></span>' : '') + '</td>' +
        '<td><button type="button" class="rm-bascule" aria-expanded="' + ouvert + '"><span class="chev" aria-hidden="true"></span><span class="id">' + p.id + '</span><span class="titre">' + esc(p.titreCourt) + '</span></button><span class="sous">' + sujet(p) + '<span title="Taille en travail d’agent">taille <b>' + p.complexite + '</b></span>' + docs(p) + '</span></td>' +
        '<td>' + etatDe(p) + '</td><td>' + attentes(p) + '</td></tr>';
      h += '<tr class="rm-fiche"' + (ouvert ? '' : ' hidden') + '><td colspan="4">' + fiche(p) + '</td></tr>';
    });
  });
  racine.querySelector('table.rm').innerHTML = h;
  racine.querySelector('.compte').innerHTML = liste.length + ' pistes à venir<span class="prio-toi"></span>prio posée par toi';
}
racine.addEventListener('input', function (e) {
  var f = e.target.closest('.prio-form'); if (!f) return;
  f.querySelector('.copier-prio').disabled = !f.querySelector('input').value.trim();
});
racine.addEventListener('click', function (e) {
  var c = e.target.closest('.copier-prio');
  if (c) {
    var f = c.closest('.form-prio, .prio-form'), id = f.getAttribute('data-piste'), p = par(id);
    var v = f.querySelector('select').value, pourquoi = f.querySelector('input').value.trim();
    var texte = v === 'ecartee'
      ? 'Dans pistes.json, écarte ' + id + ' (' + p.titreCourt + ') avec la raison « ' + pourquoi + ' ». Puis lance npm run vues et commite.'
      : 'Dans pistes.json, pose la prio ' + v + ' sur ' + id + ' (' + p.titreCourt + ') dans prioDuMainteneur, avec la raison « ' + pourquoi + ' ». Puis lance npm run vues et commite.';
    try { navigator.clipboard.writeText(texte).catch(function () {}); } catch (x) {}
    c.textContent = 'Copié ✓'; c.classList.add('fait');
    setTimeout(function () { c.textContent = 'Copier pour l’agent'; c.classList.remove('fait'); }, 2000);
    return;
  }
  var s = e.target.closest('.segmente button');
  if (s) { etat.groupe = s.getAttribute('data-groupe'); racine.querySelectorAll('.segmente button').forEach(function (b) { b.setAttribute('aria-pressed', b === s); }); lignes(); return; }
  var fl = e.target.closest('.filtre-attente');
  if (fl) { etat.filtre = !etat.filtre; fl.setAttribute('aria-pressed', etat.filtre); lignes(); return; }
  var o = e.target.closest('[data-ouvre]');
  if (o) { e.preventDefault(); etat.ouvertes[o.getAttribute('data-ouvre')] = true; lignes(); return; }
  if (e.target.closest('a, .rm-fiche, select, input, button:not(.rm-bascule)')) return;
  var tr = e.target.closest('tr.rm-ligne');
  if (tr) { var id = tr.getAttribute('data-id'); etat.ouvertes[id] = !etat.ouvertes[id]; lignes(); }
});
lignes();
`;

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Roadmap, maquette A2 v2</title>
<style>
${CSS_PAGE}
${CSS_MAQUETTE}
${CSS_V2}
</style>
</head>
<body>
<div class="page">
${NAV}
<main>
<div class="bandeau-maquette"><b>Maquette A2, version 2.</b> Données réelles du dépôt. L’avancement tient dans un tag. Les lots ne sont que dans la fiche. Les fiches de P6 et de P17 sont ouvertes. P17 porte une prio posée par toi.</div>
<section class="partie large" id="roadmap">
  <h2><span class="num">7</span>Roadmap</h2>
  <p class="defini">Calculé depuis <code>pistes.json</code> et le plan de chaque piste, dans <code>docs/notes/Recherches/</code>.</p>
  <p class="intro">Chaque ligne est une piste à venir, rangée par prio. Son état vient de son plan à chaque génération de la page. Un clic sur la ligne ouvre sa fiche.</p>
  <div class="rm-outils">
    <div class="segmente" role="group" aria-label="Grouper les pistes"><span class="lib">Grouper par</span><button type="button" data-groupe="prio" aria-pressed="true">Prio</button><button type="button" data-groupe="etat" aria-pressed="false">État</button></div>
    <button type="button" class="filtre-attente" aria-pressed="false">Attend ta décision <b>${nbAttente}</b></button>
    <span class="compte"></span>
  </div>
  <table class="rm"></table>
  <p class="livrees-rm"><span class="etat e-livree">Livrées</span> ${livrees.map((p) => `<a href="#">${p.id} ${p.titreCourt}</a>`).join(', ')}.</p>
</section>
${tableauQuestions([
  ['Questions ouvertes T1 à T10', ['Chacune passe dans la fiche des pistes qu’elle vise, T7, T8 et T9 se tranchent ou sortent', 'La table reste, sans boutons', 'Elles disparaissent'], 'Option 1. La maquette ne montre plus la table.'],
  ['T2, T3 et T4 visent seulement P19, qui est livrée', ['Tranchées par P19, elles sortent de decisions.json', 'Elles passent dans une piste à venir'], 'Option 1, à confirmer.'],
  ['« Les autres règles décidées »', ['Les règles écrites ailleurs sortent, les autres vont dans la partie 6', 'Toutes vont dans la partie 6', 'Elles restent dans la Roadmap'], 'Option 1. La maquette ne les montre plus.'],
  ['Le bandeau « À régler » en tête de page', ['Il disparaît, le filtre « Attend ta décision » le remplace', 'Il reste en tête de page, calculé depuis les cases (mainteneur)'], 'Option 1. La maquette ne compte plus les alertes de P6, qui recopient la case 0.7.'],
  ['La mise à jour à chaque commit', ['npm run inventaire régénère dans un fichier temporaire avant d’ouvrir', 'Un hook Git refuse un commit dont la page est périmée', 'Les deux'], 'Option 1.'],
  ['Le nom de la section, ROADMAP.md parlant du MVP', ['« Roadmap », ROADMAP.md garde son nom', '« Roadmap », ROADMAP.md devient « Validations du MVP »', '« Pistes »'], 'Option 2.'],
  ['Le repère « bougé depuis ta dernière visite »', ['Oui, gardé dans ce navigateur', 'Non'], 'Non dans cette maquette.'],
  ['Le nom du champ dans pistes.json', ['rang devient prio, rangDuMainteneur devient prioDuMainteneur', 'Les noms restent, seul l’affichage dit « Prio »'], 'Option 1. Le même terme du dépôt à la page.'],
])}
</main>
</div>
<script>
${SCRIPT}
</script>
</body>
</html>
`;
writeFileSync(path.join(ICI, 'maquette-A2-v2.html'), html);
console.log('maquette-A2-v2.html écrite,', nbAttente, 'pistes attendent le mainteneur');
