/**
 * Fabriques de contrats 15.0 du banc des pièces internes.
 *
 * Elles écrivent un contrat valide en quelques lignes, avant que le moteur ne
 * publie la 15.0. `meta.contractVersion` vaut « 15.0 » en dur : le kit reste en
 * 14.0 jusqu'au lot 5.9, donc ces contrats n'emploient pas `CONTRACT_VERSION`.
 * Aucun contrat n'a de `structure.sizes` (FORME-CONTRAT-15, §2.6).
 *
 * Chaque appel rend un objet neuf : un test peut le modifier sans effet sur le
 * suivant. Les noms (`Hublot`, `.Volet`, `Groupe`, `.Segment`) sont inventés.
 */

export const VERSION_15 = "15.0";

const CODE_PERTE = "UCM_PORTABLE_PROJECTION_WARNING";

function copie(valeur) {
  return structuredClone(valeur);
}

/**
 * Vue d'un composant : flux en ligne, dimensions au contenu, enfants et champs
 * en plus. `champs` remplace `layout` et `sizing` quand il les donne.
 */
export function boite(enfants, champs = {}) {
  const vue = { layout: "flex-row", sizing: { width: "fit-content", height: "fit-content" } };
  if (enfants) vue.children = enfants;
  return Object.assign(vue, copie(champs));
}

/** Slot qui porte une pièce : seulement `slot`, `figmaLayer` et `piece` (§2.3). */
export function slotPiece(slot, figmaLayer, piece, champs = {}) {
  return { slot, ...(figmaLayer ? { figmaLayer } : {}), piece, ...copie(champs) };
}

/** Renvoi d'une occurrence (§2.4). `champs` : `values`, `tokens`, `strokes`, `pieces`. */
export function renvoi(slotPath, nodeId, variant, vue, champs = {}) {
  return { slotPath, nodeId, variant, view: vue, ...copie(champs) };
}

/** Variante d'un set. `valeurs` absent : la variante n'écrit pas `values`. */
export function variante(nodeId, valeurs, vue, champs = {}) {
  return { nodeId, ...(valeurs === undefined ? {} : { values: valeurs }), view: vue, ...copie(champs) };
}

/** Entrée de `pieces` (§2.2). `structure` : `{ view, variantAxes? }`. */
export function entree(name, nodeId, structure, variants, champs = {}) {
  return { name, nodeId, ...copie(champs), variants, structure };
}

/** Perte de projection (§2.11) à son chemin du JSON publié. */
export function perte(contractPath, message, champs = {}) {
  return { code: CODE_PERTE, severity: "warning", message, contractPath, ...copie(champs) };
}

/**
 * Perte de maître regroupée (§2.11) : `slotPath`, `figma.property` et un message
 * qui finit par « Dans N variantes. ».
 */
export function perteRegroupee(contractPath, slotPath, propriete, detail, nombre) {
  return perte(
    contractPath,
    `${propriete} manque à l'adresse ${JSON.stringify(slotPath)}. ${detail} Dans ${nombre} variantes.`,
    { slotPath, figma: { property: propriete } },
  );
}

/** Déclare des pertes : la couverture portable devient `partial`. */
export function avecPertes(contrat, pertes) {
  contrat.meta.coverage = { portable: "partial" };
  contrat.meta.diagnostics = [...(contrat.meta.diagnostics ?? []), ...pertes];
  return contrat;
}

/**
 * Contrat 15.0 vide de pièces. `champs` remplace les champs de premier niveau ;
 * `meta` se fusionne dans les métadonnées ; `pertes` déclare des pertes (la
 * couverture portable devient `partial`).
 */
export function contrat15(champs = {}) {
  const { meta, pertes, ...reste } = copie(champs);
  const contrat = {
    name: "Hublot",
    meta: {
      contractVersion: VERSION_15,
      exportedAt: "2026-11-27T00:00:00.000Z",
      coverage: { portable: "complete" },
      figma: { fileName: "Fichier inventé", nodeId: "1:0" },
      ...meta,
    },
    viewStructures: {},
    variantViews: {},
    variants: [],
    structure: { view: "h" },
    rendering: { roles: {} },
    ...reste,
  };
  return pertes ? avecPertes(contrat, pertes) : contrat;
}

/**
 * Contrat de base des mutations : l'hôte `Hublot` pose la pièce `.Volet` par un
 * slot `piece`. La pièce expose sa prop `visible` (boolean), et le renvoi porte
 * sa valeur posée.
 */
export function contratDeBase15() {
  return contrat15({
    props: { visible: { type: "boolean", source: { slotPath: ["volet"], prop: "visible" } } },
    viewStructures: {
      h: boite([slotPiece("volet", undefined, "Volet")]),
      p: boite([{ slot: "texte", visibilityProp: "visible" }]),
    },
    variantViews: { h: { structure: "h" }, p: { structure: "p" } },
    variants: [
      variante("1:1", undefined, "h", {
        pieces: [renvoi(["volet"], "1:2", "2:1", "p", { values: { visible: true } })],
      }),
    ],
    pieces: {
      Volet: entree(".Volet", "2:0", { view: "p" }, [variante("2:1", undefined, "p")], {
        props: { visible: { type: "boolean" } },
      }),
    },
  });
}

/** `contratDeBase15` avec un échantillon d'occurrence (§2.10) et un texte non exposé. */
export function contratAvecEchantillon15() {
  const contrat = contratDeBase15();
  contrat.pieces.Volet.props.contenu = { type: "string" };
  contrat.samples = {
    s: {
      pieces: [
        {
          slotPath: ["volet"],
          args: { contenu: "Autre texte" },
          text: [{ slotPath: ["texte"], value: "Autre texte" }],
        },
      ],
    },
  };
  contrat.variants[0].sample = "s";
  return contrat;
}

/** `contratDeBase15` avec une pièce `.Perle` posée dans `.Volet` (renvoi imbriqué, §2.4). */
export function contratImbrique15() {
  const contrat = contratDeBase15();
  contrat.viewStructures.p.children.push(slotPiece("perle", undefined, "Perle"));
  contrat.viewStructures.q = boite();
  contrat.variantViews.q = { structure: "q" };
  contrat.pieces.Perle = entree(".Perle", "3:0", { view: "q" }, [variante("3:1", undefined, "q")]);
  contrat.pieces.Volet.variants[0].pieces = [renvoi(["perle"], "2:2", "3:1", "q")];
  contrat.variants[0].pieces[0].pieces = [renvoi(["perle"], "I1:2;2:2", "3:1", "q")];
  return contrat;
}

/**
 * Contrat qui exerce chaque champ nouveau de la 15.0 : slot `piece`, renvois
 * (`slotPath`, `nodeId`, `variant`, `values`, `view`, `tokens`, `strokes`,
 * `pieces` imbriqués), props exposées avec `source`, clés préfixées de la
 * seconde instance, `samples[].pieces`, et une perte regroupée.
 *
 * `Groupe` pose deux `.Segment`, dont la seconde expose sa prop `selected` sous
 * la clé préfixée `segment2Selected` (§2.5). `.Segment` pose une `.Pastille`.
 * Les couleurs de l'hôte sur la première occurrence vivent dans son renvoi.
 */
export function contratRiche15() {
  const etats = {
    axis: "state",
    states: { default: {}, hover: { selector: ":hover" } },
    precedence: ["hover", "default"],
  };
  return contrat15({
    name: "Groupe",
    props: {
      selected: { type: "boolean", default: false, source: { slotPath: ["segment"], prop: "selected" } },
      segment2Selected: {
        type: "boolean",
        default: false,
        source: { slotPath: ["segment-2"], prop: "selected" },
      },
    },
    viewStructures: {
      h: boite([
        slotPiece("segment", ".Segment", "Segment"),
        slotPiece("segment-2", ".Segment", "Segment"),
      ]),
      s: boite([slotPiece("pastille", ".Pastille", "Pastille"), { slot: "cadre", figmaLayer: "Cadre" }]),
      q: boite(),
    },
    variantViews: {
      h: { structure: "h" },
      s: { structure: "s", paintPlacements: "s" },
      q: { structure: "q" },
    },
    viewPaintPlacements: { s: { fills: { background: [["cadre"]] }, strokes: { border: [["cadre"]] } } },
    variants: [
      variante("1:1", {}, "h", {
        sample: "g",
        pieces: [
          renvoi(["segment"], "1:2", "2:1", "s", {
            values: { selected: true },
            tokens: { background: "{groupe.segment.fond}" },
            strokes: { border: { width: "{groupe.segment.contour}" } },
            pieces: [renvoi(["pastille"], "I1:2;2:3", "3:1", "q")],
          }),
          renvoi(["segment-2"], "1:3", "2:1", "s", {
            values: { selected: false },
            tokens: { background: "{groupe.segment.fond.repos}" },
            strokes: { border: { width: "{groupe.segment.contour}" } },
            pieces: [renvoi(["pastille"], "I1:3;2:3", "3:1", "q")],
          }),
        ],
      }),
    ],
    structure: { view: "h" },
    samples: {
      g: {
        pieces: [
          { slotPath: ["segment"], text: [{ slotPath: ["cadre"], value: "Un" }], pieces: [{ slotPath: ["pastille"], text: [{ slotPath: [], value: "1" }] }] },
        ],
      },
    },
    pieces: {
      Segment: entree(
        ".Segment",
        "2:0",
        { view: "s", variantAxes: ["state"] },
        [
          variante("2:1", { state: "default" }, "s", {
            tokens: { background: "{groupe.segment.fond}" },
            strokes: { border: { width: "{groupe.segment.contour}" } },
            pieces: [renvoi(["pastille"], "2:3", "3:1", "q")],
          }),
          variante("2:2", { state: "hover" }, "s", {
            tokens: { background: "{groupe.segment.fond.survol}" },
            strokes: { border: { width: "{groupe.segment.contour}" } },
            pieces: [renvoi(["pastille"], "2:4", "3:1", "q")],
          }),
        ],
        {
          props: {
            selected: { type: "boolean", default: false },
            state: { type: "enum", values: ["default", "hover"] },
          },
          stateModel: etats,
        },
      ),
      Pastille: entree(".Pastille", "3:0", { view: "q" }, [variante("3:1", {}, "q")]),
    },
    pertes: [
      perteRegroupee(
        "pieces.Segment.variants",
        ["cadre"],
        "strokeWeight",
        "La capture porte un contour dont le contrat omet la largeur.",
        2,
      ),
    ],
  });
}

/** Les contrats de base des mutations, par nom. */
export const BASES_15 = {
  base: contratDeBase15,
  echantillon: contratAvecEchantillon15,
  imbrique: contratImbrique15,
  riche: contratRiche15,
};
