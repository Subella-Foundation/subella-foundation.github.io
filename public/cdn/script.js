// Nav Bar

function initNavbarScrollToggle(navbarId = "navbar", offset = 64) {
  let lastScrollTop = 0;
  let isDisabled = false;
  let navbar = null;

  function handleScroll() {
    if (isDisabled || !navbar) return;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    navbar.style.top = scrollTop > lastScrollTop ? `-${offset}px` : "0";
    lastScrollTop = Math.max(scrollTop, 0);
  }

  function bindScrollHandler() {
    navbar = document.getElementById(navbarId);
    if (!navbar) return;

    window.removeEventListener("scroll", handleScroll); // prevent duplicate
    window.addEventListener("scroll", handleScroll);
    lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
  }

  // Attach rebind and control functions globally
  window.navbarScroll = {
    enable() {
      isDisabled = false;
    },
    disable() {
      isDisabled = true;
      if (navbar) navbar.style.top = "0";
    },
    rebind() {
      bindScrollHandler();
    },
  };

  // Initial setup
  bindScrollHandler();

  // Rebind after HTMX swaps or history navigation
  document.body.addEventListener("htmx:afterSwap", bindScrollHandler);
  document.body.addEventListener("htmx:load", bindScrollHandler);
}

// Call the function once DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initNavbarScrollToggle("navbar", 64);
});
//progress bar
function updateScrollProgress() {
  const progress = document.getElementById("progress");
  if (!progress) return;

  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;

  if (docHeight <= 0) {
    progress.value = 0;
    return;
  }

  const scrollPercent = (scrollTop / docHeight) * 100;
  progress.value = scrollPercent;
}

function initScrollProgressBar() {
  // Update on scroll, resize, and htmx swap
  window.addEventListener("scroll", updateScrollProgress);
  window.addEventListener("resize", updateScrollProgress);
  document.body.addEventListener("htmx:afterSwap", updateScrollProgress);
  document.body.addEventListener("htmx:load", updateScrollProgress);

  // Initial run
  updateScrollProgress();
}

// Init once DOM is ready
document.addEventListener("DOMContentLoaded", initScrollProgressBar);
// Pagefind

import("../pagefind/pagefind.js").then((pagefind) => {
  const input = document.getElementById("search-box");
  const searchTitle = document.getElementById("search-title");
  const resultsEl = document.getElementById("search-results");
  const explorerEl = document.getElementById("explorer");
  const loadMoreBtn = document.getElementById("load-more-btn");
  const explorerContent = explorerEl.innerHTML;

  let debounceTimer;
  let allResults = [];
  let shownCount = 0;
  const batchSize = 10;

  input.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const query = e.target.value.trim();
      runSearch(query);
    }, 250);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      input.value = "";
      runSearch("");
    }
  });

  loadMoreBtn.addEventListener("click", () => {
    showResultsBatch();
  });

  async function runSearch(query) {
    resultsEl.innerHTML = "";
    searchTitle.innerHTML = "";

    loadMoreBtn.classList.add("hidden");
    allResults = [];
    shownCount = 0;

    if (query.length < 2) {
      explorerEl.innerHTML = explorerContent;
      return;
    }

    explorerEl.innerHTML = "";
    searchTitle.innerHTML = `<h2>Searching for "<span class="text-secondary">${query}</span>"...</h2>`;

    try {
      const results = await pagefind.search(query, {
        sort: {
          date: "asc",
        },
      });
      allResults = results.results;

      if (!allResults.length) {
        searchTitle.innerHTML = `<h2>No results for "<span class="text-secondary">${query}</span>"</h2>`;
        explorerEl.innerHTML = explorerContent;
        return;
      }

      updateSearchTitle(query);
      showResultsBatch();
    } catch (error) {
      console.error("Search error:", error);
      searchTitle.innerHTML = "An error occurred. Please try again later.";
      loadMoreBtn.classList.add("hidden");
    }
  }

  function updateSearchTitle(query) {
    const total = allResults.length;
    const shown = Math.min(shownCount, total);
    searchTitle.innerHTML = `<h2>Showing ${shown} of ${total} results for "<span class="text-secondary">${query}</span>"</h2>`;
  }

  async function showResultsBatch() {
    const total = allResults.length;
    const nextCount = Math.min(shownCount + batchSize, total);

    for (let i = shownCount; i < nextCount; i++) {
      const data = await allResults[i].data();
      const div = document.createElement("div");

      const date = data.meta.date
        ? new Date(data.meta.date).toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          })
        : "";

      div.innerHTML = `
        <a
          href="${data.url}"        
          class="group block max-w-60 bg-base-100 rounded-lg shadow-md hover:shadow-xl hover:scale-[1.04] transition-transform duration-300 ease-in-out overflow-hidden no-underline text-inherit cursor-pointer"
        >
          <figure class="relative m-0 p-0 rounded-t-lg overflow-hidden">
            <img
              class="aspect-video w-full object-cover m-0 p-0"
              src="${data.meta.image || "/placeholder.jpg"}"
              alt="${data.meta.image_alt || "Post image"}"
              loading="lazy"
            />
            <span
              class="badge badge-ghost absolute top-3 left-3 text-xs opacity-90 group-hover:opacity-100 transition-opacity"
            >
              Tech
            </span>
          </figure>

          <div class="p-4 space-y-4">
            <time
              class="text-sm text-gray-500 group-hover:text-gray-700 transition-colors"
              datetime="${data.meta.date || ""}"
            >
              ${date} 
            </time>
            <p
              class="m-0 p-0 mt-1 sm:text-lg font-primary font-semibold leading-snug line-clamp-3 transition-colors group-hover:[color:var(--color-secondary)]"
            >
              ${data.meta.title}
            </p>
          </div>
        </a>
      `;
      resultsEl.appendChild(div);
      htmx.process(div);
    }

    shownCount = nextCount;
    updateSearchTitle(input.value.trim());

    if (shownCount < total) {
      loadMoreBtn.classList.remove("hidden");
    } else {
      loadMoreBtn.classList.add("hidden");
    }
  }
});

// setupThemeToggle

function themeToggle(toggleId = "theme-toggle") {
  const toggle = document.getElementById(toggleId);
  if (!toggle) return;

  const darkValue = toggle.value || "dark";
  const lightValue = "light";

  const savedTheme = localStorage.getItem("theme") || lightValue;
  toggle.checked = savedTheme === darkValue;

  toggle.addEventListener("change", () => {
    const newTheme = toggle.checked ? darkValue : lightValue;
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  });
}

// Initialize on page load
themeToggle();
