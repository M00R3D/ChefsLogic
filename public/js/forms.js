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
    preview.innerHTML = `
      <h4>${title.value || "Sin titulo"}</h4>
      <p class="muted">${summary.value || "Agrega un resumen de la receta para visualizarlo aqui."}</p>
      <span class="chip">Dificultad: ${difficulty.value || "media"}</span>
    `;
  }

  [title, summary, difficulty].forEach((field) => {
    field.addEventListener("input", updatePreview);
  });

  updatePreview();
}

buildRecipePreview();
