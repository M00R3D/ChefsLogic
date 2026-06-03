async function deleteRecipe(recipeId, triggerButton) {
  const shouldDelete = window.confirm("Esta accion eliminara la receta de forma permanente. Deseas continuar?");
  if (!shouldDelete) {
    return;
  }

  triggerButton.disabled = true;

  try {
    const response = await fetch(`/api/recipes/${recipeId}`, {
      method: "DELETE"
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "No fue posible eliminar la receta.");
    }

    const row = triggerButton.closest("tr") || triggerButton.closest(".card");
    if (row) {
      row.remove();
    }

    if (window.ChefUI) {
      window.ChefUI.showToast("Receta eliminada correctamente.", "success");
    }
  } catch (error) {
    if (window.ChefUI) {
      window.ChefUI.showToast(error.message || "Error al eliminar receta.", "error");
    }
  } finally {
    triggerButton.disabled = false;
  }
}

document.querySelectorAll("[data-delete-recipe]").forEach((button) => {
  button.addEventListener("click", () => {
    deleteRecipe(button.dataset.deleteRecipe, button);
  });
});

function bindClickableRecipeCards() {
  const cards = document.querySelectorAll("[data-card-href]");
  if (!cards.length) return;

  const interactiveSelector = "a, button, input, textarea, select, label, form";

  cards.forEach((card) => {
    const href = card.dataset.cardHref;
    if (!href) return;

    card.addEventListener("click", (event) => {
      if (event.target && event.target.closest(interactiveSelector)) {
        return;
      }
      window.location.href = href;
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        if (event.target && event.target.closest(interactiveSelector)) {
          return;
        }
        event.preventDefault();
        window.location.href = href;
      }
    });
  });
}

bindClickableRecipeCards();

function bindRecipesFilters() {
  const toolbar = document.querySelector("[data-recipe-filters]");
  if (!toolbar) return;

  const searchInput = toolbar.querySelector("[data-filter-search]");
  const difficultySelect = toolbar.querySelector("[data-filter-difficulty]");
  const regionSelect = toolbar.querySelector("[data-filter-region]");
  const panelSelect = toolbar.querySelector("[data-filter-panel]");
  const clearButton = toolbar.querySelector("[data-filter-clear]");
  const panels = Array.from(document.querySelectorAll(".rb-panel[data-panel-type]"));

  if (!panels.length) return;

  function ensureEmptyMessage(panel) {
    let message = panel.querySelector(".rb-filter-empty");
    if (message) return message;

    const body = panel.querySelector(".rb-panel-body");
    if (!body) return null;

    message = document.createElement("p");
    message.className = "rb-filter-empty";
    message.textContent = "No hay recetas que coincidan con los filtros.";
    message.hidden = true;
    body.appendChild(message);
    return message;
  }

  function applyFilters() {
    const text = String((searchInput && searchInput.value) || "").trim().toLowerCase();
    const difficulty = String((difficultySelect && difficultySelect.value) || "all").toLowerCase();
    const region = String((regionSelect && regionSelect.value) || "all").toLowerCase();
    const panelFilter = String((panelSelect && panelSelect.value) || "all").toLowerCase();

    panels.forEach((panel) => {
      const panelType = String(panel.getAttribute("data-panel-type") || "all").toLowerCase();
      const panelMatches = panelFilter === "all" || panelFilter === panelType;
      panel.hidden = !panelMatches;
      if (!panelMatches) return;

      const cards = Array.from(panel.querySelectorAll("[data-recipe-card]"));
      let visibleCount = 0;

      cards.forEach((card) => {
        const title = String(card.getAttribute("data-recipe-title") || "").toLowerCase();
        const author = String(card.getAttribute("data-recipe-author") || "").toLowerCase();
        const cardRegion = String(card.getAttribute("data-recipe-region") || "").toLowerCase();
        const cardDifficulty = String(card.getAttribute("data-recipe-difficulty") || "").toLowerCase();

        const matchesText = !text || title.includes(text) || author.includes(text) || cardRegion.includes(text);
        const matchesDifficulty = difficulty === "all" || cardDifficulty === difficulty;
        const matchesRegion = region === "all" || cardRegion === region;
        const visible = matchesText && matchesDifficulty && matchesRegion;

        card.classList.toggle("is-filtered-out", !visible);
        if (visible) visibleCount += 1;
      });

      const badge = panel.querySelector(".rb-panel-count");
      if (badge) badge.textContent = String(visibleCount);

      const emptyMsg = ensureEmptyMessage(panel);
      if (emptyMsg) emptyMsg.hidden = visibleCount > 0;
    });
  }

  if (searchInput) searchInput.addEventListener("input", applyFilters);
  if (difficultySelect) difficultySelect.addEventListener("change", applyFilters);
  if (regionSelect) regionSelect.addEventListener("change", applyFilters);
  if (panelSelect) panelSelect.addEventListener("change", applyFilters);

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (difficultySelect) difficultySelect.value = "all";
      if (regionSelect) regionSelect.value = "all";
      if (panelSelect) panelSelect.value = "all";
      applyFilters();
    });
  }

  applyFilters();
}

bindRecipesFilters();

function getAuthRedirectUrl() {
  const currentPath = window.location.pathname || "/";
  return `/login?returnTo=${encodeURIComponent(currentPath)}`;
}

function notify(message, type = "success") {
  if (window.ChefUI && typeof window.ChefUI.showToast === "function") {
    window.ChefUI.showToast(message, type);
  }
}

async function handleLike(button) {
  const recipeId = button.dataset.recipeLike;
  if (!recipeId) return;

  try {
    button.disabled = true;
    const payload = await window.ChefApi.recipes.like(recipeId);

    const liked = Boolean(payload && payload.data && payload.data.liked);
    const likeCount = payload && payload.data ? payload.data.likeCount : 0;

    button.classList.toggle("active", liked);

    const countEl = document.querySelector("[data-like-count]");
    if (countEl) countEl.textContent = String(likeCount || 0);

    const labelEl = document.querySelector("[data-like-label]");
    if (labelEl) labelEl.textContent = liked ? "Te gusta" : "Me gusta";

    notify(payload.message || "Interaccion actualizada.");
  } catch (error) {
    if (/iniciar sesion|login|autentic|401/i.test(error.message || "")) {
      window.location.href = getAuthRedirectUrl();
      return;
    }
    notify(error.message || "No fue posible registrar like.", "error");
  } finally {
    button.disabled = false;
  }
}

async function handleDislike(button) {
  const recipeId = button.dataset.recipeDislike;
  if (!recipeId) return;

  try {
    button.disabled = true;
    const payload = await window.ChefApi.recipes.dislike(recipeId);

    const likeButton = document.querySelector(`[data-recipe-like='${recipeId}']`);
    if (likeButton) {
      likeButton.classList.remove("active");
      const labelEl = likeButton.querySelector("[data-like-label]");
      if (labelEl) labelEl.textContent = "Me gusta";
      const countEl = likeButton.querySelector("[data-like-count]");
      if (countEl && payload && payload.data) countEl.textContent = String(payload.data.likeCount || 0);
    }

    notify(payload.message || "Dislike aplicado.");
  } catch (error) {
    if (/iniciar sesion|login|autentic|401/i.test(error.message || "")) {
      window.location.href = getAuthRedirectUrl();
      return;
    }
    notify(error.message || "No fue posible aplicar dislike.", "error");
  } finally {
    button.disabled = false;
  }
}

async function handleSave(button) {
  const recipeId = button.dataset.recipeSave;
  if (!recipeId) return;

  try {
    button.disabled = true;
    const payload = await window.ChefApi.recipes.save(recipeId);
    const saved = Boolean(payload && payload.data && payload.data.saved);

    button.classList.toggle("active", saved);
    button.classList.toggle("saved", saved);

    const saveLabel = button.querySelector("[data-save-label]");
    if (saveLabel) saveLabel.textContent = saved ? "Guardada" : "Guardar";

    notify(payload.message || "Guardado actualizado.");
  } catch (error) {
    if (/iniciar sesion|login|autentic|401/i.test(error.message || "")) {
      window.location.href = getAuthRedirectUrl();
      return;
    }
    notify(error.message || "No fue posible guardar receta.", "error");
  } finally {
    button.disabled = false;
  }
}

async function handleComment(form) {
  const recipeId = form.dataset.commentForm;
  if (!recipeId) return;

  const textArea = form.querySelector("textarea[name='commentText']");
  if (!textArea) return;

  const commentText = String(textArea.value || "").trim();
  if (!commentText) {
    notify("Escribe un comentario.", "error");
    return;
  }

  const submitButton = form.querySelector("button[type='submit']");

  try {
    if (submitButton) submitButton.disabled = true;
    const payload = await window.ChefApi.recipes.comment(recipeId, commentText);
    const comment = payload && payload.data;

    if (comment) {
      const list = document.getElementById("comment-list");
      if (list) {
        const entry = document.createElement("article");
        entry.className = "comment-item";
        const authorName = comment.user && comment.user.name ? comment.user.name : "Usuario";
        const authorInitial = authorName.charAt(0).toUpperCase();
        const dateText = new Date(comment.createdAt || Date.now()).toLocaleDateString("es-MX");

        entry.innerHTML = `
          <div class="comment-header">
            <div class="comment-avatar">${authorInitial}</div>
            <span class="comment-author">${authorName}</span>
            <span class="comment-date">${dateText}</span>
          </div>
          <p class="comment-text"></p>
        `;

        const textNode = entry.querySelector(".comment-text");
        if (textNode) textNode.textContent = comment.commentText || commentText;

        const first = list.firstElementChild;
        if (first && first.querySelector(".muted")) {
          first.remove();
        }
        list.prepend(entry);
      }
    }

    textArea.value = "";
    notify(payload.message || "Comentario publicado.");
  } catch (error) {
    if (/iniciar sesion|login|autentic|401/i.test(error.message || "")) {
      window.location.href = getAuthRedirectUrl();
      return;
    }
    notify(error.message || "No fue posible comentar.", "error");
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

document.querySelectorAll("[data-recipe-like]").forEach((button) => {
  button.addEventListener("click", () => handleLike(button));
});

document.querySelectorAll("[data-recipe-dislike]").forEach((button) => {
  button.addEventListener("click", () => handleDislike(button));
});

document.querySelectorAll("[data-recipe-save]").forEach((button) => {
  button.addEventListener("click", () => handleSave(button));
});

document.querySelectorAll("[data-comment-form]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    handleComment(form);
  });
});

function bindCookbookPreviewCarousel() {
  const carousels = document.querySelectorAll("[data-cb-preview-carousel]");
  if (!carousels.length) return;

  const canAnimate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function parseUrls(rawValue) {
    if (!rawValue) return [];
    try {
      const decoded = decodeURIComponent(rawValue);
      const parsed = JSON.parse(decoded);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function normalizeUrl(raw) {
    return String(raw || "").trim();
  }

  function isCandidateUrl(url) {
    return /^(https?:\/\/|\/|data:image\/)/i.test(url);
  }

  function dedupe(urls) {
    const seen = new Set();
    const result = [];
    urls.forEach((url) => {
      const key = String(url).trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      result.push(key);
    });
    return result;
  }

  function canLoadImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      let done = false;
      const timer = window.setTimeout(() => {
        if (done) return;
        done = true;
        resolve(false);
      }, 4500);

      img.onload = () => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        resolve(true);
      };

      img.onerror = () => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        resolve(false);
      };

      img.src = url;
    });
  }

  function setSlideImage(slide, url) {
    if (!slide || !url) return;
    slide.style.backgroundImage = `url("${encodeURI(url)}")`;
  }

  carousels.forEach(async (carousel) => {
    const fallback = normalizeUrl(carousel.getAttribute("data-cover-fallback"));
    const urls = parseUrls(carousel.getAttribute("data-carousel-images"))
      .map(normalizeUrl)
      .filter(isCandidateUrl);

    const candidates = dedupe(fallback ? urls.concat([fallback]) : urls);
    if (!candidates.length) {
      carousel.classList.add("is-empty");
      return;
    }

    const loadedFlags = await Promise.all(candidates.map((url) => canLoadImage(url)));
    const validUrls = candidates.filter((_url, index) => loadedFlags[index]);

    if (!validUrls.length) {
      carousel.classList.add("is-empty");
      return;
    }

    const slides = Array.from(carousel.querySelectorAll(".cb-card-cover-slide"));
    if (!slides.length) return;

    let activeSlide = 0;
    let currentImage = 0;
    setSlideImage(slides[activeSlide], validUrls[currentImage]);
    slides[activeSlide].classList.add("is-active");

    if (!canAnimate || validUrls.length < 2 || slides.length < 2) {
      carousel.classList.add("is-static");
      return;
    }

    let intervalId = null;

    function nextFrame() {
      const nextImage = (currentImage + 1) % validUrls.length;
      const nextSlide = activeSlide === 0 ? 1 : 0;

      setSlideImage(slides[nextSlide], validUrls[nextImage]);
      slides[nextSlide].classList.add("is-active");
      slides[activeSlide].classList.remove("is-active");

      activeSlide = nextSlide;
      currentImage = nextImage;
    }

    function start() {
      if (intervalId) return;
      intervalId = window.setInterval(nextFrame, 3200);
    }

    function stop() {
      if (!intervalId) return;
      window.clearInterval(intervalId);
      intervalId = null;
    }

    carousel.addEventListener("mouseenter", stop);
    carousel.addEventListener("mouseleave", start);
    start();
  });
}

function bindCookbookBookModal() {
  const modal = document.getElementById("cookbook-book-modal");
  const dataEl = document.getElementById("cookbooks-book-data");
  if (!modal || !dataEl) return;

  let catalog = [];
  try {
    catalog = JSON.parse(dataEl.textContent || "[]");
  } catch {
    catalog = [];
  }

  const byId = new Map(catalog.map((item) => [String(item._id), item]));
  const titleEl = document.getElementById("book-modal-title");
  const authorEl = document.getElementById("book-modal-author");
  const summaryEl = document.getElementById("book-modal-summary");
  const leftPage = document.getElementById("book-left-page");
  const rightPage = document.getElementById("book-right-page");
  const shell = document.getElementById("cookbook-book-shell");
  const indicator = document.getElementById("book-page-indicator");
  const prevBtn = document.getElementById("book-prev-page");
  const nextBtn = document.getElementById("book-next-page");

  let activeCookbook = null;
  let spread = 0;
  let animating = false;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function maxSpread() {
    const totalRecipes = Array.isArray(activeCookbook && activeCookbook.recipes)
      ? activeCookbook.recipes.length
      : 0;
    return Math.max(0, Math.ceil(totalRecipes / 2) - 1);
  }

  function renderRecipeCard(recipe, side) {
    if (!recipe) {
      return '<div class="cookbook-page-empty"><p>Hoja en blanco</p><span>Agrega más recetas al recetario.</span></div>';
    }

    const img = String(recipe.imageUrl || "").trim();
    const validImg = /^(https?:\/\/|\/|data:image\/)/i.test(img);
    const safeTitle = escapeHtml(recipe.title || "Receta");
    const safeSummary = escapeHtml(String(recipe.summary || "Sin resumen.").slice(0, 170));
    const recipeHref = recipe._id ? `/recipes/${recipe._id}` : (recipe.slug ? `/recipes/${recipe.slug}` : "#");

    return `
      <div class="cookbook-page-art cookbook-page-art-${side}">
        ${validImg
          ? `<img src="${escapeHtml(img)}" alt="${safeTitle}" class="cookbook-page-image" />`
          : `<div class="cookbook-page-image cookbook-page-image-fallback">🍽️</div>`
        }
      </div>
      <div class="cookbook-page-content">
        <h4>${safeTitle}</h4>
        <p>${safeSummary}${(recipe.summary || "").length > 170 ? "…" : ""}</p>
        <a class="btn btn-soft btn-sm" href="${recipeHref}">Ver receta</a>
      </div>
    `;
  }

  function renderSpread() {
    if (!activeCookbook) return;
    const recipes = Array.isArray(activeCookbook.recipes) ? activeCookbook.recipes : [];
    const start = spread * 2;
    const leftRecipe = recipes[start] || null;
    const rightRecipe = recipes[start + 1] || null;

    if (leftPage) leftPage.innerHTML = renderRecipeCard(leftRecipe, "left");
    if (rightPage) rightPage.innerHTML = renderRecipeCard(rightRecipe, "right");

    if (indicator) {
      const totalSpreads = maxSpread() + 1;
      indicator.textContent = `Hoja ${spread + 1} de ${totalSpreads}`;
    }
    if (prevBtn) prevBtn.disabled = spread <= 0 || animating;
    if (nextBtn) nextBtn.disabled = spread >= maxSpread() || animating;
  }

  function flip(direction) {
    if (!activeCookbook || animating) return;

    if (direction === "next" && spread >= maxSpread()) return;
    if (direction === "prev" && spread <= 0) return;

    animating = true;
    if (shell) shell.classList.add(direction === "next" ? "is-flip-next" : "is-flip-prev");
    renderSpread();

    window.setTimeout(() => {
      spread += direction === "next" ? 1 : -1;
      if (shell) shell.classList.remove("is-flip-next", "is-flip-prev");
      animating = false;
      renderSpread();
    }, 420);
  }

  function openModal(cookbookId) {
    const record = byId.get(String(cookbookId));
    if (!record) return;

    activeCookbook = record;
    spread = 0;

    if (titleEl) titleEl.textContent = record.title || "Recetario";
    if (authorEl) authorEl.textContent = `Creado por ${record.ownerName || "Usuario"}`;
    if (summaryEl) summaryEl.textContent = record.description || "Recetario sin descripción.";

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("has-modal-open");
    renderSpread();
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("has-modal-open");
    activeCookbook = null;
    spread = 0;
    animating = false;
    if (shell) shell.classList.remove("is-flip-next", "is-flip-prev");
  }

  document.querySelectorAll("[data-cookbook-open]").forEach((btn) => {
    btn.addEventListener("click", () => openModal(btn.getAttribute("data-cookbook-open")));
  });

  const interactiveSelector = "a, button, input, textarea, select, label, form";
  document.querySelectorAll("[data-cookbook-card]").forEach((card) => {
    const cookbookId = card.getAttribute("data-cookbook-card");
    if (!cookbookId) return;

    card.addEventListener("click", (event) => {
      if (event.target && event.target.closest(interactiveSelector)) return;
      openModal(cookbookId);
    });

    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target && event.target.closest(interactiveSelector)) return;
      event.preventDefault();
      openModal(cookbookId);
    });
  });

  modal.querySelectorAll("[data-cookbook-close]").forEach((btn) => {
    btn.addEventListener("click", closeModal);
  });

  if (prevBtn) prevBtn.addEventListener("click", () => flip("prev"));
  if (nextBtn) nextBtn.addEventListener("click", () => flip("next"));

  document.addEventListener("keydown", (event) => {
    if (!modal.classList.contains("is-open")) return;
    if (event.key === "Escape") closeModal();
    if (event.key === "ArrowRight") flip("next");
    if (event.key === "ArrowLeft") flip("prev");
  });
}

bindCookbookPreviewCarousel();
bindCookbookBookModal();
