async function loadApiStatus() {
  const statusElement = document.getElementById("status");

  if (!statusElement) {
    return;
  }

  try {
    const response = await fetch("/api/health");

    if (!response.ok) {
      throw new Error("La API no respondio correctamente.");
    }

    const data = await response.json();

    statusElement.textContent = `${data.message} (${data.status}) - ${new Date(data.timestamp).toLocaleString()}`;

    if (window.ChefUI) {
      window.ChefUI.showToast("Conexion con API verificada.", "success");
    }
  } catch (error) {
    statusElement.textContent = "No fue posible obtener el estado de la API.";

    if (window.ChefUI) {
      window.ChefUI.showToast("No fue posible consultar la API.", "error");
    }
  }
}

async function loadDashboardStats() {
  const recipesElement = document.getElementById("kpi-recipes");
  const ingredientsElement = document.getElementById("kpi-ingredients");
  const cookbooksElement = document.getElementById("kpi-cookbooks");
  const dbSourceElement = document.getElementById("db-source");

  if (!recipesElement || !ingredientsElement || !cookbooksElement) {
    return;
  }

  try {
    const response = await fetch("/api/dashboard-stats");
    if (!response.ok) {
      throw new Error("No fue posible obtener metricas del dashboard.");
    }

    const payload = await response.json();
    if (!payload.success || !payload.data) {
      throw new Error(payload.message || "Metricas no disponibles.");
    }

    recipesElement.textContent = String(payload.data.recipes ?? 0);
    ingredientsElement.textContent = String(payload.data.ingredients ?? 0);
    cookbooksElement.textContent = String(payload.data.cookbooks ?? 0);

    if (dbSourceElement) {
      const dbName = payload.data.database || "desconocida";
      dbSourceElement.textContent = `Fuente de datos: MongoDB (${dbName})`;
    }
  } catch (error) {
    if (window.ChefUI) {
      window.ChefUI.showToast("No fue posible actualizar metricas del Home.", "error");
    }
  }
}

loadApiStatus();
loadDashboardStats();
