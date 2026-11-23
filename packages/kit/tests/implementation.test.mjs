/**
 * L'existence d'une implémentation, sans rien savoir du langage.
 */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import test from "node:test";
import {
  cheminImplementation,
  etatDeLImplementation,
  identifiantDuContrat,
  implementationPresente,
} from "@ucm-kit/core/lecteurs";
import { MOTIF_IMPLEMENTATION_PAR_DEFAUT } from "@ucm-kit/core/format";

/** Un chemin attendu, écrit avec les séparateurs de la plateforme hôte. */
const chemin = (...segments) => segments.join(sep);

test("l'identifiant d'un contrat est son nom de base, sans le suffixe", () => {
  assert.equal(identifiantDuContrat("src/components/Button/Button.contract.json"), "Button");
  assert.equal(identifiantDuContrat("Alert.contract.json"), "Alert");
});

test("le motif par défaut place l'implémentation à côté de son contrat", () => {
  assert.equal(
    cheminImplementation("src/components/Button/Button.contract.json"),
    chemin("src", "components", "Button", "Button.tsx"),
  );
});

test("une cible non-React se décrit par son seul motif", () => {
  // Le point de toute la tâche : aucune de ces deux cibles n'écrit de `.tsx`,
  // et le noyau les sert sans connaître ni Swift ni Kotlin.
  assert.equal(
    cheminImplementation("contracts/Button.contract.json", "Sources/UI/{id}.swift"),
    chemin("Sources", "UI", "Button.swift"),
  );
  assert.equal(
    cheminImplementation("ui/Alert.contract.json", "{dir}/{id}.kt"),
    chemin("ui", "Alert.kt"),
  );
});

test("un motif qui répète un jeton le remplace partout", () => {
  // `replaceAll` et non `replace` : un motif `{id}/{id}.ts` est plausible pour
  // une cible qui range chaque composant dans son propre dossier, et un seul
  // remplacement y laisserait un `{id}` littéral dans le chemin.
  assert.equal(
    cheminImplementation("c/Card.contract.json", "{dir}/{id}/{id}.ts"),
    chemin("c", "Card", "Card.ts"),
  );
});

test("l'existence répond oui quand le fichier que le motif nomme est là", () => {
  const vus = [];
  const present = implementationPresente("src/Button.contract.json", {
    lister: (dossier) => {
      vus.push(dossier);
      return ["Button.tsx", "Button.contract.json"];
    },
  });
  assert.equal(present, true);
  // La question posée au disque est bien celle du motif, et une seule fois :
  // sans cette assertion, une implémentation qui chercherait à tâtons
  // plusieurs extensions passerait ce test sans qu'on le sache.
  assert.deepEqual(vus, ["src"]);
});

test("l'existence répond non quand il ne l'est pas, et ne devine rien", () => {
  assert.equal(
    implementationPresente("src/Button.contract.json", { lister: () => [] }),
    false,
  );
});

test("le motif choisi est celui que l'existence interroge", () => {
  const vus = [];
  const etat = etatDeLImplementation("contracts/Tile.contract.json", {
    motif: "Sources/{id}.swift",
    lister: (dossier) => {
      vus.push(dossier);
      return ["Tile.swift"];
    },
  });
  assert.deepEqual(vus, ["Sources"]);
  assert.deepEqual(etat, { presente: true });
});

test("K1 : un fichier sous une autre casse n'est pas présent, et l'état nomme celui qui existe", () => {
  const etat = etatDeLImplementation("src/Button.contract.json", {
    motif: "{dir}/{id}.tsx",
    lister: () => ["button.tsx", "Button.contract.json"],
  });
  assert.deepEqual(etat, { presente: false, autreCasse: "button.tsx" });
  assert.equal(implementationPresente("src/Button.contract.json", { lister: () => ["button.tsx"] }), false);
});

test("K2 : le disque rend le même état que la plateforme ignore la casse ou non", () => {
  // `existsSync` répondait vrai pour `Button.tsx` sous Windows et macOS, faux
  // sous Linux. Le dossier se liste : la réponse ne dépend plus du système.
  const racine = mkdtempSync(join(tmpdir(), "ucm-casse-"));
  try {
    writeFileSync(join(racine, "button.tsx"), "");
    const contrat = join(racine, "Button.contract.json");
    assert.deepEqual(etatDeLImplementation(contrat), { presente: false, autreCasse: "button.tsx" });
    assert.equal(implementationPresente(contrat), false);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
  // Un dossier où le nom exact est écrit est présent. Les deux fichiers ne
  // cohabitent pas dans un même dossier sous Windows, d'où deux dossiers.
  const exacte = mkdtempSync(join(tmpdir(), "ucm-casse-"));
  try {
    writeFileSync(join(exacte, "Button.tsx"), "");
    assert.deepEqual(etatDeLImplementation(join(exacte, "Button.contract.json")), { presente: true });
  } finally {
    rmSync(exacte, { recursive: true, force: true });
  }
});

test("K3 : le nom exact est présent ; aucun fichier ni dossier donne une absence", () => {
  assert.deepEqual(
    etatDeLImplementation("src/Button.contract.json", { lister: () => ["Button.tsx"] }),
    { presente: true },
  );
  assert.deepEqual(etatDeLImplementation("src/Button.contract.json", { lister: () => [] }), { presente: false });
  assert.deepEqual(etatDeLImplementation(join(tmpdir(), "ucm-dossier-inexistant", "Button.contract.json")), { presente: false });
});

test("le motif par défaut est publié, pour qu'un appelant puisse le citer", () => {
  assert.equal(MOTIF_IMPLEMENTATION_PAR_DEFAUT, "{dir}/{id}.tsx");
});

test("un motif qui n’est pas du texte est refusé, en nommant le coupable", () => {
  // Le cas réel, et il n'est pas théorique : `contrats.map(cheminDuComposant)`
  // passe l'index de `map` en second argument. Sans ce refus, la panne était un
  // `replaceAll is not a function` levé dans le kit pour une faute commise chez
  // le consommateur : le pire endroit où lire un message d'erreur.
  assert.throws(
    () => cheminImplementation("src/Button.contract.json", 0),
    (erreur) => erreur instanceof TypeError && /map/.test(erreur.message),
  );
});
