document.addEventListener("DOMContentLoaded", async () => {
  const listContainer = document.getElementById("project-list");
  const counter = document.getElementById("project-counter");
  const searchInput = document.getElementById("search-input");
  const refreshButton = document.getElementById("refresh-btn");
  const toggleThemeBtn = document.getElementById("theme-toggle");

  const MAX_CACHE_AGE_HOURS = 24;
  const CACHE_KEY = "openstack_projects";
  const CACHE_TIME_KEY = "openstack_projects_last_updated";

  // ---------- Theme ----------
  const updateTheme = () => {
    const current = localStorage.getItem("openstack_theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", next);
    localStorage.setItem("openstack_theme", next);
    toggleThemeBtn.textContent = next === "dark" ? "☀️" : "🌙";
  };

  const applyStoredTheme = () => {
    const theme = localStorage.getItem("openstack_theme") || "light";
    document.body.setAttribute("data-theme", theme);
    toggleThemeBtn.textContent = theme === "dark" ? "☀️" : "🌙";
  };

  toggleThemeBtn.addEventListener("click", updateTheme);
  applyStoredTheme();

  // ---------- Helpers ----------
  const highlight = (text, pattern) => {
    if (!pattern) return text;
    const regex = new RegExp(`(${pattern})`, "gi");
    return text.replace(regex, `<mark>$1</mark>`);
  };

  // Detects Horizon webroot from the current URL (supports /horizon and /dashboard).
  const getHorizonRoot = (urlObj) => {
    const m = urlObj.pathname.match(/\/(horizon|dashboard)\b/);
    return m ? m[0] : "/horizon";
  };

  // Returns the current path (including query) of the active tab.
  const loadCurrentPath = async () => {
    let currentPath = "/horizon/identity/";
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      try {
        const url = new URL(tab.url);
        currentPath = url.pathname + url.search;
      } catch (err) {
        console.warn("Could not parse current path:", err);
      }
    }
    return currentPath;
  };

  // Builds the correct switch URL for the active tab (domain + webroot + /auth/switch/<id>/?next=…)
  const buildSwitchUrl = async (projectId) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) throw new Error("Active tab has no URL.");
    const urlObj = new URL(tab.url);
    const origin = urlObj.origin;
    const root = getHorizonRoot(urlObj);
    const nextPath = urlObj.pathname + urlObj.search;
    return `${origin}${root}/auth/switch/${projectId}/?next=${encodeURIComponent(nextPath)}`;
  };

  // Performs the actual project switch in the active tab.
  const switchProject = async (projectId) => {
    try {
      const switchUrl = await buildSwitchUrl(projectId);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.update(tab.id, { url: switchUrl });
      }
    } catch (e) {
      console.error("[openstack-project-switcher] Could not build switch URL:", e);
    }
  };

  let allProjects = [];

  // ---------- Rendering ----------
  const renderProjects = (filter = "") => {
    listContainer.innerHTML = "";
    const pattern = filter.trim().toLowerCase();

    const filtered = allProjects.filter(p =>
      p.name.toLowerCase().startsWith(pattern) ||
      (p.description && p.description.toLowerCase().includes(pattern))
    );

    filtered.forEach(project => {
      const row = document.createElement("div");
      row.className = "project-entry";

      const icon = document.createElement("span");
      icon.className = "play-icon";
      icon.innerHTML = "▶️";
      icon.title = "Switch to this project";
      icon.addEventListener("click", () => switchProject(project.id));

      const textCol = document.createElement("div");
      textCol.className = "project-text";

      const name = document.createElement("span");
      name.className = "project-name";
      name.innerHTML = highlight(project.name, pattern);

      const desc = document.createElement("span");
      desc.className = "project-desc";
      desc.innerHTML = highlight(project.description || "", pattern);

      textCol.appendChild(name);
      textCol.appendChild(desc);
      row.appendChild(icon);
      row.appendChild(textCol);
      listContainer.appendChild(row);
    });

    counter.textContent = `${filtered.length} / ${allProjects.length} projects`;
  };

  // ---------- Data fetching ----------
  const fetchProjects = async () => {
    // Fetches the project list from the /identity/ page of the current domain & webroot
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) throw new Error("Active tab has no URL.");
    const urlObj = new URL(tab.url);
    const origin = urlObj.origin;
    const root = getHorizonRoot(urlObj);

    const res = await fetch(`${origin}${root}/identity/`, { credentials: "include" });
    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const rows = doc.querySelectorAll("tr[data-object-id]");
    const projects = [];

    rows.forEach(row => {
      const id = row.getAttribute("data-object-id");
      const tds = row.querySelectorAll("td");
      // Note: Depending on Horizon version/themes, the column order might differ.
      const name = tds[1]?.textContent.trim();
      const description = tds[2]?.textContent.trim();
      if (id && name) projects.push({ id, name, description });
    });

    localStorage.setItem(CACHE_KEY, JSON.stringify(projects));
    localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
    return projects;
  };

  const loadProjects = async (force = false) => {
    listContainer.textContent = "Loading projects...";
    const lastUpdated = localStorage.getItem(CACHE_TIME_KEY);
    const cache = localStorage.getItem(CACHE_KEY);

    if (
      !force &&
      lastUpdated &&
      (Date.now() - parseInt(lastUpdated, 10)) < MAX_CACHE_AGE_HOURS * 3600000 &&
      cache
    ) {
      try {
        allProjects = JSON.parse(cache);
        console.log("[openstack-project-switcher] Using cached projects.");
        renderProjects(searchInput.value);
        return;
      } catch {
        console.warn("Could not parse cached project list.");
      }
    }

    try {
      allProjects = await fetchProjects();
      console.log("[openstack-project-switcher] Project list updated.");
    } catch (err) {
      console.error(err);
      listContainer.textContent = "Error loading projects.";
      return;
    }

    renderProjects(searchInput.value);
  };

  // ---------- Events ----------
  refreshButton.addEventListener("click", () => loadProjects(true));
  searchInput.addEventListener("input", () => renderProjects(searchInput.value));

  // Initial load
  await loadProjects();
});
