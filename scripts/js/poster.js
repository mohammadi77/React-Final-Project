document.addEventListener("DOMContentLoaded", () => {
  function getSpecialItem(title, type = "movie") {
    return http(
      `${TMDB_BASE}/search/${type}?api_key=${TMDB_KEY}&query=${encodeURIComponent(
        title
      )}`
    )
      .then((searchData) => {
        if (!searchData.results?.length) return null;
        const item = searchData.results[0];
        return http(
          `${TMDB_BASE}/${type}/${item.id}?api_key=${TMDB_KEY}&append_to_response=credits,images`
        )
          .then((detail) => {
            if (
              (!detail.poster_path && !detail.backdrop_path) ||
              !detail.overview
            )
              return null;
            return detail;
          })
          .catch((err) => {
            popup(
              "getSpecialItem detail: " + (err.message || JSON.stringify(err))
            );
            return null;
          });
      })
      .catch((err) => {
        popup("getSpecialItem search: " + (err.message || JSON.stringify(err)));
        return null;
      });
  }

  function getTopRecentItems(count = 5) {
    const today = new Date();
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(today.getMonth() - 2);

    const fromDate = twoMonthsAgo.toISOString().slice(0, 10);
    const toDate = today.toISOString().slice(0, 10);

    return Promise.all([
      http(
        `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&include_adult=false&primary_release_date.gte=${fromDate}&primary_release_date.lte=${toDate}&sort_by=vote_average.desc`
      ).catch((err) => {
        popup(
          "getTopRecentItems movies: " + (err.message || JSON.stringify(err))
        );
        return { results: [] };
      }),
      http(
        `${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}&include_adult=false&first_air_date.gte=${fromDate}&first_air_date.lte=${toDate}&sort_by=vote_average.desc`
      ).catch((err) => {
        popup("getTopRecentItems tv: " + (err.message || JSON.stringify(err)));
        return { results: [] };
      }),
    ]).then(([moviesRes, tvRes]) => {
      const combined = [...(moviesRes.results || []), ...(tvRes.results || [])];
      const filtered = combined.filter(
        (i) => (i.poster_path || i.backdrop_path) && i.overview
      );
      filtered.sort((a, b) => b.vote_average - a.vote_average);
      return filtered.slice(0, count);
    });
  }

  function initSlider() {
    const slider = document.querySelector(".slider");
    const dotsContainer = document.querySelector(".dots");
    let items = [];

    getSpecialItem("Dune: Part Two", "movie").then((specialMovie) => {
      if (specialMovie) items.push(specialMovie);

      getTopRecentItems(5).then((topRecent) => {
        const detailPromises = topRecent.map((i) => {
          const type = i.title ? "movie" : "tv";
          return http(
            `${TMDB_BASE}/${type}/${i.id}?api_key=${TMDB_KEY}&append_to_response=credits,images`
          )
            .then((detail) => {
              if (
                !detail ||
                (!detail.poster_path && !detail.backdrop_path) ||
                !detail.overview
              )
                return null;
              return detail;
            })
            .catch((err) => {
              popup({
                section: `${i.title || i.name}`,
                message: err.message || err,
              });
              return null;
            });
        });

        Promise.allSettled(detailPromises).then((topDetailsSettled) => {
          topDetailsSettled.forEach((res) => {
            if (
              res.status === "fulfilled" &&
              res.value &&
              !items.some((x) => x.id === res.value.id)
            )
              items.push(res.value);
          });

          if (!items.length) return;

          let current = 0;

          items.forEach((item, index) => {
            const slide = document.createElement("div");
            slide.classList.add("slide");
            if (index === 0) slide.classList.add("active");

            const poster =
              item.backdrop_path || item.poster_path
                ? `${TMDB_IMG_Original}${
                    item.backdrop_path || item.poster_path
                  }`
                : "images/no-image.png";

            const img = document.createElement("img");
            img.src = poster;
            img.style.cursor = "pointer";
            img.addEventListener("click", () => {
              const type = item.title ? "movie" : "tv";
              window.location.href = `/details.html?id=${item.id}&type=${type}`;
            });

            slide.appendChild(img);

            const overlay = document.createElement("div");
            overlay.classList.add("overlay");
            slide.appendChild(overlay);

            let status = "Out";
            const releaseDate = item.release_date || item.first_air_date;

            if (releaseDate) {
              const today = new Date();
              const rel = new Date(releaseDate);
              const diffDays = (today - rel) / (1000 * 60 * 60 * 24);

              if (diffDays >= 0 && diffDays <= 7) {
                status = "In theaters";
              } else if (diffDays < 0) {
                status = "Coming Soon";
              }
            }

            const plot = item.overview || "-";
            const title = item.title || item.name || "-";

            const info = document.createElement("div");
            info.classList.add("slide-info", "section-Container");
            info.innerHTML = `
              <h2 class="poster-Title">${title}</h2>
              <p>
                <ul class="poster-Genre">
                  ${
                    item.genres?.map((g) => `<li>${g.name}</li>`).join("") ||
                    "<li>-</li>"
                  }
                </ul>
              </p>
              <p class="poster-Plot">${plot}</p>
              <p class="poster-Year">${status}</p>
            `;

            slide.appendChild(info);
            slider.appendChild(slide);

            const dot = document.createElement("span");
            dot.classList.add("dot");
            if (index === 0) dot.classList.add("active");
            dot.addEventListener("click", () => {
              current = index;
              updateSlider(current);
            });
            dotsContainer.appendChild(dot);
          });

          function updateSlider(index) {
            const slides = document.querySelectorAll(".slide");
            const dots = document.querySelectorAll(".dot");
            slides.forEach((s, i) => s.classList.toggle("active", i === index));
            dots.forEach((d, i) => d.classList.toggle("active", i === index));
          }

          setInterval(() => {
            current = (current + 1) % items.length;
            updateSlider(current);
          }, 5000);
        });
      });
    });
  }

  initSlider();
});
