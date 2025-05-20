document.addEventListener("DOMContentLoaded", () => {
  const bookmarkDisplay = document.getElementById("bookmark-display");
  const menuToggle = document.getElementById("menu-toggle");
  const managePanel = document.getElementById("manage-panel");
  const newCategoryInput = document.getElementById("new-category");
  const categoryIconUpload = document.getElementById("category-icon-upload");
  const addCategoryBtn = document.getElementById("add-category");
  const websiteUrlInput = document.getElementById("website-url");
  const websiteTitleInput = document.getElementById("website-title");
  const addWebsiteBtn = document.getElementById("add-website");
  const categorySelect = document.getElementById("category-select");
  const addCurrentPageBtn = document.getElementById("add-current-page-btn");
  const categoryPicker = document.getElementById("category-picker");
  const categorySelectPopup = document.getElementById("category-select-popup");
  const confirmAddPage = document.getElementById("confirm-add-page");
  const manageCategoriesSection = document.getElementById(
    "manage-categories-section"
  );
  const manageDeleteSection = document.getElementById("manage-delete-section");

  let currentTab = { title: "", url: "" };

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      currentTab.title = tabs[0].title || "";
      currentTab.url = tabs[0].url || "";
    }
  });

  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  menuToggle.onclick = () => {
    const isHidden = managePanel.classList.contains("hidden");
    managePanel.classList.toggle("hidden");
    bookmarkDisplay.style.display = isHidden ? "none" : "block";
  };

  addCategoryBtn.onclick = async () => {
    const catName = newCategoryInput.value.trim();
    if (!catName) return;
    const file = categoryIconUpload.files[0];
    let icon = null;
    if (file) icon = await toBase64(file);

    chrome.storage.local.get(["categories", "categoryOrder"], (result) => {
      const categories = result.categories || {};
      const order = result.categoryOrder || [];

      if (!categories[catName]) {
        categories[catName] = { icon, bookmarks: [] };
        order.push(catName);
        chrome.storage.local.set({ categories, categoryOrder: order }, () => {
          newCategoryInput.value = "";
          categoryIconUpload.value = "";
          refreshUI();
        });
      }
    });
  };

  addWebsiteBtn.onclick = () => {
    const url = websiteUrlInput.value.trim();
    const title = websiteTitleInput.value.trim() || url;
    const selectedCat = categorySelect.value;
    if (!url || !selectedCat || selectedCat === "Select category")
      return alert("Please select a valid category.");

    chrome.storage.local.get(["categories"], (result) => {
      const categories = result.categories || {};
      categories[selectedCat].bookmarks.push({ title, url });
      chrome.storage.local.set({ categories }, () => {
        websiteUrlInput.value = "";
        websiteTitleInput.value = "";
        refreshUI();
      });
    });
  };

  addCurrentPageBtn.onclick = () => {
    categoryPicker.innerHTML =
      "<option disabled selected>Select category</option>";
    chrome.storage.local.get(["categories"], (result) => {
      for (let cat in result.categories) {
        const opt = new Option(cat, cat);
        categoryPicker.appendChild(opt);
      }
      categorySelectPopup.classList.remove("hidden");
    });
  };

  confirmAddPage.onclick = () => {
    const selectedCat = categoryPicker.value;
    if (!selectedCat) return alert("Please select a category.");
    chrome.storage.local.get(["categories"], (result) => {
      result.categories[selectedCat].bookmarks.push({
        title: currentTab.title,
        url: currentTab.url,
      });
      chrome.storage.local.set({ categories: result.categories }, () => {
        alert("Page added!");
        categorySelectPopup.classList.add("hidden");
        refreshUI();
      });
    });
  };

  function refreshUI() {
    chrome.storage.local.get(
      ["categories", "categoryOrder", "collapsedCategories"],
      (result) => {
        const categories = result.categories || {};
        let order = result.categoryOrder || Object.keys(categories);
        const collapsed = result.collapsedCategories || [];

        // sync order
        order = order.filter((cat) => categories[cat]);
        chrome.storage.local.set({ categoryOrder: order });

        bookmarkDisplay.innerHTML = "";
        categorySelect.innerHTML =
          "<option disabled selected>Select category</option>";
        categoryPicker.innerHTML =
          "<option disabled selected>Select category</option>";

        order.forEach((cat) => {
          const catData = categories[cat];
          const card = document.createElement("div");
          card.className = "category-card";
          card.draggable = true;

          card.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", cat);
            card.style.opacity = "0.5";
          });

          card.addEventListener("dragend", () => {
            card.style.opacity = "1";
          });

          card.addEventListener("dragover", (e) => {
            e.preventDefault();
            card.classList.add("drag-over");
          });

          card.addEventListener("dragleave", () => {
            card.classList.remove("drag-over");
          });

          card.addEventListener("drop", (e) => {
            e.preventDefault();
            card.classList.remove("drag-over");
            const draggedCat = e.dataTransfer.getData("text/plain");
            if (draggedCat === cat) return;

            const newOrder = [...order];
            const from = newOrder.indexOf(draggedCat);
            const to = newOrder.indexOf(cat);
            newOrder.splice(from, 1);
            newOrder.splice(to, 0, draggedCat);
            chrome.storage.local.set({ categoryOrder: newOrder }, refreshUI);
          });

          const header = document.createElement("div");
          header.className = "category-header";

          const left = document.createElement("div");
          left.style.display = "flex";
          left.style.alignItems = "center";
          left.style.gap = "6px";

          if (catData.icon) {
            const icon = document.createElement("img");
            icon.src = catData.icon;
            icon.width = 16;
            icon.height = 16;
            left.appendChild(icon);
          }

          const name = document.createElement("span");
          name.textContent = cat;
          left.appendChild(name);

          const toggle = document.createElement("span");
          toggle.className = "category-toggle";
          toggle.textContent = collapsed.includes(cat) ? "▸" : "▾";
          toggle.onclick = () => {
            const newCollapsed = [...collapsed];
            const i = newCollapsed.indexOf(cat);
            if (i >= 0) newCollapsed.splice(i, 1);
            else newCollapsed.push(cat);
            chrome.storage.local.set(
              { collapsedCategories: newCollapsed },
              refreshUI
            );
          };

          header.appendChild(left);
          header.appendChild(toggle);
          card.appendChild(header);

          categorySelect.appendChild(new Option(cat, cat));
          categoryPicker.appendChild(new Option(cat, cat));

          const bookmarkList = document.createElement("div");
          bookmarkList.className = "bookmark-list";
          if (collapsed.includes(cat)) bookmarkList.classList.add("hidden");

          (catData.bookmarks || []).forEach((entry, idx) => {
            const row = document.createElement("div");
            row.className = "bookmark-item";

            const link = document.createElement("div");
            link.className = "bookmark-link";

            const favicon = document.createElement("img");
            try {
              favicon.src = `https://www.google.com/s2/favicons?sz=32&domain=${
                new URL(entry.url).hostname
              }`;
            } catch {
              favicon.src = "icon.png";
            }
            favicon.className = "favicon";

            const label = document.createElement("span");
            label.textContent = entry.title;
            label.onclick = () => chrome.tabs.create({ url: entry.url });

            link.appendChild(favicon);
            link.appendChild(label);

            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.onclick = () => {
              const newTitle =
                prompt("Edit title:", entry.title) || entry.title;
              const newUrl = prompt("Edit URL:", entry.url) || entry.url;
              catData.bookmarks[idx] = { title: newTitle, url: newUrl };
              chrome.storage.local.set({ categories }, refreshUI);
            };

            row.appendChild(link);
            row.appendChild(editBtn);
            bookmarkList.appendChild(row);
          });

          card.appendChild(bookmarkList);
          bookmarkDisplay.appendChild(card);
        });

        refreshDeleteSection(categories);
      }
    );
  }

  function refreshDeleteSection(categories) {
    manageCategoriesSection.innerHTML = "";
    manageDeleteSection.innerHTML = "";

    for (let cat in categories) {
      const catData = categories[cat];

      // Manage Categories
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
        if (confirm(`Delete category "${cat}" and all bookmarks?`)) {
          delete categories[cat];
          chrome.storage.local.set({ categories }, refreshUI);
        }
      };

      catRow.appendChild(catLabel);
      catRow.appendChild(editCat);
      catRow.appendChild(deleteCat);
      manageCategoriesSection.appendChild(catRow);

      // Manage Bookmarks inside this category
      (catData.bookmarks || []).forEach((entry, idx) => {
        const row = document.createElement("div");
        row.className = "manage-row";

        const label = document.createElement("span");
        label.innerHTML = `<strong>${entry.title}</strong> <em style="color:#999; font-size:12px;">(${cat})</em>`;

        const edit = document.createElement("button");
        edit.className = "action";
        edit.textContent = "Edit";
        edit.onclick = () => {
          const newTitle = prompt("Edit title:", entry.title) || entry.title;
          const newUrl = prompt("Edit URL:", entry.url) || entry.url;
          categories[cat].bookmarks[idx] = { title: newTitle, url: newUrl };
          chrome.storage.local.set({ categories }, refreshUI);
        };

        const del = document.createElement("button");
        del.className = "action";
        del.textContent = "Delete";
        del.onclick = () => {
          if (confirm(`Delete bookmark "${entry.title}"?`)) {
            categories[cat].bookmarks.splice(idx, 1);
            chrome.storage.local.set({ categories }, refreshUI);
          }
        };

        row.appendChild(label);
        row.appendChild(edit);
        row.appendChild(del);
        manageDeleteSection.appendChild(row);
      });
    }
  }

  refreshUI();
});
