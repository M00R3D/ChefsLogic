// ──────────────────────────────────────────
// LIVE PREVIEW
// ──────────────────────────────────────────
function buildRecipePreview() {
  const form = document.getElementById("recipe-form");
  const preview = document.getElementById("recipe-preview");

  if (!form || !preview) {
    return;
  }

  const title = form.querySelector("[name='title']");
  const summary = form.querySelector("[name='summary']");
  const difficulty = form.querySelector("[name='difficulty']");

  function updatePreview() {
    preview.innerHTML =
      "<h4>" + (title.value || "Sin titulo") + "</h4>" +
      '<p class="muted">' + (summary.value || "Agrega un resumen de la receta para visualizarlo aqui.") + "</p>" +
      '<span class="chip">Dificultad: ' + (difficulty.value || "media") + "</span>";
  }

  [title, summary, difficulty].forEach(function (field) {
    field.addEventListener("input", updatePreview);
  });

  updatePreview();
}

// ──────────────────────────────────────────
// STEP BUILDER WITH AUTOCOMPLETE
// ──────────────────────────────────────────
var STEP_PHRASES = [
  // Calor y coccion
  "Calentar a fuego medio por 10 minutos",
  "Calentar a fuego bajo por 20 minutos",
  "Calentar a fuego alto hasta hervir",
  "Calentar el aceite en sarten a fuego medio",
  "Hervir en agua con sal por 15 minutos",
  "Hervir a fuego lento por 30 minutos",
  "Dejar hervir tapado a fuego bajo",
  "Reducir a fuego medio hasta espesar la salsa",
  "Freir en aceite caliente hasta dorar",
  "Freir por ambos lados 3 minutos cada uno",
  "Saltear en aceite caliente a fuego alto",
  "Saltear con ajo y cebolla hasta dorar",
  "Sofreir la cebolla hasta transparentar",
  "Tostar ligeramente en comal seco sin aceite",
  "Tostar los chiles en comal a fuego medio",
  "Asar en comal a fuego medio por 5 minutos",
  "Asar los jitomates en comal hasta chamuscar",
  "Hornear a 180 grados por 30 minutos",
  "Hornear a 200 grados hasta dorar la superficie",
  "Precalentar el horno a 180 grados Celsius",
  "Gratinar en horno a 220 grados por 5 minutos",
  "Dorar la carne a fuego alto por todos lados",
  "Sellar la carne a fuego alto para conservar jugos",
  "Dejar cocinar sin mover por 3 minutos",
  "Revolver constantemente para evitar que se pegue",
  "Cubrir con papel aluminio y hornear tapado",
  "Desglasar la sarten con un poco de caldo",
  // Corte y preparacion
  "Picar finamente la cebolla",
  "Picar el cilantro finamente",
  "Picar en cubos medianos de 2 centimetros",
  "Cortar en rodajas delgadas",
  "Cortar en juliana fina",
  "Cortar en medias lunas",
  "Rebanar finamente con cuchillo afilado",
  "Pelar y desvenar los chiles secos",
  "Limpiar y desvenar el chile sin semillas",
  "Trozar en piezas medianas para coccion",
  "Deshuesar el pollo o la pieza de carne",
  "Lavar y escurrir bien antes de usar",
  // Mezcla y licuado
  "Licuar hasta obtener mezcla homogenea",
  "Licuar con un poco de caldo hasta suavizar",
  "Moler en molcajete hasta obtener pasta",
  "Triturar con procesador de alimentos",
  "Mezclar bien hasta integrar todos los ingredientes",
  "Mezclar con movimientos envolventes",
  "Incorporar poco a poco mientras se bate",
  "Batir hasta obtener punto de nieve",
  "Integrar con espatula hasta homogenizar",
  "Colar la preparacion y reservar el liquido",
  "Colar para eliminar grumos y semillas",
  // Sazon
  "Agregar sal y pimienta al gusto",
  "Sazonar con comino y oregano al gusto",
  "Condimentar con chile en polvo al gusto",
  "Agregar el jugo de limon y mezclar",
  "Rectificar la sal antes de servir",
  "Ajustar sazon al gusto",
  "Incorporar mantequilla fria para ligar la salsa",
  // Remojo y marinado
  "Remojar por 30 minutos en agua caliente",
  "Remojar los chiles en agua hirviendo 20 minutos",
  "Marinar por al menos 1 hora en refrigerador",
  "Marinar durante la noche en el refrigerador",
  "Macerar con sal y limon por 10 minutos",
  "Hidratar los chiles en caldo caliente",
  // Reposo y enfriado
  "Retirar del fuego y dejar enfriar",
  "Dejar reposar tapado por 5 minutos",
  "Tapar y dejar reposar fuera del fuego",
  "Refrigerar por al menos 2 horas",
  "Enfriar a temperatura ambiente antes de servir",
  "Dejar reposar la masa cubierta por 20 minutos",
  // Reservar y escurrir
  "Reservar en un tazon aparte",
  "Reservar el caldo para uso posterior",
  "Escurrir el exceso de aceite con papel",
  "Escurrir y secar con papel absorbente",
  "Reservar una taza del agua de coccion",
  // Servir y presentar
  "Servir caliente acompanado de tortillas",
  "Servir en plato hondo con caldo",
  "Decorar con cilantro fresco picado",
  "Decorar con crema y queso desmoronado",
  "Acompanar con rodajas de limon",
  "Verter la salsa sobre la preparacion",
  "Emplatar y agregar guarnicion al lado",
  "Espolvorear con semillas de ajonjoli tostadas",
  "Terminar con unas gotas de aceite de oliva",
  // Especiales
  "Agregar el chile desvenado y sin semillas",
  "Agregar agua poco a poco segun consistencia deseada",
  "Incorporar el consomé poco a poco sin dejar grumos",
  "Cubrir con caldo hasta tapar los ingredientes"
];

// ──────────────────────────────────────────
// STEP NODE VISUALIZATION
// ──────────────────────────────────────────
var STEP_NODE_TYPES = {
  heat:    { bg: "#fff0ee", border: "#e53935", text: "#c62828", icon: "\uD83D\uDD25" },
  cool:    { bg: "#e8f4fd", border: "#1e88e5", text: "#1565c0", icon: "\u2744\uFE0F" },
  cut:     { bg: "#edf7ee", border: "#43a047", text: "#2e7d32", icon: "\uD83D\uDD2A" },
  season:  { bg: "#fffde7", border: "#f9a825", text: "#e65100", icon: "\uD83E\uDDC2" },
  blend:   { bg: "#f3e5f5", border: "#8e24aa", text: "#6a1b9a", icon: "\uD83C\uDF00" },
  soak:    { bg: "#fff3e0", border: "#fb8c00", text: "#bf360c", icon: "\uD83D\uDCA7" },
  serve:   { bg: "#fce4ec", border: "#e91e63", text: "#880e4f", icon: "\uD83C\uDF7D\uFE0F" },
  def:     { bg: "#f5f5f5", border: "#9e9e9e", text: "#616161", icon: "\uD83D\uDC68\u200D\uD83C\uDF73" }
};

function classifyStep(text) {
  var t = text.toLowerCase();
  if (/calentar|hervir|fre[ii]r|freir|tostar|hornear|dorar|asar|saltear|reducir|gratinar|flamear|sofreir|sellar|desglasar/.test(t)) return "heat";
  if (/enfriar|refrigerar|reposar|congelar|templar/.test(t)) return "cool";
  if (/picar|cortar|rebanar|pelar|lavar|limpiar|trozar|desvenar|deshuesar|juliana|cubos|rodaj|moler|triturar|procesar/.test(t)) return "cut";
  if (/sazonar|condimentar|sal y pimienta|agregar sal|comino|oregano|pimienta|rectificar|ajustar/.test(t)) return "season";
  if (/licuar|colar|batir|mezcl|integrar|incorporar|revolver|homogene|ligar/.test(t)) return "blend";
  if (/marinar|remojar|macerar|hidratar/.test(t)) return "soak";
  if (/servir|decorar|emplatar|presentar|acompa|verter|espolvorear|terminar/.test(t)) return "serve";
  return "def";
}

function updateStepNodes() {
  var wrap = document.getElementById("step-nodes-wrap");
  var previewWrap = document.getElementById("step-nodes-preview-wrap");
  var previewEl  = document.getElementById("step-nodes-preview");
  if (!wrap) return;
  var inputs = document.querySelectorAll(".step-row-input");
  var steps = Array.from(inputs).map(function (i) { return i.value.trim(); }).filter(Boolean);

  // Horizontal nodes (in form builder)
  if (!steps.length) {
    wrap.innerHTML = "";
    if (previewEl) previewEl.innerHTML = "";
    if (previewWrap) previewWrap.style.display = "none";
    return;
  }
  var html = '<div class="step-nodes">';
  steps.forEach(function (text, idx) {
    var type = classifyStep(text);
    var c = STEP_NODE_TYPES[type];
    var short = text.length > 28 ? text.slice(0, 25) + "\u2026" : text;
    html +=
      '<div class="step-node" title="' + text.replace(/"/g, "&quot;") + '"' +
      ' style="--node-bg:' + c.bg + ';--node-border:' + c.border + ';--node-text:' + c.text + '">' +
      '<span class="node-icon">' + c.icon + '</span>' +
      '<span class="node-num">' + (idx + 1) + '</span>' +
      '<span class="node-label">' + short + '</span></div>';
    if (idx < steps.length - 1) html += '<span class="step-node-arrow">&#8594;</span>';
  });
  html += '</div>';
  wrap.innerHTML = html;

  // Vertical preview (in aside)
  if (previewEl && previewWrap) {
    previewWrap.style.display = "";
    var pvHtml = '<div class="step-nodes-vertical">';
    steps.forEach(function (text, idx) {
      var type = classifyStep(text);
      var c = STEP_NODE_TYPES[type];
      pvHtml += '<div class="step-node-v" style="--node-bg:' + c.bg + ';--node-border:' + c.border + ';--node-text:' + c.text + '">' +
        '<span class="step-node-v-icon">' + c.icon + '</span>' +
        '<span class="step-node-v-num">' + (idx + 1) + '</span>' +
        '<span class="step-node-v-label">' + text + '</span></div>';
      if (idx < steps.length - 1) pvHtml += '<div class="step-node-v-arrow">\u2193</div>';
    });
    pvHtml += '</div>';
    previewEl.innerHTML = pvHtml;
  }
}

function buildStepsBuilder() {
  var container = document.getElementById("steps-list");
  var addBtn = document.getElementById("add-step-btn");
  var hiddenTextarea = document.getElementById("steps-data");

  if (!container || !addBtn || !hiddenTextarea) {
    return;
  }

  var stepCount = 0;

  function getSuggestions(text) {
    if (!text.trim()) {
      return [];
    }
    var q = text.toLowerCase();
    return STEP_PHRASES.filter(function (p) {
      return p.toLowerCase().includes(q);
    }).slice(0, 5);
  }

  function syncHidden() {
    var inputs = container.querySelectorAll(".step-row-input");
    hiddenTextarea.value = Array.from(inputs)
      .map(function (i) { return i.value.trim(); })
      .filter(Boolean)
      .join("\n");
    updateStepNodes();
  }

  function renumberSteps() {
    stepCount = 0;
    container.querySelectorAll(".step-row").forEach(function (row) {
      stepCount++;
      row.querySelector(".step-row-num").textContent = stepCount;
    });
  }

  function createStepRow(value) {
    stepCount++;

    var li = document.createElement("li");
    li.className = "step-row";

    var num = document.createElement("span");
    num.className = "step-row-num";
    num.textContent = stepCount;

    var wrapper = document.createElement("div");
    wrapper.className = "step-row-input-wrap";

    var input = document.createElement("input");
    input.type = "text";
    input.className = "step-row-input";
    input.placeholder = "Describe este paso...";
    input.value = value || "";
    input.autocomplete = "off";

    var dropdown = document.createElement("ul");
    dropdown.className = "step-suggestions";
    dropdown.style.display = "none";

    var activeIdx = -1;

    function showSuggestions(list) {
      dropdown.innerHTML = "";
      activeIdx = -1;

      if (!list.length) {
        dropdown.style.display = "none";
        return;
      }

      list.forEach(function (phrase) {
        var item = document.createElement("li");
        item.className = "step-suggestion-item";

        var q = input.value.trim().toLowerCase();
        var matchIdx = phrase.toLowerCase().indexOf(q);

        if (matchIdx >= 0 && q) {
          item.innerHTML =
            phrase.slice(0, matchIdx) +
            "<strong>" + phrase.slice(matchIdx, matchIdx + q.length) + "</strong>" +
            phrase.slice(matchIdx + q.length);
        } else {
          item.textContent = phrase;
        }

        item.addEventListener("mousedown", function (e) {
          e.preventDefault();
          input.value = phrase;
          dropdown.style.display = "none";
          syncHidden();
          input.focus();
        });

        dropdown.appendChild(item);
      });

      dropdown.style.display = "block";
    }

    input.addEventListener("input", function () {
      showSuggestions(getSuggestions(input.value));
      syncHidden();
    });

    input.addEventListener("keydown", function (e) {
      var items = dropdown.querySelectorAll(".step-suggestion-item");

      if (e.key === "Tab") {
        if (dropdown.style.display === "none" || !items.length) {
          return;
        }
        e.preventDefault();
        var target = activeIdx >= 0 ? items[activeIdx] : items[0];
        input.value = target.textContent;
        dropdown.style.display = "none";
        syncHidden();
        return;
      }

      if (e.key === "ArrowDown") {
        if (!items.length) { return; }
        e.preventDefault();
        activeIdx = (activeIdx + 1) % items.length;
        items.forEach(function (it, i) { it.classList.toggle("is-active", i === activeIdx); });
        return;
      }

      if (e.key === "ArrowUp") {
        if (!items.length) { return; }
        e.preventDefault();
        activeIdx = (activeIdx - 1 + items.length) % items.length;
        items.forEach(function (it, i) { it.classList.toggle("is-active", i === activeIdx); });
        return;
      }

      if (e.key === "Enter") {
        if (activeIdx >= 0 && items.length) {
          e.preventDefault();
          input.value = items[activeIdx].textContent;
          dropdown.style.display = "none";
          syncHidden();
        }
        return;
      }

      if (e.key === "Escape") {
        dropdown.style.display = "none";
      }
    });

    input.addEventListener("blur", function () {
      setTimeout(function () {
        dropdown.style.display = "none";
      }, 150);
      syncHidden();
    });

    var delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "step-row-delete";
    delBtn.innerHTML = "&#10005;";
    delBtn.title = "Eliminar paso";

    delBtn.addEventListener("click", function () {
      li.remove();
      renumberSteps();
      syncHidden();
    });

    wrapper.appendChild(input);
    wrapper.appendChild(dropdown);
    li.appendChild(num);
    li.appendChild(wrapper);
    li.appendChild(delBtn);
    container.appendChild(li);
    syncHidden();

    return input;
  }

  addBtn.addEventListener("click", function () {
    var newInput = createStepRow();
    newInput.focus();
  });

  createStepRow();
}

// ──────────────────────────────────────────
// INGREDIENT PICKER
// ──────────────────────────────────────────
var CAT_META = {
  verdura:  { emoji: "🥦", color: "#2e7d32", bg: "#e8f5e9" },
  fruta:    { emoji: "🍎", color: "#c62828", bg: "#ffebee" },
  proteina: { emoji: "🥩", color: "#b71c1c", bg: "#fff3e0" },
  grano:    { emoji: "🌾", color: "#6d4c41", bg: "#efebe9" },
  especia:  { emoji: "🌶️", color: "#e65100", bg: "#fff8e1" },
  lacteo:   { emoji: "🧀", color: "#1565c0", bg: "#e3f2fd" },
  otro:     { emoji: "🧺", color: "#546e7a", bg: "#f5f5f5" }
};

function buildIngredientPicker() {
  var scriptEl = document.getElementById("ingredients-data");
  var catPillsEl = document.getElementById("ing-cat-pills");
  var catalog = document.getElementById("ing-catalog");
  var search = document.getElementById("ing-search");
  var quickNameInput = document.getElementById("ing-quick-name");
  var quickCategorySelect = document.getElementById("ing-quick-category");
  var quickUnitSelect = document.getElementById("ing-quick-unit");
  var quickAddBtn = document.getElementById("ing-quick-add");
  var selectedList = document.getElementById("ing-selected");
  var hiddenTextarea = document.getElementById("ing-data");

  if (!catalog || !search || !selectedList || !hiddenTextarea) {
    return;
  }

  var allIngredients = [];
  try {
    allIngredients = JSON.parse(scriptEl ? scriptEl.textContent.trim() : "[]");
  } catch (e) {
    allIngredients = [];
  }

  var selected = new Map();
  var activeCategory = "all";
  var searchQuery = "";

  // Build category filter pills from actual DB ingredients
  if (catPillsEl && allIngredients.length) {
    var cats = ["all"];
    allIngredients.forEach(function (ing) {
      var c = ing.category || ing.categoria || "otro";
      if (cats.indexOf(c) < 0) cats.push(c);
    });
    cats.forEach(function (cat) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ing-cat-pill" + (cat === "all" ? " is-active" : "");
      btn.dataset.cat = cat;
      if (cat === "all") {
        btn.textContent = "Todos";
      } else {
        var meta = CAT_META[cat] || { emoji: "\u2022", color: "#666", bg: "#eee" };
        btn.innerHTML = meta.emoji + " " + cat.charAt(0).toUpperCase() + cat.slice(1);
        btn.style.setProperty("--pill-color", meta.color);
        btn.style.setProperty("--pill-bg", meta.bg);
      }
      btn.addEventListener("click", function () {
        catPillsEl.querySelectorAll(".ing-cat-pill").forEach(function (p) { p.classList.remove("is-active"); });
        btn.classList.add("is-active");
        activeCategory = cat;
        renderCatalog(getFiltered());
      });
      catPillsEl.appendChild(btn);
    });
  }

  function getFiltered() {
    return allIngredients.filter(function (ing) {
      var name = (ing.name || ing.nombre || "").toLowerCase();
      var cat = ing.category || ing.categoria || "otro";
      return (activeCategory === "all" || cat === activeCategory) && (!searchQuery || name.includes(searchQuery));
    });
  }

  function syncHidden() {
    var lines = [];
    selected.forEach(function (v) {
      lines.push(v.name + "|" + v.qty + "|" + v.unit + "|" + v.notes + "|" + (v.id || ""));
    });
    hiddenTextarea.value = lines.join("\n");
  }

  function findIngredientByName(name) {
    var normalized = String(name || "").trim().toLowerCase();
    if (!normalized) return null;
    return allIngredients.find(function (ing) {
      var ingName = String(ing.name || ing.nombre || "").trim().toLowerCase();
      return ingName === normalized;
    }) || null;
  }

  function addIngredientToSelection(ing) {
    if (!ing || !ing._id) return;
    var id = String(ing._id);
    if (selected.has(id)) return;
    selected.set(id, {
      id: id,
      name: ing.name || ing.nombre || "Ingrediente",
      qty: "1",
      unit: ing.defaultUnit || ing.unidad || "g",
      notes: ""
    });
    renderCatalog(getFiltered());
    renderSelectedList();
    syncHidden();
  }

  function renderCatalog(filtered) {
    catalog.innerHTML = "";

    if (!filtered.length) {
      catalog.innerHTML = '<p class="muted" style="padding:0.5rem;font-size:0.82rem;grid-column:1/-1;">Sin resultados.</p>';
      return;
    }

    filtered.forEach(function (ing) {
      var cat = ing.category || ing.categoria || "otro";
      var meta = CAT_META[cat] || CAT_META.otro;
      var name = ing.name || ing.nombre || "?";
      var id = String(ing._id);

      var card = document.createElement("div");
      card.className = "ing-card" + (selected.has(id) ? " is-selected" : "");
      card.style.setProperty("--cat-color", meta.color);
      card.style.setProperty("--cat-bg", meta.bg);
      card.dataset.id = id;

      card.innerHTML =
        '<span class="ing-card-emoji">' + meta.emoji + "</span>" +
        '<span class="ing-card-name">' + name + "</span>" +
        '<span class="ing-card-cat">' + cat + "</span>";

      card.addEventListener("click", function () {
        if (selected.has(id)) { return; }
        var defaultUnit = ing.defaultUnit || ing.unidad || "g";
        selected.set(id, { id: id, name: name, qty: "1", unit: defaultUnit, notes: "" });
        card.classList.add("is-selected");
        renderSelectedList();
        syncHidden();
      });

      catalog.appendChild(card);
    });
  }

  function removeSelected(id) {
    selected.delete(id);
    renderSelectedList();
    syncHidden();
    var card = catalog.querySelector('.ing-card[data-id="' + id + '"]');
    if (card) {
      card.classList.remove("is-selected");
    }
  }

  function renderSelectedList() {
    selectedList.innerHTML = "";

    if (!selected.size) {
      selectedList.innerHTML = '<p class="muted" style="margin:0.4rem 0;font-size:0.82rem;">Ningun ingrediente seleccionado.</p>';
      return;
    }

    selected.forEach(function (v, id) {
      var ing = allIngredients.find(function (i) { return String(i._id) === id; });
      var cat = (ing && (ing.category || ing.categoria)) || "otro";
      var meta = CAT_META[cat] || CAT_META.otro;

      var row = document.createElement("div");
      row.className = "ing-selected-row";

      var units = ["g", "kg", "ml", "l", "pieza", "cdita", "cda", "taza"];
      var optionsHtml = units
        .map(function (u) {
          return '<option value="' + u + '"' + (u === v.unit ? " selected" : "") + ">" + u + "</option>";
        })
        .join("");

      row.innerHTML =
        '<span class="ing-sel-chip" style="background:' + meta.bg + ";color:" + meta.color + ";border-color:" + meta.color + '">' +
          meta.emoji + " " + v.name +
        "</span>" +
        '<input class="ing-sel-qty" type="number" min="0" step="0.1" value="' + v.qty + '" placeholder="Cant." />' +
        '<select class="ing-sel-unit">' + optionsHtml + "</select>" +
        '<input class="ing-sel-notes" type="text" value="' + v.notes + '" placeholder="Nota opcional" />' +
        '<button type="button" class="ing-sel-remove" title="Quitar">&#10005;</button>';

      row.querySelector(".ing-sel-qty").addEventListener("input", function (e) {
        selected.get(id).qty = e.target.value;
        syncHidden();
      });
      row.querySelector(".ing-sel-unit").addEventListener("change", function (e) {
        selected.get(id).unit = e.target.value;
        syncHidden();
      });
      row.querySelector(".ing-sel-notes").addEventListener("input", function (e) {
        selected.get(id).notes = e.target.value;
        syncHidden();
      });
      row.querySelector(".ing-sel-remove").addEventListener("click", function () {
        removeSelected(id);
      });

      selectedList.appendChild(row);
    });
  }

  search.addEventListener("input", function () {
    searchQuery = search.value.toLowerCase();
    renderCatalog(getFiltered());
  });

  if (quickNameInput && quickAddBtn) {
    quickAddBtn.addEventListener("click", async function () {
      var rawName = String(quickNameInput.value || "").trim();
      if (!rawName) {
        return;
      }

      var existing = findIngredientByName(rawName);
      if (existing) {
        addIngredientToSelection(existing);
        quickNameInput.value = "";
        if (window.ChefUI && typeof window.ChefUI.showToast === "function") {
          window.ChefUI.showToast("Ingrediente existente agregado a tu receta.", "success");
        }
        return;
      }

      quickAddBtn.disabled = true;
      try {
        var quickCategory = quickCategorySelect ? String(quickCategorySelect.value || "otro").trim() : "otro";
        var quickUnit = quickUnitSelect ? String(quickUnitSelect.value || "g").trim() : "g";
        var payload = {
          name: rawName,
          category: quickCategory || "otro",
          defaultUnit: quickUnit || "g",
          tags: "rapido"
        };
        var created = window.ChefApi && window.ChefApi.ingredients
          ? await window.ChefApi.ingredients.create(payload)
          : null;

        var newIngredient = created && created.data ? created.data : null;
        if (!newIngredient || !newIngredient._id) {
          throw new Error("No se pudo crear el ingrediente rápido.");
        }

        allIngredients.unshift(newIngredient);
        addIngredientToSelection(newIngredient);
        quickNameInput.value = "";

        if (window.ChefUI && typeof window.ChefUI.showToast === "function") {
          var msg = (created && created.message) || "Ingrediente creado correctamente.";
          window.ChefUI.showToast(msg, "success");
        }
      } catch (error) {
        if (window.ChefUI && typeof window.ChefUI.showToast === "function") {
          window.ChefUI.showToast(error && error.message ? error.message : "No fue posible crear el ingrediente.", "error");
        }
      } finally {
        quickAddBtn.disabled = false;
      }
    });

    quickNameInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        quickAddBtn.click();
      }
    });
  }

  renderCatalog(allIngredients);
  renderSelectedList();
}

// ──────────────────────────────────────────
// IMAGE UPLOAD (DRAG & DROP + URL)
// ──────────────────────────────────────────
function buildImageUpload() {
  var dropZone = document.getElementById("image-drop-zone");
  var fileInput = document.getElementById("image-file-input");
  var dropLink = document.getElementById("drop-link");
  var urlInput = document.getElementById("image-url-input");
  var preview = document.getElementById("image-preview");
  var dropInner = document.getElementById("drop-zone-inner");
  if (!dropZone || !fileInput || !urlInput || !preview) return;

  function showPreview(src) {
    preview.src = src;
    preview.style.display = "block";
    if (dropInner) dropInner.style.display = "none";
  }
  function clearPreview() {
    preview.src = "";
    preview.style.display = "none";
    if (dropInner) dropInner.style.display = "";
  }

  function uploadFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      alert("Solo se permiten imagenes (JPG, PNG, WebP, GIF).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("El archivo no debe superar 5 MB.");
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) { showPreview(e.target.result); };
    reader.readAsDataURL(file);

    var formData = new FormData();
    formData.append("image", file);
    fetch("/api/upload/image", { method: "POST", body: formData })
      .then(function (r) { return r.json(); })
      .then(function (data) { if (data.success) { urlInput.value = data.url; showPreview(data.url); } })
      .catch(function () {});
  }

  if (dropLink) {
    dropLink.addEventListener("click", function (e) { e.stopPropagation(); fileInput.click(); });
  }
  fileInput.addEventListener("change", function () {
    if (fileInput.files && fileInput.files[0]) uploadFile(fileInput.files[0]);
  });
  dropZone.addEventListener("dragover", function (e) {
    e.preventDefault(); dropZone.classList.add("is-dragging");
  });
  dropZone.addEventListener("dragleave", function (e) {
    if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove("is-dragging");
  });
  dropZone.addEventListener("drop", function (e) {
    e.preventDefault(); dropZone.classList.remove("is-dragging");
    var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) uploadFile(file);
  });
  dropZone.addEventListener("click", function (e) {
    if (e.target === dropLink || e.target === fileInput) return;
    if (preview.style.display === "none" || !preview.src || preview.src === window.location.href) fileInput.click();
  });
  urlInput.addEventListener("input", function () {
    var val = urlInput.value.trim();
    if (val) showPreview(val); else clearPreview();
  });
  if (urlInput.value.trim()) showPreview(urlInput.value.trim());
}

// ──────────────────────────────────────────
// TAG BUILDER (+ button + suggestions)
// ──────────────────────────────────────────
var TAG_SUGGESTIONS = [
  "fresco", "dulce", "picante", "ahumado", "tradicional", "casero", "crujiente",
  "cremoso", "salado", "acido", "ligero", "rapido", "festivo", "economico",
  "saludable", "vegano", "vegetariano", "horneado", "frito", "de cuchara",
  "antojito", "regional", "caliente", "frio"
];

function buildTagBuilder() {
  var hiddenInput = document.querySelector("input[name='tags']");
  if (!hiddenInput) {
    return;
  }

  if (hiddenInput.dataset.enhanced === "true") {
    return;
  }
  hiddenInput.dataset.enhanced = "true";

  var current = String(hiddenInput.value || "")
    .split(",")
    .map(function (t) { return t.trim().toLowerCase(); })
    .filter(Boolean);

  var tags = Array.from(new Set(current));

  hiddenInput.type = "hidden";

  var wrap = document.createElement("div");
  wrap.className = "tag-builder";

  var row = document.createElement("div");
  row.className = "tag-entry-row";

  var text = document.createElement("input");
  text.type = "text";
  text.className = "tag-entry-input";
  text.placeholder = "Agregar etiqueta (ej: fresco)";
  text.autocomplete = "off";

  var addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "btn btn-soft btn-sm tag-add-btn";
  addBtn.textContent = "+";
  addBtn.title = "Agregar etiqueta";

  var list = document.createElement("div");
  list.className = "tag-list";

  var sugg = document.createElement("div");
  sugg.className = "tag-suggestions";

  function syncHidden() {
    hiddenInput.value = tags.join(", ");
  }

  function renderTags() {
    list.innerHTML = "";
    if (!tags.length) {
      list.innerHTML = '<span class="muted" style="font-size:0.8rem;">Sin etiquetas.</span>';
      return;
    }
    tags.forEach(function (tag) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "tag-chip";
      chip.innerHTML = '<span>' + tag + '</span><span class="tag-chip-x">&times;</span>';
      chip.addEventListener("click", function () {
        tags = tags.filter(function (t) { return t !== tag; });
        renderTags();
        syncHidden();
      });
      list.appendChild(chip);
    });
  }

  function renderSuggestions() {
    sugg.innerHTML = "";
    var q = text.value.trim().toLowerCase();
    var candidates = TAG_SUGGESTIONS.filter(function (t) {
      if (tags.indexOf(t) >= 0) return false;
      if (!q) return true;
      return t.indexOf(q) >= 0;
    }).slice(0, 10);

    candidates.forEach(function (candidate) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tag-suggestion-btn";
      b.textContent = candidate;
      b.addEventListener("click", function () {
        addTag(candidate);
      });
      sugg.appendChild(b);
    });
  }

  function addTag(raw) {
    var tag = String(raw || "").trim().toLowerCase();
    if (!tag) return;
    if (tags.indexOf(tag) >= 0) {
      text.value = "";
      renderSuggestions();
      return;
    }
    tags.push(tag);
    text.value = "";
    renderTags();
    renderSuggestions();
    syncHidden();
    text.focus();
  }

  text.addEventListener("input", renderSuggestions);
  text.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(text.value);
    }
  });

  addBtn.addEventListener("click", function () {
    addTag(text.value);
  });

  row.appendChild(text);
  row.appendChild(addBtn);
  wrap.appendChild(row);
  wrap.appendChild(sugg);
  wrap.appendChild(list);

  hiddenInput.parentNode.appendChild(wrap);

  syncHidden();
  renderTags();
  renderSuggestions();
}

function slugifyForForm(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildRecipeCreateValidation() {
  var form = document.getElementById("recipe-form");
  if (!form) {
    return;
  }

  var action = String(form.getAttribute("action") || "").trim();
  if (action !== "/recipes") {
    return;
  }

  var titleInput = form.querySelector("input[name='title']");
  var slugInput = document.getElementById("slug-hidden") || form.querySelector("input[name='slug']");
  var slugPreview = document.getElementById("slug-preview");
  var summaryInput = form.querySelector("textarea[name='summary']");
  var ingredientsData = document.getElementById("ing-data");
  var stepsData = document.getElementById("steps-data");
  var slugFeedback = document.getElementById("slug-feedback");

  if (!titleInput || !slugInput) {
    return;
  }

  var submitInProgress = false;
  var slugCheckToken = 0;
  var lastCheckedSlug = "";
  var lastAvailable = false;
  var slugCheckTimer = null;

  function notify(message, type) {
    if (window.ChefUI && typeof window.ChefUI.showToast === "function") {
      window.ChefUI.showToast(message, type || "error");
      return;
    }
    alert(message);
  }

  function setSlugFeedback(message, isError) {
    if (!slugFeedback) {
      return;
    }
    slugFeedback.textContent = message;
    slugFeedback.style.color = isError ? "#c62828" : "";
  }

  function autoSlugFromTitle() {
    var generated = slugifyForForm(titleInput.value);
    slugInput.value = generated;
    slugInput.setCustomValidity("");
    lastCheckedSlug = "";
    lastAvailable = false;
    if (slugPreview) {
      slugPreview.textContent = generated || "-";
    }
    if (!generated) {
      setSlugFeedback("", false);
    }
  }

  async function checkSlugAvailability() {
    var slug = slugifyForForm(slugInput.value);
    slugInput.value = slug;

    if (!slug || slug.length < 3) {
      slugInput.setCustomValidity("El slug debe tener al menos 3 caracteres.");
      setSlugFeedback("", false);
      return false;
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      slugInput.setCustomValidity("El slug solo permite letras minusculas, numeros y guiones.");
      setSlugFeedback("", false);
      return false;
    }

    if (slug === lastCheckedSlug) {
      slugInput.setCustomValidity(lastAvailable ? "" : "Este slug ya esta en uso.");
      setSlugFeedback(lastAvailable ? "Nombre disponible" : "Ese nombre ya existe, ponle otro nombre a la receta", !lastAvailable);
      return lastAvailable;
    }

    var currentToken = ++slugCheckToken;
    setSlugFeedback("", false);

    try {
      var response = await fetch("/api/recipes/slug-availability?slug=" + encodeURIComponent(slug));
      var payload = await response.json();

      if (currentToken !== slugCheckToken) {
        return false;
      }

      if (!response.ok || !payload || !payload.success || !payload.data) {
        throw new Error((payload && payload.message) || "No fue posible validar el slug.");
      }

      var available = Boolean(payload.data.available);
      lastCheckedSlug = slug;
      lastAvailable = available;
      slugInput.setCustomValidity(available ? "" : "Este slug ya esta en uso.");
      setSlugFeedback(available ? "Nombre disponible" : "Ese nombre ya existe, ponle otro nombre a la receta", !available);
      return available;
    } catch (error) {
      slugInput.setCustomValidity("No fue posible validar el slug en este momento.");
      setSlugFeedback("", false);
      return false;
    }
  }

  function scheduleSlugCheck() {
    if (slugCheckTimer) {
      clearTimeout(slugCheckTimer);
    }
    slugCheckTimer = setTimeout(function () {
      checkSlugAvailability();
    }, 250);
  }

  titleInput.addEventListener("input", function () {
    autoSlugFromTitle();
    scheduleSlugCheck();
  });

  autoSlugFromTitle();

  form.addEventListener("submit", async function (event) {
    if (submitInProgress) {
      return;
    }

    event.preventDefault();

    var titleValue = String(titleInput.value || "").trim();
    if (!titleValue) {
      titleInput.setCustomValidity("El titulo es obligatorio.");
      titleInput.reportValidity();
      return;
    }
    titleInput.setCustomValidity("");

    if (summaryInput && String(summaryInput.value || "").trim().length > 400) {
      summaryInput.setCustomValidity("El resumen no debe superar 400 caracteres.");
      summaryInput.reportValidity();
      return;
    }
    if (summaryInput) {
      summaryInput.setCustomValidity("");
    }

    if (ingredientsData && !String(ingredientsData.value || "").trim()) {
      notify("Debes agregar al menos un ingrediente a la receta.", "error");
      return;
    }

    if (stepsData && !String(stepsData.value || "").trim()) {
      notify("Debes agregar al menos un paso de preparacion.", "error");
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var available = await checkSlugAvailability();
    if (!available) {
      notify("Ese nombre ya existe, ponle otro nombre a la receta", "error");
      titleInput.focus();
      return;
    }

    submitInProgress = true;
    form.submit();
  });
}

// ──────────────────────────────────────────
// INIT
// ──────────────────────────────────────────
buildRecipePreview();
buildStepsBuilder();
buildIngredientPicker();
buildImageUpload();
buildTagBuilder();
buildRecipeCreateValidation();
