async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "Error en la solicitud API.");
  }

  return payload;
}

const ChefApi = {
  recipes: {
    list: () => request("/api/recipes"),
    getById: (id) => request(`/api/recipes/${id}`),
    create: (data) => request("/api/recipes", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) => request(`/api/recipes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id) => request(`/api/recipes/${id}`, { method: "DELETE" })
  },
  ingredients: {
    list: () => request("/api/ingredients"),
    getById: (id) => request(`/api/ingredients/${id}`),
    create: (data) => request("/api/ingredients", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) => request(`/api/ingredients/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id) => request(`/api/ingredients/${id}`, { method: "DELETE" })
  },
  cookbooks: {
    list: () => request("/api/cookbooks"),
    getById: (id) => request(`/api/cookbooks/${id}`),
    create: (data) => request("/api/cookbooks", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) => request(`/api/cookbooks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id) => request(`/api/cookbooks/${id}`, { method: "DELETE" })
  }
};

window.ChefApi = ChefApi;
