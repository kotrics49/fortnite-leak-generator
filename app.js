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

  const perPage = Number($("perPage").value) || 8;
  const pageCount = Math.ceil(cosmetics.length / perPage);
  const pages = [];

  for (let page = 0; page < pageCount; page++) {
    ctx.fillStyle = "#10131e";
    ctx.fillRect(0, 0, W, H);

    const part = cosmetics.slice(
      page * perPage,
      (page + 1) * perPage
    );

    const cols = 2;
    const rows = Math.ceil(part.length / cols);
    const left = 55;
    const top = 55;
    const gapX = 25;
    const gapY = 22;
    const cardW = 472;
    const cardH = (1810 - (rows - 1) * gapY) / rows;

    for (let i = 0; i < part.length; i++) {
      const item = part[i];
      const col = i % cols;
      const row = Math.floor(i / cols);

      const x = left + col * (cardW + gapX);
      const y = top + row * (cardH + gapY);

      roundedRect(ctx, x, y, cardW, cardH, 22, "#202638");

      const img = await loadImage(item.image);

      if (img) {
        const areaTop = y + 15;
        const areaHeight = cardH - 95;
        const maxW = cardW - 35;
        const maxH = areaHeight - 15;

        const scale = Math.min(
          maxW / img.width,
          maxH / img.height
        );

        const iw = img.width * scale;
        const ih = img.height * scale;

        ctx.drawImage(
          img,
          x + (cardW - iw) / 2,
          areaTop + (maxH - ih) / 2,
          iw,
          ih
        );
      }

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.font = "bold 25px Arial";

      let name = item.name;
      while (ctx.measureText(name).width > cardW - 30 && name.length > 5) {
        name = name.slice(0, -2) + "…";
      }

      ctx.fillText(name, x + cardW / 2, y + cardH - 35);
    }

    pages.push(canvas.toDataURL("image/png"));
  }

  const link = $("download");
  link.href = pages[0];
  link.hidden = false;
  link.textContent = pageCount > 1
    ? `1. oldal letöltése (${pageCount} oldal)`
    : "PNG letöltése";

  link.download = "fortnite-item-shop.png";

  const preview = new Image();
  preview.onload = () => {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(preview, 0, 0);
  };
  preview.src = pages[0];

  if (pageCount > 1) {
    setMessage(`${pageCount} oldal készült. Egyelőre az első oldal tölthető le.`);
  } else {
    setMessage("Elkészült a TikTok-kép!");
  }
}

$("fetchBtn").addEventListener("click", fetchCosmetics);
$("generateBtn").addEventListener("click", generate);