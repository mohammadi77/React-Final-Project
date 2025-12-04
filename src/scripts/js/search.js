function updateSearchWrapper() {
  const scrollWrapperSearch = document.querySelector(".scroll-wrapper-Search");
  const divSearch = document.querySelector(".div-Search");
  if (!scrollWrapperSearch || !divSearch) return;

  const size = window.getComputedStyle(divSearch).width;
  scrollWrapperSearch.style.width = size;
  scrollWrapperSearch.style.position = "absolute";
  scrollWrapperSearch.style.left = "56%";
  scrollWrapperSearch.style.transform = "translateX(-56%)";
}

window.addEventListener("resize", updateSearchWrapper);

const input = document.querySelector("#input-Search");
const divModalRoot1 = document.querySelector(".div-Modal-Root1");

let searchResults = [];
const initialShow = 8;

input.addEventListener("input", () => {
  const search = input.value.trim();
  if (search.length < 3) {
    divModalRoot1.innerHTML = "";
    searchResults = [];
    return;
  }

  http(`${TMDB_BASE}/search/multi?api_key=${TMDB_KEY}&query=${search}`)
    .then((data) => {
      if (!data.results || data.results.length === 0) {
        divModalRoot1.innerHTML = `
          <div class="scroll-wrapper-Search">
            <div class="scroll-Content-Search">
              <p>the movie or TV show not found</p>
            </div>
            <div class="scrollbar-Track-Search">
              <div class="scrollbar-Thumb-Search"></div>
            </div>
          </div>`;
        updateSearchWrapper();
        return;
      }

      searchResults = data.results.filter(
        (item) => item.media_type === "movie" || item.media_type === "tv"
      );

      searchResults.sort((a, b) => {
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

      renderSearchBox();
      loadInitialItems();
    })
    .catch((err) =>
      popup("Error loading search: " + (err.message || JSON.stringify(err)))
    );
});

function renderSearchBox() {
  divModalRoot1.innerHTML = `
    <div class="scroll-wrapper-Search">
      <div class="scroll-Content-Search"></div>
      <div class="scrollbar-Track-Search">
        <div class="scrollbar-Thumb-Search"></div>
      </div>
    </div>`;
  updateSearchWrapper();
  initScroll();
}

function loadInitialItems() {
  const content = document.querySelector(".scroll-Content-Search");
  content.innerHTML = "";

  const showCount = Math.min(initialShow, searchResults.length);
  for (let i = 0; i < showCount; i++) {
    appendItem(searchResults[i]);
  }

  if (searchResults.length > initialShow) {
    const moreBtn = document.createElement("button");
    moreBtn.textContent = "More";
    moreBtn.className = "btn-more-search";
    moreBtn.onclick = () => {
      const query = encodeURIComponent(input.value.trim());
      window.location.href = `../pages/all-search.html?q=${query}`;
    };
    content.appendChild(moreBtn);
  }
}

function appendItem(item) {
  const content = document.querySelector(".scroll-Content-Search");
  const img = item.poster_path
    ? `https://image.tmdb.org/t/p/w200${item.poster_path}`
    : "../images/No_Image_Available.jpg";
  const title = item.title || item.name;

  const card = document.createElement("div");
  card.className = "div-Cart-Search d-flex flex-row";
  card.innerHTML = `
    <img src="${img}" />
    <div>
      <h5>${title}</h5>
      <ul class="ul-Search">Loading...</ul>
    </div>`;
  content.appendChild(card);

  card.onclick = () => {
    window.location.href = `../pages/details.html?id=${item.id}&type=${item.media_type}`;
  };

  const ulSearch = card.querySelector(".ul-Search");
  Genre_Movie(item.id, ulSearch, item.media_type);
}

function Genre_Movie(id, ulSearch, type) {
  http(`${TMDB_BASE}/${type}/${id}?api_key=${TMDB_KEY}`)
    .then((data) => {
      if (!data.genres) return;

      ulSearch.innerHTML = "";
      data.genres.forEach((genre, index) => {
        const span = document.createElement("span");
        span.textContent =
          genre.name + (index < data.genres.length - 1 ? " / " : "");
        ulSearch.appendChild(span);
      });
    })
    .catch((err) =>
      popup("Error loading genre: " + (err.message || JSON.stringify(err)))
    );
}

function initScroll() {
  const content = document.querySelector(".scroll-Content-Search");
  const thumb = document.querySelector(".scrollbar-Thumb-Search");
  const track = document.querySelector(".scrollbar-Track-Search");
  if (!content || !thumb || !track) return;

  function updateThumb() {
    const ratio = content.clientHeight / content.scrollHeight;
    thumb.style.height = Math.max(24, content.clientHeight * ratio) + "px";
    const maxTop = track.clientHeight - thumb.offsetHeight;
    thumb.style.top =
      (content.scrollTop / (content.scrollHeight - content.clientHeight)) *
        maxTop +
      "px";
  }

  content.addEventListener("scroll", updateThumb);

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

  updateThumb();
}

const mq = window.matchMedia("(max-width: 730px)");
const divSearch = document.querySelector(".div-Search");
const i720 = document.querySelector("#i-720");
let click = false;

i720.addEventListener("click", () => {
  click = !click;
  if (click) {
    input.value = "";
    divModalRoot1.innerHTML = "";
    divSearch.style.display = "none";
  }

  if (mq.matches) {
    const searchValue = input.value.trim();
    if (searchValue.length > 0) {
      divSearch.style.display = "flex";
      return;
    }
  }

  divSearch.style.display = click ? "flex" : "none";
});

mq.addEventListener("change", (e) => {
  const searchValue = input.value.trim();
  divSearch.style.display = e.matches
    ? searchValue.length > 0
      ? "flex"
      : "none"
    : "flex";
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const searchValue = input.value.trim();
    if (searchValue.length > 2) {
      window.location.href = `../pages/all-search.html?q=${encodeURIComponent(
        searchValue
      )}`;
    }
  }
});
