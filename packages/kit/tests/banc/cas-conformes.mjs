import {
  boite,
  contrat15,
  entree,
  perte,
  renvoi,
  slotPiece,
  variante,
} from "./contrats-15.mjs";

/**
 * Les contrats attendus des cas nommés de la confrontation, écrits avec les
 * fabriques. Un cas `accepte` est un contrat conforme à la forme ; un cas `refus`
 * ne l'est pas, et `point` dit le point du §2.13 qui le refuse. Aucune perte de
 * transfert (§2.12, étape 6) : seules restent la sélection non unique et
 * l'appariement ambigu. `ref` nomme le point du dessin que le cas éprouve.
 */
export const CAS_CONFORMES = [
  {
    id: "A04b-echange-expose-vers-piece",
    ref: "A04b, décision 11",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Vitrine",
      props: { glyphe: { type: "instance-swap", source: { slotPath: ["cadre"], prop: "glyphe" } } },
      viewStructures: {
        h: boite([slotPiece("cadre", ".Cadre", "Cadre")]),
        p: boite([{ slot: "signe", figmaLayer: "Signe", composes: "Signe" }]),
      },
      variantViews: { h: { structure: "h" }, p: { structure: "p" } },
      variants: [
        variante("1:1", {}, "h", {
          pieces: [renvoi(["cadre"], "1:2", "2:1", "p", { values: { glyphe: "Signe" } })],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Cadre: entree(".Cadre", "2:0", { view: "p" }, [variante("2:1", {}, "p")], {
          props: { glyphe: { type: "instance-swap" } },
          composes: [{ component: "Signe", figmaLayer: "Signe" }],
        }),
      },
      pertes: [
        perte(
          "props.glyphe",
          "L'échange exposé glyphe peut désigner la pièce .Pastille, dont le contrat ne décrit pas la vue à ce slot.",
        ),
      ],
    }),
  },
  {
    id: "A05-boucle-indirecte",
    ref: "A05",
    attendu: "refus",
    point: 9,
    contrat: () => contrat15({
      name: "Boucle",
      props: {},
      viewStructures: {
        h: boite([slotPiece("a", ".A", "A")]),
        pa: boite([slotPiece("b", ".B", "B")]),
        pb: boite([slotPiece("a", ".A", "A")]),
      },
      variantViews: { h: { structure: "h" }, a: { structure: "pa" }, b: { structure: "pb" } },
      variants: [
        variante("1:1", {}, "h", {
          pieces: [
            renvoi(["a"], "1:2", "2:1", "a", {
              pieces: [
                renvoi(["b"], "I1:2;3:2", "3:1", "b", {
                  pieces: [renvoi(["a"], "I1:2;3:2;2:2", "2:1", "a")],
                }),
              ],
            }),
          ],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        A: entree(".A", "2:0", { view: "pa" }, [
          variante("2:1", {}, "a", { pieces: [renvoi(["b"], "3:2", "3:1", "b")] }),
        ]),
        B: entree(".B", "3:0", { view: "pb" }, [
          variante("3:1", {}, "b", { pieces: [renvoi(["a"], "2:3", "2:1", "a")] }),
        ]),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
    }),
  },
  {
    id: "A13b-noms-differents-meme-adresse",
    ref: "E08, A13b",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Vitrine",
      props: {},
      viewStructures: {
        h: boite([slotPiece("carte", ".Carte", "Carte")]),
        pd: boite([
          { slot: "label", figmaLayer: "Titre" },
          { slot: "label-2", figmaLayer: "Sous-titre" },
        ]),
        ph: boite([{ slot: "label", figmaLayer: "Sous-titre" }]),
      },
      viewPaintPlacements: { pp: { fills: { foreground: [["label"]] } } },
      variantViews: {
        h: { structure: "h" },
        d: { structure: "pd", paintPlacements: "pp" },
        o: { structure: "ph", paintPlacements: "pp" },
      },
      variants: [
        variante("1:1", {}, "h", {
          pieces: [
            renvoi(["carte"], "1:2", "2:1", "d", {
              tokens: { foreground: "{components.hote.titre}" },
            }),
          ],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Carte: entree(
          ".Carte",
          "2:0",
          { view: "pd", variantAxes: ["state"] },
          [
            variante("2:1", { state: "default" }, "d", {
              tokens: { foreground: "{components.hote.carte.texte}" },
            }),
            variante("2:2", { state: "hover" }, "o", {
              tokens: { foreground: "{components.hote.carte.texte}" },
            }),
          ],
          {
            props: { state: { type: "enum", values: ["default", "hover"] } },
            stateModel: {
              axis: "state",
              states: { default: {}, hover: { selector: ":hover" } },
              precedence: ["hover", "default"],
            },
          },
        ),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
    }),
  },
  {
    id: "A13c-appariement-ambigu",
    ref: "décision 1, appariement ambigu",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Vitrine",
      props: {},
      viewStructures: {
        h: boite([slotPiece("carte", ".Carte", "Carte")]),
        p: boite([{ slot: "label", figmaLayer: "Texte" }, { slot: "label-2", figmaLayer: "Texte" }]),
      },
      viewPaintPlacements: {
        a: { fills: { foreground: [["label"], ["label-2"]] } },
        b: { fills: { foreground: [["label"]], accent: [["label-2"]] } },
      },
      variantViews: {
        h: { structure: "h" },
        d: { structure: "p", paintPlacements: "a" },
        o: { structure: "p", paintPlacements: "b" },
      },
      variants: [
        variante("1:1", {}, "h", {
          pieces: [
            renvoi(["carte"], "1:2", "2:1", "o", {
              tokens: { foreground: "{components.vitrine.texte}", accent: "{components.vitrine.second}" },
            }),
          ],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Carte: entree(
          ".Carte",
          "2:0",
          { view: "p", variantAxes: ["state"] },
          [
            variante("2:1", { state: "default" }, "d", {
              tokens: { foreground: "{components.vitrine.texte}" },
            }),
            variante("2:2", { state: "hover" }, "d", {
              tokens: { foreground: "{components.vitrine.texte}" },
            }),
          ],
          {
            props: { state: { type: "enum", values: ["default", "hover"] } },
            stateModel: {
              axis: "state",
              states: { default: {}, hover: { selector: ":hover" } },
              precedence: ["hover", "default"],
            },
          },
        ),
      },
      pertes: [
        perte(
          "variants[0].pieces[0]",
          "fills du second calque Texte : deux calques frères portent ce nom, l'appariement de Figma n'est pas certain.",
        ),
      ],
    }),
  },
  {
    id: "BX-exposition-partielle",
    ref: "décision 1, exposition partielle",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Vitrine",
      props: {},
      viewStructures: {
        h: boite([slotPiece("carte", ".Carte", "Carte")]),
        pd: boite([slotPiece("puce", ".Puce", "Puce")]),
        ph: boite(),
        q: boite(),
      },
      variantViews: {
        h: { structure: "h" },
        d: { structure: "pd" },
        o: { structure: "ph" },
        q: { structure: "q" },
      },
      variants: [
        variante("1:1", {}, "h", {
          pieces: [
            renvoi(["carte"], "1:2", "2:1", "d", {
              values: { voir: true },
              pieces: [renvoi(["puce"], "I1:2;2:3", "3:1", "q", { values: { voir: true } })],
            }),
          ],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Carte: entree(
          ".Carte",
          "2:0",
          { view: "pd", variantAxes: ["state"] },
          [
            variante("2:1", { state: "default" }, "d", {
              pieces: [renvoi(["puce"], "2:3", "3:1", "q", { values: { voir: true } })],
            }),
            variante("2:2", { state: "hover" }, "o"),
          ],
          {
            props: {
              state: { type: "enum", values: ["default", "hover"] },
              voir: { type: "boolean", default: true, source: { slotPath: ["puce"], prop: "voir" } },
            },
            stateModel: {
              axis: "state",
              states: { default: {}, hover: { selector: ":hover" } },
              precedence: ["hover", "default"],
            },
          },
        ),
        Puce: entree(".Puce", "3:0", { view: "q" }, [variante("3:1", {}, "q")], {
          props: { voir: { type: "boolean", default: true } },
        }),
      },
      pertes: [
        perte(
          "pieces.Carte.props.voir",
          "L'instance exposée .Puce manque à la variante hover (L6).",
        ),
      ],
    }),
  },
  {
    id: "D10-perte-regroupee",
    ref: "décision 10",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Rangee",
      props: {},
      viewStructures: {
        h: boite([slotPiece("case", ".Case", "Case")]),
        p: boite([{ slot: "cadre", figmaLayer: "Cadre" }]),
        p2: boite(),
      },
      variantViews: { h: { structure: "h" }, p: { structure: "p" }, p2: { structure: "p2" } },
      variants: [variante("1:1", {}, "h", { pieces: [renvoi(["case"], "1:2", "2:1", "p")] })],
      structure: { view: "h" },
      pieces: {
        Case: entree(
          ".Case",
          "2:0",
          { view: "p", variantAxes: ["taille"] },
          [
            variante("2:1", { taille: "s" }, "p"),
            variante("2:2", { taille: "m" }, "p"),
            variante("2:3", { taille: "l" }, "p"),
            variante("2:4", { taille: "xl" }, "p2"),
          ],
          { props: { taille: { type: "enum", values: ["s", "m", "l", "xl"] } } },
        ),
      },
      pertes: [
        perte(
          "pieces.Case.variants",
          "strokeWeight manque à l'adresse [\"cadre\"]. La largeur du contour n'a pas de variable. Dans 3 variantes.",
          { slotPath: ["cadre"], figma: { property: "strokeWeight" } },
        ),
      ],
    }),
  },
  {
    id: "E05-apercu-atteint-par-un-etat",
    ref: "E05, A21, décision 5",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Vitrine",
      props: {},
      viewStructures: {
        h: boite([slotPiece("a", ".Carte", "Carte"), slotPiece("b", ".Carte", "Carte")]),
        pd: boite([{ slot: "label", figmaLayer: "Texte" }]),
        ph: boite([{ slot: "label", figmaLayer: "Texte" }, { slot: "halo", figmaLayer: "Halo" }]),
      },
      viewPaintPlacements: {
        ppd: { fills: { background: [[]] } },
        pphh: { fills: { background: [[]], halo: [["halo"]] } },
      },
      variantViews: {
        h: { structure: "h" },
        d: { structure: "pd", paintPlacements: "ppd" },
        oh: { structure: "ph", paintPlacements: "pphh" },
      },
      variants: [
        variante("1:1", {}, "h", {
          pieces: [
            renvoi(["a"], "1:2", "2:2", "oh", {
              tokens: { background: "{components.hote.carte.hover.fond}", halo: "{components.hote.halo}" },
            }),
            renvoi(["b"], "1:3", "2:1", "d", {
              tokens: { background: "{components.hote.carte.default.fond}" },
            }),
          ],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Carte: entree(
          ".Carte",
          "2:0",
          { view: "pd", variantAxes: ["state"] },
          [
            variante("2:1", { state: "default" }, "d", {
              tokens: { background: "{components.hote.carte.default.fond}" },
            }),
            variante("2:2", { state: "hover" }, "oh", {
              tokens: { background: "{components.hote.carte.hover.fond}", halo: "{primitives.grey.300}" },
            }),
          ],
          {
            props: { state: { type: "enum", values: ["default", "hover"] } },
            stateModel: {
              axis: "state",
              states: { default: {}, hover: { selector: ":hover" } },
              precedence: ["hover", "default"],
            },
          },
        ),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
    }),
  },
  {
    id: "E07-valeur-par-variant",
    ref: "E07, A17, décision 4",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Signal",
      props: {
        h: { type: "enum", values: ["x", "y"] },
        voir: { type: "boolean", default: true, source: { slotPath: ["prisme"], prop: "voir" } },
      },
      viewStructures: {
        h: boite([slotPiece("prisme", ".Prisme", "Prisme")]),
        p: boite([
          { slot: "pastille", figmaLayer: "Pastille", optional: true, visibilityProp: "voir" },
        ]),
      },
      variantViews: { h: { structure: "h" }, p: { structure: "p" } },
      variants: [
        variante("1:1", { h: "x" }, "h", {
          sample: "sx",
          pieces: [renvoi(["prisme"], "1:2", "2:1", "p", { values: { voir: true } })],
        }),
        variante("1:3", { h: "y" }, "h", {
          sample: "sy",
          pieces: [renvoi(["prisme"], "1:4", "2:1", "p", { values: { voir: false } })],
        }),
      ],
      structure: { view: "h", variantAxes: ["h"] },
      samples: { sx: { args: { voir: true } }, sy: { args: { voir: false } } },
      pieces: {
        Prisme: entree(".Prisme", "2:0", { view: "p" }, [variante("2:1", {}, "p")], {
          props: { voir: { type: "boolean", default: true } },
        }),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
    }),
  },
  {
    id: "E09-deux-item-suffixe",
    ref: "A09, décision 8",
    attendu: "refus",
    point: 8,
    contrat: () => contrat15({
      name: "Liste",
      props: {},
      viewStructures: {
        h: boite([slotPiece("item", ".Item", "Item"), slotPiece("item-2", ".Item", "Item2")]),
        p: boite(),
      },
      variantViews: { h: { structure: "h" }, p: { structure: "p" } },
      variants: [
        variante("1:1", {}, "h", {
          pieces: [renvoi(["item"], "1:2", "5:1", "p"), renvoi(["item-2"], "1:3", "6:1", "p")],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Item: entree(".Item", "5", { view: "p" }, [variante("5:1", {}, "p")]),
        Item2: entree(".Item", "6", { view: "p" }, [variante("6:1", {}, "p")]),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
    }),
  },
  {
    id: "M-A01-exposition-trois-niveaux",
    ref: "A01",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Vigie",
      props: {
        ton: { type: "enum", values: ["a", "b"] },
        contenu: { type: "slot" },
        taille0: { type: "enum", values: ["s", "l"], source: { slotPath: ["piece"], prop: "taille0" } },
        montrer0: { type: "boolean", default: false, source: { slotPath: ["piece"], prop: "montrer0" } },
        glyphe0: { type: "instance-swap", source: { slotPath: ["piece"], prop: "glyphe0" } },
        texte0: { type: "string", source: { slotPath: ["piece"], prop: "texte0" } },
        taille1: { type: "enum", values: ["s", "l"], source: { slotPath: ["piece"], prop: "taille1" } },
        montrer1: { type: "boolean", default: true, source: { slotPath: ["piece"], prop: "montrer1" } },
        glyphe1: { type: "instance-swap", source: { slotPath: ["piece"], prop: "glyphe1" } },
        texte1: { type: "string", source: { slotPath: ["piece"], prop: "texte1" } },
        taille2: { type: "enum", values: ["s", "l"], source: { slotPath: ["piece"], prop: "taille2" } },
        montrer2: { type: "boolean", default: true, source: { slotPath: ["piece"], prop: "montrer2" } },
        glyphe2: { type: "instance-swap", source: { slotPath: ["piece"], prop: "glyphe2" } },
        texte2: { type: "string", source: { slotPath: ["piece"], prop: "texte2" } },
        motif: { type: "enum", values: ["etoile", "lune"], source: { slotPath: ["piece"], prop: "motif" } },
      },
      structure: { variantAxes: ["ton"], view: "x3" },
      viewStructures: {
        x0: boite([
          { slot: "label", figmaLayer: "Texte", optional: true, visibilityProp: "montrer2" },
          { slot: "signe", figmaLayer: "Signe", composes: "Signe" },
          { slot: "ajout", figmaLayer: "Ajout" },
        ]),
        x1: boite([
          { slot: "label", figmaLayer: "Texte", optional: true, visibilityProp: "montrer1" },
          { slot: "signe", figmaLayer: "Signe", composes: "Signe" },
          { slot: "ajout", figmaLayer: "Ajout" },
          slotPiece("piece", ".Piece2", "Piece2"),
        ]),
        x2: boite([
          { slot: "label", figmaLayer: "Texte", optional: true, visibilityProp: "montrer0" },
          { slot: "signe", figmaLayer: "Signe", composes: "Signe" },
          { slot: "ajout", figmaLayer: "Ajout" },
          slotPiece("piece", ".Piece1", "Piece1"),
        ]),
        x3: boite([{ slot: "contenu", figmaLayer: "Contenu" }, slotPiece("piece", ".Piece0", "Piece0")]),
      },
      variantViews: {
        x0: { structure: "x0", paintPlacements: "x0", composes: "x0", typography: "x0" },
        x1: { structure: "x1", paintPlacements: "x0", composes: "x0", typography: "x0" },
        x2: { structure: "x2", paintPlacements: "x0", composes: "x0", typography: "x0" },
        x3: { structure: "x3" },
      },
      viewPaintPlacements: { x0: { fills: { foreground: [["label"], ["signe"]] } } },
      viewComposes: { x0: [{ component: "Signe", figmaLayer: "Signe" }] },
      viewTypographies: { x0: [{ style: "accent", slotPath: ["label"] }] },
      samples: {
        x0: { args: { texte2: "T2" }, text: [{ slotPath: ["label"], value: "T2" }] },
        x1: { args: { texte1: "T1" }, text: [{ slotPath: ["label"], value: "T1" }] },
        x2: { args: { texte0: "T0" }, text: [{ slotPath: ["label"], value: "T0" }] },
      },
      pieces: {
        Piece2: entree(
          ".Piece2",
          "4:0",
          { variantAxes: ["taille2", "state"], view: "x0" },
          [
            variante("4:1", { taille2: "s", state: "default" }, "x0", {
              tokens: { foreground: "{c.2.s.default}" },
              sample: "x0",
            }),
            variante("4:2", { taille2: "s", state: "hover" }, "x0", {
              tokens: { foreground: "{c.2.s.hover}" },
              sample: "x0",
            }),
            variante("4:3", { taille2: "l", state: "default" }, "x0", {
              tokens: { foreground: "{c.2.l.default}" },
              sample: "x0",
            }),
            variante("4:4", { taille2: "l", state: "hover" }, "x0", {
              tokens: { foreground: "{c.2.l.hover}" },
              sample: "x0",
            }),
          ],
          {
            props: {
              taille2: { type: "enum", values: ["s", "l"] },
              montrer2: { type: "boolean", default: true },
              glyphe2: { type: "instance-swap" },
              texte2: { type: "string" },
              ajout2: { type: "slot" },
              motif: {
                type: "enum",
                values: ["etoile", "lune"],
                source: { slotPath: ["signe"], component: "Signe", prop: "motif" },
              },
            },
            stateModel: {
              axis: "state",
              states: { default: {}, hover: { selector: ":hover" } },
              precedence: ["hover", "default"],
            },
            composes: [{ component: "Signe", figmaLayer: "Signe" }],
          },
        ),
        Piece1: entree(
          ".Piece1",
          "3:0",
          { variantAxes: ["taille1", "state"], view: "x1" },
          [
            variante("3:1", { taille1: "s", state: "default" }, "x1", {
              tokens: { foreground: "{c.1.s.default}" },
              sample: "x1",
              pieces: [
                renvoi(["piece"], "4:80", "4:1", "x0", {
                  tokens: { foreground: "{c.2.s.default}" },
                  values: { montrer2: true, glyphe2: "Signe" },
                }),
              ],
            }),
            variante("3:2", { taille1: "s", state: "hover" }, "x1", {
              tokens: { foreground: "{c.1.s.hover}" },
              sample: "x1",
              pieces: [
                renvoi(["piece"], "4:80", "4:2", "x0", {
                  tokens: { foreground: "{c.2.s.hover}" },
                  values: { montrer2: true, glyphe2: "Signe" },
                }),
              ],
            }),
            variante("3:3", { taille1: "l", state: "default" }, "x1", {
              tokens: { foreground: "{c.1.l.default}" },
              sample: "x1",
              pieces: [
                renvoi(["piece"], "4:80", "4:3", "x0", {
                  tokens: { foreground: "{c.2.l.default}" },
                  values: { montrer2: true, glyphe2: "Signe" },
                }),
              ],
            }),
            variante("3:4", { taille1: "l", state: "hover" }, "x1", {
              tokens: { foreground: "{c.1.l.hover}" },
              sample: "x1",
              pieces: [
                renvoi(["piece"], "4:80", "4:4", "x0", {
                  tokens: { foreground: "{c.2.l.hover}" },
                  values: { montrer2: true, glyphe2: "Signe" },
                }),
              ],
            }),
          ],
          {
            props: {
              taille1: { type: "enum", values: ["s", "l"] },
              montrer1: { type: "boolean", default: true },
              glyphe1: { type: "instance-swap" },
              texte1: { type: "string" },
              ajout1: { type: "slot" },
              taille2: { type: "enum", values: ["s", "l"], source: { slotPath: ["piece"], prop: "taille2" } },
              montrer2: { type: "boolean", default: true, source: { slotPath: ["piece"], prop: "montrer2" } },
              glyphe2: { type: "instance-swap", source: { slotPath: ["piece"], prop: "glyphe2" } },
              texte2: { type: "string", source: { slotPath: ["piece"], prop: "texte2" } },
              motif: {
                type: "enum",
                values: ["etoile", "lune"],
                source: { slotPath: ["piece"], prop: "motif" },
              },
            },
            stateModel: {
              axis: "state",
              states: { default: {}, hover: { selector: ":hover" } },
              precedence: ["hover", "default"],
            },
            composes: [{ component: "Signe", figmaLayer: "Signe" }],
          },
        ),
        Piece0: entree(
          ".Piece0",
          "2:0",
          { variantAxes: ["taille0", "state"], view: "x2" },
          [
            variante("2:1", { taille0: "s", state: "default" }, "x2", {
              tokens: { foreground: "{c.0.s.default}" },
              sample: "x2",
              pieces: [
                renvoi(["piece"], "3:80", "3:1", "x1", {
                  tokens: { foreground: "{c.1.s.default}" },
                  pieces: [
                    renvoi(["piece"], "I3:80;4:80", "4:1", "x0", {
                      tokens: { foreground: "{c.2.s.default}" },
                      values: { montrer2: true, glyphe2: "Signe" },
                    }),
                  ],
                  values: { montrer1: true, glyphe1: "Signe", montrer2: true, glyphe2: "Signe" },
                }),
              ],
            }),
            variante("2:2", { taille0: "s", state: "hover" }, "x2", {
              tokens: { foreground: "{c.0.s.hover}" },
              sample: "x2",
              pieces: [
                renvoi(["piece"], "3:80", "3:2", "x1", {
                  tokens: { foreground: "{c.1.s.hover}" },
                  pieces: [
                    renvoi(["piece"], "I3:80;4:80", "4:2", "x0", {
                      tokens: { foreground: "{c.2.s.hover}" },
                      values: { montrer2: true, glyphe2: "Signe" },
                    }),
                  ],
                  values: { montrer1: true, glyphe1: "Signe", montrer2: true, glyphe2: "Signe" },
                }),
              ],
            }),
            variante("2:3", { taille0: "l", state: "default" }, "x2", {
              tokens: { foreground: "{c.0.l.default}" },
              sample: "x2",
              pieces: [
                renvoi(["piece"], "3:80", "3:3", "x1", {
                  tokens: { foreground: "{c.1.l.default}" },
                  pieces: [
                    renvoi(["piece"], "I3:80;4:80", "4:3", "x0", {
                      tokens: { foreground: "{c.2.l.default}" },
                      values: { montrer2: true, glyphe2: "Signe" },
                    }),
                  ],
                  values: { montrer1: true, glyphe1: "Signe", montrer2: true, glyphe2: "Signe" },
                }),
              ],
            }),
            variante("2:4", { taille0: "l", state: "hover" }, "x2", {
              tokens: { foreground: "{c.0.l.hover}" },
              sample: "x2",
              pieces: [
                renvoi(["piece"], "3:80", "3:4", "x1", {
                  tokens: { foreground: "{c.1.l.hover}" },
                  pieces: [
                    renvoi(["piece"], "I3:80;4:80", "4:4", "x0", {
                      tokens: { foreground: "{c.2.l.hover}" },
                      values: { montrer2: true, glyphe2: "Signe" },
                    }),
                  ],
                  values: { montrer1: true, glyphe1: "Signe", montrer2: true, glyphe2: "Signe" },
                }),
              ],
            }),
          ],
          {
            props: {
              taille0: { type: "enum", values: ["s", "l"] },
              montrer0: { type: "boolean", default: true },
              glyphe0: { type: "instance-swap" },
              texte0: { type: "string" },
              ajout0: { type: "slot" },
              taille1: { type: "enum", values: ["s", "l"], source: { slotPath: ["piece"], prop: "taille1" } },
              montrer1: { type: "boolean", default: true, source: { slotPath: ["piece"], prop: "montrer1" } },
              glyphe1: { type: "instance-swap", source: { slotPath: ["piece"], prop: "glyphe1" } },
              texte1: { type: "string", source: { slotPath: ["piece"], prop: "texte1" } },
              taille2: { type: "enum", values: ["s", "l"], source: { slotPath: ["piece"], prop: "taille2" } },
              montrer2: { type: "boolean", default: true, source: { slotPath: ["piece"], prop: "montrer2" } },
              glyphe2: { type: "instance-swap", source: { slotPath: ["piece"], prop: "glyphe2" } },
              texte2: { type: "string", source: { slotPath: ["piece"], prop: "texte2" } },
              motif: {
                type: "enum",
                values: ["etoile", "lune"],
                source: { slotPath: ["piece"], prop: "motif" },
              },
            },
            stateModel: {
              axis: "state",
              states: { default: {}, hover: { selector: ":hover" } },
              precedence: ["hover", "default"],
            },
            composes: [{ component: "Signe", figmaLayer: "Signe" }],
          },
        ),
      },
      variants: [
        variante("1:1", { ton: "a" }, "x3", {
          pieces: [
            renvoi(["piece"], "1:10", "2:1", "x2", {
              tokens: { foreground: "{c.0.s.default}" },
              pieces: [
                renvoi(["piece"], "I1:10;3:80", "3:1", "x1", {
                  tokens: { foreground: "{c.1.s.default}" },
                  pieces: [
                    renvoi(["piece"], "I1:10;3:80;4:80", "4:1", "x0", {
                      tokens: { foreground: "{c.2.s.default}" },
                      values: { montrer2: true, glyphe2: "Signe" },
                    }),
                  ],
                  values: { montrer1: true, glyphe1: "Signe", montrer2: true, glyphe2: "Signe" },
                }),
              ],
              values: {
                montrer0: false,
                glyphe0: "Signe",
                montrer1: true,
                glyphe1: "Signe",
                montrer2: true,
                glyphe2: "Signe",
              },
            }),
          ],
        }),
        variante("1:2", { ton: "b" }, "x3", {
          pieces: [
            renvoi(["piece"], "1:12", "2:1", "x2", {
              tokens: { foreground: "{c.0.s.default}" },
              pieces: [
                renvoi(["piece"], "I1:12;3:80", "3:1", "x1", {
                  tokens: { foreground: "{c.1.s.default}" },
                  pieces: [
                    renvoi(["piece"], "I1:12;3:80;4:80", "4:1", "x0", {
                      tokens: { foreground: "{c.2.s.default}" },
                      values: { montrer2: true, glyphe2: "Signe" },
                    }),
                  ],
                  values: { montrer1: true, glyphe1: "Signe", montrer2: true, glyphe2: "Signe" },
                }),
              ],
              values: {
                montrer0: false,
                glyphe0: "Signe",
                montrer1: true,
                glyphe1: "Signe",
                montrer2: true,
                glyphe2: "Signe",
              },
            }),
          ],
        }),
      ],
      textStyles: {
        accent: {
          figmaName: "Accent",
          tokens: { fontFamily: "{typography.body.family}", fontSize: "{typography.body.size}" },
          literals: { textTransform: "uppercase" },
        },
      },
    }),
  },
  {
    id: "M-A03-slot-rempli",
    ref: "A03",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Vigie",
      props: { ton: { type: "enum", values: ["a", "b"] }, contenu: { type: "slot" } },
      structure: { variantAxes: ["ton"], view: "x1" },
      viewStructures: {
        x0: boite([
          { slot: "label", figmaLayer: "Texte", optional: true, visibilityProp: "montrer0" },
          { slot: "signe", figmaLayer: "Signe", composes: "Signe" },
          { slot: "ajout", figmaLayer: "Ajout" },
        ]),
        x1: boite([{ slot: "contenu", figmaLayer: "Contenu" }, slotPiece("piece", ".Piece0", "Piece0")]),
      },
      variantViews: {
        x0: { structure: "x0", paintPlacements: "x0", composes: "x0", typography: "x0" },
        x1: { structure: "x1" },
      },
      viewPaintPlacements: { x0: { fills: { foreground: [["label"], ["signe"]] } } },
      viewComposes: { x0: [{ component: "Signe", figmaLayer: "Signe" }] },
      viewTypographies: { x0: [{ style: "accent", slotPath: ["label"] }] },
      samples: { x0: { args: { texte0: "T0" }, text: [{ slotPath: ["label"], value: "T0" }] } },
      pieces: {
        Piece0: entree(
          ".Piece0",
          "2:0",
          { variantAxes: ["taille0", "state"], view: "x0" },
          [
            variante("2:1", { taille0: "s", state: "default" }, "x0", {
              tokens: { foreground: "{c.0.s.default}" },
              sample: "x0",
            }),
            variante("2:2", { taille0: "s", state: "hover" }, "x0", {
              tokens: { foreground: "{c.0.s.hover}" },
              sample: "x0",
            }),
            variante("2:3", { taille0: "l", state: "default" }, "x0", {
              tokens: { foreground: "{c.0.l.default}" },
              sample: "x0",
            }),
            variante("2:4", { taille0: "l", state: "hover" }, "x0", {
              tokens: { foreground: "{c.0.l.hover}" },
              sample: "x0",
            }),
          ],
          {
            props: {
              taille0: { type: "enum", values: ["s", "l"] },
              montrer0: { type: "boolean", default: true },
              glyphe0: { type: "instance-swap" },
              texte0: { type: "string" },
              ajout0: { type: "slot" },
              motif: {
                type: "enum",
                values: ["etoile", "lune"],
                source: { slotPath: ["signe"], component: "Signe", prop: "motif" },
              },
            },
            stateModel: {
              axis: "state",
              states: { default: {}, hover: { selector: ":hover" } },
              precedence: ["hover", "default"],
            },
            composes: [{ component: "Signe", figmaLayer: "Signe" }],
          },
        ),
      },
      variants: [
        variante("1:1", { ton: "a" }, "x1", {
          pieces: [
            renvoi(["piece"], "1:10", "2:1", "x0", {
              values: { montrer0: true, glyphe0: "Signe" },
              tokens: { foreground: "{c.0.s.default}" },
            }),
          ],
        }),
        variante("1:2", { ton: "b" }, "x1", {
          pieces: [
            renvoi(["piece"], "1:12", "2:1", "x0", {
              values: { montrer0: true, glyphe0: "Signe" },
              tokens: { foreground: "{c.0.s.default}" },
            }),
          ],
        }),
      ],
      textStyles: {
        accent: {
          figmaName: "Accent",
          tokens: { fontFamily: "{typography.body.family}", fontSize: "{typography.body.size}" },
          literals: { textTransform: "uppercase" },
        },
      },
      pertes: [
        perte("variants[0].pieces[0]", "Le SLOT ajout0 de la pièce est rempli par l’hôte (slot)."),
        perte("variants[1].pieces[0]", "Le SLOT ajout0 de la pièce est rempli par l’hôte (slot)."),
      ],
    }),
  },
  {
    id: "M-A06-structure-differente",
    ref: "A06, A08",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Vigie",
      props: {
        ton: { type: "enum", values: ["a", "b"] },
        contenu: { type: "slot" },
        taille0: { type: "enum", values: ["s", "l"], source: { slotPath: ["piece"], prop: "taille0" } },
        montrer0: { type: "boolean", default: true, source: { slotPath: ["piece"], prop: "montrer0" } },
        glyphe0: { type: "instance-swap", source: { slotPath: ["piece"], prop: "glyphe0" } },
        texte0: { type: "string", source: { slotPath: ["piece"], prop: "texte0" } },
        motif: { type: "enum", values: ["etoile", "lune"], source: { slotPath: ["piece"], prop: "motif" } },
      },
      structure: { variantAxes: ["ton"], view: "x1" },
      viewStructures: {
        x0: boite([
          { slot: "label", figmaLayer: "Texte", optional: true, visibilityProp: "montrer0" },
          { slot: "signe", figmaLayer: "Signe", composes: "Signe" },
          { slot: "ajout", figmaLayer: "Ajout" },
        ]),
        x1: boite([{ slot: "contenu", figmaLayer: "Contenu" }, slotPiece("piece", ".Piece0", "Piece0")]),
        x2: boite([
          { slot: "label", figmaLayer: "Texte", optional: true, visibilityProp: "montrer0" },
          { slot: "signe", figmaLayer: "Signe", composes: "Signe" },
        ]),
      },
      variantViews: {
        x0: { structure: "x0", paintPlacements: "x0", composes: "x0", typography: "x0" },
        x1: { structure: "x1" },
        x2: { structure: "x2", paintPlacements: "x0", composes: "x0", typography: "x0" },
      },
      viewPaintPlacements: { x0: { fills: { foreground: [["label"], ["signe"]] } } },
      viewComposes: { x0: [{ component: "Signe", figmaLayer: "Signe" }] },
      viewTypographies: { x0: [{ style: "accent", slotPath: ["label"] }] },
      samples: { x0: { args: { texte0: "T0" }, text: [{ slotPath: ["label"], value: "T0" }] } },
      pieces: {
        Piece0: entree(
          ".Piece0",
          "2:0",
          { variantAxes: ["taille0", "state"], view: "x0" },
          [
            variante("2:1", { taille0: "s", state: "default" }, "x0", {
              tokens: { foreground: "{c.0.s.default}" },
              sample: "x0",
            }),
            variante("2:2", { taille0: "s", state: "hover" }, "x0", {
              tokens: { foreground: "{c.0.s.hover}" },
              sample: "x0",
            }),
            variante("2:3", { taille0: "l", state: "default" }, "x0", {
              tokens: { foreground: "{c.0.l.default}" },
              sample: "x0",
            }),
            variante("2:4", { taille0: "l", state: "hover" }, "x0", {
              tokens: { foreground: "{c.0.l.hover}" },
              sample: "x0",
            }),
          ],
          {
            props: {
              taille0: { type: "enum", values: ["s", "l"] },
              montrer0: { type: "boolean", default: true },
              glyphe0: { type: "instance-swap" },
              texte0: { type: "string" },
              ajout0: { type: "slot" },
              motif: {
                type: "enum",
                values: ["etoile", "lune"],
                source: { slotPath: ["signe"], component: "Signe", prop: "motif" },
              },
            },
            stateModel: {
              axis: "state",
              states: { default: {}, hover: { selector: ":hover" } },
              precedence: ["hover", "default"],
            },
            composes: [{ component: "Signe", figmaLayer: "Signe" }],
          },
        ),
      },
      variants: [
        variante("1:1", { ton: "a" }, "x1", {
          pieces: [
            renvoi(["piece"], "1:10", "2:1", "x2", {
              tokens: { foreground: "{c.0.s.default}" },
              values: { montrer0: true, glyphe0: "Signe" },
            }),
          ],
        }),
        variante("1:2", { ton: "b" }, "x1", {
          pieces: [
            renvoi(["piece"], "1:12", "2:1", "x2", {
              tokens: { foreground: "{c.0.s.default}" },
              values: { montrer0: true, glyphe0: "Signe" },
            }),
          ],
        }),
      ],
      textStyles: {
        accent: {
          figmaName: "Accent",
          tokens: { fontFamily: "{typography.body.family}", fontSize: "{typography.body.size}" },
          literals: { textTransform: "uppercase" },
        },
      },
    }),
  },
  {
    id: "M-A18-matrice-clairsemee",
    ref: "A18",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Vigie",
      props: {
        ton: { type: "enum", values: ["a", "b"] },
        contenu: { type: "slot" },
        taille0: { type: "enum", values: ["s", "l"], source: { slotPath: ["piece"], prop: "taille0" } },
        montrer0: { type: "boolean", default: true, source: { slotPath: ["piece"], prop: "montrer0" } },
        glyphe0: { type: "instance-swap", source: { slotPath: ["piece"], prop: "glyphe0" } },
        texte0: { type: "string", source: { slotPath: ["piece"], prop: "texte0" } },
        motif: { type: "enum", values: ["etoile", "lune"], source: { slotPath: ["piece"], prop: "motif" } },
      },
      structure: { variantAxes: ["ton"], view: "x1" },
      viewStructures: {
        x0: boite([
          { slot: "label", figmaLayer: "Texte", optional: true, visibilityProp: "montrer0" },
          { slot: "signe", figmaLayer: "Signe", composes: "Signe" },
          { slot: "ajout", figmaLayer: "Ajout" },
        ]),
        x1: boite([{ slot: "contenu", figmaLayer: "Contenu" }, slotPiece("piece", ".Piece0", "Piece0")]),
      },
      variantViews: {
        x0: { structure: "x0", paintPlacements: "x0", composes: "x0", typography: "x0" },
        x1: { structure: "x1" },
      },
      viewPaintPlacements: { x0: { fills: { foreground: [["label"], ["signe"]] } } },
      viewComposes: { x0: [{ component: "Signe", figmaLayer: "Signe" }] },
      viewTypographies: { x0: [{ style: "accent", slotPath: ["label"] }] },
      samples: { x0: { args: { texte0: "T0" }, text: [{ slotPath: ["label"], value: "T0" }] } },
      pieces: {
        Piece0: entree(
          ".Piece0",
          "2:0",
          { variantAxes: ["taille0", "state"], view: "x0" },
          [
            variante("2:1", { taille0: "s", state: "default" }, "x0", {
              tokens: { foreground: "{c.0.s.default}" },
              sample: "x0",
            }),
            variante("2:2", { taille0: "s", state: "hover" }, "x0", {
              tokens: { foreground: "{c.0.s.hover}" },
              sample: "x0",
            }),
            variante("2:3", { taille0: "l", state: "default" }, "x0", {
              tokens: { foreground: "{c.0.l.default}" },
              sample: "x0",
            }),
          ],
          {
            props: {
              taille0: { type: "enum", values: ["s", "l"] },
              montrer0: { type: "boolean", default: true },
              glyphe0: { type: "instance-swap" },
              texte0: { type: "string" },
              ajout0: { type: "slot" },
              motif: {
                type: "enum",
                values: ["etoile", "lune"],
                source: { slotPath: ["signe"], component: "Signe", prop: "motif" },
              },
            },
            stateModel: {
              axis: "state",
              states: { default: {}, hover: { selector: ":hover" } },
              precedence: ["hover", "default"],
            },
            composes: [{ component: "Signe", figmaLayer: "Signe" }],
          },
        ),
      },
      variants: [
        variante("1:1", { ton: "a" }, "x1", {
          pieces: [
            renvoi(["piece"], "1:10", "2:1", "x0", {
              tokens: { foreground: "{c.0.s.default}" },
              values: { montrer0: true, glyphe0: "Signe" },
            }),
          ],
        }),
        variante("1:2", { ton: "b" }, "x1", {
          pieces: [
            renvoi(["piece"], "1:12", "2:1", "x0", {
              tokens: { foreground: "{c.0.s.default}" },
              values: { montrer0: true, glyphe0: "Signe" },
            }),
          ],
        }),
      ],
      textStyles: {
        accent: {
          figmaName: "Accent",
          tokens: { fontFamily: "{typography.body.family}", fontSize: "{typography.body.size}" },
          literals: { textTransform: "uppercase" },
        },
      },
      pertes: [
        perte(
          "variants[0].pieces[0]",
          "Sélection non unique pour une coordonnée atteignable (sélection).",
        ),
        perte(
          "variants[1].pieces[0]",
          "Sélection non unique pour une coordonnée atteignable (sélection).",
        ),
      ],
    }),
  },
  {
    id: "M-A19-coordonnees-repetees",
    ref: "A19",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Vigie",
      props: {
        ton: { type: "enum", values: ["a", "b"] },
        contenu: { type: "slot" },
        taille0: { type: "enum", values: ["s", "l"], source: { slotPath: ["piece"], prop: "taille0" } },
        montrer0: { type: "boolean", default: true, source: { slotPath: ["piece"], prop: "montrer0" } },
        glyphe0: { type: "instance-swap", source: { slotPath: ["piece"], prop: "glyphe0" } },
        texte0: { type: "string", source: { slotPath: ["piece"], prop: "texte0" } },
        motif: { type: "enum", values: ["etoile", "lune"], source: { slotPath: ["piece"], prop: "motif" } },
      },
      structure: { variantAxes: ["ton"], view: "x1" },
      viewStructures: {
        x0: boite([
          { slot: "label", figmaLayer: "Texte", optional: true, visibilityProp: "montrer0" },
          { slot: "signe", figmaLayer: "Signe", composes: "Signe" },
          { slot: "ajout", figmaLayer: "Ajout" },
        ]),
        x1: boite([{ slot: "contenu", figmaLayer: "Contenu" }, slotPiece("piece", ".Piece0", "Piece0")]),
      },
      variantViews: {
        x0: { structure: "x0", paintPlacements: "x0", composes: "x0", typography: "x0" },
        x1: { structure: "x1" },
      },
      viewPaintPlacements: { x0: { fills: { foreground: [["label"], ["signe"]] } } },
      viewComposes: { x0: [{ component: "Signe", figmaLayer: "Signe" }] },
      viewTypographies: { x0: [{ style: "accent", slotPath: ["label"] }] },
      samples: { x0: { args: { texte0: "T0" }, text: [{ slotPath: ["label"], value: "T0" }] } },
      pieces: {
        Piece0: entree(
          ".Piece0",
          "2:0",
          { variantAxes: ["taille0", "state"], view: "x0" },
          [
            variante("2:1", { taille0: "s", state: "default" }, "x0", {
              tokens: { foreground: "{c.0.s.default}" },
              sample: "x0",
            }),
            variante("2:2", { taille0: "s", state: "hover" }, "x0", {
              tokens: { foreground: "{c.0.s.hover}" },
              sample: "x0",
            }),
            variante("2:3", { taille0: "l", state: "default" }, "x0", {
              tokens: { foreground: "{c.0.l.default}" },
              sample: "x0",
            }),
            variante("2:4", { taille0: "l", state: "hover" }, "x0", {
              tokens: { foreground: "{c.0.l.hover}" },
              sample: "x0",
            }),
            variante("2:9", { taille0: "l", state: "hover" }, "x0", {
              tokens: { foreground: "{c.0.double}" },
              sample: "x0",
            }),
          ],
          {
            props: {
              taille0: { type: "enum", values: ["s", "l"] },
              montrer0: { type: "boolean", default: true },
              glyphe0: { type: "instance-swap" },
              texte0: { type: "string" },
              ajout0: { type: "slot" },
              motif: {
                type: "enum",
                values: ["etoile", "lune"],
                source: { slotPath: ["signe"], component: "Signe", prop: "motif" },
              },
            },
            stateModel: {
              axis: "state",
              states: { default: {}, hover: { selector: ":hover" } },
              precedence: ["hover", "default"],
            },
            composes: [{ component: "Signe", figmaLayer: "Signe" }],
          },
        ),
      },
      variants: [
        variante("1:1", { ton: "a" }, "x1", {
          pieces: [
            renvoi(["piece"], "1:10", "2:1", "x0", {
              tokens: { foreground: "{c.0.s.default}" },
              values: { montrer0: true, glyphe0: "Signe" },
            }),
          ],
        }),
        variante("1:2", { ton: "b" }, "x1", {
          pieces: [
            renvoi(["piece"], "1:12", "2:1", "x0", {
              tokens: { foreground: "{c.0.s.default}" },
              values: { montrer0: true, glyphe0: "Signe" },
            }),
          ],
        }),
      ],
      textStyles: {
        accent: {
          figmaName: "Accent",
          tokens: { fontFamily: "{typography.body.family}", fontSize: "{typography.body.size}" },
          literals: { textTransform: "uppercase" },
        },
      },
      pertes: [
        perte(
          "variants[0].pieces[0]",
          "Sélection non unique pour une coordonnée atteignable (sélection).",
        ),
        perte(
          "variants[1].pieces[0]",
          "Sélection non unique pour une coordonnée atteignable (sélection).",
        ),
      ],
    }),
  },
  {
    id: "M-E01-bascule-sans-surcharge",
    ref: "E01, A15",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Vigie",
      props: {
        ton: { type: "enum", values: ["a", "b"] },
        contenu: { type: "slot" },
        taille0: { type: "enum", values: ["s", "l"], source: { slotPath: ["piece"], prop: "taille0" } },
        montrer0: { type: "boolean", default: true, source: { slotPath: ["piece"], prop: "montrer0" } },
        glyphe0: { type: "instance-swap", source: { slotPath: ["piece"], prop: "glyphe0" } },
        texte0: { type: "string", source: { slotPath: ["piece"], prop: "texte0" } },
        motif: { type: "enum", values: ["etoile", "lune"], source: { slotPath: ["piece"], prop: "motif" } },
      },
      structure: { variantAxes: ["ton"], view: "x1" },
      viewStructures: {
        x0: boite([
          { slot: "label", figmaLayer: "Texte", optional: true, visibilityProp: "montrer0" },
          { slot: "signe", figmaLayer: "Signe", composes: "Signe" },
          { slot: "ajout", figmaLayer: "Ajout" },
        ]),
        x1: boite([{ slot: "contenu", figmaLayer: "Contenu" }, slotPiece("piece", ".Piece0", "Piece0")]),
      },
      variantViews: {
        x0: { structure: "x0", paintPlacements: "x0", composes: "x0", typography: "x0" },
        x1: { structure: "x1" },
      },
      viewPaintPlacements: { x0: { fills: { foreground: [["label"], ["signe"]] } } },
      viewComposes: { x0: [{ component: "Signe", figmaLayer: "Signe" }] },
      viewTypographies: { x0: [{ style: "accent", slotPath: ["label"] }] },
      samples: { x0: { args: { texte0: "T0" }, text: [{ slotPath: ["label"], value: "T0" }] } },
      pieces: {
        Piece0: entree(
          ".Piece0",
          "2:0",
          { variantAxes: ["taille0", "state"], view: "x0" },
          [
            variante("2:1", { taille0: "s", state: "default" }, "x0", {
              tokens: { foreground: "{c.0.s.default}" },
              sample: "x0",
            }),
            variante("2:2", { taille0: "s", state: "hover" }, "x0", {
              tokens: { foreground: "{c.0.s.hover}" },
              sample: "x0",
            }),
            variante("2:3", { taille0: "l", state: "default" }, "x0", {
              tokens: { foreground: "{c.0.l.default}" },
              sample: "x0",
            }),
            variante("2:4", { taille0: "l", state: "hover" }, "x0", {
              tokens: { foreground: "{c.0.l.hover}" },
              sample: "x0",
            }),
          ],
          {
            props: {
              taille0: { type: "enum", values: ["s", "l"] },
              montrer0: { type: "boolean", default: true },
              glyphe0: { type: "instance-swap" },
              texte0: { type: "string" },
              ajout0: { type: "slot" },
              motif: {
                type: "enum",
                values: ["etoile", "lune"],
                source: { slotPath: ["signe"], component: "Signe", prop: "motif" },
              },
            },
            stateModel: {
              axis: "state",
              states: { default: {}, hover: { selector: ":hover" } },
              precedence: ["hover", "default"],
            },
            composes: [{ component: "Signe", figmaLayer: "Signe" }],
          },
        ),
      },
      variants: [
        variante("1:1", { ton: "a" }, "x1", {
          pieces: [
            renvoi(["piece"], "1:10", "2:1", "x0", {
              tokens: { foreground: "{c.0.s.default}" },
              values: { montrer0: true, glyphe0: "Signe" },
            }),
          ],
        }),
        variante("1:2", { ton: "b" }, "x1", {
          pieces: [
            renvoi(["piece"], "1:12", "2:1", "x0", {
              tokens: { foreground: "{c.0.s.default}" },
              values: { montrer0: true, glyphe0: "Signe" },
            }),
          ],
        }),
      ],
      textStyles: {
        accent: {
          figmaName: "Accent",
          tokens: { fontFamily: "{typography.body.family}", fontSize: "{typography.body.size}" },
          literals: { textTransform: "uppercase" },
        },
      },
    }),
  },
  {
    id: "M-E01-bascule-surcharge-valeurs-differentes",
    ref: "E01",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Vigie",
      props: {
        ton: { type: "enum", values: ["a", "b"] },
        contenu: { type: "slot" },
        taille0: { type: "enum", values: ["s", "l"], source: { slotPath: ["piece"], prop: "taille0" } },
        montrer0: { type: "boolean", default: true, source: { slotPath: ["piece"], prop: "montrer0" } },
        glyphe0: { type: "instance-swap", source: { slotPath: ["piece"], prop: "glyphe0" } },
        texte0: { type: "string", source: { slotPath: ["piece"], prop: "texte0" } },
        motif: { type: "enum", values: ["etoile", "lune"], source: { slotPath: ["piece"], prop: "motif" } },
      },
      structure: { variantAxes: ["ton"], view: "x1" },
      viewStructures: {
        x0: boite([
          { slot: "label", figmaLayer: "Texte", optional: true, visibilityProp: "montrer0" },
          { slot: "signe", figmaLayer: "Signe", composes: "Signe" },
          { slot: "ajout", figmaLayer: "Ajout" },
        ]),
        x1: boite([{ slot: "contenu", figmaLayer: "Contenu" }, slotPiece("piece", ".Piece0", "Piece0")]),
      },
      variantViews: {
        x0: { structure: "x0", paintPlacements: "x0", composes: "x0", typography: "x0" },
        x1: { structure: "x1" },
      },
      viewPaintPlacements: { x0: { fills: { foreground: [["label"], ["signe"]] } } },
      viewComposes: { x0: [{ component: "Signe", figmaLayer: "Signe" }] },
      viewTypographies: { x0: [{ style: "accent", slotPath: ["label"] }] },
      samples: { x0: { args: { texte0: "T0" }, text: [{ slotPath: ["label"], value: "T0" }] } },
      pieces: {
        Piece0: entree(
          ".Piece0",
          "2:0",
          { variantAxes: ["taille0", "state"], view: "x0" },
          [
            variante("2:1", { taille0: "s", state: "default" }, "x0", {
              tokens: { foreground: "{c.0.s.default}" },
              sample: "x0",
            }),
            variante("2:2", { taille0: "s", state: "hover" }, "x0", {
              tokens: { foreground: "{c.0.s.hover}" },
              sample: "x0",
            }),
            variante("2:3", { taille0: "l", state: "default" }, "x0", {
              tokens: { foreground: "{c.0.l.default}" },
              sample: "x0",
            }),
            variante("2:4", { taille0: "l", state: "hover" }, "x0", {
              tokens: { foreground: "{c.0.l.hover}" },
              sample: "x0",
            }),
          ],
          {
            props: {
              taille0: { type: "enum", values: ["s", "l"] },
              montrer0: { type: "boolean", default: true },
              glyphe0: { type: "instance-swap" },
              texte0: { type: "string" },
              ajout0: { type: "slot" },
              motif: {
                type: "enum",
                values: ["etoile", "lune"],
                source: { slotPath: ["signe"], component: "Signe", prop: "motif" },
              },
            },
            stateModel: {
              axis: "state",
              states: { default: {}, hover: { selector: ":hover" } },
              precedence: ["hover", "default"],
            },
            composes: [{ component: "Signe", figmaLayer: "Signe" }],
          },
        ),
      },
      variants: [
        variante("1:1", { ton: "a" }, "x1", {
          pieces: [
            renvoi(["piece"], "1:10", "2:1", "x0", {
              tokens: { foreground: "{o.0}" },
              values: { montrer0: true, glyphe0: "Signe" },
            }),
          ],
        }),
        variante("1:2", { ton: "b" }, "x1", {
          pieces: [
            renvoi(["piece"], "1:12", "2:1", "x0", {
              tokens: { foreground: "{o.0}" },
              values: { montrer0: true, glyphe0: "Signe" },
            }),
          ],
        }),
      ],
      textStyles: {
        accent: {
          figmaName: "Accent",
          tokens: { fontFamily: "{typography.body.family}", fontSize: "{typography.body.size}" },
          literals: { textTransform: "uppercase" },
        },
      },
    }),
  },
  {
    id: "M-E02-etat-non-expose-valeur-commune",
    ref: "E02, A07b",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Vigie",
      props: { ton: { type: "enum", values: ["a", "b"] }, contenu: { type: "slot" } },
      structure: { variantAxes: ["ton"], view: "x1" },
      viewStructures: {
        x0: boite([
          { slot: "label", figmaLayer: "Texte", optional: true, visibilityProp: "montrer0" },
          { slot: "signe", figmaLayer: "Signe", composes: "Signe" },
          { slot: "ajout", figmaLayer: "Ajout" },
        ]),
        x1: boite([{ slot: "contenu", figmaLayer: "Contenu" }, slotPiece("piece", ".Piece0", "Piece0")]),
      },
      variantViews: {
        x0: { structure: "x0", paintPlacements: "x0", composes: "x0", typography: "x0" },
        x1: { structure: "x1" },
      },
      viewPaintPlacements: { x0: { fills: { foreground: [["label"], ["signe"]] } } },
      viewComposes: { x0: [{ component: "Signe", figmaLayer: "Signe" }] },
      viewTypographies: { x0: [{ style: "accent", slotPath: ["label"] }] },
      samples: { x0: { args: { texte0: "T0" }, text: [{ slotPath: ["label"], value: "T0" }] } },
      pieces: {
        Piece0: entree(
          ".Piece0",
          "2:0",
          { variantAxes: ["taille0", "state"], view: "x0" },
          [
            variante("2:1", { taille0: "s", state: "default" }, "x0", {
              tokens: { foreground: "{c.0.s.tous}" },
              sample: "x0",
            }),
            variante("2:2", { taille0: "s", state: "hover" }, "x0", {
              tokens: { foreground: "{c.0.s.tous}" },
              sample: "x0",
            }),
            variante("2:3", { taille0: "l", state: "default" }, "x0", {
              tokens: { foreground: "{c.0.l.tous}" },
              sample: "x0",
            }),
            variante("2:4", { taille0: "l", state: "hover" }, "x0", {
              tokens: { foreground: "{c.0.l.tous}" },
              sample: "x0",
            }),
          ],
          {
            props: {
              taille0: { type: "enum", values: ["s", "l"] },
              montrer0: { type: "boolean", default: true },
              glyphe0: { type: "instance-swap" },
              texte0: { type: "string" },
              ajout0: { type: "slot" },
              motif: {
                type: "enum",
                values: ["etoile", "lune"],
                source: { slotPath: ["signe"], component: "Signe", prop: "motif" },
              },
            },
            stateModel: {
              axis: "state",
              states: { default: {}, hover: { selector: ":hover" } },
              precedence: ["hover", "default"],
            },
            composes: [{ component: "Signe", figmaLayer: "Signe" }],
          },
        ),
      },
      variants: [
        variante("1:1", { ton: "a" }, "x1", {
          pieces: [
            renvoi(["piece"], "1:10", "2:1", "x0", {
              values: { montrer0: true, glyphe0: "Signe" },
              tokens: { foreground: "{o.0}" },
            }),
          ],
        }),
        variante("1:2", { ton: "b" }, "x1", {
          pieces: [
            renvoi(["piece"], "1:12", "2:1", "x0", {
              values: { montrer0: true, glyphe0: "Signe" },
              tokens: { foreground: "{o.0}" },
            }),
          ],
        }),
      ],
      textStyles: {
        accent: {
          figmaName: "Accent",
          tokens: { fontFamily: "{typography.body.family}", fontSize: "{typography.body.size}" },
          literals: { textTransform: "uppercase" },
        },
      },
    }),
  },
  {
    id: "M-E02-etat-non-expose-valeurs-differentes",
    ref: "E02, A07",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Vigie",
      props: { ton: { type: "enum", values: ["a", "b"] }, contenu: { type: "slot" } },
      structure: { variantAxes: ["ton"], view: "x1" },
      viewStructures: {
        x0: boite([
          { slot: "label", figmaLayer: "Texte", optional: true, visibilityProp: "montrer0" },
          { slot: "signe", figmaLayer: "Signe", composes: "Signe" },
          { slot: "ajout", figmaLayer: "Ajout" },
        ]),
        x1: boite([{ slot: "contenu", figmaLayer: "Contenu" }, slotPiece("piece", ".Piece0", "Piece0")]),
      },
      variantViews: {
        x0: { structure: "x0", paintPlacements: "x0", composes: "x0", typography: "x0" },
        x1: { structure: "x1" },
      },
      viewPaintPlacements: { x0: { fills: { foreground: [["label"], ["signe"]] } } },
      viewComposes: { x0: [{ component: "Signe", figmaLayer: "Signe" }] },
      viewTypographies: { x0: [{ style: "accent", slotPath: ["label"] }] },
      samples: { x0: { args: { texte0: "T0" }, text: [{ slotPath: ["label"], value: "T0" }] } },
      pieces: {
        Piece0: entree(
          ".Piece0",
          "2:0",
          { variantAxes: ["taille0", "state"], view: "x0" },
          [
            variante("2:1", { taille0: "s", state: "default" }, "x0", {
              tokens: { foreground: "{c.0.s.default}" },
              sample: "x0",
            }),
            variante("2:2", { taille0: "s", state: "hover" }, "x0", {
              tokens: { foreground: "{c.0.s.hover}" },
              sample: "x0",
            }),
            variante("2:3", { taille0: "l", state: "default" }, "x0", {
              tokens: { foreground: "{c.0.l.default}" },
              sample: "x0",
            }),
            variante("2:4", { taille0: "l", state: "hover" }, "x0", {
              tokens: { foreground: "{c.0.l.hover}" },
              sample: "x0",
            }),
          ],
          {
            props: {
              taille0: { type: "enum", values: ["s", "l"] },
              montrer0: { type: "boolean", default: true },
              glyphe0: { type: "instance-swap" },
              texte0: { type: "string" },
              ajout0: { type: "slot" },
              motif: {
                type: "enum",
                values: ["etoile", "lune"],
                source: { slotPath: ["signe"], component: "Signe", prop: "motif" },
              },
            },
            stateModel: {
              axis: "state",
              states: { default: {}, hover: { selector: ":hover" } },
              precedence: ["hover", "default"],
            },
            composes: [{ component: "Signe", figmaLayer: "Signe" }],
          },
        ),
      },
      variants: [
        variante("1:1", { ton: "a" }, "x1", {
          pieces: [
            renvoi(["piece"], "1:10", "2:1", "x0", {
              values: { montrer0: true, glyphe0: "Signe" },
              tokens: { foreground: "{o.0}" },
            }),
          ],
        }),
        variante("1:2", { ton: "b" }, "x1", {
          pieces: [
            renvoi(["piece"], "1:12", "2:1", "x0", {
              values: { montrer0: true, glyphe0: "Signe" },
              tokens: { foreground: "{o.0}" },
            }),
          ],
        }),
      ],
      textStyles: {
        accent: {
          figmaName: "Accent",
          tokens: { fontFamily: "{typography.body.family}", fontSize: "{typography.body.size}" },
          literals: { textTransform: "uppercase" },
        },
      },
    }),
  },
  {
    id: "M-E03-deux-instances-exposees",
    ref: "E03, A12",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Vigie",
      props: {
        ton: { type: "enum", values: ["a", "b"] },
        contenu: { type: "slot" },
        taille0: { type: "enum", values: ["s", "l"], source: { slotPath: ["piece"], prop: "taille0" } },
        montrer0: { type: "boolean", default: true, source: { slotPath: ["piece"], prop: "montrer0" } },
        glyphe0: { type: "instance-swap", source: { slotPath: ["piece"], prop: "glyphe0" } },
        texte0: { type: "string", source: { slotPath: ["piece"], prop: "texte0" } },
        motif: { type: "enum", values: ["etoile", "lune"], source: { slotPath: ["piece"], prop: "motif" } },
        piece2Taille0: { type: "enum", values: ["s", "l"], source: { slotPath: ["piece-2"], prop: "taille0" } },
        piece2Montrer0: { type: "boolean", default: true, source: { slotPath: ["piece-2"], prop: "montrer0" } },
        piece2Glyphe0: { type: "instance-swap", source: { slotPath: ["piece-2"], prop: "glyphe0" } },
        piece2Texte0: { type: "string", source: { slotPath: ["piece-2"], prop: "texte0" } },
        piece2Motif: {
          type: "enum",
          values: ["etoile", "lune"],
          source: { slotPath: ["piece-2"], prop: "motif" },
        },
      },
      structure: { variantAxes: ["ton"], view: "x1" },
      viewStructures: {
        x0: boite([
          { slot: "label", figmaLayer: "Texte", optional: true, visibilityProp: "montrer0" },
          { slot: "signe", figmaLayer: "Signe", composes: "Signe" },
          { slot: "ajout", figmaLayer: "Ajout" },
        ]),
        x1: boite([
          { slot: "contenu", figmaLayer: "Contenu" },
          slotPiece("piece", ".Piece0", "Piece0"),
          slotPiece("piece-2", ".Piece0", "Piece0"),
        ]),
      },
      variantViews: {
        x0: { structure: "x0", paintPlacements: "x0", composes: "x0", typography: "x0" },
        x1: { structure: "x1" },
      },
      viewPaintPlacements: { x0: { fills: { foreground: [["label"], ["signe"]] } } },
      viewComposes: { x0: [{ component: "Signe", figmaLayer: "Signe" }] },
      viewTypographies: { x0: [{ style: "accent", slotPath: ["label"] }] },
      samples: { x0: { args: { texte0: "T0" }, text: [{ slotPath: ["label"], value: "T0" }] } },
      pieces: {
        Piece0: entree(
          ".Piece0",
          "2:0",
          { variantAxes: ["taille0", "state"], view: "x0" },
          [
            variante("2:1", { taille0: "s", state: "default" }, "x0", {
              tokens: { foreground: "{c.0.s.default}" },
              sample: "x0",
            }),
            variante("2:2", { taille0: "s", state: "hover" }, "x0", {
              tokens: { foreground: "{c.0.s.hover}" },
              sample: "x0",
            }),
            variante("2:3", { taille0: "l", state: "default" }, "x0", {
              tokens: { foreground: "{c.0.l.default}" },
              sample: "x0",
            }),
            variante("2:4", { taille0: "l", state: "hover" }, "x0", {
              tokens: { foreground: "{c.0.l.hover}" },
              sample: "x0",
            }),
          ],
          {
            props: {
              taille0: { type: "enum", values: ["s", "l"] },
              montrer0: { type: "boolean", default: true },
              glyphe0: { type: "instance-swap" },
              texte0: { type: "string" },
              ajout0: { type: "slot" },
              motif: {
                type: "enum",
                values: ["etoile", "lune"],
                source: { slotPath: ["signe"], component: "Signe", prop: "motif" },
              },
            },
            stateModel: {
              axis: "state",
              states: { default: {}, hover: { selector: ":hover" } },
              precedence: ["hover", "default"],
            },
            composes: [{ component: "Signe", figmaLayer: "Signe" }],
          },
        ),
      },
      variants: [
        variante("1:1", { ton: "a" }, "x1", {
          pieces: [
            renvoi(["piece"], "1:10", "2:1", "x0", {
              tokens: { foreground: "{c.0.s.default}" },
              values: { montrer0: true, glyphe0: "Signe" },
            }),
            renvoi(["piece-2"], "1:11", "2:1", "x0", {
              values: { montrer0: false, glyphe0: "Signe" },
              tokens: { foreground: "{c.0.s.default}" },
            }),
          ],
        }),
        variante("1:2", { ton: "b" }, "x1", {
          pieces: [
            renvoi(["piece"], "1:12", "2:1", "x0", {
              tokens: { foreground: "{c.0.s.default}" },
              values: { montrer0: true, glyphe0: "Signe" },
            }),
            renvoi(["piece-2"], "1:13", "2:1", "x0", {
              values: { montrer0: false, glyphe0: "Signe" },
              tokens: { foreground: "{c.0.s.default}" },
            }),
          ],
        }),
      ],
      textStyles: {
        accent: {
          figmaName: "Accent",
          tokens: { fontFamily: "{typography.body.family}", fontSize: "{typography.body.size}" },
          literals: { textTransform: "uppercase" },
        },
      },
    }),
  },
  {
    id: "M-E04-mode-force",
    ref: "E04, A20b",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Vigie",
      props: { ton: { type: "enum", values: ["a", "b"] }, contenu: { type: "slot" } },
      structure: { variantAxes: ["ton"], view: "x1" },
      viewStructures: {
        x0: boite([
          { slot: "label", figmaLayer: "Texte", optional: true, visibilityProp: "montrer0" },
          { slot: "signe", figmaLayer: "Signe", composes: "Signe" },
          { slot: "ajout", figmaLayer: "Ajout" },
        ]),
        x1: boite([{ slot: "contenu", figmaLayer: "Contenu" }, slotPiece("piece", ".Piece0", "Piece0")]),
      },
      variantViews: {
        x0: { structure: "x0", paintPlacements: "x0", composes: "x0", typography: "x0" },
        x1: { structure: "x1" },
      },
      viewPaintPlacements: { x0: { fills: { foreground: [["label"], ["signe"]] } } },
      viewComposes: { x0: [{ component: "Signe", figmaLayer: "Signe" }] },
      viewTypographies: { x0: [{ style: "accent", slotPath: ["label"] }] },
      samples: { x0: { args: { texte0: "T0" }, text: [{ slotPath: ["label"], value: "T0" }] } },
      pieces: {
        Piece0: entree(
          ".Piece0",
          "2:0",
          { variantAxes: ["taille0", "state"], view: "x0" },
          [
            variante("2:1", { taille0: "s", state: "default" }, "x0", {
              tokens: { foreground: "{c.0.s.default}" },
              sample: "x0",
            }),
            variante("2:2", { taille0: "s", state: "hover" }, "x0", {
              tokens: { foreground: "{c.0.s.hover}" },
              sample: "x0",
            }),
            variante("2:3", { taille0: "l", state: "default" }, "x0", {
              tokens: { foreground: "{c.0.l.default}" },
              sample: "x0",
            }),
            variante("2:4", { taille0: "l", state: "hover" }, "x0", {
              tokens: { foreground: "{c.0.l.hover}" },
              sample: "x0",
            }),
          ],
          {
            props: {
              taille0: { type: "enum", values: ["s", "l"] },
              montrer0: { type: "boolean", default: true },
              glyphe0: { type: "instance-swap" },
              texte0: { type: "string" },
              ajout0: { type: "slot" },
              motif: {
                type: "enum",
                values: ["etoile", "lune"],
                source: { slotPath: ["signe"], component: "Signe", prop: "motif" },
              },
            },
            stateModel: {
              axis: "state",
              states: { default: {}, hover: { selector: ":hover" } },
              precedence: ["hover", "default"],
            },
            composes: [{ component: "Signe", figmaLayer: "Signe" }],
          },
        ),
      },
      variants: [
        variante("1:1", { ton: "a" }, "x1", {
          pieces: [
            renvoi(["piece"], "1:10", "2:1", "x0", {
              values: { montrer0: true, glyphe0: "Signe" },
              tokens: { foreground: "{c.0.s.default}" },
            }),
          ],
        }),
        variante("1:2", { ton: "b" }, "x1", {
          pieces: [
            renvoi(["piece"], "1:12", "2:1", "x0", {
              values: { montrer0: true, glyphe0: "Signe" },
              tokens: { foreground: "{c.0.s.default}" },
            }),
          ],
        }),
      ],
      textStyles: {
        accent: {
          figmaName: "Accent",
          tokens: { fontFamily: "{typography.body.family}", fontSize: "{typography.body.size}" },
          literals: { textTransform: "uppercase" },
        },
      },
      pertes: [
        perte(
          "variants[0].pieces[0]",
          "explicitVariableModes force un mode de variable sur l’occurrence (mode).",
        ),
        perte(
          "variants[1].pieces[0]",
          "explicitVariableModes force un mode de variable sur l’occurrence (mode).",
        ),
      ],
    }),
  },
  {
    id: "M-E04b-mode-inerte",
    ref: "A20",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Vigie",
      props: { ton: { type: "enum", values: ["a", "b"] }, contenu: { type: "slot" } },
      structure: { variantAxes: ["ton"], view: "x1" },
      viewStructures: {
        x0: boite([
          { slot: "label", figmaLayer: "Texte", optional: true, visibilityProp: "montrer0" },
          { slot: "signe", figmaLayer: "Signe", composes: "Signe" },
          { slot: "ajout", figmaLayer: "Ajout" },
        ]),
        x1: boite([{ slot: "contenu", figmaLayer: "Contenu" }, slotPiece("piece", ".Piece0", "Piece0")]),
      },
      variantViews: {
        x0: { structure: "x0", paintPlacements: "x0", composes: "x0", typography: "x0" },
        x1: { structure: "x1" },
      },
      viewPaintPlacements: { x0: { fills: { foreground: [["label"], ["signe"]] } } },
      viewComposes: { x0: [{ component: "Signe", figmaLayer: "Signe" }] },
      viewTypographies: { x0: [{ style: "accent", slotPath: ["label"] }] },
      samples: { x0: { args: { texte0: "T0" }, text: [{ slotPath: ["label"], value: "T0" }] } },
      pieces: {
        Piece0: entree(
          ".Piece0",
          "2:0",
          { variantAxes: ["taille0", "state"], view: "x0" },
          [
            variante("2:1", { taille0: "s", state: "default" }, "x0", {
              tokens: { foreground: "{c.0.s.default}" },
              sample: "x0",
            }),
            variante("2:2", { taille0: "s", state: "hover" }, "x0", {
              tokens: { foreground: "{c.0.s.hover}" },
              sample: "x0",
            }),
            variante("2:3", { taille0: "l", state: "default" }, "x0", {
              tokens: { foreground: "{c.0.l.default}" },
              sample: "x0",
            }),
            variante("2:4", { taille0: "l", state: "hover" }, "x0", {
              tokens: { foreground: "{c.0.l.hover}" },
              sample: "x0",
            }),
          ],
          {
            props: {
              taille0: { type: "enum", values: ["s", "l"] },
              montrer0: { type: "boolean", default: true },
              glyphe0: { type: "instance-swap" },
              texte0: { type: "string" },
              ajout0: { type: "slot" },
              motif: {
                type: "enum",
                values: ["etoile", "lune"],
                source: { slotPath: ["signe"], component: "Signe", prop: "motif" },
              },
            },
            stateModel: {
              axis: "state",
              states: { default: {}, hover: { selector: ":hover" } },
              precedence: ["hover", "default"],
            },
            composes: [{ component: "Signe", figmaLayer: "Signe" }],
          },
        ),
      },
      variants: [
        variante("1:1", { ton: "a" }, "x1", {
          pieces: [
            renvoi(["piece"], "1:10", "2:1", "x0", {
              values: { montrer0: true, glyphe0: "Signe" },
              tokens: { foreground: "{c.0.s.default}" },
            }),
          ],
        }),
        variante("1:2", { ton: "b" }, "x1", {
          pieces: [
            renvoi(["piece"], "1:12", "2:1", "x0", {
              values: { montrer0: true, glyphe0: "Signe" },
              tokens: { foreground: "{c.0.s.default}" },
            }),
          ],
        }),
      ],
      textStyles: {
        accent: {
          figmaName: "Accent",
          tokens: { fontFamily: "{typography.body.family}", fontSize: "{typography.body.size}" },
          literals: { textTransform: "uppercase" },
        },
      },
    }),
  },
  {
    id: "M-E06-source-dans-entree",
    ref: "E06, A16",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Vigie",
      props: { ton: { type: "enum", values: ["a", "b"] }, contenu: { type: "slot" } },
      structure: { variantAxes: ["ton"], view: "x2" },
      viewStructures: {
        x0: boite([
          { slot: "label", figmaLayer: "Texte", optional: true, visibilityProp: "montrer1" },
          { slot: "signe", figmaLayer: "Signe", composes: "Signe" },
          { slot: "ajout", figmaLayer: "Ajout" },
        ]),
        x1: boite([
          { slot: "label", figmaLayer: "Texte", optional: true, visibilityProp: "montrer0" },
          { slot: "signe", figmaLayer: "Signe", composes: "Signe" },
          { slot: "ajout", figmaLayer: "Ajout" },
          slotPiece("piece", ".Piece1", "Piece1"),
        ]),
        x2: boite([{ slot: "contenu", figmaLayer: "Contenu" }, slotPiece("piece", ".Piece0", "Piece0")]),
      },
      variantViews: {
        x0: { structure: "x0", paintPlacements: "x0", composes: "x0", typography: "x0" },
        x1: { structure: "x1", paintPlacements: "x0", composes: "x0", typography: "x0" },
        x2: { structure: "x2" },
      },
      viewPaintPlacements: { x0: { fills: { foreground: [["label"], ["signe"]] } } },
      viewComposes: { x0: [{ component: "Signe", figmaLayer: "Signe" }] },
      viewTypographies: { x0: [{ style: "accent", slotPath: ["label"] }] },
      samples: {
        x0: { args: { texte1: "T1" }, text: [{ slotPath: ["label"], value: "T1" }] },
        x1: { args: { texte0: "T0" }, text: [{ slotPath: ["label"], value: "T0" }] },
      },
      pieces: {
        Piece1: entree(
          ".Piece1",
          "3:0",
          { variantAxes: ["taille1", "state"], view: "x0" },
          [
            variante("3:1", { taille1: "s", state: "default" }, "x0", {
              tokens: { foreground: "{c.1.s.default}" },
              sample: "x0",
            }),
            variante("3:2", { taille1: "s", state: "hover" }, "x0", {
              tokens: { foreground: "{c.1.s.hover}" },
              sample: "x0",
            }),
            variante("3:3", { taille1: "l", state: "default" }, "x0", {
              tokens: { foreground: "{c.1.l.default}" },
              sample: "x0",
            }),
            variante("3:4", { taille1: "l", state: "hover" }, "x0", {
              tokens: { foreground: "{c.1.l.hover}" },
              sample: "x0",
            }),
          ],
          {
            props: {
              taille1: { type: "enum", values: ["s", "l"] },
              montrer1: { type: "boolean", default: true },
              glyphe1: { type: "instance-swap" },
              texte1: { type: "string" },
              ajout1: { type: "slot" },
              motif: {
                type: "enum",
                values: ["etoile", "lune"],
                source: { slotPath: ["signe"], component: "Signe", prop: "motif" },
              },
            },
            stateModel: {
              axis: "state",
              states: { default: {}, hover: { selector: ":hover" } },
              precedence: ["hover", "default"],
            },
            composes: [{ component: "Signe", figmaLayer: "Signe" }],
          },
        ),
        Piece0: entree(
          ".Piece0",
          "2:0",
          { variantAxes: ["taille0", "state"], view: "x1" },
          [
            variante("2:1", { taille0: "s", state: "default" }, "x1", {
              tokens: { foreground: "{c.0.s.default}" },
              sample: "x1",
              pieces: [
                renvoi(["piece"], "3:80", "3:1", "x0", {
                  tokens: { foreground: "{c.1.s.default}" },
                  values: { montrer1: true, glyphe1: "Signe" },
                }),
              ],
            }),
            variante("2:2", { taille0: "s", state: "hover" }, "x1", {
              tokens: { foreground: "{c.0.s.hover}" },
              sample: "x1",
              pieces: [
                renvoi(["piece"], "3:80", "3:2", "x0", {
                  tokens: { foreground: "{c.1.s.hover}" },
                  values: { montrer1: true, glyphe1: "Signe" },
                }),
              ],
            }),
            variante("2:3", { taille0: "l", state: "default" }, "x1", {
              tokens: { foreground: "{c.0.l.default}" },
              sample: "x1",
              pieces: [
                renvoi(["piece"], "3:80", "3:3", "x0", {
                  tokens: { foreground: "{c.1.l.default}" },
                  values: { montrer1: true, glyphe1: "Signe" },
                }),
              ],
            }),
            variante("2:4", { taille0: "l", state: "hover" }, "x1", {
              tokens: { foreground: "{c.0.l.hover}" },
              sample: "x1",
              pieces: [
                renvoi(["piece"], "3:80", "3:4", "x0", {
                  tokens: { foreground: "{c.1.l.hover}" },
                  values: { montrer1: true, glyphe1: "Signe" },
                }),
              ],
            }),
          ],
          {
            props: {
              taille0: { type: "enum", values: ["s", "l"] },
              montrer0: { type: "boolean", default: true },
              glyphe0: { type: "instance-swap" },
              texte0: { type: "string" },
              ajout0: { type: "slot" },
              taille1: { type: "enum", values: ["s", "l"], source: { slotPath: ["piece"], prop: "taille1" } },
              montrer1: { type: "boolean", default: true, source: { slotPath: ["piece"], prop: "montrer1" } },
              glyphe1: { type: "instance-swap", source: { slotPath: ["piece"], prop: "glyphe1" } },
              texte1: { type: "string", source: { slotPath: ["piece"], prop: "texte1" } },
              motif: {
                type: "enum",
                values: ["etoile", "lune"],
                source: { slotPath: ["piece"], prop: "motif" },
              },
            },
            stateModel: {
              axis: "state",
              states: { default: {}, hover: { selector: ":hover" } },
              precedence: ["hover", "default"],
            },
            composes: [{ component: "Signe", figmaLayer: "Signe" }],
          },
        ),
      },
      variants: [
        variante("1:1", { ton: "a" }, "x2", {
          pieces: [
            renvoi(["piece"], "1:10", "2:1", "x1", {
              values: { montrer0: true, glyphe0: "Signe", montrer1: false, glyphe1: "Signe" },
              tokens: { foreground: "{c.0.s.default}" },
              pieces: [
                renvoi(["piece"], "I1:10;3:80", "3:1", "x0", {
                  tokens: { foreground: "{c.1.s.default}" },
                  values: { montrer1: false, glyphe1: "Signe" },
                }),
              ],
            }),
          ],
        }),
        variante("1:2", { ton: "b" }, "x2", {
          pieces: [
            renvoi(["piece"], "1:12", "2:1", "x1", {
              values: { montrer0: true, glyphe0: "Signe", montrer1: false, glyphe1: "Signe" },
              tokens: { foreground: "{c.0.s.default}" },
              pieces: [
                renvoi(["piece"], "I1:12;3:80", "3:1", "x0", {
                  tokens: { foreground: "{c.1.s.default}" },
                  values: { montrer1: false, glyphe1: "Signe" },
                }),
              ],
            }),
          ],
        }),
      ],
      textStyles: {
        accent: {
          figmaName: "Accent",
          tokens: { fontFamily: "{typography.body.family}", fontSize: "{typography.body.size}" },
          literals: { textTransform: "uppercase" },
        },
      },
    }),
  },
  {
    id: "codex-D6-slot-piece",
    ref: "passe finale",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Etincelle",
      viewStructures: {
        h: boite([slotPiece("coque", undefined, "Coque")]),
        p: boite([{ slot: "ajout", figmaLayer: "Ajout" }]),
      },
      variantViews: { h: { structure: "h" }, p: { structure: "p" } },
      variants: [
        variante("1:1", undefined, "h", {
          figmaName: "Etincelle",
          pieces: [renvoi(["coque"], "1:2", "2:1", "p")],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Coque: entree(
          ".Coque",
          "2:0",
          { view: "p" },
          [variante("2:1", undefined, "p", { figmaName: "Coque" })],
          { props: { ajout: { type: "slot" } } },
        ),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
      pertes: [
        perte(
          "variants[0].pieces[0]",
          "Le contenu du SLOT ajout de Coque manque dans cette occurrence.",
        ),
      ],
    }),
  },
  {
    id: "codex-F10-valeurs",
    ref: "passe finale",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Eclat",
      viewStructures: {
        h: boite([slotPiece("coque", undefined, "Coque")]),
        p: boite([
          { slot: "label", optional: true, visibilityProp: "montrer" },
          { slot: "gemme", figmaLayer: "Gemme", composes: "Gemme" },
        ]),
      },
      viewComposes: { c: [{ component: "Gemme", figmaLayer: "Gemme" }] },
      variantViews: { h: { structure: "h" }, p: { structure: "p", composes: "c" } },
      variants: [
        variante("1:1", undefined, "h", {
          figmaName: "Eclat",
          pieces: [renvoi(["coque"], "1:2", "2:1", "p", { values: { montrer: false, motif: "Gemme" } })],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Coque: entree(
          ".Coque",
          "2:0",
          { view: "p" },
          [variante("2:1", undefined, "p", { figmaName: "Coque" })],
          {
            props: {
              montrer: { type: "boolean", default: true },
              motif: { type: "instance-swap", default: "Gemme" },
            },
            composes: [{ component: "Gemme", figmaLayer: "Gemme" }],
          },
        ),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
    }),
  },
  {
    id: "codex-F11-D6-slot-hote",
    ref: "passe finale",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Veilleuse",
      props: { montrer: { type: "boolean", default: false }, contenu: { type: "slot" } },
      viewStructures: {
        h: boite([
          {
            slot: "contenu",
            figmaLayer: "Contenu",
            optional: true,
            visibilityProp: "montrer",
            layout: "flex-row",
            children: [slotPiece("coque", undefined, "Coque")],
          },
        ]),
        p: boite(),
      },
      variantViews: { h: { structure: "h" }, p: { structure: "p" } },
      variants: [
        variante("1:1", undefined, "h", {
          figmaName: "Veilleuse",
          pieces: [renvoi(["contenu", "coque"], "1:2", "2:1", "p")],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Coque: entree(".Coque", "2:0", { view: "p" }, [
          variante("2:1", undefined, "p", { figmaName: "Coque" }),
        ]),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
    }),
  },
  {
    id: "codex-F16-F19-F21-F27",
    ref: "passe finale",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Aurore",
      viewStructures: {
        h: boite([slotPiece("coque", undefined, "Coque"), slotPiece("coque-2", undefined, "Coque")]),
        p: boite([{ slot: "signe", figmaLayer: "Signe", composes: "Signe" }]),
      },
      viewComposes: { c: [{ component: "Signe", figmaLayer: "Signe" }] },
      viewIcons: { i: { etoile: { figmaName: "etoile", slotPath: ["signe"] } } },
      viewPaintPlacements: { pp: { fills: { foreground: [["signe"]] } } },
      variantViews: {
        h: { structure: "h" },
        p: { structure: "p", composes: "c", icons: "i", paintPlacements: "pp" },
      },
      variants: [
        variante("1:1", undefined, "h", {
          figmaName: "Aurore",
          pieces: [
            renvoi(["coque"], "1:2", "2:1", "p", {
              tokens: { foreground: "{components.aurore.encre}" },
            }),
            renvoi(["coque-2"], "1:3", "2:1", "p", {
              tokens: { foreground: "{components.aurore.encre}" },
            }),
          ],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Coque: entree(
          ".Coque",
          "2:0",
          { view: "p" },
          [
            variante("2:1", undefined, "p", {
              figmaName: "Coque",
              tokens: { foreground: "{components.aurore.encre}" },
            }),
          ],
          {
            props: { signeName: { type: "icon", policy: "modifiable" } },
            icons: {
              etoile: { figmaName: "etoile", policy: "modifiable", slot: "signe", runtimeProp: "signeName" },
            },
            composes: [{ component: "Signe", figmaLayer: "Signe" }],
          },
        ),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
    }),
  },
  {
    id: "codex-F33-sans-choix",
    ref: "passe finale",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Lueur",
      viewStructures: {
        h: boite([slotPiece("anneau", undefined, "Anneau")]),
        p: boite(undefined, { layout: "flex-row", sizing: { width: "stretch", height: "stretch" } }),
      },
      variantViews: { h: { structure: "h" }, p: { structure: "p" } },
      variants: [
        variante("1:1", undefined, "h", {
          figmaName: "Lueur",
          pieces: [renvoi(["anneau"], "1:2", "2:1", "p")],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Anneau: entree(
          ".Anneau",
          "2:0",
          { view: "p", variantAxes: ["property1"] },
          [variante("2:1", { property1: "default" }, "p", { figmaName: "Property 1=Default" })],
          { props: { property1: { type: "enum", values: ["default"] } } },
        ),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
    }),
  },
  {
    id: "codex-F44-contours",
    ref: "passe finale",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Couronne",
      viewStructures: {
        h: boite([slotPiece("lame", undefined, "Lame"), slotPiece("lame-2", undefined, "Lame")]),
        p: boite(),
      },
      viewPaintPlacements: { pp: { strokes: { border: [[]] } } },
      variantViews: { h: { structure: "h" }, p: { structure: "p", paintPlacements: "pp" } },
      variants: [
        variante("1:1", undefined, "h", {
          figmaName: "Couronne",
          pieces: [
            renvoi(["lame"], "1:2", "2:1", "p", {
              strokes: {
                border: {
                  color: "{components.couronne.border}",
                  width: { top: "{layout.stroke.fin}", left: "{layout.stroke.fin}" },
                  align: "inside",
                },
              },
            }),
            renvoi(["lame-2"], "1:3", "2:2", "p", {
              strokes: {
                border: {
                  color: "{components.couronne.border}",
                  width: { top: "{layout.stroke.fin}", right: "{layout.stroke.fin}" },
                  align: "inside",
                },
              },
            }),
          ],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Lame: entree(
          ".Lame",
          "2:0",
          { view: "p", variantAxes: ["position"] },
          [
            variante("2:1", { position: "debut" }, "p", {
              figmaName: "Position=Debut",
              strokes: {
                border: {
                  color: "{components.couronne.border}",
                  width: { top: "{layout.stroke.fin}", left: "{layout.stroke.fin}" },
                  align: "inside",
                },
              },
            }),
            variante("2:2", { position: "fin" }, "p", {
              figmaName: "Position=Fin",
              strokes: {
                border: {
                  color: "{components.couronne.border}",
                  width: { top: "{layout.stroke.fin}", right: "{layout.stroke.fin}" },
                  align: "inside",
                },
              },
            }),
          ],
          { props: { position: { type: "enum", values: ["debut", "fin"] } } },
        ),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
    }),
  },
  {
    id: "codex-F5-partage",
    ref: "passe finale",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Girouette",
      viewStructures: { h: boite([slotPiece("voile", undefined, "Voile")]), p: boite() },
      viewPaintPlacements: { pp: { fills: { background: [[]] } } },
      variantViews: { h: { structure: "h" }, p: { structure: "p", paintPlacements: "pp" } },
      variants: [
        variante("1:1", undefined, "h", {
          figmaName: "Girouette",
          pieces: [
            renvoi(["voile"], "1:2", "2:1", "p", {
              tokens: { background: "{components.autrehote.background}" },
            }),
          ],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Voile: entree(".Voile", "2:0", { view: "p" }, [
          variante("2:1", undefined, "p", {
            figmaName: "Voile",
            tokens: { background: "{components.autrehote.background}" },
          }),
        ]),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
    }),
  },
  {
    id: "codex-F6-effacement",
    ref: "passe finale",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Torche",
      viewStructures: { h: boite([slotPiece("prisme", undefined, "Prisme")]), p: boite() },
      viewPaintPlacements: { pp: { fills: { background: [[]] }, strokes: { border: [[]] } } },
      variantViews: {
        h: { structure: "h" },
        p: { structure: "p", paintPlacements: "pp" },
        vide: { structure: "p" },
      },
      variants: [
        variante("1:1", undefined, "h", {
          figmaName: "Torche",
          pieces: [renvoi(["prisme"], "1:2", "2:1", "vide")],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Prisme: entree(".Prisme", "2:0", { view: "p" }, [
          variante("2:1", undefined, "p", {
            figmaName: "Prisme",
            tokens: { background: "{components.torche.background}" },
            strokes: {
              border: { color: "{components.torche.border}", width: "{layout.stroke.fin}", align: "inside" },
            },
          }),
        ]),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
    }),
  },
  {
    id: "codex-F7-imbrique",
    ref: "passe finale",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Borne",
      viewStructures: {
        h: boite([slotPiece("coque", undefined, "Coque")]),
        p: boite([slotPiece("perle", undefined, "Perle")]),
        q: boite(),
        r: boite(undefined, { padding: { x: "{components.borne.long}" } }),
      },
      variantViews: { h: { structure: "h" }, p: { structure: "p" }, q: { structure: "q" }, r: { structure: "r" } },
      variants: [
        variante("1:1", undefined, "h", {
          figmaName: "Borne",
          pieces: [
            renvoi(["coque"], "1:2", "2:1", "p", {
              pieces: [renvoi(["perle"], "I1:2;2:2", "3:2", "r")],
            }),
          ],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Coque: entree(".Coque", "2:0", { view: "p" }, [
          variante("2:1", undefined, "p", {
            figmaName: "Coque",
            pieces: [renvoi(["perle"], "2:2", "3:1", "q")],
          }),
        ]),
        Perle: entree(
          ".Perle",
          "3:0",
          { view: "q", variantAxes: ["format"] },
          [
            variante("3:1", { format: "court" }, "q", { figmaName: "Format=Court" }),
            variante("3:2", { format: "long" }, "r", { figmaName: "Format=Long" }),
          ],
          { props: { format: { type: "enum", values: ["court", "long"] } } },
        ),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
    }),
  },
  {
    id: "codex-F8-liaison",
    ref: "passe finale",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Rivet",
      props: { montrer: { type: "boolean", default: true } },
      viewStructures: {
        h: boite([slotPiece("coque", ".Coque", "Coque")]),
        p: boite([{ slot: "label", figmaLayer: "Texte" }]),
      },
      variantViews: { h: { structure: "h" }, p: { structure: "p" } },
      propertyBindingDefinitions: {
        b: {
          prop: "montrer",
          figmaPropName: "Montrer#1:0",
          target: "visible",
          figmaPath: [".Coque", "Texte"],
        },
      },
      variants: [
        variante("1:1", undefined, "h", {
          figmaName: "Rivet",
          bindings: [{ definition: "b", nodeId: "I1:2;2:2" }],
          pieces: [renvoi(["coque"], "1:2", "2:1", "p")],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Coque: entree(".Coque", "2:0", { view: "p" }, [
          variante("2:1", undefined, "p", { figmaName: "Coque" }),
        ]),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
    }),
  },
  {
    id: "codex-F9-boite",
    ref: "passe finale",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Flamme",
      viewStructures: {
        h: boite([
          slotPiece("coque", undefined, "Coque", {
            size: { width: "{components.flamme.largeur}" },
            opacity: "{components.flamme.opacite}",
            rotation: "12deg",
            bounds: { maxWidth: "{components.flamme.max}" },
          }),
        ]),
        p: boite(undefined, {
          layout: "flex-row",
          sizing: { width: "{components.flamme.maitre}", height: "stretch" },
          opacity: "{components.flamme.maitre-opacite}",
          rotation: "4deg",
        }),
      },
      variantViews: { h: { structure: "h" }, p: { structure: "p" } },
      variants: [
        variante("1:1", undefined, "h", {
          figmaName: "Flamme",
          pieces: [renvoi(["coque"], "1:2", "2:1", "p")],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Coque: entree(".Coque", "2:0", { view: "p" }, [
          variante("2:1", undefined, "p", { figmaName: "Coque" }),
        ]),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
    }),
  },
  {
    id: "codex-L1",
    ref: "passe finale",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Lanterne",
      viewStructures: {
        h: boite([slotPiece("prisme", ".Prisme", "Prisme"), slotPiece("voile", ".Voile", "Voile")]),
        p: boite(undefined, { padding: { x: "{components.lanterne.court}" } }),
        q: boite(undefined, { padding: { x: "{components.lanterne.long}" } }),
      },
      variantViews: { h: { structure: "h" }, p: { structure: "p" }, q: { structure: "q" } },
      variants: [
        variante("1:1", undefined, "h", {
          figmaName: "Lanterne",
          pieces: [renvoi(["prisme"], "1:2", "2:1", "p"), renvoi(["voile"], "1:3", "3:1", "p")],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Prisme: entree(
          ".Prisme",
          "2:0",
          { view: "p", variantAxes: ["size"] },
          [
            variante("2:1", { size: "small" }, "p", { figmaName: "Size=Small" }),
            variante("2:2", { size: "large" }, "q", { figmaName: "Size=Large" }),
          ],
          { props: { size: { type: "enum", values: ["small", "large"] } } },
        ),
        Voile: entree(
          ".Voile",
          "3:0",
          { view: "p", variantAxes: ["size"] },
          [
            variante("3:1", { size: "small" }, "p", { figmaName: "Size=Small" }),
            variante("3:2", { size: "large" }, "q", { figmaName: "Size=Large" }),
          ],
          { props: { size: { type: "enum", values: ["small", "large"] } } },
        ),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
    }),
  },
  {
    id: "codex-L2-L4",
    ref: "passe finale",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Balise",
      viewStructures: {
        h: boite([slotPiece("prisme", ".Prisme", "Prisme")]),
        p: boite(undefined, { gap: "{components.balise.small}" }),
        q: boite(undefined, { gap: "{components.balise.large}" }),
      },
      variantViews: { h: { structure: "h" }, p: { structure: "p" }, q: { structure: "q" } },
      variants: [
        variante("1:1", undefined, "h", {
          figmaName: "Balise",
          pieces: [renvoi(["prisme"], "1:2", "2:1", "p")],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Prisme: entree(
          ".Prisme",
          "2:0",
          { view: "p", variantAxes: ["size"] },
          [
            variante("2:1", { size: "small" }, "p", { figmaName: "Size=Small" }),
            variante("2:2", { size: "large" }, "q", { figmaName: "Size=Large" }),
          ],
          {
            props: { size: { type: "enum", values: ["small", "large"] } },
            intent: { usage: "Rend le motif interne." },
          },
        ),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
    }),
  },
  {
    id: "codex-L3-F23",
    ref: "passe finale",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Signal",
      props: { size: { type: "enum", values: ["small", "large"] } },
      viewStructures: {
        h: boite([slotPiece("prisme", undefined, "Prisme")]),
        p: boite(undefined, { padding: { x: "{components.signal.small}" } }),
        q: boite(undefined, { padding: { x: "{components.signal.large}" } }),
      },
      variantViews: { h: { structure: "h" }, p: { structure: "p" }, q: { structure: "q" } },
      variants: [
        variante("1:1", { size: "small" }, "h", {
          figmaName: "Size=Small",
          pieces: [renvoi(["prisme"], "1:2", "2:1", "p")],
        }),
        variante("1:3", { size: "large" }, "h", {
          figmaName: "Size=Large",
          pieces: [renvoi(["prisme"], "1:4", "2:2", "q")],
        }),
      ],
      structure: { view: "h", variantAxes: ["size"] },
      pieces: {
        Prisme: entree(
          ".Prisme",
          "2:0",
          { view: "p", variantAxes: ["size"] },
          [
            variante("2:1", { size: "small" }, "p", { figmaName: "Size=Small" }),
            variante("2:2", { size: "large" }, "q", { figmaName: "Size=Large" }),
          ],
          { props: { size: { type: "enum", values: ["small", "large"] } } },
        ),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
    }),
  },
  {
    id: "codex-L5-detail",
    ref: "passe finale",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Flambeau",
      viewStructures: { h: boite([{ slot: "toile", figmaLayer: "Toile" }]) },
      variantViews: { h: { structure: "h" } },
      variants: [variante("1:1", undefined, "h", { figmaName: "Flambeau" })],
      structure: { view: "h" },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
      pertes: [
        perte(
          "viewStructures.h.children[0]",
          "Le détail Toile est aplati. Ses autres variantes manquent.",
        ),
      ],
    }),
  },
  {
    id: "codex-L5-prefixe",
    ref: "passe finale",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Fanion",
      viewStructures: { h: boite([slotPiece("toile", "_Toile", "Toile")]), p: boite() },
      variantViews: { h: { structure: "h" }, p: { structure: "p" } },
      variants: [
        variante("1:1", undefined, "h", {
          figmaName: "Fanion",
          pieces: [renvoi(["toile"], "1:2", "2:1", "p")],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Toile: entree(
          "_Toile",
          "2:0",
          { view: "p", variantAxes: ["format"] },
          [
            variante("2:1", { format: "etoile" }, "p", { figmaName: "Format=Etoile" }),
            variante("2:2", { format: "lune" }, "p", { figmaName: "Format=Lune" }),
          ],
          { props: { format: { type: "enum", values: ["etoile", "lune"] } } },
        ),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
    }),
  },
  {
    id: "codex-L6",
    ref: "passe finale",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Phare",
      props: {
        theme: { type: "enum", values: ["clair", "sombre"] },
        format: {
          type: "enum",
          values: ["court", "long"],
          source: { slotPath: ["prisme"], prop: "format" },
        },
      },
      viewStructures: { h: boite([slotPiece("prisme", undefined, "Prisme")]), p: boite() },
      variantViews: { h: { structure: "h" }, p: { structure: "p" } },
      variants: [
        variante("1:1", { theme: "clair" }, "h", {
          figmaName: "Theme=Clair",
          pieces: [renvoi(["prisme"], "1:2", "2:1", "p")],
        }),
        variante("1:3", { theme: "sombre" }, "h", {
          figmaName: "Theme=Sombre",
          pieces: [renvoi(["prisme"], "1:4", "2:1", "p")],
        }),
      ],
      structure: { view: "h", variantAxes: ["theme"] },
      pieces: {
        Prisme: entree(
          ".Prisme",
          "2:0",
          { view: "p", variantAxes: ["format"] },
          [
            variante("2:1", { format: "court" }, "p", { figmaName: "Format=Court" }),
            variante("2:2", { format: "long" }, "p", { figmaName: "Format=Long" }),
          ],
          { props: { format: { type: "enum", values: ["court", "long"] } } },
        ),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
      pertes: [
        perte(
          "props.format",
          "La pièce Prisme est exposée dans un seul variant. La prop format manque dans le variant 1:3.",
        ),
      ],
    }),
  },
  {
    id: "codex-Q-dependance-exposee",
    ref: "passe finale",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Aurore",
      viewStructures: {
        h: boite([slotPiece("coque", undefined, "Coque"), slotPiece("coque-2", undefined, "Coque")]),
        p: boite([{ slot: "signe", figmaLayer: "Signe", composes: "Signe" }]),
      },
      viewComposes: { c: [{ component: "Signe", figmaLayer: "Signe" }] },
      viewIcons: { i: { etoile: { figmaName: "etoile", slotPath: ["signe"] } } },
      viewPaintPlacements: { pp: { fills: { foreground: [["signe"]] } } },
      variantViews: {
        h: { structure: "h" },
        p: { structure: "p", composes: "c", icons: "i", paintPlacements: "pp" },
      },
      variants: [
        variante("1:1", undefined, "h", {
          figmaName: "Aurore",
          pieces: [
            renvoi(["coque"], "1:2", "2:1", "p", {
              tokens: { foreground: "{components.aurore.encre}" },
            }),
            renvoi(["coque-2"], "1:3", "2:1", "p", {
              tokens: { foreground: "{components.aurore.encre}" },
            }),
          ],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Coque: entree(
          ".Coque",
          "2:0",
          { view: "p" },
          [
            variante("2:1", undefined, "p", {
              figmaName: "Coque",
              tokens: { foreground: "{components.aurore.encre}" },
            }),
          ],
          {
            props: {
              signeName: { type: "icon", policy: "modifiable" },
              motif: {
                type: "enum",
                values: ["etoile", "lune"],
                source: { slotPath: ["signe"], component: "Signe", prop: "motif" },
              },
            },
            icons: {
              etoile: { figmaName: "etoile", policy: "modifiable", slot: "signe", runtimeProp: "signeName" },
            },
            composes: [{ component: "Signe", figmaLayer: "Signe" }],
          },
        ),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
      props: {
        motif: { type: "enum", values: ["etoile", "lune"], source: { slotPath: ["coque"], prop: "motif" } },
      },
    }),
  },
  {
    id: "codex-Q-source-deux-niveaux",
    ref: "passe finale",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Borne",
      viewStructures: {
        h: boite([slotPiece("coque", undefined, "Coque")]),
        p: boite([slotPiece("perle", undefined, "Perle")]),
        q: boite(),
        r: boite(undefined, { padding: { x: "{components.borne.long}" } }),
      },
      variantViews: { h: { structure: "h" }, p: { structure: "p" }, q: { structure: "q" }, r: { structure: "r" } },
      variants: [
        variante("1:1", undefined, "h", {
          figmaName: "Borne",
          pieces: [
            renvoi(["coque"], "1:2", "2:1", "p", {
              pieces: [renvoi(["perle"], "I1:2;2:2", "3:2", "r")],
            }),
          ],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Coque: entree(
          ".Coque",
          "2:0",
          { view: "p" },
          [
            variante("2:1", undefined, "p", {
              figmaName: "Coque",
              pieces: [renvoi(["perle"], "2:2", "3:1", "q")],
            }),
          ],
          {
            props: {
              format: {
                type: "enum",
                values: ["court", "long"],
                source: { slotPath: ["perle"], prop: "format" },
              },
            },
          },
        ),
        Perle: entree(
          ".Perle",
          "3:0",
          { view: "q", variantAxes: ["format"] },
          [
            variante("3:1", { format: "court" }, "q", { figmaName: "Format=Court" }),
            variante("3:2", { format: "long" }, "r", { figmaName: "Format=Long" }),
          ],
          { props: { format: { type: "enum", values: ["court", "long"] } } },
        ),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
      props: {
        format: { type: "enum", values: ["court", "long"], source: { slotPath: ["coque"], prop: "format" } },
      },
    }),
  },
  {
    id: "codex-Q-swap-illisible",
    ref: "passe finale",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Eclat",
      viewStructures: {
        h: boite([slotPiece("coque", undefined, "Coque")]),
        p: boite([
          { slot: "label", optional: true, visibilityProp: "montrer" },
          { slot: "gemme", figmaLayer: "Gemme", composes: "Gemme" },
        ]),
      },
      viewComposes: { c: [{ component: "Gemme", figmaLayer: "Gemme" }] },
      variantViews: { h: { structure: "h" }, p: { structure: "p", composes: "c" } },
      variants: [
        variante("1:1", undefined, "h", {
          figmaName: "Eclat",
          pieces: [renvoi(["coque"], "1:2", "2:1", "p", { values: { montrer: false } })],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Coque: entree(
          ".Coque",
          "2:0",
          { view: "p" },
          [variante("2:1", undefined, "p", { figmaName: "Coque" })],
          {
            props: {
              montrer: { type: "boolean", default: true },
              motif: { type: "instance-swap", default: "Gemme" },
            },
            composes: [{ component: "Gemme", figmaLayer: "Gemme" }],
          },
        ),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
      pertes: [perte("variants[0].pieces[0]", "Le composant placé dans motif ne peut pas être nommé.")],
    }),
  },
  {
    id: "codex-Q-variante-absente",
    ref: "passe finale",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Balise",
      viewStructures: {
        h: boite([slotPiece("prisme", ".Prisme", "Prisme")]),
        p: boite(undefined, { gap: "{components.balise.small}" }),
        q: boite(undefined, { gap: "{components.balise.large}" }),
      },
      variantViews: { h: { structure: "h" }, p: { structure: "p" }, q: { structure: "q" } },
      variants: [
        variante("1:1", undefined, "h", {
          figmaName: "Balise",
          pieces: [renvoi(["prisme"], "1:2", "2:1", "p")],
        }),
      ],
      structure: { view: "h" },
      pieces: {
        Prisme: entree(
          ".Prisme",
          "2:0",
          { view: "p", variantAxes: ["size"] },
          [
            variante("2:1", { size: "small" }, "p", { figmaName: "Size=Small" }),
            variante("2:2", { size: "large" }, "q", { figmaName: "Size=Large" }),
          ],
          {
            props: { size: { type: "enum", values: ["small", "large", "medium"] } },
            intent: { usage: "Rend le motif interne." },
          },
        ),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
      props: {
        size: {
          type: "enum",
          values: ["small", "large", "medium"],
          source: { slotPath: ["prisme"], prop: "size" },
        },
      },
      pertes: [
        perte(
          "variants[0].pieces[0]",
          "La sélection size=medium ne désigne aucune variante. Aucune variante ne peut être choisie.",
        ),
      ],
    }),
  },
  {
    id: "codex-Q-variante-double",
    ref: "passe finale",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Signal",
      props: {
        size: { type: "enum", values: ["small", "large"], source: { slotPath: ["prisme"], prop: "size" } },
      },
      viewStructures: {
        h: boite([slotPiece("prisme", undefined, "Prisme")]),
        p: boite(undefined, { padding: { x: "{components.signal.small}" } }),
        q: boite(undefined, { padding: { x: "{components.signal.large}" } }),
      },
      variantViews: { h: { structure: "h" }, p: { structure: "p" }, q: { structure: "q" } },
      variants: [
        variante("1:1", { size: "small" }, "h", {
          figmaName: "Size=Small",
          pieces: [renvoi(["prisme"], "1:2", "2:1", "p")],
        }),
        variante("1:3", { size: "large" }, "h", {
          figmaName: "Size=Large",
          pieces: [renvoi(["prisme"], "1:4", "2:2", "q")],
        }),
      ],
      structure: { view: "h", variantAxes: ["size"] },
      pieces: {
        Prisme: entree(
          ".Prisme",
          "2:0",
          { view: "p", variantAxes: ["size"] },
          [
            variante("2:1", { size: "small" }, "p", { figmaName: "Size=Small" }),
            variante("2:2", { size: "large" }, "q", { figmaName: "Size=Large" }),
            variante("2:3", { size: "large" }, "p", { figmaName: "Size=Large" }),
          ],
          { props: { size: { type: "enum", values: ["small", "large"] } } },
        ),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
      pertes: [
        perte(
          "variants[0].pieces[0]",
          "La sélection size=large atteint deux variantes de rendus différents. Aucune variante ne peut être choisie.",
        ),
        perte(
          "variants[1].pieces[0]",
          "La sélection size=large atteint deux variantes de rendus différents. Aucune variante ne peut être choisie.",
        ),
      ],
    }),
  },
  {
    id: "codex-Q-variante-double-identique",
    ref: "passe finale",
    attendu: "accepte",
    contrat: () => contrat15({
      name: "Signal",
      props: {
        size: { type: "enum", values: ["small", "large"], source: { slotPath: ["prisme"], prop: "size" } },
      },
      viewStructures: {
        h: boite([slotPiece("prisme", undefined, "Prisme")]),
        p: boite(undefined, { padding: { x: "{components.signal.small}" } }),
        q: boite(undefined, { padding: { x: "{components.signal.large}" } }),
      },
      variantViews: { h: { structure: "h" }, p: { structure: "p" }, q: { structure: "q" } },
      variants: [
        variante("1:1", { size: "small" }, "h", {
          figmaName: "Size=Small",
          pieces: [renvoi(["prisme"], "1:2", "2:1", "p")],
        }),
        variante("1:3", { size: "large" }, "h", {
          figmaName: "Size=Large",
          pieces: [renvoi(["prisme"], "1:4", "2:2", "q")],
        }),
      ],
      structure: { view: "h", variantAxes: ["size"] },
      pieces: {
        Prisme: entree(
          ".Prisme",
          "2:0",
          { view: "p", variantAxes: ["size"] },
          [
            variante("2:1", { size: "small" }, "p", { figmaName: "Size=Small" }),
            variante("2:2", { size: "large" }, "q", { figmaName: "Size=Large" }),
            variante("2:3", { size: "large" }, "q", { figmaName: "Size=Large" }),
          ],
          { props: { size: { type: "enum", values: ["small", "large"] } } },
        ),
      },
      rendering: {
        roles: {
          background: { kind: "paint", cssProperties: ["background-color"] },
          foreground: { kind: "paint", cssProperties: ["color", "fill"] },
          border: { kind: "stroke", cssProperties: ["box-shadow"] },
        },
      },
      pertes: [
        perte(
          "variants[0].pieces[0]",
          "La sélection size=large atteint deux identités de variante. Aucune variante ne peut être choisie.",
        ),
        perte(
          "variants[1].pieces[0]",
          "La sélection size=large atteint deux identités de variante. Aucune variante ne peut être choisie.",
        ),
      ],
    }),
  },
];
