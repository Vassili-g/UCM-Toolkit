#!/usr/bin/env node
/**
 * Régénère la section 13 de VUE-D-ENSEMBLE.html depuis PISTES-DE-REFLEXION.md.
 * Le document fait autorité : modifier le document, puis relancer.
 *
 *   node Mesures/generer-section-pistes.mjs   (depuis le dossier Architecture globale UCM)
 */
import { readFileSync, writeFileSync } from "node:fs";

const echapper = (x) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const enLigne = (x) => echapper(x)
  .replace(/`([^`]+)`/g, "<code>$1</code>")
  .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
  .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
const estListe = (l) => /^(- |\d+\. )/.test(l);

function rendre(bloc) {
  const lignes = bloc.split("\n");
  const sortie = [];
  let i = 0;
  while (i < lignes.length) {
    const l = lignes[i];
    if (!l.trim()) { i += 1; continue; }
    if (l.startsWith("|")) {
      const rangs = [];
      while (i < lignes.length && lignes[i].startsWith("|")) rangs.push(lignes[i++].replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
      const [tete, , ...corps] = rangs;
      sortie.push(`<table style="margin:8px 0"><tr>${tete.map((c) => `<th>${enLigne(c)}</th>`).join("")}</tr>${corps.map((r) => `<tr>${r.map((c) => `<td>${enLigne(c)}</td>`).join("")}</tr>`).join("")}</table>`);
      continue;
    }
    if (estListe(l)) {
      const balise = /^\d/.test(l) ? "ol" : "ul";
      const items = [];
      while (i < lignes.length && estListe(lignes[i])) {
        let item = lignes[i++].replace(/^(- |\d+\. )/, "");
        while (i < lignes.length && lignes[i].startsWith("  ") && lignes[i].trim()) item += ` ${lignes[i++].trim()}`;
        items.push(`<li>${enLigne(item)}</li>`);
      }
      sortie.push(`<${balise} class="petit">${items.join("")}</${balise}>`);
      continue;
    }
    const paragraphe = [];
    while (i < lignes.length && lignes[i].trim() && !lignes[i].startsWith("|") && !estListe(lignes[i])) paragraphe.push(lignes[i++].trim());
    sortie.push(`<p class="petit">${enLigne(paragraphe.join(" "))}</p>`);
  }
  return sortie.join("\n");
}

const source = readFileSync("PISTES-DE-REFLEXION.md", "utf8");
const sections = source.split(/^## /m).slice(1).map((partie) => {
  const [titre, ...reste] = partie.split("\n");
  return `<div class="carte" style="margin-bottom:14px"><h3>${enLigne(titre)}</h3>\n${rendre(reste.join("\n"))}\n</div>`;
});
const section = `<h2>13. Les pistes de réflexion <span class="statut propose">Pistes</span></h2>\n<p class="sous">Options, questions et essais pour chaque sujet ouvert. Aucun contenu n'est rédigé et aucune option n'est retenue. Source : PISTES-DE-REFLEXION.md.</p>\n${sections.join("\n")}\n\n`;
const page = readFileSync("VUE-D-ENSEMBLE.html", "utf8");
const debut = page.indexOf("<h2>13. Les pistes de réflexion");
const fin = page.indexOf("<footer>");
writeFileSync("VUE-D-ENSEMBLE.html", page.slice(0, debut) + section + page.slice(fin));
console.log(`${sections.length} pistes écrites dans la section 13.`);
