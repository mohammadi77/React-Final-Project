let genresMap = {};

function loadGenres() {
  if (Object.keys(genresMap).length > 0) return Promise.resolve();

  return http(`${TMDB_BASE}/genre/movie/list?api_key=${TMDB_KEY}`)
    .then((data) => {
      data.genres?.forEach((g) => (genresMap[g.id] = g.name));
    })
    .catch((error) => {
      console.error("Failed to load genres:", error);
    });
}

const params = new URLSearchParams(window.location.search);
const query = params.get("q");

function createMovieCard(item) {
  const poster = item.poster_path
    ? `${TMDB_IMG}${item.poster_path}`
    : "../image/No_Image_Available.jpg";

  const rating = item.vote_average ? item.vote_average.toFixed(1) : "-";
  const genresList =
    item.genre_ids?.map((id) => genresMap[id] || "").join(" / ") || "-";
  const year =
    (item.release_date || item.first_air_date || "").slice(0, 4) || "-";
  const type = item.title ? "movie" : "tv";
  const name = item.title || item.name || "Unknown";

  return `
    <div class="cart-index">
      <div class="div-Up">
        <img src="${poster}" alt="${name}" title="${name}" onerror="this.src='../images/No_Image_Available.jpg'" />
        <p>${type === "movie" ? "Movie" : "TV Series"}</p>
      </div> 
      <div class="div-details">
        <div class="div-up">
          <h6>${name} (${year})</h6>
          <ul class="genres">${genresList}</ul>
        </div>
        <div class="div-button">
          <div class="star">
            <i class="fa fa-star"></i>
            <span>${rating}</span>
          </div>
          <button onclick="goToMovie(${item.id}, '${type}')">View Info</button>
        </div>
      </div>
    </div>
  `;
}

function goToMovie(id, type) {
  window.location.href = `../pages/details.html?id=${id}&type=${type}`;
}

let currentPage = 1;
const moviesPerPage = 20;
let totalResults = 0;
let totalPages = 0;

function getMovies(page) {
  return http(
    `${TMDB_BASE}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(
      query
    )}&page=${page}`
  )
    .then((data) => {
      const results = data.results.filter(
        (item) => item.media_type === "movie" || item.media_type === "tv"
      );

      const sortedResults = results.sort((a, b) => {
        const voteA = a.vote_average || 0;
        const voteB = b.vote_average || 0;
        if (voteB !== voteA) return voteB - voteA;

        const dateA = new Date(
          a.release_date || a.first_air_date || "1900-01-01"
        );
        const dateB = new Date(
          b.release_date || b.first_air_date || "1900-01-01"
        );
        return dateB - dateA;
      });

      return { results: sortedResults, total: data.total_results };
    })
    .catch((err) => {
      console.error("Failed to load movies:", err);
      return { results: [], total: 0 };
    });
}

function renderPage(page = 1) {
  currentPage = page;
  const container = document.getElementById("movies-container");
  if (!container) return;

  loading();

  getMovies(page).then(({ results, total }) => {
    totalResults = total;
    totalPages = Math.ceil(totalResults / moviesPerPage);

    container.innerHTML = results.map(createMovieCard).join("");
    renderPagination();

    const titleDiv = document.querySelector(".div-Results h3");
    const itemDiv = document.querySelector(".div-Item span");
    if (titleDiv) titleDiv.textContent = query;
    if (itemDiv) itemDiv.textContent = totalResults;
  });
}

const pagination = document.getElementById("pagination");

function renderPagination() {
  pagination.innerHTML = "";

  const prevBtn = createPaginationButton(
    "prev",
    `<i class="fa fa-arrow-left"></i>`,
    currentPage === 1
  );
  prevBtn.onclick = () => changePage(currentPage - 1);
  pagination.appendChild(prevBtn);

  appendPageButton(1);

  if (currentPage > 4) appendDots();

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let i = start; i <= end; i++) appendPageButton(i);

  if (currentPage < totalPages - 3) appendDots();

  if (totalPages > 1) appendPageButton(totalPages);

  const nextBtn = createPaginationButton(
    "next",
    `<i class="fa fa-arrow-right"></i>`,
    currentPage === totalPages
  );
  nextBtn.onclick = () => changePage(currentPage + 1);
  pagination.appendChild(nextBtn);
}

function createPaginationButton(type, innerHTML, isDisabled) {
  const btn = document.createElement("button");
  btn.className = "btn-Arrow";
  btn.innerHTML = innerHTML;
  btn.disabled = isDisabled;
  return btn;
}

function appendPageButton(page) {
  const btn = document.createElement("button");
  btn.className = "btn-Number";
  btn.textContent = page;

  if (page === currentPage) {
    btn.disabled = true;
    btn.classList.add("btn-Number-active");
    btn.classList.remove("btn-Number-disabled");
  } else {
    btn.classList.add("btn-Number-disabled");
  }

  btn.onclick = () => changePage(page);
  pagination.appendChild(btn);
}

function appendDots() {
  const dots = document.createElement("span");
  dots.textContent = "...";
  dots.style.padding = "6px 8px";
  dots.style.color = "var(--BCBCBC-color)";
  dots.style.fontWeight = "bold";
  pagination.appendChild(dots);
}

function changePage(page) {
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderPage(page);
}

// Initialize
if (query) {
  loadGenres().then(() => renderPage(1));
}
