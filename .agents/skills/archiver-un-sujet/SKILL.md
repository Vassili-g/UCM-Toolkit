---
name: archiver-un-sujet
description: "Archiver le sujet d'une piste livrée de pistes.json : garder ses outils et ses faits uniques, supprimer ses autres documents après confirmation du mainteneur, figer les liens. Charger quand toutes les cases du plan d'une piste sont cochées, ou quand le mainteneur demande d'archiver un sujet."
---

# Archiver un sujet

Procédure : [recherche P25, « Archiver un sujet terminé »](../../../docs/notes/Recherches/Roadmap/RECHERCHE-ROADMAP.md#archiver-un-sujet-terminé).

1. **Calculer.** `npm run sujet:archiver -- <Pn>` rend la table `garder` / `relire` / `supprimer`, avec la raison de chaque fichier. Une piste non livrée est refusée. Un dossier partagé avec une piste vivante ne se déplace pas : seuls ses fichiers `supprimer` partent.
2. **Relire.** Lire chaque fichier `relire`. Un fait que seul ce fichier porte part dans son domicile (`npm run agents:domicile -- <fichier autorité>`), dans un commit à part. Un outil n'est jamais supprimé.
3. **Demander.** Présenter au mainteneur la table des fichiers à supprimer et à garder. Attendre sa confirmation. Sans confirmation, rien ne se supprime.
4. **Archiver**, après confirmation :
   - `C = git rev-parse --short HEAD`, commit déjà poussé ;
   - `node scripts/archiver-sujet.mjs --figer C <fichiers supprimés>` ;
   - supprimer les fichiers confirmés ;
   - passer la ligne du sujet dans la table « Archive » de `docs/notes/Recherches/README.md`, avec un lien figé sur `C` ;
   - retirer le motif du dossier de `.agents/domiciles.json` si le dossier est vide ;
   - supprimer le dossier vide : `tests/dossiersDeRecherche.test.ts` refuse un dossier sans motif. Ajouter les fichiers archivés à `.agents/documents-fermes.json` ;
   - écrire `archive: "C"` sur la piste de `pistes.json` ;
   - `npm run vues`, puis `npm test` par un `verificateur` ;
   - commiter par chemins explicites, pousser.

Borne : `docs/notes/Archives/` ne reçoit plus de dossier ; le lien figé sur `C` retrouve un document supprimé. Tests : `tests/archiverSujet.test.ts`.
