import { CAS_CONFORMES } from "./cas-conformes.mjs";
import {
  contratAvecEchantillon15,
  contratDeBase15,
  contratImbrique15,
  perte,
  renvoi,
  slotPiece,
} from "./contrats-15.mjs";

/**
 * Table des 73 mutations du contrat 15.0.
 *
 * Chaque entrée dit quel contrat de base elle modifie (`base`, une fabrique),
 * comment (`muter` modifie le contrat ; `muterTexte` modifie son texte JSON),
 * le verdict attendu et l'autorité qui le rend.
 *
 * - `verdict` vaut `{ refus: n }`, n étant le point de FORME-CONTRAT-15 §2.13 qui
 *   refuse la mutation, ou `{ admis: true }` quand le contrat reste admis.
 * - `autorite` vaut `kit` quand le JSON seul tranche. Elle vaut `dessin` quand il
 *   faut les constats du dessin : mode forcé, `SLOT` rempli, clé exposée prise,
 *   échange vers une pièce, perte de maître, identifiant direct hors instance
 *   (§2.13, dernier paragraphe).
 * - `note` dit pourquoi le point est un rattachement : le §2.13 ne numérote pas
 *   ce refus.
 *
 * 58 entrées viennent du stress test et de la contre-expertise (`source:
 * "stress-test"`), 15 de la confrontation (`source: "confrontation"`). Les
 * mutations de transfert, retirées par la convention des états (§2.12, étape 6),
 * n'y figurent pas.
 */

const cas = (id) => () => CAS_CONFORMES.find((c) => c.id === id).contrat();
const refus = (point) => ({ refus: point });
const ADMIS = { admis: true };

const SANS_POINT_PERTE = "Le §2.13 ne numérote pas ce refus ; rattaché au point 14, celui des pertes d'état.";
const SANS_POINT_ECHANTILLON = "Le §2.10 pose cet invariant d'échantillon, que le §2.13 ne refuse pas ; rattaché au point 3.";

const sansPerte = (re) => (c) => {
  c.meta.diagnostics = (c.meta.diagnostics ?? []).filter((d) => !re.test(d.message));
  if (!c.meta.diagnostics.length) {
    delete c.meta.diagnostics;
    c.meta.coverage = { portable: "complete" };
  }
};

function entree(id, base, muter, verdict, autorite, extra = {}) {
  return { id, source: "stress-test", base, muter, verdict, autorite, ...extra };
}

function confrontation(id, base, muter, verdict, autorite, extra = {}) {
  return { id, source: "confrontation", base, muter, verdict, autorite, ...extra };
}

const base = contratDeBase15;
const echantillon = contratAvecEchantillon15;

export const MUTATIONS = [
  // Renvois, slots et entrées (32 mutations de la passe finale, récrites sur la forme intégrée).
  entree("renvoi-retire", base, (c) => { delete c.variants[0].pieces; }, refus(3), "kit"),
  entree("variante-absente", base, (c) => { c.variants[0].pieces[0].variant = "9:99"; }, refus(4), "kit"),
  entree("vue-absente", base, (c) => { c.variants[0].pieces[0].view = "absente"; }, refus(4), "kit"),
  entree("slot-piece-absente", base, (c) => { c.viewStructures.h.children[0].piece = "Absent"; }, refus(1), "kit"),
  entree("piece-decrite-deux-fois", base, (c) => { c.viewStructures.h.children[0].children = [{ slot: "texte" }]; }, refus(1), "kit"),
  entree("piece-et-composes", base, (c) => { c.viewStructures.h.children[0].composes = "Icon"; }, refus(1), "kit"),
  entree("piece-flux-layout", base, (c) => { c.viewStructures.h.children[0].layout = "flex-row"; }, refus(1), "kit"),
  entree("piece-flux-padding", base, (c) => { c.viewStructures.h.children[0].padding = "{layout.gap}"; }, refus(1), "kit"),
  entree("renvoi-double", base, (c) => { c.variants[0].pieces.push(structuredClone(c.variants[0].pieces[0])); }, refus(3), "kit"),
  entree("renvoi-sans-slot", base, (c) => { c.variants[0].pieces[0].slotPath = ["absent"]; }, refus(3), "kit"),
  entree("entree-sans-occurrence", base, (c) => { c.pieces.Auvent = { ...structuredClone(c.pieces.Volet), name: ".Auvent" }; }, refus(2), "kit"),
  entree("cle-piece-fausse", base, (c) => { c.pieces.Volet.name = ".Fenetre"; }, refus(8), "kit"),
  entree("piece-meme-cle-hote", base, (c) => { c.name = "Volet"; }, refus(8), "kit"),
  entree("source-slot-absent", base, (c) => { c.props.visible.source.slotPath = ["absent"]; }, refus(7), "kit"),
  entree("source-prop-absente", base, (c) => { c.props.visible.source.prop = "absente"; }, refus(7), "kit"),
  entree("source-type-faux", base, (c) => { c.props.visible.type = "string"; }, refus(7), "kit"),
  entree("source-values-fausses", base, (c) => { c.props.visible.values = ["faux"]; }, refus(7), "kit"),
  entree("values-prop-exposee-absente", base, (c) => { delete c.variants[0].pieces[0].values; }, refus(6), "kit"),
  entree("values-prop-inexistante", base, (c) => { c.variants[0].pieces[0].values = { absente: true }; }, refus(6), "kit"),
  entree("values-manquante", base, (c) => { delete c.props; }, refus(7), "dessin", {
    note: "La prop exposée manque à l'API de l'hôte : constat du dessin, sans point numéroté ; rattaché au point 7.",
  }),
  entree("values-type-faux", base, (c) => {
    delete c.props;
    c.variants[0].pieces[0].values = { visible: "true" };
  }, refus(6), "kit"),
  entree("token-sans-placement", base, (c) => { c.variants[0].pieces[0].tokens = { background: "{theme.primary}" }; }, refus(5), "kit"),
  entree("placement-sans-token", base, (c) => {
    c.viewPaintPlacements = { pp: { fills: { background: [[]] } } };
    c.variantViews.p.paintPlacements = "pp";
  }, refus(5), "kit"),
  entree("adresse-peinture-absente", base, (c) => {
    c.viewPaintPlacements = { pp: { fills: { background: [["absent"]] } } };
    c.variantViews.p.paintPlacements = "pp";
    c.variants[0].pieces[0].tokens = { background: "{theme.primary}" };
    c.pieces.Volet.variants[0].tokens = { background: "{theme.primary}" };
  }, refus(5), "kit"),
  entree("catalogue-orphelin", base, (c) => {
    c.viewStructures.inutile = { sizing: { width: "fit-content", height: "fit-content" } };
  }, refus(10), "kit"),
  entree("source-piece-interdite-corps-initial", base, (c) => {
    c.pieces.Volet.props.visible.source = { slotPath: ["x"], prop: "visible" };
  }, refus(7), "kit"),
  entree("nodeId-vide", base, (c) => { delete c.variants[0].pieces[0].nodeId; }, refus(12), "kit", {
    note: "Le §2.13 ne refuse pas un `nodeId` absent ; rattaché au point 12, celui des identifiants d'instance.",
  }),
  entree("nodeId-hors-instance-indecidable", base, (c) => { c.variants[0].pieces[0].nodeId = "9:99"; }, ADMIS, "dessin", {
    note: "Un identifiant direct n'encode pas son parent Figma : le JSON seul ne prouve pas qu'il sort de l'hôte (§2.13, point 12).",
  }),
  entree("cycle-direct", base, (c) => {
    c.viewStructures.p.children.push(slotPiece("boucle", undefined, "Volet"));
    c.pieces.Volet.variants[0].pieces = [renvoi(["boucle"], "2:2", "2:1", "p")];
    c.variants[0].pieces[0].pieces = [renvoi(["boucle"], "I1:2;2:2", "2:1", "p")];
  }, refus(9), "kit"),
  entree("profondeur-treize", base, (c) => {
    let noeud = c.viewStructures.h;
    for (let i = 0; i < 12; i++) {
      noeud.children = [{ slot: `niveau${i}`, children: noeud.children }];
      noeud = noeud.children[0];
    }
    const chemin = [...Array.from({ length: 12 }, (_, i) => `niveau${i}`), "volet"];
    c.variants[0].pieces[0].slotPath = chemin;
    c.props.visible.source.slotPath = structuredClone(chemin);
  }, refus(9), "kit"),
  entree("collision-prop-exposee-hote-indecidable", base, (c) => { c.props.visible.default = true; }, ADMIS, "dessin", {
    note: "Une clé exposée déjà prise par une prop propre ne se décide que sur le dessin (§2.5).",
  }),
  entree("nodeId-variante-double", base, (c) => { c.pieces.Volet.variants.push(structuredClone(c.pieces.Volet.variants[0])); }, refus(4), "kit", {
    note: "Le contrôle de la 14.0 sur les `nodeId` de variantes n'a pas de point au §2.13 ; rattaché au point 4, car `renvoi.variant` désigne une variante par son `nodeId`.",
  }),

  // Échantillons de pièces (§2.10).
  entree("piece-sample-slot-absent", echantillon, (c) => { c.samples.s.pieces[0].slotPath = ["inconnu"]; }, refus(3), "kit", { note: SANS_POINT_ECHANTILLON }),
  entree("piece-sample-double", echantillon, (c) => { c.samples.s.pieces.push(structuredClone(c.samples.s.pieces[0])); }, refus(3), "kit", { note: SANS_POINT_ECHANTILLON }),
  entree("piece-sample-sans-ecart", echantillon, (c) => { c.samples.s.pieces[0] = { slotPath: ["volet"] }; }, refus(3), "kit", { note: SANS_POINT_ECHANTILLON }),
  entree("piece-sample-args-boolean", echantillon, (c) => { c.samples.s.pieces[0].args.visible = true; }, refus(3), "kit", { note: SANS_POINT_ECHANTILLON }),
  entree("piece-sample-args-expose", echantillon, (c) => {
    c.props.contenu = { type: "string", source: { slotPath: ["volet"], prop: "contenu" } };
  }, refus(3), "kit", { note: SANS_POINT_ECHANTILLON }),
  entree("piece-sample-texte-adresse-absente", echantillon, (c) => { c.samples.s.pieces[0].text[0].slotPath = ["inconnu"]; }, refus(3), "kit", { note: SANS_POINT_ECHANTILLON }),
  entree("piece-sample-texte-valeur-fausse", echantillon, (c) => { c.samples.s.pieces[0].text[0].value = false; }, refus(3), "kit", { note: SANS_POINT_ECHANTILLON }),
  entree("piece-sample-composes-adresse-absente", echantillon, (c) => {
    c.samples.s.pieces[0].composes = [{ slotPath: ["inconnu"], component: "Icon", figmaLayer: "Icon" }];
  }, refus(3), "kit", { note: SANS_POINT_ECHANTILLON }),
  entree("piece-sample-imbrique-sans-renvoi", echantillon, (c) => {
    c.samples.s.pieces[0].pieces = [{ slotPath: ["inconnu"], text: [{ slotPath: [], value: "Texte" }] }];
  }, refus(3), "kit", { note: SANS_POINT_ECHANTILLON }),

  // Sources et pertes de sélection des réponses 1 à 3 du stress test.
  entree("source-intermediaire-absente", cas("codex-Q-source-deux-niveaux"), (c) => { delete c.pieces.Coque.props.format; }, refus(7), "kit"),
  entree("source-terminale-absente", cas("codex-Q-source-deux-niveaux"), (c) => { delete c.pieces.Perle.props.format; }, refus(7), "kit"),
  entree("source-terminale-type-faux", cas("codex-Q-source-deux-niveaux"), (c) => { c.pieces.Perle.props.format.type = "boolean"; }, refus(7), "kit"),
  entree("source-terminale-valeurs-fausses", cas("codex-Q-source-deux-niveaux"), (c) => { c.pieces.Perle.props.format.values = ["unique"]; }, refus(7), "kit"),
  entree("source-component-sur-piece", cas("codex-Q-source-deux-niveaux"), (c) => { c.props.format.source.component = "Coque"; }, refus(7), "kit"),
  entree("source-component-absent", cas("codex-Q-dependance-exposee"), (c) => { delete c.pieces.Coque.props.motif.source.component; }, refus(7), "kit"),
  entree("source-component-faux", cas("codex-Q-dependance-exposee"), (c) => { c.pieces.Coque.props.motif.source.component = "Autre"; }, refus(7), "kit"),
  entree("source-prop-publique-absente", cas("codex-Q-dependance-exposee"), (c) => { c.pieces.Coque.props.motif.source.prop = "absente"; }, refus(7), "kit"),
  entree("source-dependance-type-faux", cas("codex-Q-dependance-exposee"), (c) => { c.pieces.Coque.props.motif.type = "boolean"; }, refus(7), "kit"),
  ...["double", "absente"].map((suite) =>
    entree(`variante-${suite}-perte-retiree`, cas(`codex-Q-variante-${suite}`), (c) => {
      delete c.meta.diagnostics;
      c.meta.coverage.portable = "complete";
    }, refus(14), "kit", { note: SANS_POINT_PERTE }),
  ),
  ...["double", "absente"].map((suite) =>
    entree(`variante-${suite}-perte-voisine`, cas(`codex-Q-variante-${suite}`), (c) => {
      for (const d of c.meta.diagnostics) d.contractPath = "variants[10].pieces[0]";
    }, refus(14), "kit", { note: SANS_POINT_PERTE }),
  ),
  entree("perte-width-ne-couvre-pas-selection", cas("codex-Q-variante-absente"), (c) => {
    for (const d of c.meta.diagnostics) d.message = "width manque dans ce renvoi.";
  }, refus(14), "kit", { note: SANS_POINT_PERTE }),
  entree("perte-width-ne-couvre-pas-swap", cas("codex-Q-swap-illisible"), (c) => {
    for (const d of c.meta.diagnostics) d.message = "width manque dans ce renvoi.";
  }, refus(6), "kit"),

  // Limites : ce que le JSON décodé ne montre plus, ou ce qu'une chaîne d'identifiants prouve.
  entree("chaine-imbriquee-hors-parent", contratImbrique15, (c) => {
    c.variants[0].pieces[0].pieces[0].nodeId = "I9:99;2:2";
  }, refus(12), "kit"),
  {
    ...entree("cle-json-repetee", base, undefined, refus(13), "kit"),
    muterTexte: (texte) => texte.replace('"name":".Volet"', '"name":".Volet","name":".Autre"'),
  },

  // Les 15 de la confrontation.
  confrontation("mode-force-perte-retiree", cas("M-E04-mode-force"), sansPerte(/explicitVariableModes/), refus(14), "dessin", {
    note: "Un mode forcé efficace sans perte : constat du dessin, sans point numéroté ; rattaché au point 14.",
  }),
  confrontation("mode-inerte-perte-ajoutee", cas("M-E04b-mode-inerte"), (c) => {
    c.meta.coverage = { portable: "partial" };
    c.meta.diagnostics = [perte("variants[0].pieces[0]", "explicitVariableModes force un mode de variable sur l’occurrence.")];
  }, refus(14), "dessin", {
    note: "Une perte de mode sans variable liée de sa collection : constat du dessin, sans point numéroté ; rattaché au point 14.",
  }),
  confrontation("slot-rempli-perte-retiree", cas("M-A03-slot-rempli"), sansPerte(/SLOT/), refus(14), "dessin", {
    note: "Un `SLOT` de pièce rempli sans perte : constat du dessin, sans point numéroté ; rattaché au point 14.",
  }),
  confrontation("cles-prefixees-retirees", cas("M-E03-deux-instances-exposees"), (c) => {
    for (const [cle, p] of Object.entries(c.props)) {
      if (p.source && JSON.stringify(p.source.slotPath) === '["piece-2"]') delete c.props[cle];
    }
  }, refus(7), "dessin", {
    note: "Une prop d'instance exposée absente de l'API : constat du dessin, sans point numéroté ; rattaché au point 7.",
  }),
  confrontation("seconde-instance-premiere-cle", cas("M-E03-deux-instances-exposees"), (c) => {
    for (const p of Object.values(c.props)) {
      if (p.source && JSON.stringify(p.source.slotPath) === '["piece-2"]') p.source.prop = "absente";
    }
  }, refus(7), "kit"),
  confrontation("appariement-perte-retiree", cas("A13c-appariement-ambigu"), sansPerte(/appariement/i), refus(14), "kit"),
  confrontation("matrice-clairsemee-perte-retiree", cas("M-A18-matrice-clairsemee"), sansPerte(/sélection/i), refus(14), "kit", { note: SANS_POINT_PERTE }),
  confrontation("coordonnees-repetees-perte-retiree", cas("M-A19-coordonnees-repetees"), sansPerte(/sélection/i), refus(14), "kit", { note: SANS_POINT_PERTE }),
  confrontation("valeur-posee-retiree-de-values", cas("E07-valeur-par-variant"), (c) => { delete c.variants[1].pieces[0].values; }, refus(6), "kit"),
  confrontation("echange-perte-retiree", cas("A04b-echange-expose-vers-piece"), sansPerte(/échange/), refus(14), "dessin", {
    note: "Un échange vers une pièce sans perte : constat du dessin, sans point numéroté ; rattaché au point 14.",
  }),
  confrontation("perte-regroupee-nombre-faux", cas("D10-perte-regroupee"), (c) => {
    c.meta.diagnostics[0].message = c.meta.diagnostics[0].message.replace("3 variantes", "4 variantes");
  }, refus(15), "kit"),
  confrontation("perte-regroupee-adresse-retiree", cas("D10-perte-regroupee"), (c) => { delete c.meta.diagnostics[0].slotPath; }, refus(15), "kit"),
  confrontation("perte-regroupee-retiree", cas("D10-perte-regroupee"), sansPerte(/strokeWeight/), refus(15), "dessin", {
    note: "Une perte de maître ni publiée seule ni couverte par sa classe : constat du dessin ; rattaché au point 15.",
  }),
  confrontation("temoin-e07-sans-valeur-posee", cas("E07-valeur-par-variant"), (c) => {
    for (const v of c.variants) for (const r of v.pieces) delete r.values;
  }, refus(6), "kit"),
  confrontation("temoin-e03-collision-par-perte", cas("M-E03-deux-instances-exposees"), (c) => {
    for (const [cle, p] of Object.entries(c.props)) {
      if (p.source && JSON.stringify(p.source.slotPath) === '["piece-2"]') {
        delete c.props[cle];
        c.meta.coverage = { portable: "partial" };
        (c.meta.diagnostics ??= []).push(
          perte(`props.${p.source.prop}`, `L’instance exposée du slot piece-2 présente aussi la clé ${p.source.prop}, déjà prise par piece (collision).`),
        );
      }
    }
  }, refus(7), "dessin", {
    note: "Une collision de clé se corrige par le préfixe, jamais par une perte : constat du dessin, sans point numéroté ; rattaché au point 7.",
  }),
];
