let popupErrors = [];
let popupTimeout;

function popup(error) {
  const container_Popup = document.querySelector(".container-Popup");
  container_Popup.classList.remove("d-none");
  container_Popup.classList.add("d-flex");

  if (!Array.isArray(error)) error = [error];

  popupErrors.push(...error);

  const errorsHTML = popupErrors
    .map((err) => `<p> ${err.message || err}</p>`)
    .join("");

  container_Popup.innerHTML = `
    <div class="cookiesContent" id="cookiesPopup">
      <button class="close">✖</button>
      ${errorsHTML}
    </div>
  `;

  container_Popup.querySelector(".close").addEventListener("click", () => {
    container_Popup.classList.add("d-none");
    container_Popup.classList.remove("d-flex");
    popupErrors = [];
    clearTimeout(popupTimeout);
  });

  clearTimeout(popupTimeout);
  popupTimeout = setTimeout(() => {
    container_Popup.classList.add("d-none");
    container_Popup.classList.remove("d-flex");
    popupErrors = [];
  }, 2000);
}
