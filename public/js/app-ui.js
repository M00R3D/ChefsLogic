function showToast(message, type = "success") {
  const toastRoot = document.getElementById("toast-root");
  if (!toastRoot) {
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastRoot.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 2600);
}

function activateTabs() {
  const tabLinks = document.querySelectorAll(".tab-link");
  tabLinks.forEach((link) => {
    link.addEventListener("click", () => {
      tabLinks.forEach((item) => item.classList.remove("is-active"));
      link.classList.add("is-active");
    });
  });
}

window.ChefUI = {
  showToast
};

activateTabs();
