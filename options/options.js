const input = document.getElementById("domain-input");
const addBtn = document.getElementById("add-btn");
const list = document.getElementById("domain-list");

const loadDomains = async () => {
  const { domains = [] } = await chrome.storage.local.get("domains");
  list.innerHTML = "";
  domains.forEach(d => {
    const li = document.createElement("li");
    li.textContent = d;

    const removeBtn = document.createElement("span");
    removeBtn.textContent = "✖";
    removeBtn.className = "remove";
    removeBtn.addEventListener("click", async () => {
      const updated = domains.filter(x => x !== d);
      await chrome.storage.local.set({ domains: updated });
      loadDomains();
    });

    li.appendChild(removeBtn);
    list.appendChild(li);
  });
};

addBtn.addEventListener("click", async () => {
  let url = input.value.trim();
  if (!url.endsWith("/")) url += "/";
  if (!url.startsWith("http")) {
    alert("Bitte vollständige URL mit http/https eingeben.");
    return;
  }
  const pattern = url + "*";

  chrome.permissions.request({ origins: [pattern] }, async (granted) => {
    if (granted) {
      const { domains = [] } = await chrome.storage.local.get("domains");
      if (!domains.includes(url)) {
        domains.push(url);
        await chrome.storage.local.set({ domains });
      }
      input.value = "";
      loadDomains();
    } else {
      alert("Berechtigung nicht erteilt.");
    }
  });
});

loadDomains();
