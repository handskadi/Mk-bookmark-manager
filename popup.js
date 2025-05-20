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
  const categoryIconUpload = document.getElementById("category-icon-upload");

  // NEW: Add Current Page button + dropdown
  const addCurrentPageBtn = document.getElementById("add-current-page-btn");
  const categoryPicker = document.getElementById("category-picker");
  const categorySelectPopup = document.getElementById("category-select-popup");
  const confirmAddPage = document.getElementById("confirm-add-page");
  let currentTab = { title: "", url: "" };

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      currentTab.title = tabs[0].title || "";
      currentTab.url = tabs[0].url || "";
    }
  });

  // Convert uploaded image to base64
  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Toggle manage panel
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

  // Add category
  addCategoryBtn.onclick = async () => {
    const catName = newCategoryInput.value.trim();
    if (!catName) return;

    const file = categoryIconUpload.files[0];
    let icon = null;

    if (file) {
      icon = await toBase64(file);
    }

    chrome.storage.local.get(["categories"], (result) => {
      const categories = result.categories || {};
      if (!categories[catName]) {
        categories[catName] = {
          icon: icon,
          bookmarks: [],
        };
        chrome.storage.local.set({ categories }, () => {
          newCategoryInput.value = "";
          categoryIconUpload.value = "";
          refreshUI();
        });
      }
    });
  };

  // Add website manually
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
      const catData = categories[selectedCat];
      if (!catData || !catData.bookmarks) catData.bookmarks = [];
      catData.bookmarks.push({ title, url });
      chrome.storage.local.set({ categories }, () => {
        websiteUrlInput.value = "";
        websiteTitleInput.value = "";
        refreshUI();
      });
    });
  };

  // NEW: Add current tab to selected category
  addCurrentPageBtn.onclick = () => {
    categoryPicker.innerHTML =
      "<option disabled selected>Select category</option>";
    chrome.storage.local.get(["categories"], (result) => {
      const categories = result.categories || {};
      for (let cat in categories) {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        categoryPicker.appendChild(opt);
      }
      categorySelectPopup.classList.remove("hidden");
    });
  };

  confirmAddPage.onclick = () => {
    const selectedCat = categoryPicker.value;
    if (!selectedCat) {
      alert("Please select a category.");
      return;
    }

    chrome.storage.local.get(["categories"], (result) => {
      const categories = result.categories || {};
      const catData = categories[selectedCat];
      if (!catData || !catData.bookmarks) catData.bookmarks = [];

      catData.bookmarks.push({
        title: currentTab.title,
        url: currentTab.url,
      });

      chrome.storage.local.set({ categories }, () => {
        alert("Page added to bookmarks!");
        categorySelectPopup.classList.add("hidden");
        refreshUI();
      });
    });
  };

  // Refresh UI: main panel
  function refreshUI() {
    chrome.storage.local.get(["categories"], (result) => {
      const categories = result.categories || {};
      bookmarkDisplay.innerHTML = "";
      categorySelect.innerHTML =
        "<option disabled selected>Select category</option>";
      categoryPicker.innerHTML =
        "<option disabled selected>Select category</option>";

      for (let cat in categories) {
        const catData = categories[cat];
        const card = document.createElement("div");
        card.className = "category-card";

        const header = document.createElement("div");
        header.className = "category-header";

        if (catData.icon) {
          const iconImg = document.createElement("img");
          iconImg.src = catData.icon;
          iconImg.width = 16;
          iconImg.height = 16;
          iconImg.style.marginRight = "6px";
          iconImg.style.verticalAlign = "middle";
          header.appendChild(iconImg);
        }

        header.appendChild(document.createTextNode(cat));
        card.appendChild(header);

        const opt1 = document.createElement("option");
        opt1.value = cat;
        opt1.textContent = cat;
        categorySelect.appendChild(opt1);

        const opt2 = document.createElement("option");
        opt2.value = cat;
        opt2.textContent = cat;
        categoryPicker.appendChild(opt2);

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
            const newTitle = prompt("Edit title:", entry.title) || entry.title;
            const newUrl = prompt("Edit URL:", entry.url) || entry.url;
            catData.bookmarks[idx] = { title: newTitle, url: newUrl };
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

  // Refresh manage panel
  function refreshDeleteSection(categories) {
    const section = document.getElementById("manage-delete-section");
    const categoryList = document.getElementById("manage-categories-section");
    section.innerHTML = "";
    categoryList.innerHTML = "";

    for (let cat in categories) {
      const catData = categories[cat];
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

      (catData.bookmarks || []).forEach((entry, idx) => {
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
          catData.bookmarks[idx] = { title: newTitle, url: newUrl };
          chrome.storage.local.set({ categories }, refreshUI);
        };

        const del = document.createElement("button");
        del.className = "action";
        del.textContent = "Delete";
        del.onclick = () => {
          const confirmed = confirm(`Delete bookmark: "${entry.title}"?`);
          if (confirmed) {
            catData.bookmarks.splice(idx, 1);
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

  refreshUI();
});
