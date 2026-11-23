// Prototype du calcul de l'état des pistes depuis le dépôt, pour les maquettes de l'étude Roadmap.
// Lit pistes.json, decisions.json, les plans et l'historique Git. N'écrit rien dans le dépôt.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..');
const lire = (chemin) => readFileSync(path.join(RACINE, chemin), 'utf8');
const DOSSIER = 'docs/notes/Recherches/Evolutions globales/';

function dateDuCommit(hash) {
  try { return execFileSync('git', ['show', '-s', '--format=%cs', hash], { cwd: RACINE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; }
}

// Un texte de case raccourci : la première phrase, sans le nom de l'agent en tête.
const ACTEURS = /^((décision du mainteneur|conversation principale|avec le développeur|implementeur-exigeant|implementeur|executant|verificateur|puis|,|\s)+)\.\s*/i;
function court(texte) {
  let t = texte.replace(/`/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(ACTEURS, '');
  t = (t.match(/^[\s\S]*?[.!?](?=\s|$)/) || [t])[0];
  return t.length > 90 ? t.slice(0, 88).trimEnd() + '…' : t;
}

/**
 * Les lots d'un plan. Un lot est une case de premier niveau ; une case indentée est une étape du lot et ne compte pas.
 * Un titre « ## Lot N » groupe les cases qui le suivent. Marques reconnues, en prototype :
 * une case non faite qui nomme le mainteneur ou le développeur attend une personne ; « attend le premier contrat » attend P1.
 */
export function lotsDuPlan(chemin) {
  const lignes = lire(chemin).split(/\r?\n/);
  const lots = [];
  let groupe = '', dansUnBloc = false;
  for (const ligne of lignes) {
    if (/^\s*(```|~~~)/.test(ligne)) { dansUnBloc = !dansUnBloc; continue; }
    if (dansUnBloc) continue;
    const titre = /^##\s+(Lot\s+[\w.]+)/i.exec(ligne);
    if (titre) { groupe = titre[1].replace(/\.$/, ''); continue; }
    const m = /^[-*+] \[([ xX])\] ([\w.]+)(?: \(([^)]*)\))?\.?\s*(.*)$/.exec(ligne);
    if (!m) continue;
    const fait = m[1] !== ' ';
    const hashes = (m[3] || '').match(/\b[0-9a-f]{7,10}\b/g) || [];
    const texte = m[4];
    let attend = '';
    if (!fait && /mainteneur|avec le développeur/i.test(texte.slice(0, 80))) attend = 'mainteneur';
    if (!fait && /attend le premier contrat/i.test(texte)) attend = 'P1';
    lots.push({ groupe, num: m[2].replace(/\.$/, ''), fait, hashes, date: hashes.map(dateDuCommit).filter(Boolean).sort().pop() || null, attend, texte: court(texte) });
  }
  // La première case non faite et sans attente est la suivante.
  const suivante = lots.find((l) => !l.fait && !l.attend);
  if (suivante) suivante.suivante = true;
  return lots;
}

export function donnees() {
  const { pistes } = JSON.parse(lire(DOSSIER + 'pistes.json'));
  const decisions = JSON.parse(lire(DOSSIER + 'decisions.json'));
  const parId = Object.fromEntries(pistes.map((p) => [p.id, p]));
  for (const p of pistes) {
    p.lots = p.plan && existsSync(path.join(RACINE, p.plan)) ? lotsDuPlan(p.plan) : null;
    p.faits = p.lots ? p.lots.filter((l) => l.fait).length : 0;
    p.livree = !!p.lots && p.faits === p.lots.length;
    p.dernierLot = p.lots ? p.lots.map((l) => l.date).filter(Boolean).sort().pop() || null : null;
  }
  for (const p of pistes) {
    p.prerequisEnAttente = p.dependances.filter((d) => !parId[d].livree);
    p.debloque = pistes.filter((q) => q.dependances.includes(p.id)).map((q) => q.id);
    // L'état calculé, du plus avancé au moins avancé.
    if (p.livree) p.etatCalcule = 'livree';
    else if (p.lots) p.etatCalcule = 'en-cours';
    else if (p.recherche) p.etatCalcule = 'recherche';
    else p.etatCalcule = 'idee';
    const attendMoi = p.lots ? p.lots.filter((l) => l.attend === 'mainteneur') : [];
    const bloques = p.lots ? p.lots.filter((l) => l.attend && l.attend !== 'mainteneur') : [];
    p.attente = [];
    if (attendMoi.length) p.attente.push({ genre: 'toi', texte: `Ta décision, lot ${attendMoi[0].num}`, detail: attendMoi[0].texte });
    if (!p.lots && p.recherche && p.questions.length) p.attente.push({ genre: 'toi', texte: `Tes réponses, ${p.questions.length} ${p.questions.length > 1 ? 'questions' : 'question'}`, detail: 'Questions de la recherche' });
    if (p.alertes && p.alertes.length) p.attente.push({ genre: 'toi', texte: `${p.alertes.length} ${p.alertes.length > 1 ? 'alertes' : 'alerte'}`, detail: p.alertes.map((a) => a.texte).join(' / ') });
    if (bloques.length) p.attente.push({ genre: 'piste', texte: `Lot ${bloques[0].num} attend ${bloques[0].attend}`, detail: bloques[0].texte });
    else if (p.prerequisEnAttente.length && p.etatCalcule !== 'livree') p.attente.push({ genre: 'piste', texte: `Après ${p.prerequisEnAttente.join(', ')}`, detail: 'Prérequis pas encore livrés' });
    const rangEffectif = p.id === 'P17' ? 4 : p.rang; // le rang posé par le mainteneur, plus bas
    if (p.etatCalcule === 'idee' && rangEffectif <= 1) p.attente.unshift({ genre: 'toi', texte: 'À lancer, rien de commencé', detail: 'Rang 0 ou 1 sans recherche ni plan' });
    const d = decisions.pistes[p.id];
    p.noteDuMainteneur = d && d.note ? d.note : '';
  }
  // Exemple de rang posé par le mainteneur : sa note sur P17 dans decisions.json devient une raison écrite.
  const p17 = parId.P17;
  p17.rangDuMainteneur = { rang: 4, raison: p17.noteDuMainteneur || 'Pas prioritaire pour le moment.' };
  for (const p of pistes) p.rangEffectif = p.rangDuMainteneur ? p.rangDuMainteneur.rang : p.rang;
  const ordreImportance = { critique: 0, haute: 1, moyenne: 2, basse: 3 };
  pistes.sort((a, b) => a.rangEffectif - b.rangEffectif || ordreImportance[a.importance] - ordreImportance[b.importance]);
  return { pistes, transverses: decisions.regles.filter((r) => r.genre === 'transverse') };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { pistes } = donnees();
  for (const p of pistes) {
    console.log(p.id, 'rang', p.rangEffectif, p.etatCalcule, p.lots ? `${p.faits}/${p.lots.length}` : '-', p.dernierLot || '', '|', p.attente.map((a) => a.texte).join(' ; '));
  }
}
