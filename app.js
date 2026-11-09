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
  const shop = data?.data;

  const entries = shop?.entries || [];

  if (!entries.length) {
    throw new Error("Nem találhatók Item Shop ajánlatok.");
  }

  const bundleItemIds = new Set();

  for (const entry of entries) {
    if (entry.bundle) {
      for (const item of entry.items || []) {
        if (item.id) bundleItemIds.add(item.id);
      }
    }
  }

  const rarityColors = {
    common: "#a0a0a0",
    uncommon: "#55aa44",
    rare: "#35a9ed",
    epic: "#a34be8",
    legendary: "#e99532",
    mythic: "#e8bd35",
    marvel: "#d52d43",
    dc: "#2774c9",
    icon: "#e7a3d8",
    gaming: "#d4a2e8"
  };

  const result = [];

  for (const entry of entries) {
    const items = entry.items || [];
    const bundle = entry.bundle;

    if (bundle) {
      const firstItem = items[0];
      const image =
        bundle.image ||
        firstItem?.images?.featured ||
        firstItem?.images?.icon ||
        "";

      if (image) {
        result.push({
          id: entry.offerId || bundle.name,
          name: bundle.name || "Bundle",
          image,
          color: "#a34be8"
        });
      }

      continue;
    }

    for (const item of items) {
      if (!item.id || bundleItemIds.has(item.id)) continue;

      const image =
        item.images?.featured ||
        item.images?.icon ||
        item.images?.smallIcon ||
        "";

      if (!image) continue;

      const rarity = (
        item.rarity?.value ||
        item.rarity?.name ||
        "common"
      ).toLowerCase();

      result.push({
        id: item.id,
        name: item.name,
        image,
        color: rarityColors[rarity] || "#64748b"
      });
    }
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
  const H = 1920;

  canvas.width = W;
  canvas.height = H;

  const count = cosmetics.length;

  // Automatikus oszlopszám
  let cols = 3;
  if (count <= 12) cols = 2;
  else if (count > 24) cols = 4;
  else if (count > 40) cols = 5;

  const rows = Math.ceil(count / cols);
  const margin = 24;
  const gap = 5;

  const cardW = (W - margin * 2 - gap * (cols - 1)) / cols;
  const cardH = (H - margin * 2 - gap * (rows - 1)) / rows;

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
  const link = $("download");
  link.href = canvas.toDataURL("image/png");
  link.download = "fortnite-item-shop.png";
  link.hidden = false;
  link.textContent = "TikTok-kép letöltése";

  setMessage(`Elkészült! Mind a ${count} tárgy egyetlen képen látható.`);
}

$("fetchBtn").addEventListener("click", fetchCosmetics);
$("generateBtn").addEventListener("click", generate);