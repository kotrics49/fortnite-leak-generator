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
  const entries = data?.data?.entries;

  if (!Array.isArray(entries)) {
    throw new Error("Nem sikerült beolvasni az Item Shop adatait.");
  }

  const list = [];

  for (const entry of entries) {
    const groups = [
      entry.brItems,
      entry.items,
      entry.tracks,
      entry.instruments,
      entry.cars,
      entry.legoKits
    ];

    for (const group of groups) {
      if (Array.isArray(group)) {
        list.push(...group);
      }
    }
  }

  const unique = new Map();

  for (const item of list) {
    const image = pickImage(item);
    if (!item.name || !image) continue;

    const id = item.id || item.name + image;

    if (!unique.has(id)) {
      unique.set(id, {
        id,
        name: item.name,
        image
      });
    }
  }

  const result = [...unique.values()];

  if (!result.length) {
    throw new Error("Nem találtam megjeleníthető tárgyakat a shopban.");
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

  let cols = 2;
  if (count > 12) cols = 3;
  if (count > 24) cols = 4;
  if (count > 40) cols = 5;

  const rows = Math.ceil(count / cols);

  const margin = 35;
  const gap = 14;

  const cardW = (W - margin * 2 - gap * (cols - 1)) / cols;
  const cardH = (H - margin * 2 - gap * (rows - 1)) / rows;

  ctx.fillStyle = "#10131e";
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < count; i++) {
    const item = cosmetics[i];

    const col = i % cols;
    const row = Math.floor(i / cols);

    const x = margin + col * (cardW + gap);
    const y = margin + row * (cardH + gap);

    roundedRect(ctx, x, y, cardW, cardH, 16, "#202638");

    const img = await loadImage(item.image);

    if (img) {
      const imageAreaHeight = cardH - 42;
      const maxW = cardW - 12;
      const maxH = imageAreaHeight - 8;

      const scale = Math.min(
        maxW / img.width,
        maxH / img.height
      );

      const iw = img.width * scale;
      const ih = img.height * scale;

      ctx.drawImage(
        img,
        x + (cardW - iw) / 2,
        y + 4 + (imageAreaHeight - ih) / 2,
        iw,
        ih
      );
    }

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const fontSize = Math.max(
      12,
      Math.min(25, cardW / 11, cardH / 7)
    );

    ctx.font = `bold ${fontSize}px Arial`;

    let name = item.name;
    while (
      ctx.measureText(name).width > cardW - 12 &&
      name.length > 4
    ) {
      name = name.slice(0, -2) + "…";
    }

    ctx.fillText(
      name,
      x + cardW / 2,
      y + cardH - 21
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