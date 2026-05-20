async function loadApiStatus() {
  const statusElement = document.getElementById("status");

  try {
    const response = await fetch("/api/health");
    const data = await response.json();

    statusElement.textContent = `${data.message} (${data.status}) - ${new Date(data.timestamp).toLocaleString()}`;
  } catch (error) {
    statusElement.textContent = "No fue posible obtener el estado de la API.";
  }
}

loadApiStatus();
