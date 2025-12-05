function loading() {
  const bg = document.createElement("div");
  bg.classList.add("loading-bg");

  const loader = document.createElement("div");
  loader.className = "loader";

  bg.appendChild(loader);
  document.body.appendChild(bg);

  bg.style.display = "flex";

  setTimeout(() => {
    bg.style.opacity = "0";

    setTimeout(() => {
      bg.remove();
    }, 300);
  }, 3000);
}
