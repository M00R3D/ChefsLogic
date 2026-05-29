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
