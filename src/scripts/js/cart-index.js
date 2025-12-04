let currentPage = 1;
let totalPages = 1;
let genresMap = {};
const ITEMS_PER_PAGE = 20;
const CACHE_TIME = 3600000;

function loadGenres() {
  const cachedGenres = JSON.parse(localStorage.getItem("genres"));
  const cacheTimestamp = localStorage.getItem("genresTimestamp");

  if (
    cachedGenres &&
    cacheTimestamp &&
    Date.now() - cacheTimestamp < CACHE_TIME
  ) {
    genresMap = cachedGenres;
    return Promise.resolve();
  }

  return http(
    `${TMDB_BASE}/genre/movie/list?api_key=${TMDB_KEY}&language=en-US`
  )
    .then((movieGenres) => {
      movieGenres.genres.forEach((g) => (genresMap[g.id] = g.name));
      return http(
        `${TMDB_BASE}/genre/tv/list?api_key=${TMDB_KEY}&language=en-US`
      );
    })
    .then((tvGenres) => {
      tvGenres.genres.forEach((g) => (genresMap[g.id] = g.name));
      localStorage.setItem("genres", JSON.stringify(genresMap));
      localStorage.setItem("genresTimestamp", Date.now());
    })
    .catch((err) => {
      console.error("HTTP Error:", err);
      popup("Load Genres : " + (err.message || JSON.stringify(err)));
    });
}

function getMovies(page = 1) {
  const cacheKey = `movies_page_${page}`;
  const cachedData = JSON.parse(localStorage.getItem(cacheKey));
  const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);

  if (
    cachedData &&
    cacheTimestamp &&
    Date.now() - cacheTimestamp < CACHE_TIME
  ) {
    totalPages = cachedData.totalPages;
    return Promise.resolve(cachedData.results);
  }

  return http(
    `${TMDB_BASE}/trending/movie/day?api_key=${TMDB_KEY}&page=${page}`
  )
    .then((movieRes) => {
      return http(
        `${TMDB_BASE}/trending/tv/day?api_key=${TMDB_KEY}&page=${page}`
      ).then((tvRes) => {
        let combined = [...movieRes.results, ...tvRes.results];

        combined.sort((a, b) => {
          const dateA = new Date(a.release_date || a.first_air_date || 0);
          const dateB = new Date(b.release_date || b.first_air_date || 0);
          return dateB - dateA;
        });

        totalPages = Math.max(movieRes.total_pages, tvRes.total_pages);
        const final20 = combined.slice(0, ITEMS_PER_PAGE);

        localStorage.setItem(
          cacheKey,
          JSON.stringify({ results: final20, totalPages })
        );
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now());

        return final20;
      });
    })
    .catch((err) => {
      console.error("Error fetching trending movies:", err);
      popup("Load Movies : " + (err.message || JSON.stringify(err)));
      return [];
    });
}

function createMovieCard(item) {
  const poster = item.poster_path
    ? TMDB_IMG + item.poster_path
    : "https://via.placeholder.com/100x150?text=No+Image";

  const rating =
    item.vote_average !== undefined && item.vote_average !== null
      ? item.vote_average.toFixed(1)
      : "-";

  const genresList =
    item.genre_ids
      ?.map((id) => genresMap[id])
      .filter(Boolean)
      .map((g) => `<li>${g}</li>`)
      .join(" / ") || "<li>-</li>";

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

function renderPage(page = 1) {
  currentPage = page;
  const container = document.getElementById("movies-container");
  loading();

  getMovies(page)
    .then((data) => {
      container.innerHTML = data.map(createMovieCard).join("");
      renderPagination();
    })
    .catch((err) => {
      popup("Load Movies : " + (err.message || JSON.stringify(err)));
    });
}

function renderPagination() {
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  const prevBtn = document.createElement("button");
  prevBtn.className = "btn-Arrow";
  prevBtn.innerHTML = `<i class="fa fa-arrow-left"></i>`;
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage(currentPage);
    }
  };
  pagination.appendChild(prevBtn);

  appendPageButton(1);

  if (currentPage === 1) {
    if (totalPages >= 2) appendPageButton(2);
    if (totalPages > 4) appendDots();
    if (totalPages - 1 > 2) appendPageButton(totalPages - 1);
    if (totalPages > 1) appendPageButton(totalPages);

    addNextBtn();
    return;
  }

  if (currentPage > 4) appendDots();

  let start = Math.max(2, currentPage - 1);
  let end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    appendPageButton(i);
  }

  if (currentPage < totalPages - 3) appendDots();

  if (totalPages > 1) appendPageButton(totalPages);

  addNextBtn();
}

function appendPageButton(page) {
  const btn = document.createElement("button");
  btn.className = "btn-Number";
  btn.textContent = page;
  btn.classList.remove("btn-Number-active");
  btn.classList.add("btn-Number-disabled");

  if (page === currentPage) {
    btn.disabled = true;
    btn.classList.add("btn-Number-active");
    btn.classList.remove("btn-Number-disabled");
  }

  btn.onclick = () => {
    currentPage = page;
    renderPage(page);
  };

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

function addNextBtn() {
  const nextBtn = document.createElement("button");
  nextBtn.className = "btn-Arrow";
  nextBtn.innerHTML = `<i class="fa fa-arrow-right"></i>`;
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderPage(currentPage);
    }
  };
  pagination.appendChild(nextBtn);
}

window.onload = () => {
  loadGenres().then(() => {
    renderPage(1);
  });
};
