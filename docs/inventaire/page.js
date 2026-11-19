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

  // Rampes calculées par packages/couleur pour les palettes de démonstration du hub (sens normal et inverse), cartes et variable CSS du Button.
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
  var COLLECTIONS = REFERENCE.collections.map(function (c) { return c.nom; });
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
      groupes.push({ id: 'components/couleur', titre: 'Button/color/primary/contained/default', ouvert: true, lignes: [ligne('solid/default', 'background'), ligne('solid/foreground', 'foreground')] });
      groupes.push({ id: 'components/taille', titre: 'Button/size/md', ouvert: true, lignes: [
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
  // « Suivre le Button » : le trajet components, theme, brands, primitives en rose, avec la variable visée sur chaque flèche.
  var NS = 'http://www.w3.org/2000/svg';
  var boutonSuivre = document.getElementById('suivre-button');
  function etiquetteSvg(x, y, ancre, texte, classe) {
    var t = document.createElementNS(NS, 'text'); t.setAttribute('x', x); t.setAttribute('y', y); t.setAttribute('text-anchor', ancre); t.setAttribute('class', classe || 'suivi halo');
    t.textContent = texte; return t;
  }
  function suivreLeButton(actif) {
    schema.classList.toggle('suit', actif);
    boutonSuivre.setAttribute('aria-pressed', actif);
    boutonSuivre.textContent = actif ? 'Ne plus suivre le Button' : 'Suivre le Button';
    schema.querySelectorAll('.suivi, .suivi-groupe').forEach(function (n) { n.parentNode.removeChild(n); });
    schema.querySelectorAll('.cb').forEach(function (b) { b.classList.toggle('suivie', actif && ['components', 'theme', 'brands', 'primitives'].indexOf(b.getAttribute('data-col')) !== -1); });
    schema.querySelectorAll('.fleche[data-suivi]').forEach(function (f) { f.classList.toggle('suivie', actif); });
    if (!actif) return;
    var it = intensiteDe(0), s = choixSens.value, hexa = hexaDuCran(0, it, s, 'light', 700);
    var chemin = nomDeLaPrimitive(0, it, 'light', 700).split('/');
    var groupe = document.createElementNS(NS, 'g'); groupe.setAttribute('class', 'suivi-groupe');
    groupe.appendChild(etiquetteSvg(190, 62, 'end', 'theme/primary/solid/default'));
    groupe.appendChild(etiquetteSvg(396, 12, 'end', 'brands/primary/light/700'));
    groupe.appendChild(etiquetteSvg(606, 50, 'start', chemin.slice(0, 3).join('/') + '/'));
    groupe.appendChild(etiquetteSvg(606, 62, 'start', chemin.slice(3).join('/')));
    var pastille = document.createElementNS(NS, 'circle'); pastille.setAttribute('cx', 598); pastille.setAttribute('cy', 123); pastille.setAttribute('r', 6); pastille.setAttribute('fill', hexa); pastille.setAttribute('stroke', 'var(--rose)'); pastille.setAttribute('stroke-width', 1.5);
    groupe.appendChild(pastille);
    groupe.appendChild(etiquetteSvg(606, 76, 'start', hexa));
    schema.appendChild(groupe);
  }
  boutonSuivre.addEventListener('click', function () { suivreLeButton(boutonSuivre.getAttribute('aria-pressed') !== 'true'); });

  // V1. Le trajet d'un Button, de Figma au code : 8 stations en trois couloirs.
  // Les valeurs entre accolades viennent de DONNEES : {clair} et {sombre} (Terracota, Soft, cran 700), {reference}, {css} (tokenCssVariable du kit).
  var TRAJET = {
    couloirs: [['Designer,', 'dans Figma'], ['Forge et CI'], ['Développeur,', 'dans le repository']],
    stations: [
      { couloir: 0, col: 0, outil: ['UCM Palettes'], objet: ['primitives/color/', 'terracota/soft/light/700'], pastille: true, note: '{clair}, Dark {sombre}',
        longue: '`primitives/color/terracota/soft/light/700` = {clair}, Dark {sombre}, référence {reference}.' },
      { couloir: 0, col: 1, outil: ['À la main'], objet: ['brands/primary/', 'light/700'], pastille: true, note: 'alias de la primitive', style: 'main',
        longue: '`brands/primary/light/700`, alias de la primitive. Aucun outil ne l’écrit.' },
      { couloir: 0, col: 2, outil: ['Architect', 'vue Tokens'], objet: ['theme/primary/', 'solid/default'], pastille: true, note: 'vise brands, G2',
        longue: '`theme/primary/solid/default` vise `brands/primary/light/700`. Garantie G2 (3:1 sur la page).' },
      { couloir: 0, col: 3, outil: ['Architect', 'vue Composant'], objet: ['components/Button/', '…/default/background'], pastille: true, note: 'press vers pressed',
        longue: '`components/Button/color/primary/contained/default/background` vise `theme/primary/solid/default`. Le remplissage du variant Primary, Contained, Default y est lié. Corrections proposées : `press` en `pressed`, `error` en `danger`.' },
      { couloir: 1, col: 3, outil: ['Contract Exporter'], objet: ['tokens.json', 'Button.contract.json'], note: 'deux pull requests',
        longue: 'Deux pull requests, `tokens.json` d’abord, puis `Button.contract.json`.' },
      { couloir: 1, col: 4, outil: ['ucm check'], objet: ['commentaire de', 'pull request'], note: 'illisible bloque',
        longue: 'Rapport en commentaire de la pull request. Un contrat illisible bloque. Un token absent avertit.' },
      { couloir: 2, col: 4, outil: ['CLI et adaptateur'], objet: ['--components-button-', '…-default-background'], note: 'types, parité avertit',
        longue: '`ucm tokens css` donne `{css}`. Les types des variantes sont générés. `Button.tsx` est écrit contre le contrat, et la parité est contrôlée, elle avertit.' },
      { couloir: 2, col: 5, outil: ['Personne'], objet: ['rendu non comparé', ''], note: 'pistes P9, P10, P20', style: 'trou',
        longue: 'Le rendu dans un navigateur n’est comparé par personne. Pistes P9, P10 et P20.' }
    ]
  };
  (function () {
    var zone = document.getElementById('trajet-button'); if (!zone) return;
    var t = DONNEES.palettes[0], cran = DONNEES.crans.indexOf(700);
    var valeurs = { clair: t.intensites.soft['light-normal'][cran], sombre: t.intensites.soft['dark-normal'][cran], reference: t.reference, css: DONNEES.bouton.variableCss };
    var remplir = function (s) { return s.replace(/\{(\w+)\}/g, function (m, k) { return valeurs[k]; }); };
    var LB = 150, HB = 84, PX = 168, X0 = 128, HC = 100, GAP = 4, largeur = X0 + 5 * PX + LB + 12, hauteur = 3 * HC + 2 * GAP + 16;
    var posDe = function (s) { return { x: X0 + s.col * PX, y: 8 + s.couloir * (HC + GAP) + 8 }; };
    var svg = '<svg class="schema-trajet" viewBox="0 0 ' + largeur + ' ' + hauteur + '" role="img" aria-label="Le trajet du Button en huit stations, de Palettes au rendu dans un navigateur">' +
      '<defs><marker id="pointe-trajet" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" style="fill: var(--doux)"/></marker></defs>';
    TRAJET.couloirs.forEach(function (c, i) {
      var y = 8 + i * (HC + GAP);
      svg += '<rect class="couloir" x="0" y="' + y + '" width="' + (largeur - 4) + '" height="' + HC + '" rx="8"/>' +
        c.map(function (ligne, k) { return '<text class="titre-couloir" x="10" y="' + (y + 24 + k * 14) + '">' + esc(ligne) + '</text>'; }).join('');
    });
    TRAJET.stations.forEach(function (s, i) {
      var p = posDe(s);
      if (i > 0) {
        var q = posDe(TRAJET.stations[i - 1]);
        svg += q.y === p.y
          ? '<path class="lien" d="M' + (q.x + LB) + ' ' + (q.y + HB / 2) + ' L' + (p.x - 1) + ' ' + (p.y + HB / 2) + '"/>'
          : '<path class="lien" d="M' + (q.x + LB / 2) + ' ' + (q.y + HB) + ' L' + (p.x + LB / 2) + ' ' + (p.y - 1) + '"/>';
      }
    });
    TRAJET.stations.forEach(function (s, i) {
      var p = posDe(s), l = 0;
      svg += '<g>' +
        '<rect class="station' + (s.style ? ' ' + s.style : '') + '" x="' + p.x + '" y="' + p.y + '" width="' + LB + '" height="' + HB + '" rx="8"/>' +
        '<text class="numero" x="' + (p.x + LB - 8) + '" y="' + (p.y + 15) + '" text-anchor="end">' + (i + 1) + '</text>' +
        '<text class="outil" x="' + (p.x + 8) + '" y="' + (p.y + 17) + '">' + esc(s.outil[0]) + '</text>' +
        (s.outil[1] ? '<text class="outil-suite" x="' + (p.x + 8) + '" y="' + (p.y + 30) + '">' + esc(s.outil[1]) + '</text>' : '') +
        s.objet.map(function (ligne, k) { return ligne ? '<text class="objet" x="' + (p.x + 8) + '" y="' + (p.y + 46 + k * 11) + '">' + esc(ligne) + '</text>' : ''; }).join('') +
        (s.pastille ? '<rect class="echantillon" x="' + (p.x + 8) + '" y="' + (p.y + 66) + '" width="11" height="11" rx="3" fill="' + valeurs.clair + '"/>' : '') +
        '<text class="note' + (s.style === 'trou' ? ' rose' : '') + '" x="' + (p.x + (s.pastille ? 24 : 8)) + '" y="' + (p.y + 75) + '">' + esc(remplir(s.note)) + '</text></g>';
    });
    svg += '</svg>';
    var liste = '<ol class="chaine seul-mobile">' + TRAJET.stations.map(function (s) {
      return '<li><b>' + esc(s.outil.join(', ')) + '</b> ' + esc(remplir(s.longue)).replace(/`([^`]+)`/g, '<code>$1</code>') + '</li>';
    }).join('') + '</ol>';
    var detail = '<details class="pli seul-ecran"><summary>Le détail de chaque station</summary><div class="contenu">' + liste.replace(' seul-mobile', '') + '</div></details>';
    zone.innerHTML = '<div class="seul-ecran">' + svg + '</div>' + detail + liste +
      '<p class="legende-trajet doux">Les pointillés gris marquent un geste fait à la main. Les pointillés roses marquent un contrôle absent.</p>';
  })();

  // Feuille de route : les pistes viennent de pistes.json (docs/notes/Recherches/Evolutions globales/), rangées par rang puis par importance.
  var PISTES = {{js:PISTES}};
  PISTES.forEach(function (x) { x.complexite = x.complexite.toUpperCase(); });
  // Les décisions que le dépôt porte (decisions.json) : la base de comparaison avec le choix gardé dans ce navigateur.
  var DECISIONS_DU_DEPOT = {{js:DECISIONS}};
  var RANGS = ['Avant d’ouvrir le projet', 'Socle de la bibliothèque et verdict', 'Premiers modules', 'Vérification du rendu', 'Utile, sans urgence', 'Plus tard'];
  var IMPORTANCES = { critique: ['●●●', 'critique'], haute: ['●●', 'haute'], moyenne: ['●', 'moyenne'], basse: ['○', 'basse'] };
  var TAILLES = { S: 'petite', M: 'moyenne', L: 'grande', XL: 'un projet' };
  var PROMESSES = { R: 'robustesse', C: 'confiance' };
  var PORTEURS = { mainteneur: 'porté par le mainteneur', 'développeurs': 'porté par les développeurs', 'les deux': 'porté par le mainteneur et les développeurs' };
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function txt(t) {
    return esc(t).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\b(P\d{1,2})\b/g, function (m) {
      return PISTES.some(function (x) { return x.id === m; }) ? '<a href="#piste-' + m + '">' + m + '</a>' : m;
    });
  }
  function premierePhrase(t) { var m = String(t).match(/^[\s\S]*?[.!?](?=\s|$)/); return m ? m[0] : t; }
  var ETATS = { 'à faire': ['decidee', 'décidée, à faire'], 'proposé': ['propose', 'proposée par une recherche'], 'ouvert': ['ouvert', 'question ouverte'] };

  // Le graphe : prérequis, profondeur (nombre d'étapes de prérequis), descendantes et chemin critique, calculés depuis PISTES.
  var PAR_ID = {}, PROFONDEUR = {}, DIRECTS = {}, ASCENDANTES = {}, DESCENDANTES = {};
  PISTES.forEach(function (x) { PAR_ID[x.id] = x; DIRECTS[x.id] = []; });
  PISTES.forEach(function (x) { x.dependances.forEach(function (d) { DIRECTS[d].push(x.id); }); });
  function profondeur(id) {
    if (id in PROFONDEUR) return PROFONDEUR[id];
    var d = PAR_ID[id].dependances;
    return (PROFONDEUR[id] = d.length ? 1 + Math.max.apply(null, d.map(profondeur)) : 0);
  }
  function ascendantes(id) {
    if (id in ASCENDANTES) return ASCENDANTES[id];
    var s = {};
    PAR_ID[id].dependances.forEach(function (d) { s[d] = 1; Object.keys(ascendantes(d)).forEach(function (k) { s[k] = 1; }); });
    return (ASCENDANTES[id] = s);
  }
  PISTES.forEach(function (x) { profondeur(x.id); ascendantes(x.id); DESCENDANTES[x.id] = {}; });
  PISTES.forEach(function (x) { Object.keys(ASCENDANTES[x.id]).forEach(function (a) { DESCENDANTES[a][x.id] = 1; }); });
  // Le plus long chemin de prérequis. À égalité de profondeur, la piste qui vient la première dans l'ordre de la feuille de route l'emporte.
  var CHEMIN = (function () {
    var fin = PISTES.reduce(function (a, x) { return PROFONDEUR[x.id] > PROFONDEUR[a.id] ? x : a; }, PISTES[0]);
    var chemin = [fin.id], courant = fin.id;
    while (PROFONDEUR[courant] > 0) {
      var precedent = PISTES.filter(function (q) { return PAR_ID[courant].dependances.indexOf(q.id) !== -1 && PROFONDEUR[q.id] === PROFONDEUR[courant] - 1; })[0];
      chemin.unshift(precedent.id); courant = precedent.id;
    }
    return chemin;
  })();

  var CLE_DECISIONS = 'inventaire-ucm-decisions';
  var OPTIONS = [['oui', 'On fait'], ['non', 'On ne fait pas'], ['', 'À décider']];
  var OPTIONS_T = {};
  DECISIONS_DU_DEPOT.regles.forEach(function (r) {
    if (r.options) OPTIONS_T[r.id] = r.options.map(function (o) { return [o.valeur, o.libelle]; }).concat([['', 'À décider']]);
  });
  var TRANSVERSES = [];
  // Les décisions de travail : l'état du dépôt, avec par-dessus l'écart gardé dans ce navigateur.
  function duDepot() {
    var base = {};
    ['pistes', 'transverses'].forEach(function (groupe) {
      Object.keys(DECISIONS_DU_DEPOT[groupe] || {}).forEach(function (cle) {
        var d = DECISIONS_DU_DEPOT[groupe][cle];
        base[cle] = { choix: d.choix || '', note: d.note || '' };
      });
    });
    return base;
  }
  var decisions = duDepot();
  try {
    var local = JSON.parse(localStorage.getItem(CLE_DECISIONS) || '{}') || {};
    Object.keys(local).forEach(function (cle) {
      var d = decisions[cle] || { choix: '', note: '' };
      decisions[cle] = { choix: typeof local[cle].choix === 'string' ? local[cle].choix : d.choix, note: typeof local[cle].note === 'string' ? local[cle].note : d.note };
    });
  } catch (e) { decisions = duDepot(); }
  function choixDe(cle) { return (decisions[cle] || {}).choix || ''; }
  function listeDe(ids, mot) { return ids.length < 2 ? ids.join('') : ids.slice(0, -1).join(', ') + ' et ' + ids[ids.length - 1]; }
  // Ce qui contredit une décision : un prérequis écarté, ou une décision attendue sur un prérequis.
  function incoherencesDe(id) {
    var ecartees = Object.keys(ASCENDANTES[id]).filter(function (a) { return choixDe(a) === 'non'; });
    var attendues = PAR_ID[id].dependances.filter(function (d) { return choixDe(d) === ''; });
    return {
      ecartee: ecartees.length && choixDe(id) !== 'non' ? 'Dépend de ' + listeDe(ecartees) + ', ' + (ecartees.length > 1 ? 'écartées' : 'écartée') : '',
      attend: choixDe(id) === 'oui' && attendues.length ? 'Attend une décision sur ' + listeDe(attendues) : ''
    };
  }
  function toutesLesIncoherences() {
    var lignes = [];
    PISTES.forEach(function (x) {
      if (choixDe(x.id) !== 'oui') return;
      var i = incoherencesDe(x.id);
      if (i.ecartee) lignes.push(x.id + ' ' + x.titre + ' : on fait. ' + i.ecartee + '.');
      if (i.attend) lignes.push(x.id + ' ' + x.titre + ' : on fait. ' + i.attend + '.');
    });
    return lignes;
  }
  function bilan() {
    var oui = 0, non = 0, t = 0;
    PISTES.forEach(function (x) { var c = choixDe(x.id); if (c === 'oui') oui++; else if (c === 'non') non++; });
    TRANSVERSES.forEach(function (x) { if (choixDe(x.id)) t++; });
    document.getElementById('bilan-decisions').textContent = oui + ' on fait · ' + non + ' on ne fait pas · ' + (PISTES.length - oui - non) + ' à décider · ' + t + ' décisions transverses sur ' + TRANSVERSES.length;
  }
  function marquerLaPiste(d, id) {
    var c = choixDe(id), zone = d.querySelector('.choix-zone'), i = incoherencesDe(id);
    zone.innerHTML = c === 'oui' ? '<span class="choix-piste oui">On fait</span>' : c === 'non' ? '<span class="choix-piste non">On ne fait pas</span>' : '';
    d.classList.toggle('decide-non', c === 'non');
    d.querySelector('.coherence').innerHTML = (i.ecartee ? '<span class="etat manque">' + i.ecartee + '</span> ' : '') + (i.attend ? '<span class="etat ouvert">' + i.attend + '</span>' : '');
  }
  var radios = {};
  function lierLesChoix(racine) {
    racine.querySelectorAll('input[type=radio][data-cle]').forEach(function (inp) {
      var cle = inp.getAttribute('data-cle');
      (radios[cle] = radios[cle] || []).push(inp);
      inp.addEventListener('change', function () { decisions[cle] = decisions[cle] || {}; decisions[cle].choix = inp.value; garder(); });
    });
    racine.querySelectorAll('textarea[data-note]').forEach(function (z) {
      var cle = z.getAttribute('data-note');
      z.value = (decisions[cle] || {}).note || '';
      z.addEventListener('input', function () { decisions[cle] = decisions[cle] || {}; decisions[cle].note = z.value; garder(); });
    });
  }
  function synchroniserLesChoix() {
    Object.keys(radios).forEach(function (cle) { radios[cle].forEach(function (inp) { inp.checked = inp.value === choixDe(cle); }); });
  }
  function boutonsDe(cle, contexte, options) {
    return '<div class="options" role="radiogroup" aria-label="Décision sur ' + cle + '">' + options.map(function (o) {
      return '<label class="option"><input type="radio" name="d-' + contexte + '-' + cle + '" data-cle="' + cle + '" value="' + o[0] + '"> ' + o[1] + '</label>';
    }).join('') + '</div>';
  }
  function vide(d) { return !d || (!d.choix && !d.note); }
  function memes(a, b) { return vide(a) ? vide(b) : !vide(b) && (a.choix || '') === (b.choix || '') && (a.note || '') === (b.note || ''); }
  // Les décisions qui diffèrent de celles du dépôt (choix ou note).
  function ecart() {
    var base = duDepot(), cles = {}, ecarts = {};
    Object.keys(base).concat(Object.keys(decisions)).forEach(function (cle) { cles[cle] = 1; });
    Object.keys(cles).forEach(function (cle) { if (!memes(decisions[cle], base[cle])) ecarts[cle] = { choix: (decisions[cle] || {}).choix || '', note: (decisions[cle] || {}).note || '' }; });
    return ecarts;
  }
  var messageEcart = '';
  function garder() {
    messageEcart = '';
    try { localStorage.setItem(CLE_DECISIONS, JSON.stringify(ecart())); } catch (e) {}
    afficher();
  }
  function afficherLEcart() {
    var n = Object.keys(ecart()).length;
    document.getElementById('ecart-decisions').hidden = !n;
    document.getElementById('ecart-compte').textContent = n + (n > 1 ? ' décisions pas encore dans le dépôt' : ' décision pas encore dans le dépôt');
    document.getElementById('ecart-message').textContent = messageEcart;
  }
  // Le decisions.json complet : les règles du dépôt inchangées, les choix du dépôt fusionnés avec l'écart local, clés triées.
  function contenuDuDepot() {
    var sortie = { version: DECISIONS_DU_DEPOT.version, pistes: {}, transverses: {}, regles: DECISIONS_DU_DEPOT.regles };
    var estTransverse = {};
    DECISIONS_DU_DEPOT.regles.forEach(function (r) { if (r.genre === 'transverse') estTransverse[r.id] = 1; });
    Object.keys(decisions).sort(function (a, b) { return a.localeCompare(b, 'fr', { numeric: true }); }).forEach(function (cle) {
      if (vide(decisions[cle])) return;
      sortie[estTransverse[cle] ? 'transverses' : 'pistes'][cle] = { choix: decisions[cle].choix || '', note: decisions[cle].note || '' };
    });
    return JSON.stringify(sortie, null, 2) + '\n';
  }
  var NOM_FICHIER = 'decisions.json', CHEMIN_FICHIER = 'docs/notes/Recherches/Evolutions globales/decisions.json';
  function baseDePoignees(mode, f) {
    return new Promise(function (ok, ko) {
      var ouverture = indexedDB.open('inventaire-ucm', 1);
      ouverture.onupgradeneeded = function () { ouverture.result.createObjectStore('poignees'); };
      ouverture.onerror = function () { ko(ouverture.error); };
      ouverture.onsuccess = function () {
        try {
          var tx = ouverture.result.transaction('poignees', mode), req = f(tx.objectStore('poignees'));
          tx.oncomplete = function () { ouverture.result.close(); ok(req && req.result); };
          tx.onerror = function () { ko(tx.error); };
        } catch (e) { ko(e); }
      };
    });
  }
  function poigneeGardee() { try { return baseDePoignees('readonly', function (m) { return m.get('decisions'); }).catch(function () { return null; }); } catch (e) { return Promise.resolve(null); } }
  function garderLaPoignee(h) { try { return baseDePoignees('readwrite', function (m) { return m.put(h, 'decisions'); }).catch(function () {}); } catch (e) { return Promise.resolve(); } }
  function telecharger(texte) {
    var a = document.createElement('a');
    a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(texte);
    a.download = NOM_FICHIER;
    document.body.appendChild(a); a.click(); a.remove();
    return 'Fichier téléchargé. Déposez-le dans ' + CHEMIN_FICHIER + ', lancez `npm run vues`, puis commitez.';
  }
  function ecrire(h, texte) {
    return h.createWritable().then(function (w) { return w.write(texte).then(function () { return w.close(); }); });
  }
  function permise(h) {
    if (!h.queryPermission) return Promise.resolve(true);
    return h.queryPermission({ mode: 'readwrite' }).then(function (p) {
      return p === 'granted' ? true : h.requestPermission({ mode: 'readwrite' }).then(function (q) { return q === 'granted'; });
    });
  }
  // Chrome et Edge réécrivent le même fichier ; sans cette API, ou si l'écriture échoue, le fichier se télécharge.
  function enregistrerDansLeDepot() {
    var texte, dit = function (m) { messageEcart = m; afficherLEcart(); };
    try { texte = contenuDuDepot(); } catch (e) { dit('Enregistrement impossible : ' + e.message); return; }
    var reussi = function () { dit('Enregistré dans ' + NOM_FICHIER + '. Lancez `npm run vues`, puis commitez.'); };
    var repli = function (e) {
      if (e && e.name === 'AbortError') { dit('Enregistrement annulé.'); return; }
      try { dit(telecharger(texte)); } catch (e2) { dit('Enregistrement impossible : ' + e2.message); }
    };
    if (!window.showSaveFilePicker) { repli(); return; }
    var choisir = function () {
      return window.showSaveFilePicker({ suggestedName: NOM_FICHIER, types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] })
        .then(function (h) { return garderLaPoignee(h).then(function () { return ecrire(h, texte); }); });
    };
    try {
      poigneeGardee().then(function (h) {
        if (!h) return choisir();
        return permise(h).then(function (ok) { return ok ? ecrire(h, texte) : choisir(); });
      }).then(reussi, repli);
    } catch (e) { repli(e); }
  }
  function poserLesNotes() {
    document.querySelectorAll('textarea[data-note]').forEach(function (z) { z.value = (decisions[z.getAttribute('data-note')] || {}).note || ''; });
  }
  function revenirAuDepot() {
    if (!confirm('Revenir à la version du dépôt ? Les décisions et notes de ce navigateur qui diffèrent seront perdues.')) return;
    try { localStorage.removeItem(CLE_DECISIONS); } catch (e) {}
    decisions = duDepot();
    messageEcart = '';
    poserLesNotes();
    afficher();
  }
  function afficher() {
    synchroniserLesChoix();
    afficherLEcart();
    bilan();
    zonePistes.querySelectorAll('details.piste').forEach(function (d) { marquerLaPiste(d, d.id.replace('piste-', '')); });
    dessinerLeGraphe();
  }
  var zonePistes = document.getElementById('pistes');
  var parRang = {};
  PISTES.forEach(function (x) { (parRang[x.rang] = parRang[x.rang] || []).push(x); });
  Object.keys(parRang).sort().forEach(function (rang) {
    var h = document.createElement('div'); h.className = 'rang-titre';
    h.textContent = 'Rang ' + rang + ' · ' + (RANGS[rang] || '');
    zonePistes.appendChild(h);
    parRang[rang].forEach(function (x) {
      var d = document.createElement('details'); d.className = 'piste'; d.id = 'piste-' + x.id;
      var points = '<div class="defile points"><table><tr><th>Action</th><th>Chemin</th><th>Quoi</th></tr>' + x.points.map(function (pt) {
        return '<tr><td>' + esc(pt.action) + '</td><td><code>' + esc(pt.chemin) + '</code></td><td>' + txt(pt.quoi) + '</td></tr>';
      }).join('') + '</table></div>';
      var liste = function (a, cls) { return a.length ? '<ul' + (cls ? ' class="' + cls + '"' : '') + '>' + a.map(function (t) { return '<li>' + txt(t) + '</li>'; }).join('') + '</ul>' : '<p class="doux">Aucune.</p>'; };
      var imp = IMPORTANCES[x.importance], etat = ETATS[x.etat] || ETATS['ouvert'], prof = PROFONDEUR[x.id];
      var meta = '<span class="imp">importance <span aria-hidden="true">' + imp[0] + '</span> ' + imp[1] + '</span> · complexité ' + TAILLES[x.complexite] + ' (' + x.complexite + ') · ' +
        (prof === 0 ? 'sans prérequis' : prof + (prof === 1 ? ' étape' : ' étapes') + ' de prérequis') + ' · ' + PROMESSES[x.promesse] + ' · ' + (PORTEURS[x.porteur] || esc(x.porteur)) + ' · <span class="etat ' + etat[0] + '">' + etat[1] + '</span>';
      d.innerHTML = '<summary><span class="id">' + x.id + '</span><span class="titre">' + txt(x.titre) + '<small>' + txt(x.resume) + '</small>' +
        '<small class="sinon"><b>Si on ne fait pas</b>' + txt(premierePhrase(x.raisonImportance)) + '</small><span class="meta">' + meta + '</span><span class="coherence"></span></span>' +
        '<span class="marques"><span class="choix-zone"></span></span></summary>' +
        '<div class="corps-piste">' +
        '<div class="decider">' + boutonsDe(x.id, 'fiche', OPTIONS) +
          '<textarea data-note="' + x.id + '" aria-label="Note sur ' + x.id + '" placeholder="Note : condition, priorité, réponse à une question…"></textarea></div>' +
        '<h4>Pourquoi</h4><p>' + txt(x.raisonImportance) + '</p>' +
        '<h4>Complexité ' + TAILLES[x.complexite] + '</h4><p>' + txt(x.raisonComplexite) + '</p>' +
        '<h4>Temps du mainteneur</h4><p>' + txt(x.coutHumain) + '</p>' +
        '<h4>Dépend de</h4><p>' + (x.dependances.length ? x.dependances.map(function (id) { return '<a href="#piste-' + id + '">' + id + '</a>'; }).join(', ') : 'rien') + '</p>' +
        '<h4>Points touchés</h4>' + points +
        '<h4>Critères de fin</h4>' + liste(x.criteresDeFin, 'criteres') +
        '<h4>Questions au mainteneur</h4>' + liste(x.questions) +
        '<h4>Risques</h4>' + liste(x.risques) +
        '</div>';
      zonePistes.appendChild(d);
    });
  });
  // Vue d'ensemble : une ligne par piste, dans l'ordre de la feuille de route.
  (function () {
    var corps = document.getElementById('corps-ensemble');
    var rangCourant = null;
    corps.innerHTML = PISTES.map(function (x) {
      var entete = '';
      if (x.rang !== rangCourant) { rangCourant = x.rang; entete = '<tr class="rang-ligne"><td colspan="6">Rang ' + x.rang + ' · ' + (RANGS[x.rang] || '') + '</td></tr>'; }
      var directs = DIRECTS[x.id], total = Object.keys(DESCENDANTES[x.id]).length;
      return entete + '<tr><td><a href="#piste-' + x.id + '"><b>' + x.id + '</b></a> ' + txt(x.titre) + '</td>' +
        '<td class="sinon">' + txt(premierePhrase(x.raisonImportance)) + '</td>' +
        '<td><b>' + x.complexite + '</b> · ' + txt(x.coutHumain) + '</td>' +
        '<td>' + (x.dependances.length ? x.dependances.map(function (id) { return '<a href="#piste-' + id + '">' + id + '</a>'; }).join(', ') : 'rien') + '</td>' +
        '<td>' + (directs.length ? directs.map(function (id) { return '<a href="#piste-' + id + '">' + id + '</a>'; }).join(', ') + ', ' + total + ' au total' : 'rien') + '</td>' +
        '<td class="choix-ligne">' + boutonsDe(x.id, 'ensemble', OPTIONS) + '</td></tr>';
    }).join('');
  })();
  // Décisions transverses : mêmes boutons et une note par ligne, enregistrés avec les décisions des pistes.
  document.querySelectorAll('tr[data-decision]').forEach(function (tr) {
    var cle = tr.getAttribute('data-decision');
    TRANSVERSES.push({ id: cle, titre: tr.cells[0].textContent.trim() });
    var td = document.createElement('td'); td.className = 'choix-ligne';
    td.innerHTML = boutonsDe(cle, 'transverse', OPTIONS_T[cle] || OPTIONS) + '<details><summary>Note</summary><textarea data-note="' + cle + '" aria-label="Note sur la décision ' + cle + '"></textarea></details>';
    tr.appendChild(td);
  });
  lierLesChoix(document.getElementById('suite'));
  document.querySelectorAll('#suite details > textarea[data-note]').forEach(function (z) { if (z.value) z.parentNode.open = true; });
  // Le graphe des dépendances : une colonne par profondeur, flèches du prérequis vers la piste, chemin critique en rose.
  var NSVG = 'http://www.w3.org/2000/svg';
  function dessinerLeGraphe() {
    var zone = document.getElementById('graphe-pistes'), liste = document.getElementById('graphe-liste');
    var L = 136, H = 42, PX = 152, PY = 54, HAUT = 22, colonnes = [], pos = {};
    PISTES.forEach(function (x) { (colonnes[PROFONDEUR[x.id]] = colonnes[PROFONDEUR[x.id]] || []).push(x); });
    colonnes.forEach(function (col, d) { col.forEach(function (x, r) { pos[x.id] = { x: 10 + d * PX, y: HAUT + r * PY }; }); });
    var lignesMax = Math.max.apply(null, colonnes.map(function (c) { return c.length; }));
    var largeur = 10 + (colonnes.length - 1) * PX + L + 10, hauteur = HAUT + lignesMax * PY;
    var enChemin = {}; CHEMIN.forEach(function (id) { enChemin[id] = 1; });
    var critique = {}; for (var k = 1; k < CHEMIN.length; k++) critique[CHEMIN[k - 1] + '>' + CHEMIN[k]] = 1;
    var ecartee = function (id) { return choixDe(id) === 'non' || Object.keys(ASCENDANTES[id]).some(function (a) { return choixDe(a) === 'non'; }); };
    var s = '<svg viewBox="0 0 ' + largeur + ' ' + hauteur + '" role="img" aria-label="Graphe des ' + PISTES.length + ' pistes, rangées par nombre d’étapes de prérequis">' +
      '<defs><marker id="pointe-graphe" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" style="fill: var(--doux)"/></marker>' +
      '<marker id="pointe-graphe-rose" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" style="fill: var(--rose)"/></marker></defs>';
    colonnes.forEach(function (col, d) { s += '<text class="entete-col" x="' + (10 + d * PX) + '" y="12">Étape ' + d + '</text>'; });
    PISTES.forEach(function (x) {
      x.dependances.forEach(function (dep) {
        var a = pos[dep], b = pos[x.id], x1 = a.x + L, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2, dx = (x2 - x1) / 2;
        s += '<path class="ln' + (critique[dep + '>' + x.id] ? ' critique' : '') + (ecartee(dep) ? ' coupee' : '') + '" d="M' + x1 + ' ' + y1 + ' C' + (x1 + dx) + ' ' + y1 + ', ' + (x2 - dx) + ' ' + y2 + ', ' + x2 + ' ' + y2 + '"/>';
      });
    });
    PISTES.forEach(function (x) {
      var p = pos[x.id], c = choixDe(x.id), cls = 'bp' + (enChemin[x.id] ? ' critique' : '') + (c === 'oui' ? ' oui' : '') + (c === 'non' ? ' non' : '') + (c !== 'non' && ecartee(x.id) ? ' descendante' : '');
      s += '<a href="#piste-' + x.id + '" aria-label="' + x.id + ' ' + esc(x.titre) + ', complexité ' + x.complexite + (enChemin[x.id] ? ', sur le chemin critique' : '') + '"><g class="' + (c === 'non' ? 'non-texte' : '') + '">' +
                '<rect class="' + cls + '" x="' + p.x + '" y="' + p.y + '" width="' + L + '" height="' + H + '" rx="7"/>' +
        '<text class="bp-id" x="' + (p.x + 8) + '" y="' + (p.y + 16) + '">' + x.id + '</text>' +
        '<text class="bp-s" x="' + (p.x + L - 8) + '" y="' + (p.y + 16) + '" text-anchor="end">' + x.complexite + '</text>' +
        '<text class="bp-t" x="' + (p.x + 8) + '" y="' + (p.y + 32) + '">' + esc(x.titreCourt || x.titre) + '</text></g></a>';
    });
    zone.innerHTML = s + '</svg>';
    liste.innerHTML = colonnes.map(function (col, d) {
      return '<li><b>Étape ' + d + '</b> ' + col.map(function (x) { return '<a href="#piste-' + x.id + '">' + (enChemin[x.id] ? '<strong>' + x.id + '</strong>' : x.id) + '</a> ' + esc(x.titreCourt || x.titre); }).join(', ') + '</li>';
    }).join('');
    document.getElementById('legende-chemin').textContent = 'Le chemin rose compte ' + CHEMIN.length + ' pistes, de ' + CHEMIN[0] + ' à ' + CHEMIN[CHEMIN.length - 1] + '. Il fixe le délai le plus court avant la dernière piste du graphe. La complexité (S, M, L, XL) est en haut à droite de chaque boîte.';
  }
  afficher();
  // Un lien vers une piste la déplie.
  function ouvrirLaPiste() {
    var cible = location.hash && document.getElementById(location.hash.slice(1));
    for (var n = cible; n; n = n.parentElement) if (n.tagName === 'DETAILS') n.open = true;
    if (cible && cible.scrollIntoView) cible.scrollIntoView();
  }
  window.addEventListener('hashchange', ouvrirLaPiste); ouvrirLaPiste();
  var pistesOuvertes = false;
  document.getElementById('deplier-pistes').addEventListener('click', function () {
    pistesOuvertes = !pistesOuvertes;
    document.getElementById('fiches').open = pistesOuvertes;
    zonePistes.querySelectorAll('details.piste').forEach(function (d) { d.open = pistesOuvertes; });
    this.textContent = pistesOuvertes ? 'Replier les pistes' : 'Déplier les ' + PISTES.length + ' pistes';
  });
  document.getElementById('copier-decisions').addEventListener('click', function () {
    function libelle(cle) {
      var c = choixDe(cle), options = OPTIONS_T[cle] || OPTIONS;
      if (c === 'oui') return 'on fait'; if (c === 'non') return 'on ne fait pas'; if (c === '') return 'à décider';
      return options.filter(function (o) { return o[0] === c; })[0][1];
    }
    function note(cle) { var n = (decisions[cle] || {}).note; return n ? '. Note : ' + n.replace(/\s+/g, ' ').trim() : ''; }
    var lignes = PISTES.map(function (x) { return '- ' + x.id + ' ' + x.titre + ' : ' + libelle(x.id) + note(x.id); });
    var texte = 'Décisions sur la feuille de route\n' + lignes.join('\n') +
      '\n\nDécisions transverses\n' + TRANSVERSES.map(function (t) { return '- ' + t.titre + ' : ' + libelle(t.id) + note(t.id); }).join('\n');
    var inc = toutesLesIncoherences();
    if (inc.length) texte += '\n\nIncohérences\n' + inc.map(function (l) { return '- ' + l; }).join('\n');
    var zone = document.getElementById('export-decisions');
    zone.value = texte; zone.hidden = false; zone.select();
    try { if (navigator.clipboard) navigator.clipboard.writeText(texte).catch(function () {}); } catch (e) {}
  });
  document.getElementById('effacer-decisions').addEventListener('click', function () {
    if (!confirm('Effacer toutes les décisions et notes de ce navigateur ?')) return;
    decisions = {};
    document.querySelectorAll('#suite textarea[data-note]').forEach(function (z) { z.value = ''; });
    garder();
  });
  document.getElementById('enregistrer-decisions').addEventListener('click', enregistrerDansLeDepot);
  document.getElementById('revenir-au-depot').addEventListener('click', revenirAuDepot);

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

  // Destinataires. data-pour vaut pour tout ce que l'élément contient, sauf un descendant marqué ;
  // un h3 marqué prête sa marque aux éléments qui le suivent jusqu'au titre suivant.
  // Un élément qui porte la même marque que son titre ou son conteneur marqué ne reçoit pas de pictogramme.
  var POUR = { designer: 'Designer', developpeur: 'Développeur', toolkit: 'Toolkit' };
  var ORDRE = ['designer', 'developpeur', 'toolkit'];
  var DEFINITIONS = { designer: 'Ce qui se passe dans Figma', developpeur: 'Ce qui arrive dans le repository de l\u2019application', toolkit: 'Ce qui reste dans UCM-Toolkit' };
  var principal = document.querySelector('main');
  function lire(el) {
    if (!el) return [];
    return (el.getAttribute('data-pour') || el.getAttribute('data-pour-herite') || '').split(/\s+/).filter(function (m) { return POUR[m]; });
  }
  var BORDS = { designer: 'var(--pour-designer)', developpeur: 'var(--pour-developpeur)', toolkit: 'var(--pour-toolkit)' };
  function groupe(liste, avecMot) {
    var g = document.createElement('span'); g.className = 'pours' + (avecMot ? ' avec-mot' : '');
    var l = document.createElement('span'); l.className = 'lecteur'; l.textContent = 'Pour'; g.appendChild(l);
    liste.forEach(function (m) {
      var s = document.createElement('span'); s.className = 'pour pour-' + m; s.title = 'Pour ' + POUR[m];
      var mot = document.createElement('span'); mot.className = 'mot'; mot.textContent = POUR[m]; s.appendChild(mot);
      g.appendChild(s);
    });
    return g;
  }
  // Un liseré de 3 px par marque, dans l'ordre des pictogrammes. Deux liserés sont séparés par un vide de 2 px à la couleur du fond de l'élément.
  function liseret(el, liste) {
    el.setAttribute('data-pour-bord', liste.length);
    var ombres = [];
    liste.forEach(function (m, i) {
      if (i) ombres.push('inset ' + (3 + 5 * (i - 1) + 2) + 'px 0 0 var(--liseret-fond)');
      ombres.push('inset ' + (3 + 5 * i) + 'px 0 0 ' + BORDS[m]);
    });
    el.style.setProperty('--liseret', ombres.join(', '));
  }
  function memeMarque(a, b) { return a.length > 0 && a.length === b.length && a.every(function (m) { return b.indexOf(m) !== -1; }); }
  // La marque du titre qui précède l'élément : le h3 le plus proche, sinon celle de la partie.
  function marqueDuTitre(el) {
    for (var n = el; n && n !== principal; n = n.parentElement) {
      for (var s = n.previousElementSibling; s; s = s.previousElementSibling) {
        if (s.tagName === 'H3') return lire(s);
        if (s.tagName === 'H2') return lire(s.parentElement);
      }
    }
    return [];
  }
  function muet(el) {
    if (el.tagName === 'SECTION' || el.tagName === 'H3') return false;
    var liste = lire(el);
    if (memeMarque(liste, marqueDuTitre(el))) return true;
    var parent = el.parentElement && el.parentElement.closest('[data-pour]');
    return !!parent && parent.tagName !== 'SECTION' && memeMarque(liste, lire(parent));
  }
  function poser(el) {
    if (muet(el)) return;
    var liste = lire(el), t = el.tagName;
    var g = groupe(liste, t === 'SECTION' || t === 'H3' || t === 'DETAILS');
    if (t === 'TR') { var c = el.querySelector(':scope > td:not(.n)') || el.querySelector(':scope > td'); c.insertBefore(g, c.firstChild); liseret(el, liste); }
    else if (t === 'SECTION') el.querySelector('h2').appendChild(g);
    else if (t === 'DETAILS') { el.querySelector('summary').appendChild(g); liseret(el, liste); }
    else if (el.classList.contains('fiche')) { el.querySelector('.tete').appendChild(g); liseret(el, liste); }
    else if (el.classList.contains('carte')) { (el.querySelector('h4') || el).appendChild(g); liseret(el, liste); }
    else if (el.classList.contains('defile')) el.querySelector('th').appendChild(g);
    else if (t === 'DT') { el.insertBefore(g, el.firstChild); liseret(el, liste); }
    else if (t === 'H3') el.appendChild(g);
    else el.insertBefore(g, el.firstChild);
  }
  principal.querySelectorAll('[data-pour]').forEach(poser);
  var TITRE = /^H[1-3]$/;
  function suite(h) { var l = []; for (var s = h.nextElementSibling; s && !TITRE.test(s.tagName); s = s.nextElementSibling) l.push(s); return l; }
  var titres = Array.prototype.slice.call(principal.querySelectorAll('h3'));
  titres.forEach(function (h) {
    if (!h.hasAttribute('data-pour')) return;
    suite(h).forEach(function (s) { if (!s.hasAttribute('data-pour')) s.setAttribute('data-pour-herite', h.getAttribute('data-pour')); });
  });
  function porteur(el) { return el.closest('[data-pour], [data-pour-herite]'); }
  var unites = Array.prototype.slice.call(principal.querySelectorAll('[data-pour], [data-pour-herite], tr, li, p, dt, .carte, details, .encadre, .defile, .fiche'))
    .filter(function (el) {
      if (el.tagName === 'H3') return false;
      if (el.tagName === 'TR' && !el.querySelector(':scope > td')) return false;
      return !!porteur(el);
    });
  var estUnite = new Set(unites), parentDe = new Map();
  unites.forEach(function (u) { for (var p = u.parentElement; p && p !== principal; p = p.parentElement) if (estUnite.has(p)) { parentDe.set(u, p); break; } });
  function contientUnite(el) { return unites.some(function (x) { return x === el || el.contains(x); }); }
  function vivant(el) { return unites.some(function (x) { return (x === el || el.contains(x)) && !x.closest('.hors-pour'); }); }
  var marquees = Array.prototype.slice.call(principal.querySelectorAll('[data-pour]'));
  var choix = [], boutonsPour = {};
  var zonePour = document.querySelector('.filtre-pour'), tout = document.getElementById('pour-tout'), annonce = document.getElementById('annonce-pour');
  function choisi(el) { return lire(el).some(function (m) { return choix.indexOf(m) !== -1; }); }
  function appliquer() {
    var actif = choix.length > 0;
    principal.querySelectorAll('.hors-pour').forEach(function (e) { e.classList.remove('hors-pour'); });
    if (actif) {
      var porte = new Set();
      for (var i = unites.length - 1; i >= 0; i--) {
        var u = unites[i], propre = choisi(porteur(u)), ok = propre || porte.has(u);
        if (!ok) { u.classList.add('hors-pour'); if (u.tagName === 'DT' && u.nextElementSibling) u.nextElementSibling.classList.add('hors-pour'); }
        else { if (parentDe.has(u)) porte.add(parentDe.get(u)); if (!propre && u.tagName === 'DETAILS') u.open = true; }
      }
      var conteneurs = Array.prototype.slice.call(principal.querySelectorAll('.defile, ul, dl, .grille, details, .deux > div, .fiche'));
      for (var j = conteneurs.length - 1; j >= 0; j--) {
        var c = conteneurs[j], dedans = unites.filter(function (x) { return x !== c && c.contains(x); });
        if (dedans.length && dedans.every(function (x) { return x.closest('.hors-pour'); })) c.classList.add('hors-pour');
      }
      principal.querySelectorAll('h4').forEach(function (h) {
        var s = h.nextElementSibling;
        if (!h.closest('.carte') && s && s.classList.contains('hors-pour')) h.classList.add('hors-pour');
      });
      titres.forEach(function (h) {
        if (h.hasAttribute('data-pour-garde')) return;
        var l = suite(h).filter(contientUnite);
        if (l.length && !l.some(vivant)) { h.classList.add('hors-pour'); suite(h).forEach(function (s) { s.classList.add('hors-pour'); }); }
      });
      principal.querySelectorAll('section.partie').forEach(function (s) {
        if (!s.hasAttribute('data-pour-garde') && contientUnite(s) && !vivant(s)) s.classList.add('hors-pour');
      });
    }
    ORDRE.forEach(function (m) { boutonsPour[m].setAttribute('aria-pressed', choix.indexOf(m) !== -1); });
    tout.hidden = !actif;
    var n = marquees.filter(choisi).length;
    annonce.textContent = actif
      ? n + ' éléments sur ' + marquees.length + ' pour ' + choix.map(function (m) { return POUR[m]; }).join(' et ')
      : marquees.length + ' éléments marqués, tous affichés';
    document.querySelectorAll('nav.sommaire ol a').forEach(function (a) {
      var s = document.querySelector(a.getAttribute('href')), nb = a.querySelector('.nb');
      if (!s) return;
      if (!nb) { nb = document.createElement('span'); nb.className = 'nb'; a.appendChild(nb); }
      var dedans = marquees.filter(function (e) { return s.contains(e); });
      nb.textContent = actif && dedans.length ? dedans.filter(choisi).length : '';
      a.classList.toggle('vide', actif && s.classList.contains('hors-pour'));
    });
  }
  function ecrireAdresse() {
    try { var u = new URL(location.href); if (choix.length) u.searchParams.set('pour', choix.join(',')); else u.searchParams.delete('pour'); history.replaceState(null, '', u); } catch (e) {}
  }
  ORDRE.forEach(function (m, i) {
    var n = marquees.filter(function (e) { return lire(e).indexOf(m) !== -1; }).length;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'filtre pour-' + m; b.title = DEFINITIONS[m];
    b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', POUR[m] + ', ' + n + ' éléments');
    b.innerHTML = '<span class="signe-pour" aria-hidden="true"></span>' + POUR[m] + ' <span class="nb" aria-hidden="true">' + n + '</span>';
    b.addEventListener('click', function () {
      var k = choix.indexOf(m); if (k === -1) choix.push(m); else choix.splice(k, 1);
      choix.sort(function (x, y) { return ORDRE.indexOf(x) - ORDRE.indexOf(y); });
      appliquer(); ecrireAdresse();
    });
    zonePour.insertBefore(b, tout); boutonsPour[m] = b;
    if (i === 1) { var sep = document.createElement('span'); sep.className = 'separateur'; sep.setAttribute('aria-hidden', 'true'); zonePour.insertBefore(sep, tout); }
  });
  tout.addEventListener('click', function () { choix = []; appliquer(); ecrireAdresse(); });
  try { choix = (new URLSearchParams(location.search).get('pour') || '').split(',').filter(function (m) { return POUR[m]; }); } catch (e) { choix = []; }
  appliquer();


  // Tout déplier ou replier.
  var deplie = false;
  document.getElementById('tout-deplier').addEventListener('click', function () {
    deplie = !deplie;
    document.querySelectorAll('details').forEach(function (d) { d.open = deplie; });
    this.textContent = deplie ? 'Tout replier' : 'Tout déplier';
  });

  // Thème mémorisé pour ce navigateur seulement.
  var racine = document.documentElement;
  try { var t = localStorage.getItem('inventaire-theme'); if (t) racine.dataset.theme = t; } catch (e) {}
  document.getElementById('theme').addEventListener('click', function () {
    var sombre = racine.dataset.theme ? racine.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    racine.dataset.theme = sombre ? 'light' : 'dark';
    try { localStorage.setItem('inventaire-theme', racine.dataset.theme); } catch (e) {}
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
