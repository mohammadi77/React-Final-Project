document.addEventListener("DOMContentLoaded", () => {
  const cache = {
    set(key, data, ttl = 5 * 60 * 1000) {
      const record = { value: data, expiry: Date.now() + ttl };
      localStorage.setItem(key, JSON.stringify(record));
    },
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
  };

  let array_Genres = [];
  let click = false;

  const div_Genres = document.querySelector(".div-Genres");
  div_Genres.addEventListener("click", () => {
    if (!click) {
      click = true;
      genres_Visible();
    } else {
      genres_Unvisible();
      click = false;
    }
  });

  function genres_Visible() {
    const div_Modal_Root1 = document.querySelector(".div-Modal-Root1");
    div_Modal_Root1.innerHTML = `
      <div class="scroll-wrapper">
        <ul class="scroll-content"></ul>
        <div class="scrollbar-track">
          <div class="scrollbar-thumb"></div>
        </div>
      </div>
    `;

    const wrapper = document.querySelector(".scroll-wrapper");
    const content = document.querySelector(".scroll-content");
    const thumb = document.querySelector(".scrollbar-thumb");
    const track = document.querySelector(".scrollbar-track");
    const i_Genres = document.querySelector(".i-Genres");
    i_Genres.classList.remove("fa-angle-down");
    i_Genres.classList.add("fa-angle-up");

    getGenresFromSearch("Matrix").then((genres) => {
      array_Genres = genres;

      if (!array_Genres.length) {
        content.innerHTML = "<li>هیچ ژانری پیدا نشد</li>";
        return;
      }

      let currentIndex = 0;
      const initialBatch = 8;
      const scrollBatch = 1;

      function addItems(count) {
        const nextIndex = Math.min(currentIndex + count, array_Genres.length);
        for (let i = currentIndex; i < nextIndex; i++) {
          const li = document.createElement("li");
          li.classList.add("item", "cursor-pointer");
          li.textContent = array_Genres[i].name;
          li.dataset.id = array_Genres[i].id;
          li.addEventListener("click", () => {
            window.location.href = `genresList.html?genreId=${array_Genres[i].id}`;
          });
          content.appendChild(li);
        }
        currentIndex = nextIndex;
        updateThumb();
      }

      function updateThumb() {
        const ratio = content.clientHeight / content.scrollHeight;
        thumb.style.height = Math.max(24, content.clientHeight * ratio) + "px";
        thumb.style.top =
          (content.scrollTop / (content.scrollHeight - content.clientHeight)) *
            (track.clientHeight - thumb.offsetHeight) +
          "px";
      }

      setTimeout(() => {
        wrapper.style.height = "260px";
        addItems(initialBatch);
      }, 2000);

      content.addEventListener("scroll", () => {
        if (
          content.scrollTop + content.clientHeight >=
          content.scrollHeight - 2
        ) {
          if (currentIndex < array_Genres.length) addItems(scrollBatch);
        }
        updateThumb();
      });

      let dragging = false,
        startY = 0,
        startTop = 0;

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
    });
  }

  function genres_Unvisible() {
    const wrapper = document.querySelector(".scroll-wrapper");
    if (wrapper) wrapper.style.height = "0px";

    setTimeout(() => {
      const div_Modal_Root1 = document.querySelector(".div-Modal-Root1");
      div_Modal_Root1.innerHTML = "";
    }, 1500);

    const i_Genres = document.querySelector(".i-Genres");
    i_Genres.classList.add("fa-angle-down");
    i_Genres.classList.remove("fa-angle-up");
  }

  function getGenresFromSearch(searchTerm) {
    const cacheKey = `tmdb_genres_movie_tv_${searchTerm}`;
    const cached = cache.get(cacheKey);
    if (cached) return Promise.resolve(cached);

    const genresSet = new Set();
    const maxPages = 5;

    const moviePromises = [];
    const tvPromises = [];

    for (let page = 1; page <= maxPages; page++) {
      moviePromises.push(
        http(
          `${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(
            searchTerm
          )}&page=${page}&language=en-US`
        )
          .then((movieData) => {
            if (!movieData.results || movieData.results.length === 0) return;
            movieData.results.forEach((movie) =>
              movie.genre_ids?.forEach((g) => genresSet.add(g))
            );
          })
          .catch((err) => console.error("Movie Search Error:", err))
      );

      tvPromises.push(
        http(
          `${TMDB_BASE}/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(
            searchTerm
          )}&page=${page}&language=en-US`
        )
          .then((tvData) => {
            if (!tvData.results || tvData.results.length === 0) return;
            tvData.results.forEach((tv) =>
              tv.genre_ids?.forEach((g) => genresSet.add(g))
            );
          })
          .catch((err) => console.error("TV Search Error:", err))
      );
    }

    return Promise.all([...moviePromises, ...tvPromises])
      .then(() => {
        return Promise.all([
          http(
            `${TMDB_BASE}/genre/movie/list?api_key=${TMDB_KEY}&language=en-US`
          ).catch((err) => ({ genres: [] })),
          http(
            `${TMDB_BASE}/genre/tv/list?api_key=${TMDB_KEY}&language=en-US`
          ).catch((err) => ({ genres: [] })),
        ]);
      })
      .then(([movieGenresList, tvGenresList]) => {
        const allGenres = [
          ...(movieGenresList.genres || []),
          ...(tvGenresList.genres || []),
        ];
        const genresArray = Array.from(genresSet)
          .map((id) => {
            const g = allGenres.find((g) => g.id === id);
            return g ? { id: g.id, name: g.name } : null;
          })
          .filter(Boolean)
          .sort((a, b) => a.name.localeCompare(b.name));
        cache.set(cacheKey, genresArray, 5 * 60 * 1000);
        return genresArray;
      })
      .catch((err) => {
        console.error("TMDB Genre Error:", err);
        return [];
      });
  }
});
