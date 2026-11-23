(function () {
  // Clarté OKLCH des courbes par défaut du moteur (PREREGLAGES[11], packages/couleur/src/nuances.ts).
  var CRANS = {{js:crans}};
  var CLARTE = {{js:clarte}};
  function teinte(mode, cran) {
    var l = CLARTE[mode][CRANS.indexOf(cran)];
    return { fond: 'oklch(' + l + ' 0.012 255)', texte: l > 0.55 ? '#111827' : '#f3f4f6' };
  }
  function pastille(mode, cran) {
    if (typeof cran !== 'number') return '<span class="doux">' + cran + '</span>';
    var t = teinte(mode, cran);
    return '<span class="cran" style="background:' + t.fond + ';color:' + t.texte + '">' + cran + '</span>';
  }
  [['light', 'Light'], ['dark', 'Dark']].forEach(function (m) {
    var el = document.getElementById('rampe-' + m[0]);
    var nom = document.createElement('div'); nom.className = 'mode'; nom.textContent = m[1]; el.appendChild(nom);
    CRANS.forEach(function (cran) {
      var t = teinte(m[0], cran), d = document.createElement('div');
      d.style.background = t.fond; d.style.color = t.texte; d.textContent = cran;
      el.appendChild(d);
    });
  });

  // Rampes calculées par packages/couleur pour les palettes de démonstration du hub (sens normal et inverse) et couleur des cartes.
  var DONNEES = {{js:DONNEES}};
  // Références du kit : collections et cibles, familles, table du thème par mode et par sens, garanties.
  // Sources : packages/kit/src/referentiel/architecture.ts, packages/kit/src/emplois/dossiers.ts, packages/kit/src/emplois/garanties.ts.
  var REFERENCE = {{js:REFERENCE}};
  // Rôle de chaque palette de démonstration dans l'architecture : marque ou utilitaire.
  var ROLES = [['brands', 'primary'], ['utility', 'neutral'], ['utility', 'success'], ['utility', 'warning'], ['utility', 'danger'], ['utility', 'info']];
  // Ce que chaque collection porte et qui l'écrit. Le reste de la note vient de REFERENCE : cibles et scope.
  var PORTE = {
    components: ['Les couleurs et les dimensions de chaque composant.', 'Architect l’écrit.'],
    theme: ['Les rôles de couleur du design system.', 'Architect l’écrit.'],
    brands: ['Les palettes de marque.', 'Elle est posée à la main.'],
    utility: ['Le neutre, l’élévation et les quatre statuts.', 'Elle est posée à la main.'],
    primitives: ['Les valeurs brutes, couleurs, dimensions et polices.', 'Palettes écrit le groupe color.'],
    layout: ['Les tailles, les rayons, les épaisseurs et les icônes.', 'Elle est posée à la main.'],
    typography: ['Les réglages de texte par famille et par taille.', 'Elle est posée à la main.']
  };
  // Ce que le kit définit pour la collection, et ce qu'il laisse à la piste P21.
  var DEFINI = {
    components: ['la forme des noms et les 25 propriétés admises', ''],
    theme: ['les 24 variables et le cran de chacune', ''],
    brands: ['la forme des chemins et les familles identity, primary et secondary', 'les variables attendues. Les lignes viennent du moteur de couleur.'],
    utility: ['la forme des chemins, les familles et les niveaux page et raised', 'les variables attendues. Les lignes viennent du moteur de couleur.'],
    primitives: ['la forme des chemins et les familles color, dimension et font-*', 'les valeurs de dimension et de font-*. Les couleurs viennent du moteur de couleur.'],
    layout: ['les familles sizing, radius, stroke et icon, et leurs chemins', 'Le kit ne définit aucune valeur de référence pour cette collection.'],
    typography: ['les familles display à label, et leurs chemins', 'Le kit ne définit aucune valeur de référence pour cette collection.']
  };
  // L'ordre du schéma, des primitives aux composants : une collection vient après celles qu'elle vise.
  var CIBLES = {}; REFERENCE.collections.forEach(function (c) { CIBLES[c.nom] = c.cibles; });
  function etage(nom) { return CIBLES[nom].length ? 1 + Math.max.apply(null, CIBLES[nom].map(etage)) : 0; }
  var COLLECTIONS = REFERENCE.collections.map(function (c, i) { return { nom: c.nom, etage: etage(c.nom), rang: i }; })
    .sort(function (a, b) { return a.etage - b.etage || a.rang - b.rang; }).map(function (c) { return c.nom; });
  var etatPanneau = { collection: 'theme', ouverts: {} };
  var choixPalette = document.getElementById('choix-palette'), choixIntensite = document.getElementById('choix-intensite'), choixSens = document.getElementById('choix-sens');
  DONNEES.palettes.forEach(function (p, i) { var o = document.createElement('option'); o.value = i; o.textContent = p.nom + ' (' + ROLES[i][1] + ')'; choixPalette.appendChild(o); });
  function intensites() {
    var p = DONNEES.palettes[+choixPalette.value], garde = choixIntensite.value;
    choixIntensite.innerHTML = '';
    Object.keys(p.intensites).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = k === 'unique' ? 'unique' : k.charAt(0).toUpperCase() + k.slice(1); choixIntensite.appendChild(o); });
    if (p.intensites[garde]) choixIntensite.value = garde;
    choixIntensite.disabled = Object.keys(p.intensites).length < 2;
  }
  // L'intensité d'une palette : celle du sélecteur pour la palette choisie, la première sinon.
  function intensiteDe(i) {
    var cles = Object.keys(DONNEES.palettes[i].intensites);
    return +choixPalette.value === i && cles.indexOf(choixIntensite.value) !== -1 ? choixIntensite.value : cles[0];
  }
  function hexaDuCran(i, intensite, sens, mode, cran) { return DONNEES.palettes[i].intensites[intensite][mode + '-' + sens][DONNEES.crans.indexOf(cran)]; }
  function noteIntensite(p) { return 'L’alias de brands choisit l’intensité : ici brands vise primitives/color/' + p.nom.toLowerCase() + '/<intensité>/…'; }
  function nomDeLaPrimitive(i, intensite, mode, cran) { return 'primitives/color/' + DONNEES.palettes[i].nom.toLowerCase() + '/' + (intensite === 'unique' ? '' : intensite + '/') + mode + '/' + cran; }
  // La valeur d'une cellule : alias affiché, chemin complet pour le survol, couleur.
  function valeurDeRampe(i, intensite, sens, mode, cran) {
    var role = ROLES[i], p = DONNEES.palettes[i];
    var profil = role[0] === 'utility' && role[1] !== 'neutral' && intensite !== 'unique' ? intensite + '/' : '';
    return { alias: role[0] + '/' + role[1] + '/' + profil + mode + '/<b>' + cran + '</b>', primitive: nomDeLaPrimitive(i, intensite, mode, cran), hexa: hexaDuCran(i, intensite, sens, mode, cran), note: role[0] === 'brands' ? noteIntensite(p) : '' };
  }
  // Les couleurs absolues vivent dans utility/neutral. La grammaire du kit les place sous color/<palette>/white ou black.
  function valeurAbsolue(mode, absolue) {
    return { alias: 'utility/neutral/' + mode + '/<b>' + absolue + '</b>', primitive: 'primitives/color/<palette>/' + absolue, hexa: REFERENCE.couleursAbsolues[absolue], note: '' };
  }
  function valeurGlobale(sens, mode, cran) {
    var v = valeurDeRampe(1, 'unique', sens, mode, cran);
    return { alias: 'utility/neutral/' + mode + '/<b>' + cran + '</b>', primitive: v.primitive, hexa: v.hexa, note: '' };
  }
  function valeurElevation(mode, niveau) {
    return { alias: 'utility/elevation/' + mode + '/<b>' + niveau + '</b>', primitive: '', hexa: niveau === 'page' ? DONNEES.fonds[mode] : DONNEES.cartes[mode],
      note: niveau === 'page' ? 'fond de page' : 'carte, blanche en Light et un cran de la courbe plus claire que la page en Dark' };
  }
  function cellule(v) {
    var titre = v.alias.replace(/<\/?b>/g, '') + (v.primitive ? ' vise ' + v.primitive : '') + ' · ' + v.hexa + (v.note ? ' · ' + v.note : '');
    return '<span class="valeur" title="' + titre.replace(/"/g, '&quot;') + '"><i style="background:' + v.hexa + '"></i><span class="alias">' + v.alias + '</span></span>';
  }
  function hexaSeul(hexa, titre) { return '<span class="valeur" title="' + titre + ' · ' + hexa + '"><i style="background:' + hexa + '"></i><span class="alias">' + hexa + '</span></span>'; }
  function variableDuTheme(nom) { return REFERENCE.theme.filter(function (v) { return v.variable === nom; })[0]; }
  function hexaDuTheme(i, intensite, sens, mode, nom) {
    var cible = variableDuTheme(nom).cibles[mode + '-' + sens];
    return cible.absolue ? REFERENCE.couleursAbsolues[cible.absolue] : hexaDuCran(i, intensite, sens, mode, cible.cran);
  }
  // Les lignes d'une collection, en groupes. Un groupe : { id, titre, ouvert, lignes: [{ nom, g, cellules | vide }] }.
  function groupesDuTheme(i, intensite, sens) {
    var role = ROLES[i], neutre = role[1] === 'neutral';
    var prefixe = role[1] + (role[0] === 'utility' && !neutre && intensite !== 'unique' ? '/' + intensite : '');
    var groupes = [], index = {};
    REFERENCE.theme.forEach(function (v) {
      if (v.famille === 'neutre' && !neutre) return;
      var coupe = v.variable.split('/'), dossier = coupe.length > 1 ? coupe[0] : '', nom = coupe.length > 1 ? coupe.slice(1).join('/') : coupe[0];
      var titre = v.famille === 'globale' || v.famille === 'elevation' ? dossier : (dossier ? prefixe + '/' + dossier : prefixe);
      var cle = 'theme/' + dossier;
      if (!index[cle]) { index[cle] = { id: cle, titre: titre, ouvert: true, lignes: [] }; groupes.push(index[cle]); }
      var cellules = ['light', 'dark'].map(function (mode) {
        var cible = v.cibles[mode + '-' + sens];
        if (v.famille === 'elevation') return cellule(valeurElevation(mode, coupe[1]));
        if (v.famille === 'globale') return cellule(valeurGlobale(sens, mode, cible.cran));
        return cellule(cible.absolue ? valeurAbsolue(mode, cible.absolue) : valeurDeRampe(i, intensite, sens, mode, cible.cran));
      });
      var g = REFERENCE.garanties.filter(function (x) { return x.variable === v.variable; }).map(function (x) { return 'G' + x.numero; }).join(' ');
      index[cle].lignes.push({ nom: nom, g: g, cellules: cellules });
    });
    return groupes;
  }
  function lignesDeCrans(i, intensite, sens, aliasDe) {
    return DONNEES.crans.map(function (cran) {
      return { nom: String(cran), cellules: ['light', 'dark'].map(function (mode) { return cellule(aliasDe(mode, cran)); }) };
    });
  }
  function groupesDe(collection, i, intensite, sens) {
    if (collection === 'theme') return groupesDuTheme(i, intensite, sens);
    var groupes = [];
    if (collection === 'brands') {
      var t = 0, it = intensiteDe(t);
      groupes.push({ id: 'brands/primary', titre: 'primary', ouvert: true, lignes: lignesDeCrans(t, it, sens, function (mode, cran) {
        var p = DONNEES.palettes[t], note = noteIntensite(p);
        return { alias: nomDeLaPrimitive(t, it, mode, '<b>' + cran + '</b>'), primitive: '', hexa: hexaDuCran(t, it, sens, mode, cran), note: note };
      }) });
    } else if (collection === 'utility') {
      groupes.push({ id: 'utility/neutral', titre: 'neutral', ouvert: true, lignes: lignesDeCrans(1, 'unique', sens, function (mode, cran) {
        return { alias: nomDeLaPrimitive(1, 'unique', mode, '<b>' + cran + '</b>'), primitive: '', hexa: hexaDuCran(1, 'unique', sens, mode, cran), note: '' };
      }).concat(['white', 'black'].map(function (a) { return { nom: a, cellules: ['light', 'dark'].map(function (mode) { var v = valeurAbsolue(mode, a); return cellule({ alias: 'primitives/color/&lt;palette&gt;/<b>' + a + '</b>', primitive: '', hexa: v.hexa, note: '' }); }) }; })) });
      groupes.push({ id: 'utility/elevation', titre: 'elevation', ouvert: false, lignes: REFERENCE.niveauxElevation.map(function (n) {
        return { nom: n, cellules: ['light', 'dark'].map(function (mode) { var v = valeurElevation(mode, n); return hexaSeul(v.hexa, 'utility/elevation/' + mode + '/' + n + ' · ' + v.note); }) };
      }) });
      [[2, 'success'], [3, 'warning'], [4, 'danger'], [5, 'info']].forEach(function (s) {
        var it = intensiteDe(s[0]);
        groupes.push({ id: 'utility/' + s[1], titre: s[1] + '/' + it, ouvert: false, lignes: lignesDeCrans(s[0], it, sens, function (mode, cran) {
          return { alias: nomDeLaPrimitive(s[0], it, mode, '<b>' + cran + '</b>'), primitive: '', hexa: hexaDuCran(s[0], it, sens, mode, cran), note: '' };
        }) });
      });
    } else if (collection === 'primitives') {
      DONNEES.palettes.forEach(function (p, k) {
        var it = intensiteDe(k);
        groupes.push({ id: 'primitives/' + p.nom, titre: 'color/' + p.nom.toLowerCase() + (it === 'unique' ? '' : '/' + it), ouvert: +choixPalette.value === k, lignes: DONNEES.crans.map(function (cran) {
          return { nom: String(cran), cellules: ['light', 'dark'].map(function (mode) { return hexaSeul(hexaDuCran(k, it, sens, mode, cran), nomDeLaPrimitive(k, it, mode, cran)); }) };
        }) });
      });
      groupes.push({ id: 'primitives/absolues', titre: 'color/<palette>', ouvert: false, lignes: ['white', 'black'].map(function (a) {
        return { nom: a, cellules: ['light', 'dark'].map(function (mode) { return hexaSeul(REFERENCE.couleursAbsolues[a], 'primitives/color/<palette>/' + a); }) };
      }) });
      var R = REFERENCE.registres;
      groupes.push({ id: 'primitives/sans-valeur', titre: 'dimension, font-*', ouvert: false, lignes:
        R.valeursDimensionnelles.map(function (v) { return { nom: 'dimension/' + v, vide: 'aucune valeur' }; })
          .concat(REFERENCE.familles.primitives.filter(function (f) { return /^font-/.test(f); }).map(function (f) { return { nom: f + '/' + R.valeursTypographiques[0], vide: 'aucune valeur' }; })) });
    } else if (collection === 'components') {
      var cibleDe = function (nom, mode) { return variableDuTheme(nom).cibles[mode + '-' + sens]; };
      var ligne = function (nomTheme, nom) {
        return { nom: nom, cellules: ['light', 'dark'].map(function (mode) {
          var c = cibleDe(nomTheme, mode), it = intensiteDe(0), hexa = hexaDuTheme(0, it, sens, mode, nomTheme);
          var chaine = c.absolue ? 'utility/neutral/' + mode + '/' + c.absolue : 'brands/primary/' + mode + '/' + c.cran;
          var fin = c.absolue ? 'primitives/color/<palette>/' + c.absolue : nomDeLaPrimitive(0, it, mode, c.cran);
          return cellule({ alias: 'theme/primary/' + nomTheme.replace(/\/([^/]+)$/, '/<b>$1</b>'), primitive: '', hexa: hexa, note: 'vise ' + chaine + ', qui vise ' + fin });
        }) };
      };
      groupes.push({ id: 'components/couleur', titre: '{Composant}/color/primary/default', ouvert: true, lignes: [ligne('solid/default', 'background'), ligne('solid/foreground', 'foreground')] });
      groupes.push({ id: 'components/taille', titre: '{Composant}/size/md', ouvert: true, lignes: [
        { nom: 'padding-x', vide: 'vise layout/sizing, variable à choisir' },
        { nom: 'radius', vide: 'vise layout/radius, variable à choisir' }] });
    } else if (collection === 'layout') {
      var M = REFERENCE.registres;
      groupes.push({ id: 'layout/familles', titre: 'familles', ouvert: true, lignes: [
        { nom: 'icon/<taille>', vide: 'aucune valeur' },
        { nom: 'sizing/<' + M.mesuresLayout.join('|') + '|nombre>', vide: 'aucune valeur' },
        { nom: 'radius/<' + M.valeursDimensionnelles.join('|') + '>', vide: 'aucune valeur' },
        { nom: 'stroke/<' + M.valeursDimensionnelles.join('|') + '>', vide: 'aucune valeur' }] });
    } else if (collection === 'typography') {
      groupes.push({ id: 'typography/familles', titre: 'familles', ouvert: true, lignes: REFERENCE.familles.typography.map(function (f) {
        return { nom: f + '/<taille>/<propriété>', vide: 'aucune valeur' };
      }) });
    }
    return groupes;
  }
  function nombreDeLignes(groupes) { return groupes.reduce(function (n, g) { return n + g.lignes.length; }, 0); }
  function noteDeLaCollection(nom) {
    var c = REFERENCE.collections.filter(function (x) { return x.nom === nom; })[0];
    var cibles = c.cibles.length ? 'Elle peut viser ' + c.cibles.join(', ') + '.' : 'Elle ne vise aucune collection.';
    var d = DEFINI[nom];
    return '<span>' + PORTE[nom][0] + ' ' + PORTE[nom][1] + ' ' + cibles + (c.scope ? ' Ses variables portent des scopes.' : ' Elle n’a pas de scope.') + '</span>' +
      '<span><span class="etat livre">Défini par le kit</span> ' + d[0] + '.</span>' +
      (d[1] ? '<span><span class="etat manque">Non défini par le kit (P21)</span> ' + d[1] + '</span>' : '');
  }
  function menuDesCollections() {
    var nav = document.getElementById('menu-collections');
    nav.innerHTML = '<span class="etiquette">Collections</span>' + COLLECTIONS.map(function (c) {
      return '<button type="button" data-col="' + c + '" aria-current="' + (c === etatPanneau.collection) + '">' + c + '</button>';
    }).join('');
  }
  function selectionnerCollection(nom, defiler) {
    etatPanneau.collection = nom;
    rendre();
    var pliable = document.getElementById('panneau-variables');
    if (defiler && pliable && pliable.scrollIntoView) pliable.scrollIntoView({ block: 'nearest' });
  }
  function rendre() {
    var i = +choixPalette.value, p = DONNEES.palettes[i], intensite = choixIntensite.value, sens = choixSens.value;
    var role = ROLES[i];
    var col = etatPanneau.collection;
    document.getElementById('reference-palette').textContent = p.nom + ', référence ' + p.reference;
    document.getElementById('fx-nom').textContent = col;
    var noteI = document.getElementById('note-intensite');
    noteI.hidden = role[0] !== 'brands';
    noteI.textContent = role[0] === 'brands' ? noteIntensite(p) : '';
    menuDesCollections();
    document.querySelectorAll('svg.schema .cb').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-col') === col); });
    document.getElementById('fx-note').innerHTML = noteDeLaCollection(col);
    var groupes = groupesDe(col, i, intensite, sens), avecG = col === 'theme';
    var html = '<tr><th>Nom</th><th>Light</th><th>Dark</th>' + (avecG ? '<th class="n">G</th>' : '') + '</tr>';
    groupes.forEach(function (g) {
      var ouvert = g.id in etatPanneau.ouverts ? etatPanneau.ouverts[g.id] : g.ouvert;
      html += '<tr class="groupe"><td colspan="' + (avecG ? 4 : 3) + '"><button type="button" class="bascule" data-g="' + g.id + '" aria-expanded="' + ouvert + '"><span class="chev" aria-hidden="true"></span>' + g.titre.replace(/</g, '&lt;') + ' <span class="nb">' + g.lignes.length + '</span></button></td></tr>';
      g.lignes.forEach(function (l) {
        html += '<tr' + (ouvert ? '' : ' hidden') + '><td class="nom">' + l.nom.replace(/</g, '&lt;') + '</td>' +
          (l.vide ? '<td class="vide" colspan="2">' + l.vide + '</td>' : '<td>' + l.cellules[0] + '</td><td>' + l.cellules[1] + '</td>') +
          (avecG ? '<td class="n"><b>' + (l.g || '') + '</b></td>' : '') + '</tr>';
      });
    });
    document.getElementById('panneau-theme').innerHTML = html;
    var zone = document.getElementById('apercus');
    zone.innerHTML = '';
    ['light', 'dark'].forEach(function (mode) {
      var c = {};
      REFERENCE.theme.forEach(function (v) { if (v.famille === 'palette') c[v.variable] = hexaDuTheme(i, intensite, sens, mode, v.variable); });
      var bloc = document.createElement('div');
      bloc.className = 'apercu';
      bloc.style.background = DONNEES.fonds[mode];
      bloc.style.color = c['page/foreground'];
      bloc.innerHTML =
        '<span class="titre-apercu">' + (mode === 'light' ? 'Light' : 'Dark') + ', fond de page ' + DONNEES.fonds[mode] + '</span>' +
        '<span class="ligne">' +
          ['default', 'hover', 'pressed'].map(function (e) { return '<span class="btn" style="background:' + c['solid/' + e] + ';color:' + c['solid/foreground'] + '">' + e.charAt(0).toUpperCase() + e.slice(1) + '</span>'; }).join('') +
        '</span>' +
        '<span class="ligne">' +
          '<span class="puce-s" style="background:' + c['surface/subtle'] + ';color:' + c['surface/foreground'] + ';border-color:' + c['surface/border'] + '">Subtle</span>' +
          '<span class="puce-s" style="background:' + c['surface/default'] + ';color:' + c['surface/foreground'] + ';border-color:' + c['surface/default'] + '">Surface</span>' +
          '<span class="puce-s" style="background:transparent;color:' + c['page/foreground'] + ';border-color:' + c['page/border'] + ';outline:2px solid ' + c['ring'] + ';outline-offset:2px">Ring</span>' +
        '</span>' +
        '<span>Texte sur la page</span>' +
        '<span class="rampe-mini">' + p.intensites[intensite][mode + '-' + sens].map(function (h) { return '<i style="background:' + h + '"></i>'; }).join('') + '</span>';
      zone.appendChild(bloc);
    });
  }
  choixPalette.addEventListener('change', function () { intensites(); rendre(); });
  choixIntensite.addEventListener('change', rendre);
  choixSens.addEventListener('change', rendre);
  document.getElementById('menu-collections').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-col]'); if (b) selectionnerCollection(b.getAttribute('data-col'), false);
  });
  document.getElementById('panneau-theme').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-g]'); if (!b) return;
    var id = b.getAttribute('data-g');
    etatPanneau.ouverts[id] = b.getAttribute('aria-expanded') !== 'true';
    rendre();
    var suite = document.querySelector('#panneau-theme button[data-g="' + id + '"]'); if (suite) suite.focus();
  });
  intensites();
  rendre();
  // Le schéma des collections et le menu se répondent : un clic sur une boîte ouvre la collection.
  var schema = document.querySelector('svg.schema');
  schema.addEventListener('click', function (e) {
    var b = e.target.closest('.cb'); if (b) selectionnerCollection(b.getAttribute('data-col'), true);
  });
  schema.addEventListener('keydown', function (e) {
    var b = e.target.closest && e.target.closest('.cb');
    if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectionnerCollection(b.getAttribute('data-col'), true); }
  });
  // « Suivre une valeur d'un composant » : la couleur, la taille ou le texte, des primitives jusqu'au composant, en rose sur le schéma, et la chaîne d'exemple dessous.
  // Un second clic sur le choix actif l'éteint.
  var choixDuChemin = document.querySelectorAll('.suivre button[data-chemin]'), cheminSuivi = '';
  function suivreLaValeur(chemin) {
    cheminSuivi = chemin;
    schema.classList.toggle('suit', !!chemin);
    choixDuChemin.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-chemin') === chemin); });
    schema.querySelectorAll('.cb').forEach(function (g) { g.classList.toggle('suivie', !!chemin && (g.getAttribute('data-chemins') || '').split(' ').indexOf(chemin) !== -1); });
    schema.querySelectorAll('.fleche').forEach(function (f) { f.classList.toggle('suivie', !!chemin && f.getAttribute('data-chemin') === chemin); });
    document.querySelectorAll('.chaine-valeur').forEach(function (c) { c.hidden = c.getAttribute('data-chemin') !== chemin; });
  }
  choixDuChemin.forEach(function (b) {
    b.addEventListener('click', function () { var c = b.getAttribute('data-chemin'); suivreLaValeur(cheminSuivi === c ? '' : c); });
  });

  // Le parcours d'un composant : un clic sur une étape montre sa carte sous les couloirs ; les flèches du clavier passent d'une étape à l'autre.
  var etapes = Array.prototype.slice.call(document.querySelectorAll('.parcours [role="tab"]'));
  function montrerLEtape(onglet, focaliser) {
    etapes.forEach(function (t) {
      var actif = t === onglet;
      t.setAttribute('aria-selected', actif);
      t.tabIndex = actif ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !actif;
    });
    if (focaliser) onglet.focus();
  }
  etapes.forEach(function (t, i) {
    t.addEventListener('click', function () { montrerLEtape(t, false); });
    t.addEventListener('keydown', function (e) {
      var pas = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!pas) return;
      e.preventDefault();
      montrerLEtape(etapes[(i + pas + etapes.length) % etapes.length], true);
    });
  });

  // Roadmap : les pistes viennent de pistes.json et de leur plan (docs/notes/Recherches/), calculées par le générateur. Le script ne
  // garde rien du choix du mainteneur : la prio se pose dans pistes.json, par l'agent à qui le formulaire donne la consigne.
  var PISTES = {{js:PISTES}};
  var SUJETS = {{js:SUJETS}};
  var TERMINEES = {{js:TERMINEES}};
  var PRIOS = ['Avant d’ouvrir le projet', 'Socle de la bibliothèque et verdict', 'Premiers modules', 'Vérification du rendu', 'Utile, sans urgence', 'Plus tard'];
  var ETATS = { idee: ['e-idee', 'Idée'], recherche: ['e-recherche', 'Recherche faite'], 'en-cours': ['e-cours', 'En cours'] };
  var IMPORTANCES = { critique: 0, haute: 1, moyenne: 2, basse: 3 };
  PISTES.forEach(function (x) { x.complexite = String(x.complexite).toUpperCase(); });
  PISTES.sort(function (a, b) { return a.prio - b.prio || IMPORTANCES[a.importance] - IMPORTANCES[b.importance]; });
  var racine = document.getElementById('suite');
  var tableau = racine.querySelector('table.rm');
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function parId(id) { return PISTES.filter(function (p) { return p.id === id; })[0]; }
  // Un identifiant de piste dans un texte renvoie à sa ligne, qu'elle soit à venir ou terminée.
  function txt(t) {
    return esc(t).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\b(P\d{1,2})\b/g, function (m) {
      return parId(m) || TERMINEES.some(function (x) { return x.id === m; }) ? '<a href="#piste-' + m + '">' + m + '</a>' : m;
    });
  }
  // Un résumé de piste se découpe par ces étiquettes, écrites en tête de phrase et suivies de « : ». Seule liste du dépôt.
  var ETIQUETTES_DU_RESUME = ["Ce qu'il fait", 'Où', 'Quand', 'Pourquoi', 'Ne voit pas'];
  function resumeEnBlocs(t) {
    var motif = new RegExp('(?:^|\\s)(' + ETIQUETTES_DU_RESUME.join('|') + ') : ', 'g');
    var morceaux = String(t).split(motif);
    if (morceaux.length < 3) return '<p class="resume">' + txt(t) + '</p>';
    var tete = morceaux[0].trim() ? '<p class="resume">' + txt(morceaux[0].trim()) + '</p>' : '';
    var blocs = '';
    for (var i = 1; i < morceaux.length; i += 2) blocs += '<dt>' + esc(morceaux[i]) + '</dt><dd>' + txt(morceaux[i + 1].trim()) + '</dd>';
    return tete + '<dl class="blocs-resume">' + blocs + '</dl>';
  }
  function lienGitHub(chemin) { return 'https://github.com/Vassili-g/UCM-Toolkit/blob/main/' + chemin.split('/').map(encodeURIComponent).join('/'); }

  // Le repère « a bougé » : le navigateur garde la date de la dernière visite et celle d'avant. Une piste dont un lot est plus récent
  // que la visite d'avant porte un point. Sans localStorage, aucune piste n'est marquée.
  var CLE_VISITE = 'inventaire-ucm-visite';
  var avant = null;
  function aujourdhui() {
    var d = new Date(), deux = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + deux(d.getMonth() + 1) + '-' + deux(d.getDate());
  }
  try {
    var visite = JSON.parse(localStorage.getItem(CLE_VISITE) || 'null') || {}, jour = aujourdhui();
    avant = typeof visite.avant === 'string' ? visite.avant : null;
    if (visite.derniere !== jour) {
      if (typeof visite.derniere === 'string') avant = visite.derniere;
      localStorage.setItem(CLE_VISITE, JSON.stringify({ derniere: jour, avant: avant }));
    }
  } catch (e) {}
  function aBouge(p) { return !!avant && !!p.dernierLot && p.dernierLot > avant; }

  // Les lots d'un plan : un carré par case, rangés par groupe.
  function classeDuLot(l) { return l.fait ? 'f' : l.marque === 'mainteneur' ? 'm' : l.marque ? 'b' : l.suivant ? 's' : ''; }
  function motDuLot(l) { return l.fait ? 'fait' : l.marque === 'mainteneur' ? 'attend ta décision' : l.marque ? l.marque : l.suivant ? 'suivant, prêt pour un agent' : 'à faire'; }
  function rangee(p) {
    var groupes = [], courant = null;
    p.lots.forEach(function (l) {
      if (!courant || courant.nom !== l.groupe) { courant = { nom: l.groupe, lots: [] }; groupes.push(courant); }
      courant.lots.push(l);
    });
    return '<span class="lots">' + groupes.map(function (g) {
      return '<span class="g">' + g.lots.map(function (l) { return '<i class="' + classeDuLot(l) + '" title="' + esc(l.numero + ' · ' + motDuLot(l) + ' · ' + l.texte) + '"></i>'; }).join('') + '</span>';
    }).join('') + '</span>';
  }
  function ligneDeLot(l, groupe) {
    return (groupe ? '<li class="gr">' + esc(groupe) + '</li>' : '') + '<li class="' + (l.fait ? 'fait' : classeDuLot(l)) + '"><span class="lots"><i class="' + classeDuLot(l) + '"></i></span><span class="num">' + esc(l.numero) + '</span>' +
      '<span class="txt">' + txt(l.texte) + (l.marque === 'mainteneur' ? ' <span class="attend toi">ta décision</span>' : l.marque ? ' <span class="attend piste">' + esc(l.marque) + '</span>' : '') + '</span><span class="h">' + esc(l.hash || '') + '</span></li>';
  }
  function blocDeLots(lots) {
    var g = null;
    return lots.map(function (l) { var titre = l.groupe !== g ? l.groupe : ''; g = l.groupe; return ligneDeLot(l, titre); }).join('');
  }
  function listeDeLots(p) {
    var faits = p.lots.filter(function (l) { return l.fait; }), reste = p.lots.filter(function (l) { return !l.fait; });
    var groupes = [], index = {};
    reste.forEach(function (l) {
      if (!(l.groupe in index)) { index[l.groupe] = groupes.length; groupes.push({ nom: l.groupe, lots: [] }); }
      groupes[index[l.groupe]].lots.push(l);
    });
    // Le groupe en cours et ceux qui attendent le mainteneur restent ouverts, les autres se replient.
    var suite = groupes.map(function (g, i) {
      var attendu = g.lots.some(function (l) { return l.marque === 'mainteneur'; });
      if (i === 0 || attendu) return '<ol class="lots-detail">' + blocDeLots(g.lots) + '</ol>';
      return '<details class="lots-plus"><summary>' + esc(g.nom || 'Suite') + ' · ' + g.lots.length + (g.lots.length > 1 ? ' cases à faire' : ' case à faire') + '</summary><ol class="lots-detail">' + blocDeLots(g.lots) + '</ol></details>';
    });
    return '<h4>Lots du plan · ' + faits.length + '/' + p.lots.length + '</h4>' + rangee(p) +
      '<div class="legende-fiche"><span><span class="lots"><i class="f"></i></span>fait</span><span><span class="lots"><i class="m"></i></span>ta décision</span><span><span class="lots"><i class="b"></i></span>attend une piste</span><span><span class="lots"><i class="s"></i></span>suivant</span><span><span class="lots"><i></i></span>à faire</span></div>' +
      (faits.length ? '<details class="lots-faits"><summary>' + faits.length + (faits.length > 1 ? ' cases faites' : ' case faite') + '</summary><ol class="lots-detail">' + blocDeLots(faits) + '</ol></details>' : '') +
      suite.join('');
  }
  function liensDePistes(ids) {
    return ids.length ? ids.map(function (id) { var q = parId(id); return q ? '<a href="#piste-' + id + '">' + id + ' ' + esc(q.titreCourt) + '</a>' : esc(id); }).join(', ') : 'rien';
  }
  function liste(textes) { return '<ul>' + textes.map(function (t) { return '<li>' + txt(t) + '</li>'; }).join('') + '</ul>'; }
  // Les décisions qui touchent plusieurs pistes : chacune dit les autres pistes qu'elle nomme.
  function transverses(p) {
    if (!p.transverses.length) return '';
    return '<h4>Décisions communes · ' + p.transverses.length + '</h4><ul>' + p.transverses.map(function (t) {
      var autres = t.pistes.filter(function (id) { return id !== p.id; });
      return '<li><b>' + txt(t.titre) + '</b> ' + txt(t.texte) + (autres.length ? ' <span class="doux">Elle touche aussi ' + autres.map(function (id) { return '<a href="#piste-' + id + '">' + id + '</a>'; }).join(', ') + '.</span>' : '') + '</li>';
    }).join('') + '</ul>';
  }
  // Le changement de prio : un sélecteur (les six prios et « Écartée »), un champ d'une ligne, un bouton qui copie la consigne de l'agent.
  function formulaireDePrio(p) {
    var options = PRIOS.map(function (nom, i) { return '<option value="' + i + '"' + (i === p.prio ? ' selected' : '') + '>' + i + ' · ' + esc(nom) + '</option>'; }).join('') + '<option value="ecartee">Écartée</option>';
    return (p.prioPosee ? '<p class="prio-posee"><span class="prio-toi"></span>Prio posée par toi. « ' + esc(p.prioPosee.raison) + ' »</p>' : '') +
      '<div class="prio-form" data-piste="' + p.id + '"><label for="prio-' + p.id + '">Prio</label><select id="prio-' + p.id + '">' + options + '</select>' +
      '<input type="text" placeholder="Pourquoi ?" aria-label="Pourquoi cette prio sur ' + p.id + '">' +
      '<button type="button" class="bouton copier-prio" aria-live="polite" disabled>Copier pour l’agent</button></div>';
  }
  function fiche(p) {
    var droite = '';
    if (p.lots) droite += listeDeLots(p);
    else if (p.recherche && p.questions.length) droite += '<h4>Questions de la recherche · ' + p.questions.length + '</h4>' + liste(p.questions);
    else droite += '<h4>Finie quand</h4>' + liste(p.criteresDeFin);
    droite += transverses(p) + '<h4>Dépend de</h4><p>' + liensDePistes(p.dependances) + '</p><h4>Débloque</h4><p>' + liensDePistes(p.debloque) + '</p>';
    var gauche = resumeEnBlocs(p.resume) +
      '<h4>Si on ne fait pas</h4><p>' + txt(p.raisonImportance) + '</p>' +
      '<h4>Ce que ça te demande</h4><p>' + txt(p.coutHumain) + '</p>' +
      (p.risques.length ? '<h4>Risques</h4>' + liste(p.risques) : '') + formulaireDePrio(p);
    return '<div class="fiche-rm"><div>' + gauche + '</div><div>' + droite + '</div></div>';
  }

  // Les lignes de la table.
  var etat = { groupe: 'prio', filtre: false, ouvertes: {} };
  function attendMoi(p) { return p.attentes.some(function (a) { return a.genre === 'toi'; }); }
  function etatDe(p) {
    var e = ETATS[p.etat];
    return '<span class="etat ' + e[0] + '">' + e[1] + '</span>' + (p.avancement ? '<span class="tag-avance" title="Cases cochées du plan">' + p.avancement.faits + '/' + p.avancement.total + '</span>' : '');
  }
  // Le lien vers un document du dépôt sur GitHub, dans un nouvel onglet.
  function lienDuDepot(chemin, mot) {
    var url = lienGitHub(chemin);
    return '<a href="' + url + '" target="_blank" rel="noopener" title="' + esc(chemin.split('/').pop()) + '">' + mot + ' ↗</a>';
  }
  function sousLaLigne(p) {
    var c = SUJETS[p.sujet], style = c ? ' style="color:' + c.texte + ';background:' + c.fond + '"' : '';
    return '<span class="sous"><span class="sujet"' + style + '>' + esc(p.sujet) + '</span><span title="Taille en travail d’agent">taille <b>' + p.complexite + '</b></span>' +
      (p.recherche ? lienDuDepot(p.recherche, 'Recherche') : '') + (p.plan ? lienDuDepot(p.plan, 'Plan') : '') + '</span>';
  }
  function attentesDe(p) {
    return '<span class="attentes">' + p.attentes.map(function (a) { return '<span class="attend ' + a.genre + '" title="' + esc(a.detail) + '">' + esc(a.texte) + '</span>'; }).join('') + '</span>';
  }
  function ligneDePiste(p) {
    var ouvert = !!etat.ouvertes[p.id], posee = p.prioPosee;
    var titrePosee = posee ? 'Prio posée par toi. ' + (p.prioDeLAgent !== p.prio ? 'L’agent proposait la prio ' + p.prioDeLAgent + '. ' : '') + posee.raison : '';
    return '<tr class="rm-ligne' + (ouvert ? ' ouverte' : '') + '" id="piste-' + p.id + '" data-id="' + p.id + '">' +
      '<td class="n"><span class="rang">' + p.prio + '</span>' + (posee ? '<span class="prio-toi" role="img" title="' + esc(titrePosee) + '" aria-label="Prio posée par toi"></span>' : '') + '</td>' +
      '<td><button type="button" class="rm-bascule" aria-expanded="' + ouvert + '" aria-controls="fiche-' + p.id + '" title="' + esc(p.titre) + '"><span class="chev" aria-hidden="true"></span><span class="id">' + p.id + '</span><span class="titre">' + esc(p.titreCourt) + '</span>' +
        (aBouge(p) ? '<span class="a-bouge" role="img" aria-label="a bougé depuis ta dernière visite" title="Un lot a été fait depuis ta dernière visite"></span>' : '') + '</button>' + sousLaLigne(p) + '</td>' +
      '<td>' + etatDe(p) + '</td><td>' + attentesDe(p) + '</td></tr>' +
      '<tr class="rm-fiche" id="fiche-' + p.id + '"' + (ouvert ? '' : ' hidden') + '><td colspan="4">' + fiche(p) + '</td></tr>';
  }
  function rendreLaTable() {
    var visibles = PISTES.filter(function (p) { return !etat.filtre || attendMoi(p); }), groupes = [];
    if (etat.groupe === 'prio') {
      PRIOS.forEach(function (nom, i) { var l = visibles.filter(function (p) { return p.prio === i; }); if (l.length) groupes.push(['Prio ' + i, nom, l]); });
    } else {
      [['en-cours', 'En cours'], ['recherche', 'Recherche faite'], ['idee', 'Idée']].forEach(function (e) {
        var l = visibles.filter(function (p) { return p.etat === e[0]; });
        if (l.length) groupes.push([e[1], l.length + (l.length > 1 ? ' pistes' : ' piste'), l]);
      });
    }
    var h = '<colgroup><col class="c-rang"><col class="c-piste"><col class="c-etat"><col></colgroup><tr><th class="n">Prio</th><th>Piste</th><th>État</th><th>En attente</th></tr>';
    groupes.forEach(function (g) {
      h += '<tr class="groupe"><td colspan="4">' + g[0] + '<span>' + esc(g[1]) + '</span></td></tr>' + g[2].map(ligneDePiste).join('');
    });
    tableau.innerHTML = h;
    racine.querySelectorAll('.segmente button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-groupe') === etat.groupe); });
    racine.querySelector('.filtre-attente').setAttribute('aria-pressed', etat.filtre);
    var bouge = visibles.filter(aBouge).length;
    racine.querySelector('.compte').innerHTML = visibles.length + (visibles.length > 1 ? ' pistes à venir' : ' piste à venir') +
      (bouge ? '<span class="a-bouge"></span>a bougé depuis ta dernière visite' : '');
    if (produitsMarques) marquerLesProduits(tableau);
  }
  document.getElementById('rm-nb-attente').textContent = PISTES.filter(attendMoi).length;
  function basculer(ligne, ouvert) {
    etat.ouvertes[ligne.getAttribute('data-id')] = ouvert;
    ligne.classList.toggle('ouverte', ouvert);
    ligne.querySelector('.rm-bascule').setAttribute('aria-expanded', ouvert);
    ligne.nextElementSibling.hidden = !ouvert;
  }

  // La partie « Terminés » : une ligne par piste livrée ou écartée, la plus récente d'abord.
  function rendreLesTerminees() {
    var pli = document.getElementById('terminees');
    if (!TERMINEES.length) { pli.hidden = true; return; }
    var triees = TERMINEES.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    document.getElementById('terminees-compte').textContent = triees.length + (triees.length > 1 ? ' pistes, livrées ou écartées' : ' piste');
    document.getElementById('terminees-table').innerHTML = '<tr><th>Piste</th><th>État</th><th>Date</th><th>Plan</th></tr>' + triees.map(function (t) {
      var url = esc(t.lien || '');
      return '<tr id="piste-' + t.id + '"><td><span class="id">' + t.id + '</span> ' + esc(t.titreCourt) + '</td>' +
        '<td>' + (t.ecartee ? '<span class="etat propose">Écartée</span> <span class="doux">' + esc(t.ecartee) + '</span>' : '<span class="etat livre">Livrée</span>') + '</td>' +
        '<td class="n">' + (t.date ? esc(t.date) : '<span class="doux">date inconnue</span>') + '</td>' +
        '<td>' + (url ? '<a href="' + url + '" target="_blank" rel="noopener">Plan ↗</a>' : '') + '</td></tr>';
    }).join('');
  }

  var produitsMarques = false;
  rendreLaTable();
  rendreLesTerminees();

  function copier(texte) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(texte); } catch (e) {}
    return new Promise(function (ok, ko) {
      var z = document.createElement('textarea'), reussi = false;
      z.value = texte; z.style.position = 'fixed'; z.style.opacity = '0';
      document.body.appendChild(z); z.select();
      try { reussi = document.execCommand('copy'); } catch (e) {}
      z.remove();
      if (reussi) ok(); else ko(new Error('copie refusée'));
    });
  }
  racine.addEventListener('input', function (e) {
    var f = e.target.closest('.prio-form'); if (!f) return;
    f.querySelector('.copier-prio').disabled = !f.querySelector('input').value.trim();
  });
  racine.addEventListener('click', function (e) {
    var c = e.target.closest('.copier-prio');
    if (c) {
      var f = c.closest('.prio-form'), id = f.getAttribute('data-piste'), p = parId(id);
      var v = f.querySelector('select').value, pourquoi = f.querySelector('input').value.trim();
      var texte = v === 'ecartee'
        ? 'Dans pistes.json, écarte ' + id + ' (' + p.titreCourt + ') avec la raison « ' + pourquoi + ' ». Puis lance npm run vues et commite.'
        : 'Dans pistes.json, pose la prio ' + v + ' sur ' + id + ' (' + p.titreCourt + ') dans prioDuMainteneur, avec la raison « ' + pourquoi + ' ». Puis lance npm run vues et commite.';
      var dit = function (mot, fait) {
        c.textContent = mot; c.classList.toggle('fait', fait);
        setTimeout(function () { c.textContent = 'Copier pour l’agent'; c.classList.remove('fait'); }, 2000);
      };
      copier(texte).then(function () { dit('Copié ✓', true); }, function () { dit('Copie impossible', false); });
      return;
    }
    var s = e.target.closest('.segmente button');
    if (s) { etat.groupe = s.getAttribute('data-groupe'); rendreLaTable(); return; }
    if (e.target.closest('.filtre-attente')) { etat.filtre = !etat.filtre; rendreLaTable(); return; }
    if (e.target.closest('a, .rm-fiche, select, input, button:not(.rm-bascule)')) return;
    var ligne = e.target.closest('tr.rm-ligne');
    if (ligne) basculer(ligne, !etat.ouvertes[ligne.getAttribute('data-id')]);
  });
  // Un lien vers une piste ouvre sa fiche, et les plis qui la contiennent ; le filtre se lève s'il cache la ligne.
  function ouvrirLaPiste() {
    var cible = location.hash && document.getElementById(location.hash.slice(1));
    if (!cible && /^#piste-P\d+$/.test(location.hash) && etat.filtre) { etat.filtre = false; rendreLaTable(); cible = document.getElementById(location.hash.slice(1)); }
    if (!cible) return;
    for (var n = cible; n; n = n.parentElement) if (n.tagName === 'DETAILS') n.open = true;
    if (cible.classList.contains('rm-ligne')) basculer(cible, true);
    if (cible.scrollIntoView) cible.scrollIntoView();
  }
  window.addEventListener('hashchange', ouvrirLaPiste); ouvrirLaPiste();
  // Codes des contrôles, lus dans CODES_DES_CONSTATS (kit). La section suit ELEMENT_DE_LA_FAMILLE de plugin-architect/src/ui/panneau/elements.ts.
  var C = {{js:C}};
  var MOTS = { bloquant: 'bloquant', corriger: 'corriger', verifier: 'vérifier', info: 'info' };
  var corps = document.querySelector('#table-controles tbody');
  C.forEach(function (c) {
    var tr = document.createElement('tr');
    tr.dataset.section = c[1]; tr.dataset.types = c[3].join(' ');
    tr.dataset.texte = (c[0] + ' ' + c[1] + ' ' + c[2]).toLowerCase();
    tr.innerHTML = '<td class="n"><b>' + c[0] + '</b></td><td class="doux">' + c[1] + '</td><td>' + c[2] + '</td><td>' +
      c[3].map(function (t) { return '<span class="alerte a-' + t + '">' + MOTS[t] + '</span>'; }).join(' ') + '</td>';
    corps.appendChild(tr);
  });
  var filtre = { section: 'Toutes', type: 'Tous' };
  function boutons(zoneId, cle, valeurs, libelle) {
    var zone = document.getElementById(zoneId);
    valeurs.forEach(function (v) {
      var b = document.createElement('button'); b.className = 'filtre'; b.textContent = libelle ? libelle(v) : v;
      b.setAttribute('aria-pressed', v === filtre[cle]);
      b.addEventListener('click', function () { filtre[cle] = v; zone.querySelectorAll('.filtre').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); filtrer(); });
      zone.appendChild(b);
    });
  }
  var sections = C.map(function (c) { return c[1]; }).filter(function (s, i, a) { return a.indexOf(s) === i; });
  boutons('filtres-section', 'section', ['Toutes'].concat(sections));
  boutons('filtres-type', 'type', ['Tous', 'bloquant', 'corriger', 'verifier', 'info'], function (v) { return MOTS[v] || v; });
  var recherche = document.getElementById('recherche-controles'), compte = document.getElementById('compte');
  function filtrer() {
    var q = recherche.value.trim().toLowerCase(), n = 0;
    corps.querySelectorAll('tr').forEach(function (tr) {
      var ok = (filtre.section === 'Toutes' || tr.dataset.section === filtre.section) &&
        (filtre.type === 'Tous' || tr.dataset.types.split(' ').indexOf(filtre.type) !== -1) &&
        (!q || tr.dataset.texte.indexOf(q) !== -1);
      tr.hidden = !ok; if (ok) n++;
    });
    compte.textContent = n + ' codes sur ' + C.length;
  }
  recherche.addEventListener('input', filtrer);
  filtrer();

  // Tout déplier ou replier.
  var deplie = false;
  document.getElementById('tout-deplier').addEventListener('click', function () {
    deplie = !deplie;
    PISTES.forEach(function (p) { etat.ouvertes[p.id] = deplie; });
    document.querySelectorAll('.rm-ligne').forEach(function (l) { basculer(l, deplie); });
    document.querySelectorAll('details').forEach(function (d) { d.open = deplie; });
    this.textContent = deplie ? 'Tout replier' : 'Tout déplier';
  });

  // Produits cités : chaque nom d'un des cinq outils de la partie 2 devient une étiquette qui mène à sa carte. Le marquage passe après le
  // rendu des pistes, sur le texte seul : un lien, du code, un titre, un bouton ou un résumé de pli gardent leur texte. Une carte ne
  // s'étiquette pas elle-même. Un lien écrit vers une carte (href="#outil-…") prend la même étiquette.
  var PRODUITS = [
    ['exporter', /UCM Contract Exporter|Contract Exporter|Exporter/],
    ['palettes', /UCM Palettes|Palettes/],
    ['architect', /UCM Architect|Architect/],
    ['adaptateur', /[Aa]daptateur TypeScript|adaptateur/],
    ['cli', /CLI/],
  ];
  var NOM_DE_PRODUIT = new RegExp('(?<![\\p{L}\\d_@/.-])(' + PRODUITS.map(function (p) { return p[1].source; }).join('|') + ')(?![\\p{L}\\d_-])', 'gu');
  var HORS_ETIQUETTE = 'a, code, pre, script, style, svg, button, summary, textarea, select, label, h1, h2, h3, h4, th, .chemin, .fiche .nom, .etat, .alerte, nav';
  function produitDuNom(nom) {
    for (var i = 0; i < PRODUITS.length; i++) if (new RegExp('^(' + PRODUITS[i][1].source + ')$').test(nom)) return PRODUITS[i][0];
    return null;
  }
  // L'étiquette porte le nom court, avec une majuscule : « UCM Palettes » s'écrit « Palettes », « adaptateur » « Adaptateur ». Le titre de la carte garde le nom complet.
  function etiqueter(lien, produit) {
    var nom = lien.textContent.replace(/^UCM /, '');
    lien.classList.add('produit', 'p-' + produit); lien.textContent = nom.charAt(0).toUpperCase() + nom.slice(1);
  }
  document.querySelectorAll('main a[href^="#outil-"]').forEach(function (a) {
    var cible = document.getElementById(a.getAttribute('href').slice(1));
    if (cible && cible.classList.contains('fiche') && !a.closest('.fiche .nom')) etiqueter(a, a.getAttribute('href').slice(7));
  });
  document.querySelectorAll('main .fiche[id^="outil-"]').forEach(function (f) { f.classList.add('p-' + f.id.slice(6)); });
  // La table de la Roadmap se reconstruit au changement de groupe ou de filtre : elle repasse par cette fonction après chaque rendu.
  function marquerLesProduits(zone) {
    var marcheur = document.createTreeWalker(zone, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.parentElement || n.parentElement.closest(HORS_ETIQUETTE)) return NodeFilter.FILTER_REJECT;
        NOM_DE_PRODUIT.lastIndex = 0;
        return NOM_DE_PRODUIT.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var textes = [];
    while (marcheur.nextNode()) textes.push(marcheur.currentNode);
    textes.forEach(function (n) {
      var carte = n.parentElement.closest('.fiche[id^="outil-"]'), soi = carte ? carte.id.slice(6) : null;
      var morceaux = document.createDocumentFragment(), texte = n.nodeValue, depuis = 0, m;
      NOM_DE_PRODUIT.lastIndex = 0;
      while ((m = NOM_DE_PRODUIT.exec(texte))) {
        var produit = produitDuNom(m[1]);
        if (!produit || produit === soi) continue;
        morceaux.appendChild(document.createTextNode(texte.slice(depuis, m.index)));
        var a = document.createElement('a'); a.href = '#outil-' + produit; a.textContent = m[1]; etiqueter(a, produit);
        morceaux.appendChild(a);
        depuis = m.index + m[1].length;
      }
      if (depuis === 0) return;
      morceaux.appendChild(document.createTextNode(texte.slice(depuis)));
      n.parentNode.replaceChild(morceaux, n);
    });
  }
  marquerLesProduits(document.querySelector('main'));
  produitsMarques = true;
  // La carte atteinte s'entoure un instant de la couleur du produit.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.produit');
    if (!a) return;
    var carte = document.getElementById(a.getAttribute('href').slice(1));
    if (!carte) return;
    carte.classList.remove('vise'); void carte.offsetWidth; carte.classList.add('vise');
  });

  // Revenir : un lien interne de la page garde l'endroit d'où l'on part. Le bouton ramène ce lien à la même hauteur d'écran,
  // même si un pli s'est ouvert entre-temps, puis le souligne un instant. Les liens du sommaire ne comptent pas.
  var depart = [], boutonRevenir = document.getElementById('revenir'), lieuRevenir = document.getElementById('revenir-lieu');
  function lieuDe(el) {
    var titres = document.querySelectorAll('main h2, main h3');
    var lieu = '';
    titres.forEach(function (t) { if (t.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) lieu = t.textContent.replace(/^\d+/, '').trim(); });
    return lieu;
  }
  function majRevenir() {
    var dernier = depart[depart.length - 1];
    boutonRevenir.hidden = !dernier;
    if (dernier) lieuRevenir.textContent = dernier.lieu ? '« ' + dernier.lieu + ' »' : '';
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('main a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2 || !document.getElementById(a.getAttribute('href').slice(1))) return;
    depart.push({ lien: a, haut: a.getBoundingClientRect().top, lieu: lieuDe(a) });
    if (depart.length > 30) depart.shift();
    majRevenir();
  });
  boutonRevenir.addEventListener('click', function () {
    var d = depart.pop();
    majRevenir();
    if (!d || !d.lien.isConnected) return;
    window.scrollTo({ top: d.lien.getBoundingClientRect().top + window.scrollY - d.haut });
    d.lien.classList.remove('revenir-ici'); void d.lien.offsetWidth; d.lien.classList.add('revenir-ici');
  });

  // Sommaire : la partie visible est surlignée.
  var liens = document.querySelectorAll('nav.sommaire ol > li > a');
  var obs = new IntersectionObserver(function (entrees) {
    entrees.forEach(function (e) {
      if (e.isIntersecting) liens.forEach(function (a) { a.classList.toggle('actif', a.getAttribute('href') === '#' + e.target.id); });
    });
  }, { rootMargin: '-20% 0px -70% 0px' });
  document.querySelectorAll('section.partie').forEach(function (s) { obs.observe(s); });
})();
