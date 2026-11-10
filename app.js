const API_URL = "https://fortnite-api.com/v2/shop?language=en";
const $ = (id) => document.getElementById(id);

let cosmetics = [];

function setMessage(text, bad = false) {
  $("message").textContent = text;
  $("message").style.color = bad ? "#ff9a9a" : "#9ba5bb";
}

function pickImage(item) {
  const images = item.images || {};
  return images.icon || images.smallIcon || images.featured ||
         images.other || images.large || "";
}

function normalize(data) {
  const entries = data?.data?.entries || [];

  if (!entries.length) {
    throw new Error("Nem találhatók Item Shop ajánlatok.");
  }

  const itemGroups = [
    "brItems",
    "tracks",
    "instruments",
    "cars",
    "legoKits",
    "beans",
    "jamTracks"
  ];

  const bundleItemIds = new Set();

  // Bundle-ökben szereplő tárgyak összegyűjtése
  for (const entry of entries) {
    if (entry.bundle) {
      for (const group of itemGroups) {
        for (const item of entry[group] || []) {
          if (item.id) bundleItemIds.add(item.id);
        }
      }
    }
  }

  function getColor(item) {
    const rarity = (
      item.rarity?.value || "common"
    ).toLowerCase();

    const series = (
      item.series?.value || ""
    ).toLowerCase();

    if (series.includes("marvel")) return "#d52d43";
    if (series.includes("dc")) return "#2774c9";
    if (series.includes("icon")) return "#e7a3d8";
    if (series.includes("gaming")) return "#d4a2e8";

    const colors = {
      common: "#a0a0a0",
      uncommon: "#55aa44",
      rare: "#35a9ed",
      epic: "#a34be8",
      legendary: "#e99532",
      mythic: "#e8bd35"
    };

    return colors[rarity] || "#64748b";
  }

  const result = [];
  const added = new Set();

  for (const entry of entries) {
    const allItems = [];

    for (const group of itemGroups) {
      allItems.push(...(entry[group] || []));
    }

    // Bundle egyetlen csempén
    if (entry.bundle) {
      const bundle = entry.bundle;
      const firstItem = allItems[0];

      const image =
        bundle.image ||
        firstItem?.images?.featured ||
        firstItem?.images?.icon ||
        "";

      if (image) {
        const id = entry.offerId || bundle.name;

        if (!added.has(id)) {
          added.add(id);

          result.push({
            id,
            name: bundle.name || "Bundle",
            image,
            color: firstItem ? getColor(firstItem) : "#a34be8"
          });
        }
      }

      continue;
    }

    // Önálló tárgyak
    for (const item of allItems) {
      if (!item.id || bundleItemIds.has(item.id)) continue;
      if (added.has(item.id)) continue;

      const image =
        item.images?.featured ||
        item.images?.icon ||
        item.albumArt ||
        "";

      if (!image || !item.name) continue;

      added.add(item.id);

      result.push({
        id: item.id,
        name: item.name,
        image,
        color: getColor(item)
      });
    }
  }

  if (!result.length) {
    throw new Error("Nem sikerült feldolgozni a shop ajánlatait.");
  }

  return result;
}

function renderList() {
  const root = $("items");
  root.classList.remove("empty");
  root.innerHTML = "";

  if (!cosmetics.length) {
    root.textContent = "Nincsenek megjeleníthető tárgyak.";
    return;
  }

  cosmetics.forEach(item => {
    const el = document.createElement("article");
    el.className = "item";

    const img = document.createElement("img");
    img.src = item.image;
    img.alt = item.name;
    img.loading = "lazy";

    const info = document.createElement("div");
    const name = document.createElement("div");
    name.className = "item-name";
    name.textContent = item.name;

    info.append(name);
    el.append(img, info);
    root.append(el);
  });
}

async function fetchCosmetics() {
  $("fetchBtn").disabled = true;
  $("status").textContent = "LEKÉRÉS…";
  setMessage("Az aktuális Item Shop lekérése…");

  try {
    const res = await fetch(API_URL, {
      headers: { Accept: "application/json" }
    });

    if (!res.ok) {
      throw new Error(`API-hiba: ${res.status}`);
    }

    const json = await res.json();
    cosmetics = normalize(json);

    $("totalCount").textContent = cosmetics.length;
    $("outfitCount").textContent = "—";
    $("otherCount").textContent = "—";

    $("updated").textContent =
      "Frissítve: " + new Date().toLocaleString("hu-HU");

    renderList();

    $("generateBtn").disabled = false;
    $("status").textContent = "ONLINE";

    setMessage(`${cosmetics.length} tárgy érkezett az aktuális Item Shopból.`);
  } catch (err) {
    $("status").textContent = "HIBA";
    setMessage(err.message, true);
  } finally {
    $("fetchBtn").disabled = false;
  }
}

function roundedRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function loadImage(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function generate() {
  if (!cosmetics.length) return;

  const canvas = $("art");
  const ctx = canvas.getContext("2d");

  const W = 1080;
const margin = 0;
const gap = 2;

const count = cosmetics.length;
const cols = 7;
const rows = Math.ceil(count / cols);

const cardW = (W - margin * 2 - gap * (cols - 1)) / cols;
const cardH = cardW;

const H = margin * 2 + rows * (cardH + gap) - gap;

canvas.width = W;
canvas.height = H;

  // Háttér
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < count; i++) {
    const item = cosmetics[i];

    const col = i % cols;
    const row = Math.floor(i / cols);

    const x = margin + col * (cardW + gap);
    const y = margin + row * (cardH + gap);

    // Eredeti Fortnite ritkasági háttér
    const color = item.color || "#64748b";

    ctx.fillStyle = color;
    ctx.fillRect(x, y, cardW, cardH);

    // Enyhe sötétítés a kép mögött
    const gradient = ctx.createLinearGradient(x, y, x, y + cardH);
    gradient.addColorStop(0, "rgba(255,255,255,0.12)");
    gradient.addColorStop(1, "rgba(0,0,0,0.25)");

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, cardW, cardH);

    // Tárgy képe
    const img = await loadImage(item.image);

    if (img) {
      const imageAreaHeight = cardH * 0.78;
      const maxW = cardW * 0.94;
      const maxH = imageAreaHeight * 0.94;

      const scale = Math.min(
        maxW / img.width,
        maxH / img.height
      );

      const iw = img.width * scale;
      const ih = img.height * scale;

      ctx.drawImage(
        img,
        x + (cardW - iw) / 2,
        y + (imageAreaHeight - ih) / 2,
        iw,
        ih
      );
    }

    // Név háttere
    const nameHeight = cardH * 0.22;

    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(
      x,
      y + cardH - nameHeight,
      cardW,
      nameHeight
    );

    // Angol név
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const fontSize = Math.max(
      11,
      Math.min(24, cardW / 10, nameHeight / 2.2)
    );

    ctx.font = `bold ${fontSize}px Arial`;

    let name = item.name;

    while (
      ctx.measureText(name).width > cardW - 10 &&
      name.length > 5
    ) {
      name = name.slice(0, -2) + "…";
    }

    ctx.fillText(
      name,
      x + cardW / 2,
      y + cardH - nameHeight / 2
    );
  }

  // Letöltés
  const link = $("download");

  link.href = canvas.toDataURL("image/png");
  link.download = "fortnite-item-shop.png";
  link.hidden = false;
  link.textContent = "TikTok-kép letöltése";

  setMessage(
    `Elkészült! ${count} ajánlat egyetlen képen.`
  );
}


$("fetchBtn").addEventListener("click", fetchCosmetics);
$("generateBtn").addEventListener("click", generate);
