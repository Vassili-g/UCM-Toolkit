/**
 * Extraction de sections de Markdown pour le générateur de l'inventaire.
 *
 * Chaque fonction est pure : elle reçoit le texte d'un Markdown, son chemin
 * (cité dans les messages) et le titre d'une section, sans le `#`. La section
 * court jusqu'au titre de même niveau ou de niveau supérieur suivant. Les
 * lignes d'un bloc de code ne sont jamais des titres.
 *
 * Règle d'échec : un titre absent lève « ancre <titre> absente de <chemin> ».
 * Le générateur échoue donc dès qu'un document renomme une section dont
 * l'inventaire dépend, au lieu d'afficher une section vide.
 */

interface Titre {
  niveau: number;
  texte: string;
  ligne: number;
}

export interface SousTitre {
  titre: string;
  paragraphe: string;
}

function lignesDe(texte: string): string[] {
  return texte.split(/\r?\n/);
}

/** Les titres du document, hors blocs de code. */
function titresDe(lignes: string[]): Titre[] {
  const titres: Titre[] = [];
  let dansUnBloc = false;
  lignes.forEach((ligne, index) => {
    if (/^\s*```/.test(ligne)) {
      dansUnBloc = !dansUnBloc;
      return;
    }
    if (dansUnBloc) return;
    const trouve = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(ligne);
    if (trouve) titres.push({ niveau: trouve[1].length, texte: trouve[2], ligne: index });
  });
  return titres;
}

/** Les lignes d'une section, titre exclu, et le niveau de son titre. */
function lignesDeSection(texte: string, chemin: string, titre: string): { lignes: string[]; niveau: number } {
  const lignes = lignesDe(texte);
  const titres = titresDe(lignes);
  const rang = titres.findIndex((t) => t.texte === titre.trim());
  if (rang === -1) throw new Error(`ancre ${titre} absente de ${chemin}`);
  const debut = titres[rang];
  const fin = titres.slice(rang + 1).find((t) => t.niveau <= debut.niveau);
  return { lignes: lignes.slice(debut.ligne + 1, fin ? fin.ligne : lignes.length), niveau: debut.niveau };
}

/** Le contenu de la section, sans espace de bord. */
export function sectionDe(texte: string, chemin: string, titre: string): string {
  return lignesDeSection(texte, chemin, titre).lignes.join('\n').trim();
}

function cellulesDe(ligne: string): string[] {
  const interieur = ligne.trim().replace(/^\|/, '').replace(/\|$/, '');
  return interieur.split(/(?<!\\)\|/).map((cellule) => cellule.replace(/\\\|/g, '|').trim());
}

/**
 * Les lignes du premier tableau de la section, chacune en objet dont les clés
 * sont les en-têtes. Une section sans tableau rend une liste vide.
 */
export function tableauDe(texte: string, chemin: string, titre: string): Record<string, string>[] {
  const { lignes } = lignesDeSection(texte, chemin, titre);
  const debut = lignes.findIndex((ligne) => ligne.trim().startsWith('|'));
  if (debut === -1) return [];
  const bloc: string[] = [];
  for (const ligne of lignes.slice(debut)) {
    if (!ligne.trim().startsWith('|')) break;
    bloc.push(ligne);
  }
  const [entetes, , ...corps] = bloc;
  if (!entetes) return [];
  const cles = cellulesDe(entetes);
  return corps.map((ligne) => {
    const cellules = cellulesDe(ligne);
    return Object.fromEntries(cles.map((cle, index) => [cle, cellules[index] ?? '']));
  });
}

/**
 * Les sous-titres directs de la section (un niveau plus bas), chacun avec le
 * premier paragraphe qui le suit. Un sous-titre suivi d'un autre titre sans
 * texte a un paragraphe vide.
 */
export function sousTitresDe(texte: string, chemin: string, titre: string): SousTitre[] {
  const { lignes, niveau } = lignesDeSection(texte, chemin, titre);
  const sousTitres: SousTitre[] = [];
  const titres = titresDe(lignes);
  titres.forEach((sous, rang) => {
    if (sous.niveau !== niveau + 1) return;
    const suivant = titres[rang + 1];
    const corps = lignes.slice(sous.ligne + 1, suivant ? suivant.ligne : lignes.length);
    const paragraphe: string[] = [];
    for (const ligne of corps) {
      if (ligne.trim() === '') {
        if (paragraphe.length > 0) break;
        continue;
      }
      paragraphe.push(ligne.trim());
    }
    sousTitres.push({ titre: sous.texte, paragraphe: paragraphe.join(' ') });
  });
  return sousTitres;
}
