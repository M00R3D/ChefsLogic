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
