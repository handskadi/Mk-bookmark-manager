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

    // If currently hidden → show manage panel, hide main panel
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
      if (!categories[selectedCat]) categories[selectedCat] = [];
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
      // CATEGORY ROW
      const catRow = document.createElement("div");
      catRow.className = "manage-row";

      const catLabel = document.createElement("span");
      catLabel.textContent = cat;

      const editCat = document.createElement("button");
      editCat.textContent = "Edit";
      editCat.className = "action";
      editCat.onclick = () => {
        const newName = prompt("Rename category:", cat);
        if (newName && newName !== cat) {
          categories[newName] = categories[cat];
          delete categories[cat];
          chrome.storage.local.set({ categories }, refreshUI);
        }
      };

      const deleteCatBtn = document.createElement("button");
      deleteCatBtn.textContent = "Delete";
      deleteCatBtn.className = "action";
      deleteCatBtn.onclick = () => {
        const confirmDelete = confirm(
          `Delete category "${cat}" and all its bookmarks?`
        );
        if (confirmDelete) {
          delete categories[cat];
          chrome.storage.local.set({ categories }, refreshUI);
        }
      };

      catRow.appendChild(catLabel);
      catRow.appendChild(editCat);
      catRow.appendChild(deleteCatBtn);
      categoryList.appendChild(catRow);

      // BOOKMARK ROWS
      categories[cat].forEach((entry, idx) => {
        const row = document.createElement("div");
        row.className = "manage-row";

        const label = document.createElement("span");
        label.textContent = entry.title;

        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.className = "action";
        editBtn.onclick = () => {
          const newTitle = prompt("Edit title:", entry.title) || entry.title;
          const newUrl = prompt("Edit URL:", entry.url) || entry.url;
          categories[cat][idx] = { title: newTitle, url: newUrl };
          chrome.storage.local.set({ categories }, refreshUI);
        };

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "action";
        deleteBtn.onclick = () => {
          const confirmed = confirm(`Delete bookmark: "${entry.title}"?`);
          if (confirmed) {
            categories[cat].splice(idx, 1);
            chrome.storage.local.set({ categories }, refreshUI);
          }
        };

        row.appendChild(label);
        row.appendChild(editBtn);
        row.appendChild(deleteBtn);
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

      for (let cat in categories) {
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

        categories[cat].forEach((entry, idx) => {
          const row = document.createElement("div");
          row.className = "bookmark-item";

          const link = document.createElement("span");
          link.textContent = entry.title;
          link.onclick = () => chrome.tabs.create({ url: entry.url });

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
