const params = new URLSearchParams(window.location.search);
const movieId = params.get("id");
let type = params.get("type") || "movie";
type = type.toLowerCase();
if (type !== "tv" && type !== "movie") type = "movie";

function formatRuntime(minutes) {
  if (!minutes || minutes <= 0) return "N/A";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function loadDetails() {
  const detailsContainer = document.querySelector(".div-Details");
  if (!movieId || !/^\d+$/.test(movieId)) {
    detailsContainer.innerHTML = "Invalid ID.";
    return;
  }

  // دریافت جزئیات اصلی فیلم/سریال
  http(`${TMDB_BASE}/${type}/${movieId}?api_key=${TMDB_KEY}&language=en-US`)
    .then((data) => {
      const title = type === "movie" ? data.title : data.name;
      const date =
        type === "movie" ? data.release_date : data.first_air_date || "-";
      const runtime =
        type === "movie"
          ? formatRuntime(data.runtime)
          : data.episode_run_time?.length
          ? formatRuntime(data.episode_run_time[0])
          : "N/A";

      document.querySelector(".div-Details-Up h5").textContent = title || "-";
      document.querySelector(".div-Details-Up span").textContent = `
        ${date?.slice(0, 4) || "-"} • ${
        data.adult ? "18+" : "PG-13"
      } • ${runtime}
      `;

      document.querySelector(".div-Details-Up-Star span").textContent =
        data.vote_average?.toFixed(1) || "-";

      let votesShort = "-";
      if (data.vote_count) {
        if (data.vote_count >= 1000000)
          votesShort = (data.vote_count / 1000000).toFixed(1) + "M";
        else if (data.vote_count >= 1000)
          votesShort = (data.vote_count / 1000).toFixed(1) + "K";
        else votesShort = data.vote_count.toString();
      }
      document.querySelector(
        ".div-Details-Up-Right-Container .p-Number span"
      ).textContent = votesShort;

      const genreList = document.getElementById("div-Details-Ul-Gender");
      genreList.innerHTML = "";
      const genres = data.genres?.length
        ? data.genres.map((g) => g.name)
        : ["-"];
      genres.forEach((g) => (genreList.innerHTML += `<li>${g}</li>`));

      document.querySelector("tr:nth-of-type(2) td.td-2 p").textContent =
        data.overview || "-";

      // مسیر پوستر از data بگیریم نه credits
      const posterPath = data.poster_path || data.backdrop_path;
      document.querySelector(".div-Details-Img img").src = posterPath
        ? TMDB_IMG + posterPath
        : "images/No_Image_Available.jpg";

      // دریافت credits (بازیگران و crew)
      return http(
        `${TMDB_BASE}/${type}/${movieId}/credits?api_key=${TMDB_KEY}&language=en-US`
      );
    })
    .then((credits) => {
      const crew = Array.isArray(credits.crew) ? credits.crew : [];
      const cast = Array.isArray(credits.cast) ? credits.cast : [];

      // کارگردان یا سازندگان
      let director = "-";
      if (type === "movie") {
        director = crew.find((c) => c.job === "Director")?.name || "-";
      } else {
        const creators = crew
          .filter((c) => c.job === "Creator")
          .map((c) => c.name);
        director = creators.length ? creators.join(", ") : "-";
      }
      document.querySelector("tr:nth-of-type(3) td.td-2 p").textContent =
        director;

      // نویسندگان
      const writersTd = document.querySelector("tr:nth-of-type(4) td.td-2");
      let writersUl =
        writersTd.querySelector("ul") || document.createElement("ul");
      writersTd.innerHTML = "";
      writersTd.appendChild(writersUl);

      const writers = crew.filter(
        (c) => c.department === "Writing" || (c.job && c.job.includes("Writer"))
      );
      writersUl.classList.add("d-flex", "flex-row", "flex-wrap");
      writersUl.innerHTML = writers.length
        ? writers.map((w) => `<li>${w.name}</li>`).join(",")
        : "<li>-</li>";

      // بازیگران
      const starsTd = document.querySelector("tr:nth-of-type(5) td.td-2");
      let starsUl = starsTd.querySelector("ul") || document.createElement("ul");
      starsTd.innerHTML = "";
      starsTd.appendChild(starsUl);

      starsUl.classList.add("d-flex", "flex-row", "flex-wrap");
      starsUl.innerHTML = cast.length
        ? cast
            .slice(0, 10)
            .map((a) => `<li>${a.name}</li>`)
            .join(",")
        : "<li>-</li>";

      window.fullCast = cast || [];
      window.castStartIndex = 0;
      window.castVisibleCount = 10;

      if (window.fullCast.length > 0) {
        renderCastSlider();
      } else {
        document.getElementById("castSlider").innerHTML =
          "<p>No cast available.</p>";
      }
    })
    .catch((err) => {
      console.error(err);
      popup("Load details: " + (err.message || JSON.stringify(err)));
    });
}

function renderCastSlider() {
  const cont = document.getElementById("castSlider");
  cont.innerHTML = "";

  const cast = window.fullCast;
  if (!cast || cast.length === 0) return;

  const total = cast.length;
  const visible = window.castVisibleCount;
  let start = window.castStartIndex;

  for (let i = 0; i < visible; i++) {
    const realIndex = (start + i) % total;
    const actor = cast[realIndex];

    let imgSrc = actor.profile_path
      ? TMDB_IMG + actor.profile_path
      : actor.gender === 1
      ? "images/female.jpg"
      : actor.gender === 2
      ? "images/male.png"
      : "images/default.jpg";

    cont.innerHTML += `
      <div class="cart-Actor">
        <img src="${imgSrc}" alt="${actor.name}" />
        <div class="div-Details-Name">
          <h6>${actor.name}</h6>
          <span>${actor.character || "-"}</span>
        </div>
      </div>
    `;
  }
}

document.addEventListener("click", (e) => {
  if (e.target.closest("#castRightBtn")) {
    window.castStartIndex =
      (window.castStartIndex - 1 + window.fullCast.length) %
      window.fullCast.length;
    renderCastSlider();
  }
  if (e.target.closest("#castLeftBtn")) {
    window.castStartIndex =
      (window.castStartIndex + 1) % window.fullCast.length;
    renderCastSlider();
  }
});

// گالری تصاویر
function loadGallery() {
  const galleryContainer = document.querySelector(".div-Details-pic");

  function fadeOut() {
    return new Promise((resolve) => {
      galleryContainer.style.transition = "opacity 0.5s";
      galleryContainer.style.opacity = "0";
      setTimeout(resolve, 500);
    });
  }

  function fadeIn() {
    galleryContainer.style.opacity = "1";
  }

  galleryContainer.innerHTML = "<p>Loading gallery...</p>";

  http(`${TMDB_BASE}/${type}/${movieId}/images?api_key=${TMDB_KEY}`)
    .then((imagesData) => {
      const allImages = [
        ...(imagesData.backdrops || []),
        ...(imagesData.posters || []),
        ...(imagesData.logos || []),
      ]
        .filter((img) => img.file_path)
        .map((img) => `${TMDB_IMG}${img.file_path}`);

      function renderDefault() {
        fadeOut().then(() => {
          galleryContainer.innerHTML = "";
          allImages.slice(0, 2).forEach((src) => {
            galleryContainer.innerHTML += `<img src="${src}" class="gallery-img" loading="lazy" />`;
          });

          if (allImages.length > 2) {
            galleryContainer.innerHTML += `
              <div class="gallery-more-box" id="galleryMoreBtn">
                <img src="${allImages[2]}" class="gallery-img blur-img" />
                <span class="more-text">More</span>
              </div>
            `;
            document
              .getElementById("galleryMoreBtn")
              .addEventListener("click", renderExpanded);
          }
          fadeIn();
        });
      }

      function renderExpanded() {
        fadeOut().then(() => {
          galleryContainer.innerHTML = "";
          allImages.slice(0, 5).forEach((src) => {
            galleryContainer.innerHTML += `<img src="${src}" class="gallery-img" loading="lazy" />`;
          });

          galleryContainer.innerHTML += `
            <div class="gallery-more-box" id="galleryLessBtn">
              <span class="more-text">Less</span>
            </div>
          `;
          document
            .getElementById("galleryLessBtn")
            .addEventListener("click", renderDefault);
          fadeIn();
        });
      }

      renderDefault();
    })
    .catch((err) => {
      console.error(err);
      galleryContainer.innerHTML = "<p>Error loading images.</p>";
    });
}

// فراخوانی‌ها
loadDetails();
loadGallery();
loading();
