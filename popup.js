document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menu-toggle");
  const managePanel = document.getElementById("manage-panel");
  const bookmarkDisplay = document.getElementById("bookmark-display");
  const groupTabs = document.getElementById("group-tabs");
  const exportBtn = document.getElementById("export-btn");
  const importInput = document.getElementById("import-input");

  const newCategoryInput = document.getElementById("new-category");
  const addCategoryBtn = document.getElementById("add-category");
  const categoryIconUpload = document.getElementById("category-icon-upload");

  const websiteUrlInput = document.getElementById("website-url");
  const websiteTitleInput = document.getElementById("website-title");
  const categorySelect = document.getElementById("category-select");
  const addWebsiteBtn = document.getElementById("add-website");

  const categoryPicker = document.getElementById("category-picker");
  const addCurrentPageBtn = document.getElementById("add-current-page-btn");
  const confirmAddPage = document.getElementById("confirm-add-page");
  const categorySelectPopup = document.getElementById("category-select-popup");

  const manageCategoriesSection = document.getElementById(
    "manage-categories-section"
  );
  const manageDeleteSection = document.getElementById("manage-delete-section");
  const manageGroupsSection = document.getElementById("manage-groups-section");

  let currentGroup = "";
  let groupOrder = [];
  let currentTab = { title: "", url: "" };

  menuToggle.onclick = () => {
    const isHidden = managePanel.classList.contains("hidden");
    managePanel.classList.toggle("hidden");
    bookmarkDisplay.style.display = isHidden ? "none" : "block";
  };

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      currentTab.title = tabs[0].title;
      currentTab.url = tabs[0].url;
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

  function promptColor(defaultColor = "#4a90e2") {
    const color = prompt(
      "Enter hex color for group (e.g. #4a90e2):",
      defaultColor
    );
    return /^#([0-9A-F]{3}){1,2}$/i.test(color) ? color : defaultColor;
  }

  function loadStorage(callback) {
    chrome.storage.local.get(
      [
        "masterGroups",
        "currentGroup",
        "collapsedCategories",
        "categoryOrder",
        "groupOrder",
      ],
      (data) => {
        let groups = data.masterGroups || {
          Default: { color: "#4a90e2", categories: {} },
        };
        if (!data.currentGroup || !groups[data.currentGroup]) {
          chrome.storage.local.set({ currentGroup: "Default" });
          currentGroup = "Default";
        } else {
          currentGroup = data.currentGroup;
        }
        const collapsed = data.collapsedCategories || [];
        const categoryOrder = data.categoryOrder || {};
        groupOrder = data.groupOrder || Object.keys(groups);
        callback(groups, collapsed, categoryOrder, groupOrder);
      }
    );
  }

  function saveGroups(groups) {
    chrome.storage.local.set({ masterGroups: groups });
  }

  function setCurrentGroup(name) {
    chrome.storage.local.set({ currentGroup: name }, () => refreshUI());
  }

  exportBtn.onclick = () => {
    loadStorage((groups) => {
      const blob = new Blob([JSON.stringify(groups, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bookmarks.json";
      a.click();
    });
  };

  importInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (typeof data === "object") {
          chrome.storage.local.set({ masterGroups: data }, () => {
            alert("Import successful!");
            location.reload();
          });
        } else {
          alert("Invalid JSON format.");
        }
      } catch {
        alert("Error parsing file.");
      }
    };
    reader.readAsText(file);
  };
  function renderGroupTabs(groups) {
    groupTabs.innerHTML = "";

    groupOrder = groupOrder.filter((g) => groups[g]);
    if (groupOrder.length === 0) groupOrder = Object.keys(groups);

    groupOrder.forEach((group) => {
      const tab = document.createElement("button");
      tab.className = "group-tab";
      tab.textContent = group;
      if (group === currentGroup) tab.classList.add("active");
      tab.style.backgroundColor = groups[group].color || "#eaeaea";

      tab.draggable = true;
      tab.ondragstart = (e) => e.dataTransfer.setData("text/plain", group);
      tab.ondragover = (e) => e.preventDefault();
      tab.ondrop = (e) => {
        e.preventDefault();
        const dragged = e.dataTransfer.getData("text/plain");
        const from = groupOrder.indexOf(dragged);
        const to = groupOrder.indexOf(group);
        groupOrder.splice(from, 1);
        groupOrder.splice(to, 0, dragged);
        chrome.storage.local.set({ groupOrder }, refreshUI);
      };

      tab.onclick = () => setCurrentGroup(group);
      groupTabs.appendChild(tab);
    });

    const addBtn = document.createElement("button");
    addBtn.textContent = "+";
    addBtn.onclick = () => {
      const name = prompt("New group name:");
      if (!name) return;
      const color = promptColor();
      loadStorage((groups) => {
        if (!groups[name]) {
          groups[name] = { color, categories: {} };
          groupOrder.push(name);
          chrome.storage.local.set({ masterGroups: groups, groupOrder }, () =>
            setCurrentGroup(name)
          );
        }
      });
    };
    groupTabs.appendChild(addBtn);
  }

  function refreshGroupManager(groups) {
    manageGroupsSection.innerHTML = "";
    Object.keys(groups).forEach((groupName) => {
      const row = document.createElement("div");
      row.className = "manage-row";

      const label = document.createElement("span");
      label.textContent = groupName;

      const editBtn = document.createElement("button");
      editBtn.className = "action";
      editBtn.textContent = "Edit";
      editBtn.onclick = () => {
        const newName = prompt("Rename group:", groupName);
        const newColor = promptColor(groups[groupName].color);

        if (!newName || newName === groupName) {
          groups[groupName].color = newColor;
          saveGroups(groups);
          refreshUI();
          return;
        }

        if (groups[newName]) return alert("Group already exists");

        groups[newName] = {
          ...groups[groupName],
          color: newColor,
        };

        delete groups[groupName];

        const index = groupOrder.indexOf(groupName);
        if (index >= 0) groupOrder[index] = newName;

        const isCurrent = currentGroup === groupName;
        chrome.storage.local.set(
          {
            masterGroups: groups,
            groupOrder,
            currentGroup: isCurrent ? newName : currentGroup,
          },
          refreshUI
        );
      };

      const delBtn = document.createElement("button");
      delBtn.className = "action";
      delBtn.textContent = "Delete";
      delBtn.onclick = () => {
        if (!confirm(`Delete group "${groupName}" and all its content?`))
          return;

        chrome.storage.local.get(
          ["masterGroups", "currentGroup", "categoryOrder"],
          (result) => {
            const groups = result.masterGroups;
            const orders = result.categoryOrder || {};
            const isCurrent = result.currentGroup === groupName;

            delete groups[groupName];
            delete orders[groupName];

            const remaining = Object.keys(groups);
            const newCurrent = isCurrent
              ? remaining[0] || "Default"
              : result.currentGroup;

            chrome.storage.local.set(
              {
                masterGroups: groups,
                categoryOrder: orders,
                currentGroup: newCurrent,
              },
              refreshUI
            );
          }
        );
      };

      row.appendChild(label);
      row.appendChild(editBtn);
      row.appendChild(delBtn);
      manageGroupsSection.appendChild(row);
    });
  }

  addCategoryBtn.onclick = async () => {
    const catName = newCategoryInput.value.trim();
    if (!catName) return;
    const file = categoryIconUpload.files[0];
    const icon = file ? await toBase64(file) : null;

    loadStorage((groups, collapsed, order) => {
      const group = groups[currentGroup];
      if (!group.categories[catName]) {
        group.categories[catName] = { icon, bookmarks: [] };
        order[currentGroup] = order[currentGroup] || [];
        order[currentGroup].push(catName);
        chrome.storage.local.set(
          { masterGroups: groups, categoryOrder: order },
          refreshUI
        );
      }
    });

    newCategoryInput.value = "";
    categoryIconUpload.value = "";
  };

  addWebsiteBtn.onclick = () => {
    const url = websiteUrlInput.value.trim();
    const title = websiteTitleInput.value.trim() || url;
    const selectedCat = categorySelect.value;
    if (!url || !selectedCat) return;

    loadStorage((groups) => {
      groups[currentGroup].categories[selectedCat].bookmarks.push({
        title,
        url,
      });
      saveGroups(groups);
      refreshUI();
    });

    websiteUrlInput.value = "";
    websiteTitleInput.value = "";
  };

  addCurrentPageBtn.onclick = () => {
    categoryPicker.innerHTML =
      "<option disabled selected>Select category</option>";
    loadStorage((groups) => {
      for (let cat in groups[currentGroup].categories) {
        categoryPicker.appendChild(new Option(cat, cat));
      }
      categorySelectPopup.classList.remove("hidden");
    });
  };

  confirmAddPage.onclick = () => {
    const selectedCat = categoryPicker.value;
    if (!selectedCat) return;

    loadStorage((groups) => {
      groups[currentGroup].categories[selectedCat].bookmarks.push({
        title: currentTab.title,
        url: currentTab.url,
      });
      saveGroups(groups);
      categorySelectPopup.classList.add("hidden");
      refreshUI();
    });
  };

  function refreshUI() {
    loadStorage((groups, collapsed, categoryOrder) => {
      const group = groups[currentGroup];
      const categories = group.categories || {};
      const order = categoryOrder[currentGroup] || Object.keys(categories);

      renderGroupTabs(groups);
      refreshGroupManager(groups);

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

          const idxFrom = order.indexOf(draggedCat);
          const idxTo = order.indexOf(cat);
          order.splice(idxFrom, 1);
          order.splice(idxTo, 0, draggedCat);
          chrome.storage.local.set(
            { categoryOrder: { ...categoryOrder, [currentGroup]: order } },
            refreshUI
          );
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

        const catName = document.createElement("span");
        catName.textContent = cat;
        left.appendChild(catName);

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

        const list = document.createElement("div");
        list.className = "bookmark-list";
        if (collapsed.includes(cat)) list.classList.add("hidden");

        (catData.bookmarks || []).forEach((entry, idx) => {
          const row = document.createElement("div");
          row.className = "bookmark-item";

          const link = document.createElement("div");
          link.className = "bookmark-link";

          const favicon = document.createElement("img");
          try {
            const domain = new URL(entry.url).hostname;
            favicon.src = `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
          } catch {
            favicon.src = "icon.png"; // fallback
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
            saveGroups(groups);
            refreshUI();
          };

          row.appendChild(link);
          row.appendChild(editBtn);
          list.appendChild(row);
        });

        card.appendChild(list);
        bookmarkDisplay.appendChild(card);
      });

      refreshDeleteSection(groups[currentGroup].categories, groups);
    });
  }

  function refreshDeleteSection(categories, allGroups) {
    manageCategoriesSection.innerHTML = "";
    manageDeleteSection.innerHTML = "";

    for (let cat in categories) {
      const catRow = document.createElement("div");
      catRow.className = "manage-row";

      const label = document.createElement("span");
      label.textContent = cat;

      const edit = document.createElement("button");
      edit.className = "action";
      edit.textContent = "Edit";
      edit.onclick = () => {
        const newName = prompt("Rename category:", cat) || cat;
        const groupNames = Object.keys(allGroups);
        const moveTo =
          prompt(
            "Move category to group:\n" + groupNames.join(", "),
            currentGroup
          ) || currentGroup;

        if (!allGroups[moveTo]) return alert("Invalid group.");

        const catData = categories[cat];
        delete categories[cat];
        allGroups[moveTo].categories[newName] = catData;

        chrome.storage.local.set({ masterGroups: allGroups }, refreshUI);
      };

      const del = document.createElement("button");
      del.className = "action";
      del.textContent = "Delete";
      del.onclick = () => {
        if (confirm(`Delete category "${cat}"?`)) {
          delete categories[cat];
          chrome.storage.local.get(["masterGroups"], (result) => {
            result.masterGroups[currentGroup].categories = categories;
            chrome.storage.local.set(
              { masterGroups: result.masterGroups },
              refreshUI
            );
          });
        }
      };

      catRow.appendChild(label);
      catRow.appendChild(edit);
      catRow.appendChild(del);
      manageCategoriesSection.appendChild(catRow);

      (categories[cat].bookmarks || []).forEach((entry, idx) => {
        const row = document.createElement("div");
        row.className = "manage-row";

        const label = document.createElement("span");
        label.innerHTML = `<strong>${entry.title}</strong> <em style="color:#999;">(${cat})</em>`;

        const edit = document.createElement("button");
        edit.className = "action";
        edit.textContent = "Edit";
        edit.onclick = () => {
          const newTitle = prompt("Edit title:", entry.title) || entry.title;
          const newUrl = prompt("Edit URL:", entry.url) || entry.url;
          categories[cat].bookmarks[idx] = { title: newTitle, url: newUrl };
          chrome.storage.local.get(["masterGroups"], (result) => {
            result.masterGroups[currentGroup].categories = categories;
            chrome.storage.local.set(
              { masterGroups: result.masterGroups },
              refreshUI
            );
          });
        };

        const del = document.createElement("button");
        del.className = "action";
        del.textContent = "Delete";
        del.onclick = () => {
          if (confirm(`Delete bookmark "${entry.title}"?`)) {
            categories[cat].bookmarks.splice(idx, 1);
            chrome.storage.local.get(["masterGroups"], (result) => {
              result.masterGroups[currentGroup].categories = categories;
              chrome.storage.local.set(
                { masterGroups: result.masterGroups },
                refreshUI
              );
            });
          }
        };

        row.appendChild(label);
        row.appendChild(edit);
        row.appendChild(del);
        manageDeleteSection.appendChild(row);
      });
    }
  }

  // Kick off the UI
  refreshUI();
});
