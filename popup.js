document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menu-toggle");
  const managePanel = document.getElementById("manage-panel");
  const newCategoryInput = document.getElementById("new-category");
  const addCategoryBtn = document.getElementById("add-category");
  const websiteUrlInput = document.getElementById("website-url");
  const websiteTitleInput = document.getElementById("website-title");
  const addWebsiteBtn = document.getElementById("add-website");
  const categorySelect = document.getElementById("category-select");
  const bookmarkDisplay = document.getElementById("bookmark-display");

  menuToggle.onclick = () => {
    const isHidden = managePanel.classList.contains("hidden");
    if (isHidden) {
      managePanel.classList.remove("hidden");
      bookmarkDisplay.style.display = "none";
    } else {
      managePanel.classList.add("hidden");
      bookmarkDisplay.style.display = "block";
    }
  };

  addCategoryBtn.onclick = () => {
    const catName = newCategoryInput.value.trim();
    if (!catName) return;

    chrome.storage.local.get(["categories"], (result) => {
      const categories = result.categories || {};
      if (!categories[catName]) {
        categories[catName] = [];
        chrome.storage.local.set({ categories }, () => {
          newCategoryInput.value = "";
          refreshUI();
        });
      }
    });
  };

  addWebsiteBtn.onclick = () => {
    const url = websiteUrlInput.value.trim();
    const title = websiteTitleInput.value.trim() || url;
    const selectedCat = categorySelect.value;

    if (!url || !selectedCat || selectedCat === "Select category") {
      alert("Please select a valid category.");
      return;
    }

    chrome.storage.local.get(["categories"], (result) => {
      const categories = result.categories || {};
      categories[selectedCat].push({ title, url });
      chrome.storage.local.set({ categories }, () => {
        websiteUrlInput.value = "";
        websiteTitleInput.value = "";
        refreshUI();
      });
    });
  };

  function refreshDeleteSection(categories) {
    const section = document.getElementById("manage-delete-section");
    const categoryList = document.getElementById("manage-categories-section");
    section.innerHTML = "";
    categoryList.innerHTML = "";

    for (let cat in categories) {
      const catRow = document.createElement("div");
      catRow.className = "manage-row";

      const catLabel = document.createElement("span");
      catLabel.textContent = cat;

      const editCat = document.createElement("button");
      editCat.className = "action";
      editCat.textContent = "Edit";
      editCat.onclick = () => {
        const newName = prompt("Rename category:", cat);
        if (newName && newName !== cat) {
          categories[newName] = categories[cat];
          delete categories[cat];
          chrome.storage.local.set({ categories }, refreshUI);
        }
      };

      const deleteCat = document.createElement("button");
      deleteCat.className = "action";
      deleteCat.textContent = "Delete";
      deleteCat.onclick = () => {
        const confirmDelete = confirm(
          `Delete category "${cat}" and all bookmarks?`
        );
        if (confirmDelete) {
          delete categories[cat];
          chrome.storage.local.set({ categories }, refreshUI);
        }
      };

      catRow.appendChild(catLabel);
      catRow.appendChild(editCat);
      catRow.appendChild(deleteCat);
      categoryList.appendChild(catRow);

      categories[cat].forEach((entry, idx) => {
        const row = document.createElement("div");
        row.className = "manage-row";

        const label = document.createElement("span");
        label.textContent = entry.title;

        const edit = document.createElement("button");
        edit.className = "action";
        edit.textContent = "Edit";
        edit.onclick = () => {
          const newTitle = prompt("Edit title:", entry.title) || entry.title;
          const newUrl = prompt("Edit URL:", entry.url) || entry.url;
          categories[cat][idx] = { title: newTitle, url: newUrl };
          chrome.storage.local.set({ categories }, refreshUI);
        };

        const del = document.createElement("button");
        del.className = "action";
        del.textContent = "Delete";
        del.onclick = () => {
          const confirmed = confirm(`Delete bookmark: "${entry.title}"?`);
          if (confirmed) {
            categories[cat].splice(idx, 1);
            chrome.storage.local.set({ categories }, refreshUI);
          }
        };

        row.appendChild(label);
        row.appendChild(edit);
        row.appendChild(del);
        section.appendChild(row);
      });
    }
  }

  function refreshUI() {
    chrome.storage.local.get(["categories"], (result) => {
      const categories = result.categories || {};
      bookmarkDisplay.innerHTML = "";
      categorySelect.innerHTML =
        "<option disabled selected>Select category</option>";

      for (const cat in categories) {
        const card = document.createElement("div");
        card.className = "category-card";

        const header = document.createElement("div");
        header.className = "category-header";
        header.textContent = cat;
        card.appendChild(header);

        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);

        const bookmarks = categories[cat] || [];
        bookmarks.forEach((entry, idx) => {
          const row = document.createElement("div");
          row.className = "bookmark-item";

          const link = document.createElement("div");
          link.className = "bookmark-link";

          const favicon = document.createElement("img");
          favicon.className = "favicon";
          try {
            favicon.src = `https://www.google.com/s2/favicons?sz=32&domain=${
              new URL(entry.url).hostname
            }`;
          } catch {
            favicon.src = "icon.png"; // fallback
          }

          const label = document.createElement("span");
          label.textContent = entry.title;
          label.onclick = () => chrome.tabs.create({ url: entry.url });

          link.appendChild(favicon);
          link.appendChild(label);

          const editBtn = document.createElement("button");
          editBtn.textContent = "Edit";
          editBtn.onclick = () => {
            const newTitle = prompt("Edit title:", entry.title) || entry.title;
            const newUrl = prompt("Edit URL:", entry.url) || entry.url;
            categories[cat][idx] = { title: newTitle, url: newUrl };
            chrome.storage.local.set({ categories }, refreshUI);
          };

          row.appendChild(link);
          row.appendChild(editBtn);
          card.appendChild(row);
        });

        bookmarkDisplay.appendChild(card);
      }

      refreshDeleteSection(categories);
    });
  }

  refreshUI();
});
