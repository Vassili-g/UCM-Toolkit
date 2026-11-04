/** Le fichier proposé au designer, par un lien vers un blob ; rien ne quitte le poste. */
export function telecharger(nom: string, contenu: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nom;
  document.body.append(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Le nom du rapport d'analyse du mode Tokens. */
export const nomDuRapportDeTokens = (date: Date): string =>
  `ucm-architect-rapport-tokens-${date.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;

/** Le contenu du rapport du mode Tokens : les mesures du sandbox (`mesuresDuModeTokens`), sans nom de variable. */
export const contenuDuRapportDeTokens = (mesures: unknown, date: Date): string =>
  JSON.stringify({ version: 1, mode: 'tokens', date: date.toISOString(), mesures });
