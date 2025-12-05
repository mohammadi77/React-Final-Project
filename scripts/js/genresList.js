const cache = {
  get(key) {
    const item = localStorage.getItem(key);
    if (!item) return null;
    try {
      const record = JSON.parse(item);
      if (Date.now() > record.expiry) {
        localStorage.removeItem(key);
        return null;
      }
      return record.value;
    } catch {
      return null;
    }
  },
  set(key, data, ttl = 5 * 60 * 1000) {
    localStorage.setItem(
      key,
      JSON.stringify({ value: data, expiry: Date.now() + ttl })
    );
  },
};

const params = new URLSearchParams(window.location.search);
const genreId = params.get("genreId");
if (!genreId) popup("genreId not provided in URL");

let genresMap = {};

function loadGenres() {
  return http(
    `${TMDB_BASE}/genre/movie/list?api_key=${TMDB_KEY}&language=en-US`
  )
    .then((movieGenres) => {
      return http(
        `${TMDB_BASE}/genre/tv/list?api_key=${TMDB_KEY}&language=en-US`
      )
        .then((tvGenres) => {
          movieGenres.genres?.forEach((g) => (genresMap[g.id] = g.name));
          tvGenres.genres?.forEach((g) => (genresMap[g.id] = g.name));
        })
        .catch((err) => popup(err.message));
    })
    .catch((err) => popup(err.message));
}

function fetchCredits(item) {
  const creditKey = `credits_${item.id}`;
  const cached = cache.get(creditKey);
  if (cached) return Promise.resolve(cached);

  const type = item.title ? "movie" : "tv";
  return http(
    `${TMDB_BASE}/${type}/${item.id}/credits?api_key=${TMDB_KEY}&language=en-US`
  )
    .then((data) => {
      const directors = data.crew
        ?.filter((p) => p.job === "Director")
        .map((d) => d.name) || ["-"];
      const actors = data.cast?.slice(0, 5).map((a) => a.name) || ["-"];
      const credits = { directors, actors };
      cache.set(creditKey, credits, 24 * 60 * 60 * 1000);
      return credits;
    })
    .catch((err) => {
      popup(err.message);
      return { directors: ["-"], actors: ["-"] };
    });
}

function fetchRuntime(item) {
  const runtimeKey = `runtime_${item.id}`;
  const cached = cache.get(runtimeKey);
  if (cached !== null) return Promise.resolve(cached);

  const type = item.title ? "movie" : "tv";
  return http(
    `${TMDB_BASE}/${type}/${item.id}?api_key=${TMDB_KEY}&language=en-US`
  )
    .then((data) => {
      let runtime =
        type === "movie" ? data.runtime || 0 : data.episode_run_time || [];
      cache.set(runtimeKey, runtime, 24 * 60 * 60 * 1000);
      return runtime;
    })
    .catch((err) => {
      popup(err.message);
      return item.title ? 0 : [];
    });
}

function createMovieCard(item) {
  const poster = item.poster_path
    ? TMDB_IMG + item.poster_path
    : "images/No_Image_Available.jpg";
  const rating = item.vote_average || "-";
  const year =
    (item.release_date || item.first_air_date || "").slice(0, 4) || "-";
  const isMovie = !!item.title;
  let runtime = "-";

  if (isMovie) {
    if (typeof item.runtime === "number" && item.runtime > 0) {
      const hours = Math.floor(item.runtime / 60);
      const minutes = item.runtime % 60;
      runtime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    } else runtime = "N/A";
  } else {
    if (Array.isArray(item.episode_run_time) && item.episode_run_time.length) {
      const sum = item.episode_run_time.reduce((a, b) => a + b, 0);
      const avg = Math.round(sum / item.episode_run_time.length);
      if (avg > 0) {
        const hours = Math.floor(avg / 60);
        const minutes = avg % 60;
        runtime = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
      } else runtime = "N/A";
    } else runtime = "N/A";
  }

  const ageRating = item.adult ? "R" : "PG-13";
  const name = item.title || item.name || "Unknown";
  const genresHTML =
    item.genre_names?.map((g) => `<li>${g}</li>`).join("") || "<li>-</li>";
  const detailLink = `details.html?id=${item.id}&type=${
    isMovie ? "movie" : "tv"
  }`;

  return `
    <div class="genres-cart d-flex flex-row cursor-pointer" onclick="window.location.href='${detailLink}'">
      <div class="div-Genres-Left">
        <img src="${poster}" alt="${name}" onerror="this.src='images/No_Image_Available.jpg'" />
      </div>
      <div class="div-Genres-Right d-flex flex-column">
        <div class="div-Name-Star d-flex flex-row justify-content-between">
          <h5>${name}</h5>
          <div class="div-Star d-flex flex-row">
            <i class="fa fa-star"></i>
            <span>${rating}</span>
            <p>(<span>${item.vote_count || "-"}</span>)</p>
          </div>
        </div>
        <span>${year} . ${ageRating}  . ${runtime} </span>
        <ul class="d-flex flex-row flex-wrap">${genresHTML}</ul>
        <p>${item.overview || "Description"}</p>
        <div class="div-style d-flex flex-row flex-wrap">
          <span>Director: </span>
          <ul class="d-flex flex-wrap">${(item.directors || ["-"])
            .map((d) => `<li class="flex-wrap">${d}</li>`)
            .join(" , ")}</ul>
        </div>
        <div class="div-style d-flex flex-row flex-wrap">
          <span>Stars: </span>
          <ul class="d-flex flex-wrap">${(item.actors || ["-"])
            .map((a) => `<li class="flex-wrap">${a}</li>`)
            .join(" , ")}</ul>
        </div>
        <div class="div-style d-flex flex-row flex-wrap">
          <span>Votes: </span>
          <ul><li>${item.vote_count || "-"}</li></ul>
        </div>
      </div>
    </div>
  `;
}

async function loadGenresSide() {
  const genreList = document.getElementById("genre-list");
  let allGenres = cache.get("tmdb_genres_all");

  if (!allGenres) {
    const movieGenres = await http(
      `${TMDB_BASE}/genre/movie/list?api_key=${TMDB_KEY}&language=en-US`
    );
    const tvGenres = await http(
      `${TMDB_BASE}/genre/tv/list?api_key=${TMDB_KEY}&language=en-US`
    );
    allGenres = [...movieGenres.genres, ...tvGenres.genres];
    cache.set("tmdb_genres_all", allGenres, 10 * 60 * 1000);
  }

  const uniqueGenres = new Set();
  allGenres.forEach((genre) => {
    if (!uniqueGenres.has(genre.id)) {
      uniqueGenres.add(genre.id);
      const li = document.createElement("li");
      li.classList.add("cursor-pointer");
      li.textContent = genre.name;
      li.dataset.id = genre.id;
      if (genre.id == genreId) li.classList.add("active-genre");
      li.addEventListener("click", () => {
        window.location.href = `genresList.html?genreId=${genre.id}`;
      });
      genreList.appendChild(li);
    }
  });
  updateScrollbar();
}

let sortBy = "All";
let currentPage = 1;
let pageSize = 20;
let allResults = [];

document.querySelectorAll(".div-Sort li").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const selectedText = e.target.textContent;
    sortBy = selectedText.toLowerCase();
    currentPage = 1;
    const sortNameSpan = document.querySelector(".span-Sort-Name");
    if (sortNameSpan) sortNameSpan.textContent = selectedText;
    renderMoviesPage();
  });
});

async function fetchAllTrending() {
  const cacheKey = `trending_genre_${genreId}`;
  const cachedResults = cache.get(cacheKey);

  if (!cachedResults) {
    loading();

    const intervalId = setInterval(() => {
      loading();
    }, 2000);

    setTimeout(() => {
      clearInterval(intervalId);
    }, 30000);
  }
  if (cachedResults) {
    allResults = cachedResults;
    renderMoviesPage();
    loading();
    return;
  }

  const fetchAllPages = async (type, maxPages = 50) => {
    let results = [];
    for (let page = 1; page <= maxPages; page++) {
      try {
        const data = await http(
          `${TMDB_BASE}/trending/${type}/day?api_key=${TMDB_KEY}&page=${page}`
        );
        if (!data.results?.length) break;
        results.push(...data.results);
      } catch {
        break;
      }
    }
    return results;
  };

  const [moviePages, tvPages] = await Promise.all([
    fetchAllPages("movie"),
    fetchAllPages("tv"),
  ]);

  let results = [...moviePages, ...tvPages].filter((item) =>
    item.genre_ids?.includes(Number(genreId))
  );

  results.forEach((item) => {
    item.genre_names =
      item.genre_ids?.map((id) => genresMap[id]).filter(Boolean) || [];
  });

  const concurrency = 5;
  const creditsList = [];
  for (let i = 0; i < results.length; i += concurrency) {
    const batch = results.slice(i, i + concurrency);
    const batchCredits = await Promise.all(
      batch.map(async (item) => {
        const credits = await fetchCredits(item);
        const runtime = await fetchRuntime(item);
        item.runtime = runtime;
        item.episode_run_time = Array.isArray(runtime) ? runtime : [];
        return credits;
      })
    );
    creditsList.push(...batchCredits);
  }

  results.forEach((item, idx) => {
    item.directors = creditsList[idx].directors;
    item.actors = creditsList[idx].actors;
  });

  allResults = results;
  cache.set(cacheKey, allResults, 10 * 60 * 1000);
  renderMoviesPage();
}

function renderMoviesPage() {
  let results = [...allResults];
  if (sortBy === "ranking")
    results.sort((a, b) => b.vote_average - a.vote_average);
  else if (sortBy === "latest")
    results.sort(
      (a, b) =>
        new Date(b.release_date || b.first_air_date || 0) -
        new Date(a.release_date || a.first_air_date || 0)
    );
  else if (sortBy === "oldest")
    results.sort(
      (a, b) =>
        new Date(a.release_date || a.first_air_date || 0) -
        new Date(b.release_date || b.first_air_date || 0)
    );

  const container = document.querySelector(".div-Container-genres");
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  container.innerHTML = results.slice(start, end).map(createMovieCard).join("");

  renderPagination(Math.ceil(results.length / pageSize));
}

const pagination = document.getElementById("pagination");

function renderPagination(totalPages) {
  pagination.innerHTML = "";
  const prevBtn = document.createElement("button");
  prevBtn.className = "btn-Arrow";
  prevBtn.innerHTML = `<i class="fa fa-arrow-left"></i>`;
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderMoviesPage();
    }
  };
  pagination.appendChild(prevBtn);

  const appendPageButton = (page) => {
    if (page < 1 || page > totalPages) return;
    const btn = document.createElement("button");
    btn.className = "btn-Number";
    btn.textContent = page;
    btn.classList.remove("btn-Number-active");
    btn.classList.add("btn-Number-disabled");
    if (page === currentPage) {
      btn.disabled = true;
      btn.classList.add("btn-Number-active");
      btn.classList.remove("btn-Number-disabled");
    } else
      btn.onclick = () => {
        currentPage = page;
        renderMoviesPage();
      };
    pagination.appendChild(btn);
  };

  const appendDots = () => {
    const dots = document.createElement("span");
    dots.textContent = "...";
    dots.style.padding = "6px";
    pagination.appendChild(dots);
  };

  appendPageButton(1);
  if (totalPages >= 2) appendPageButton(2);
  if (currentPage > 4 && totalPages > 5) appendDots();
  for (
    let i = Math.max(3, currentPage - 1);
    i <= Math.min(totalPages - 2, currentPage + 1);
    i++
  )
    appendPageButton(i);
  if (currentPage < totalPages - 3 && totalPages > 5) appendDots();
  if (totalPages - 1 > 2) appendPageButton(totalPages - 1);
  if (totalPages > 2) appendPageButton(totalPages);

  const nextBtn = document.createElement("button");
  nextBtn.className = "btn-Arrow";
  nextBtn.innerHTML = `<i class="fa fa-arrow-right"></i>`;
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderMoviesPage();
    }
  };
  pagination.appendChild(nextBtn);
}

function updateScrollbar() {
  const content = document.querySelector(".scroll-content");
  const thumb = document.querySelector(".scrollbar-thumb");
  const track = document.querySelector(".scrollbar-track");
  if (!content || !thumb || !track) return;

  const ratio = content.clientHeight / content.scrollHeight;
  thumb.style.height = Math.max(24, content.clientHeight * ratio) + "px";

  content.addEventListener("scroll", () => {
    const scrollPercentage =
      content.scrollTop / (content.scrollHeight - content.clientHeight);
    thumb.style.top =
      scrollPercentage * (track.clientHeight - thumb.offsetHeight) + "px";
  });

  let dragging = false,
    startY,
    startTop;

  thumb.addEventListener("mousedown", (e) => {
    dragging = true;
    startY = e.clientY;
    startTop = parseInt(thumb.style.top) || 0;
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const delta = e.clientY - startY;
    const newTop = Math.min(
      track.clientHeight - thumb.offsetHeight,
      Math.max(0, startTop + delta)
    );
    thumb.style.top = newTop + "px";
    content.scrollTop =
      (newTop / (track.clientHeight - thumb.offsetHeight)) *
      (content.scrollHeight - content.clientHeight);
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
    document.body.style.userSelect = "";
  });
}

function clickFilter() {
  const btn_Filter = document.querySelector(".btn-Filter");
  const div_Filter = document.querySelector(".div-Flex-Filter");
  let isVisible = false;
  btn_Filter.addEventListener("click", () => {
    if (isVisible)
      div_Filter.classList.remove("div-Flex-Filter-show"), (isVisible = false);
    else div_Filter.classList.add("div-Flex-Filter-show"), (isVisible = true);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  document.querySelector(".span-Sort-Name").textContent = sortBy;
  await loadGenresSide();
  await loadGenres();
  await fetchAllTrending();
  updateScrollbar();
  clickFilter();
});
