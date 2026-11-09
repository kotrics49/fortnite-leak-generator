const API_URL = "https://fortnite-api.com/v2/cosmetics/new?language=hu";
const $ = (id) => document.getElementById(id);
let cosmetics = [];

function setMessage(text, bad=false){ $("message").textContent=text; $("message").style.color=bad?"#ff9a9a":"#9ba5bb"; }
function pickImage(item){
  const images=item.images||{};
  return images.icon||images.smallIcon||images.featured||images.other||"";
}
function category(item){
  const raw=(item.type?.displayValue||item.type?.value||item.type?.backendValue||"Kozmetikum").toString();
  const map={"outfit":"Öltözék","backpack":"Hátidísz","pickaxe":"Csákány","emote":"Emote","glider":"Sikló","wrap":"Fegyverfestés","pet":"Kedvenc","toy":"Játék","music":"Zene","loadingscreen":"Töltőképernyő","contrail":"Égcsík"};
  return map[raw.toLowerCase()]||raw;
}
function rarity(item){
  return item.rarity?.displayValue||item.rarity?.value||"Ismeretlen";
}
function normalize(data){
  const payload=data?.data;
  let list=[];
  if(Array.isArray(payload)) list=payload;
  else if(payload && Array.isArray(payload.items)) list=payload.items;
  else if(payload && typeof payload === "object") {
    // A /v2/cosmetics/new válasza több kategóriát is tartalmazhat (BR, LEGO, tracks stb.).
    for(const [key, value] of Object.entries(payload)) {
      if(value && Array.isArray(value.items)) {
        list.push(...value.items.map(item=>({...item, _apiCategory:key})));
      } else if(Array.isArray(value)) {
        list.push(...value.map(item=>({...item, _apiCategory:key})));
      }
    }
  }
  if(!list.length) throw new Error("Nem találtam kozmetikai elemeket a válaszban. Lehet, hogy jelenleg nincs új elem, vagy változott az API válaszformátuma.");
  return list.map(x=>({id:x.id,name:x.name||"Névtelen tárgy",type:category(x),rarity:rarity(x),set:x.set?.text||x.series?.name||"",image:pickImage(x)}))
    .filter(x=>x.image);
}
function renderList(){
  const root=$("items");
  root.classList.remove("empty");
  root.innerHTML="";
  if(!cosmetics.length){root.textContent="A lekérés sikerült, de nem érkezett megjeleníthető tárgykép.";return;}
  cosmetics.forEach(item=>{
    const el=document.createElement("article");el.className="item";
    const img=document.createElement("img");img.src=item.image;img.alt=item.name;img.loading="lazy";
    const info=document.createElement("div");
    const name=document.createElement("div");name.className="item-name";name.textContent=item.name;
    const meta=document.createElement("div");meta.className="item-meta";meta.textContent=$("showRarity").checked?`${item.type} · ${item.rarity}`:item.type;
    info.append(name,meta);el.append(img,info);root.append(el);
  });
}
async function fetchCosmetics(){
  $("fetchBtn").disabled=true;$("status").textContent="LEKÉRÉS…";setMessage("Kapcsolódás a Fortnite-API-hoz…");
  try{
    const res=await fetch(API_URL,{headers:{Accept:"application/json"}});
    if(!res.ok) throw new Error(`API-hiba: ${res.status}`);
    const json=await res.json();
    cosmetics=normalize(json);
    $("totalCount").textContent=cosmetics.length;
    $("outfitCount").textContent=cosmetics.filter(x=>x.type.toLowerCase().includes("öltözék")||x.type.toLowerCase().includes("outfit")).length;
    $("otherCount").textContent=cosmetics.length-Number($("outfitCount").textContent);
    $("updated").textContent="Frissítve: "+new Date().toLocaleString("hu-HU");
    renderList();$("generateBtn").disabled=cosmetics.length===0;
    $("status").textContent="ONLINE";setMessage(`${cosmetics.length} képpel rendelkező kozmetikai bejegyzés érkezett.`);
  }catch(err){
    $("status").textContent="HIBA";setMessage(err.message+" Ha CORS-hibát látsz, a lekérést egy kis szerveroldali közvetítőn keresztül kell futtatnunk.",true);
  }finally{$("fetchBtn").disabled=false;}
}
function roundedRect(ctx,x,y,w,h,r,fill){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
}
function loadImage(url){
  return new Promise(resolve=>{const img=new Image();img.crossOrigin="anonymous";img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=url;});
}
async function generate(){
  if(!cosmetics.length)return;
  const canvas=$("art"),ctx=canvas.getContext("2d"),W=1080,H=1920;
  const grad=ctx.createLinearGradient(0,0,W,H);grad.addColorStop(0,"#17192a");grad.addColorStop(.55,"#10131e");grad.addColorStop(1,"#090b12");ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#a88cff";ctx.font="800 30px Arial";ctx.fillText("FORTNITE  /  KÖZÖSSÉGI ADATFIGYELŐ",70,95);
  ctx.fillStyle="#ffffff";ctx.font="900 76px Arial";ctx.fillText("ÚJ KOZMETIKUMOK",70,190);
  ctx.fillStyle="#9ba5bb";ctx.font="30px Arial";ctx.fillText("LEGÚJABBAN HOZZÁADOTT TÁRGYAK",70,245);
  ctx.strokeStyle="#34394c";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(70,285);ctx.lineTo(1010,285);ctx.stroke();
  const perPage=Number($("perPage").value),pageCount=Math.ceil(cosmetics.length/perPage);
  const pages=[];
  for(let page=0;page<pageCount;page++){
    const start=page*perPage,part=cosmetics.slice(start,start+perPage);
    if(page>0){ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);ctx.fillStyle="#a88cff";ctx.font="800 30px Arial";ctx.fillText("FORTNITE  /  KÖZÖSSÉGI ADATFIGYELŐ",70,95);ctx.fillStyle="#fff";ctx.font="900 76px Arial";ctx.fillText("ÚJ KOZMETIKUMOK",70,190);ctx.fillStyle="#9ba5bb";ctx.font="30px Arial";ctx.fillText("FOLYTATÁS",70,245);ctx.strokeStyle="#34394c";ctx.beginPath();ctx.moveTo(70,285);ctx.lineTo(1010,285);ctx.stroke();}
    const cols=2,rows=Math.ceil(part.length/2),cardW=450,cardH=390,gap=30,left=70,top=330;
    for(let i=0;i<part.length;i++){
      const item=part[i],col=i%cols,row=Math.floor(i/cols),x=left+col*(cardW+gap),y=top+row*(cardH+25);
      roundedRect(ctx,x,y,cardW,cardH,24,"#202638");
      roundedRect(ctx,x+18,y+18,cardW-36,cardH-120,18,"#151a28");
      const img=await loadImage(item.image);
      if(img){const maxW=cardW-70,maxH=cardH-155,scale=Math.min(maxW/img.width,maxH/img.height);const iw=img.width*scale,ih=img.height*scale;ctx.drawImage(img,x+(cardW-iw)/2,y+28+(maxH-ih)/2,iw,ih);}
      ctx.fillStyle="#fff";ctx.font="bold 27px Arial";let nm=item.name;if(nm.length>27)nm=nm.slice(0,26)+"…";ctx.fillText(nm,x+22,y+cardH-70);
      ctx.fillStyle="#b4bdd1";ctx.font="20px Arial";const meta=$("showRarity").checked?`${item.type}  •  ${item.rarity}`:item.type;ctx.fillText(meta.slice(0,37),x+22,y+cardH-35);
    }
    ctx.fillStyle="#8791a8";ctx.font="20px Arial";ctx.fillText(`OLDAL ${page+1} / ${pageCount}`,70,1840);
    ctx.fillStyle="#fff";ctx.font="bold 22px Arial";ctx.fillText("KÖVESS TOVÁBBI FORTNITE HÍREKÉRT",70,1880);
    pages.push(canvas.toDataURL("image/png"));
  }
  const link=$("download");link.href=pages[0];link.hidden=false;link.textContent=pageCount>1?`1. oldal letöltése (${pageCount} oldal)`:"PNG letöltése";
  link.download="fortnite-uj-kozmetikumok-1.png";
  const firstPreview=new Image();firstPreview.onload=()=>{ctx.clearRect(0,0,W,H);ctx.drawImage(firstPreview,0,0);};firstPreview.src=pages[0];
  if(pageCount>1){setMessage(`${pageCount} oldal készült. Jelenleg az első oldal tölthető le; a többoldalas ZIP-exportot a következő fejlesztési körben adjuk hozzá.`);}
  else setMessage("Elkészült a TikTok-grafika. Töltsd le a PNG-t!");
}
$("fetchBtn").addEventListener("click",fetchCosmetics);
$("generateBtn").addEventListener("click",generate);
$("showRarity").addEventListener("change",renderList);
