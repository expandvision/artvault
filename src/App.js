import { useState, useEffect } from "react";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup } from "firebase/auth";
import { db } from "./firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
const INITIAL_RESOURCES = [
  { id: 1, type: "reference", title: "Dynamic Pose Reference Collection", desc: "A huge library of dynamic human poses for figure drawing practice.", source: "Line of Action", url: "https://line-of-action.com", tags: ["poses", "anatomy"], addedBy: "You", date: "2025-02-10", palette: null, imgColor: "#D4E8F0" },
  { id: 2, type: "palette",   title: "Studio Ghibli Inspired Palette",   desc: "Soft natural tones inspired by classic Ghibli films.", source: "Coolors", url: "https://coolors.co", tags: ["soft", "natural"], addedBy: "Maya", date: "2025-02-08", palette: ["#a8c5b5","#e8d5b0","#c4a882","#7d9b8a","#3d6b5e"], imgColor: null },
  { id: 3, type: "tutorial",  title: "Light & Shadow Fundamentals",       desc: "Comprehensive guide to form lighting for illustrators.", source: "YouTube", url: "https://youtube.com", tags: ["lighting", "shadow"], addedBy: "You", date: "2025-02-06", palette: null, imgColor: "#F5E4D0" },
  { id: 4, type: "asset",     title: "Procreate Brush Pack — Vol. 3",     desc: "Textured inking and painting brushes for Procreate 5X.", source: "Gumroad", url: "https://gumroad.com", tags: ["procreate", "brushes"], addedBy: "Sam", date: "2025-02-05", palette: null, imgColor: "#E8D4F0" },
  { id: 5, type: "reference", title: "Hand Anatomy Reference Sheets",     desc: "Detailed anatomical diagrams and photo refs for drawing hands.", source: "Pinterest", url: "https://pinterest.com", tags: ["hands", "anatomy"], addedBy: "Maya", date: "2025-02-03", palette: null, imgColor: "#FDE8D8" },
  { id: 6, type: "palette",   title: "Retro Sunset Neons",                desc: "Bold, saturated 80s sunset palette with neon accents.", source: "Adobe Color", url: "https://color.adobe.com", tags: ["retro", "vibrant"], addedBy: "You", date: "2025-01-30", palette: ["#ff6b6b","#ff8e53","#ffd93d","#ff6b9d","#c44dff"], imgColor: null },
  { id: 7, type: "tutorial",  title: "Cloth & Fabric Draping Course",     desc: "Master drawing fabric folds and clothing drapes.", source: "Proko", url: "https://proko.com", tags: ["clothing", "folds"], addedBy: "Sam", date: "2025-01-28", palette: null, imgColor: "#D8E8D4" },
  { id: 8, type: "reference", title: "Facial Expression Library",         desc: "Photo library of 500+ genuine human facial expressions.", source: "PoseMy.Art", url: "https://posemy.art", tags: ["faces", "expressions"], addedBy: "You", date: "2025-01-25", palette: null, imgColor: "#F0E4D8" },
  { id: 9, type: "asset",     title: "Clip Studio Watercolor Set",        desc: "Realistic watercolor and gouache brushes for CSP.", source: "Clip Studio", url: "https://assets.clip-studio.com", tags: ["watercolor", "texture"], addedBy: "Maya", date: "2025-01-22", palette: null, imgColor: "#D8F0E8" },
  { id: 10, type: "tutorial", title: "Perspective Drawing: 1, 2 & 3 Point", desc: "Beginner-to-advanced guide on all types of perspective.", source: "Ctrl+Paint", url: "https://ctrlpaint.com", tags: ["perspective", "environment"], addedBy: "You", date: "2025-01-18", palette: null, imgColor: "#E0D8F4" },
  { id: 11, type: "reference", title: "Animal Anatomy — Quadrupeds",      desc: "Skeletal and muscular references for common quadruped animals.", source: "ArtStation", url: "https://artstation.com", tags: ["animals", "anatomy"], addedBy: "Sam", date: "2025-01-14", palette: null, imgColor: "#E8EAD4" },
  { id: 12, type: "palette",  title: "Muted Studio Darks",                desc: "Low-saturation dark tones for shadows and moody illustrations.", source: "Lospec", url: "https://lospec.com", tags: ["dark", "muted"], addedBy: "Maya", date: "2025-01-10", palette: ["#2c2c3e","#3d3550","#4a3f6b","#2a2535","#1a1825"], imgColor: null },
  { id: 13, type: "tutorial", title: "Marc Brunet — How to Paint Light",   desc: "A full walkthrough on painting convincing light and glow effects in digital art.", source: "YouTube", url: "https://www.youtube.com/watch?v=MnGCosF4AxI", tags: ["lighting", "digital painting", "tutorial"], addedBy: "You", date: "2025-02-17", palette: null, imgColor: "#D4E8F0" },
];

const INITIAL_REQUESTS = [
  { id: 1, name: "Jordan Lee",   email: "jordanlee@gmail.com",     date: "Feb 14, 2025", reason: "I'm a friend of Maya's from art school!", status: "pending" },
  { id: 2, name: "Casey Nguyen", email: "casey.n@gmail.com",        date: "Feb 15, 2025", reason: "Sam invited me, love collecting art refs!", status: "pending" },
  { id: 3, name: "Alex Rivera",  email: "alexrivera.art@gmail.com", date: "Feb 16, 2025", reason: "", status: "pending" },
];

const INITIAL_MEMBERS = [
  { id: 1, name: "You (Admin)", email: "admin@gmail.com",  joined: "Jan 1, 2025",  saves: 5 },
  { id: 2, name: "Maya",        email: "maya@gmail.com",   joined: "Jan 3, 2025",  saves: 4 },
  { id: 3, name: "Sam",         email: "sam@gmail.com",    joined: "Jan 5, 2025",  saves: 3 },
];

const TYPE_META = {
  reference: { label: "Reference", color: "#3B82F6" },
  palette:   { label: "Palette",   color: "#22C55E" },
  tutorial:  { label: "Tutorial",  color: "#C1440E" },
  asset:     { label: "Asset",     color: "#A855F7" },
};

function getYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
  } catch(e) {}
  return null;
}
function getVimeoId(url) {
  const match = (url||"").match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}
function getVideoType(url) {
  if (!url) return "other";
  if (getYouTubeId(url)) return "youtube";
  if (getVimeoId(url)) return "vimeo";
  if (url.match(/\.(mp4|webm|ogg|mov)(\?|$)/i)) return "mp4";
  return "other";
}

const IMG_COLORS = ["#D4E8F0","#F5E4D0","#E8D4F0","#FDE8D8","#D8E8D4","#F0E4D8","#D8F0E8","#E0D8F4","#E8EAD4"];

const C = {
  bg:"#FAF7F2", panel:"#FFFFFF", accent:"#C1440E", accentLight:"#F5E6DF",
  ink:"#1C1A18", mid:"#6B6560", border:"#E4DDD6", cream:"#F0EBE4",
  green:"#16A34A", greenLight:"#DCFCE7",
};

// ── TOAST ──
function Toast({ message }) {
  return (
    <div style={{ position:"fixed", bottom:28, left:"50%", transform:message?"translate(-50%,0)":"translate(-50%,80px)", background:C.ink, color:"#FAF7F2", padding:"11px 24px", borderRadius:100, fontSize:13, fontWeight:500, zIndex:9999, transition:"transform 0.3s cubic-bezier(0.34,1.56,0.64,1)", pointerEvents:"none", whiteSpace:"nowrap", fontFamily:"system-ui, sans-serif" }}>
      {message}
    </div>
  );
}

// ── NAVBAR ──
function Navbar({ onAdmin, onSignOut, onAddResource, showAdd = true }) {
  return (
    <nav style={{ height:58, background:C.panel, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 28px", position:"sticky", top:0, zIndex:100 }}>
      <div style={{ fontFamily:"Georgia, serif", fontSize:20, color:C.ink, fontWeight:700 }}>Art<span style={{color:C.accent}}>Vault</span></div>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        {showAdd && <button onClick={onAddResource} style={{ background:C.accent, color:"#fff", border:"none", borderRadius:6, padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"system-ui, sans-serif" }}>+ Add Resource</button>}
        <div onClick={onAdmin} title="Admin Panel" style={{ width:34, height:34, borderRadius:"50%", background:C.accentLight, border:`2px solid ${C.accent}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:C.accent, cursor:"pointer" }}>A</div>
        <button onClick={onSignOut} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"7px 14px", fontSize:12, color:C.mid, cursor:"pointer", fontFamily:"system-ui, sans-serif" }}>Sign Out</button>
      </div>
    </nav>
  );
}

// ── ADD RESOURCE MODAL ──
function AddModal({ onClose, onSave }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState("");

  const handleUrl = v => {
    setUrl(v);
    try { const u = new URL(v); const h = u.hostname.replace("www.","").split(".")[0]; setSource(h.charAt(0).toUpperCase()+h.slice(1)); } catch(e) {}
  };

  const handleSave = () => {
    if (!title.trim()) { setError("Please add a title."); return; }
    if (!category) { setError("Please select a category."); return; }
    setError("");
    onSave({ url:url||"#", title:title.trim(), desc:desc.trim()||"No description provided.", type:category, tags:tags.split(",").map(t=>t.trim()).filter(Boolean), source:source.trim()||"Unknown" });
    onClose();
  };

  const f = { width:"100%", background:"#FAF7F2", border:`1px solid ${C.border}`, borderRadius:6, padding:"11px 13px", fontSize:14, fontFamily:"system-ui, sans-serif", color:C.ink, outline:"none", boxSizing:"border-box" };
  const l = { fontSize:11, letterSpacing:"0.15em", textTransform:"uppercase", color:C.mid, marginBottom:6, display:"block", fontWeight:600 };
  const cats = [["reference","📸","Reference / Pose"],["palette","🎨","Color Palette"],["tutorial","📖","Tutorial / Guide"],["asset","🖌️","Brush / Asset"]];

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:"fixed", inset:0, background:"rgba(28,26,24,0.55)", backdropFilter:"blur(3px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ background:C.panel, borderRadius:12, width:"100%", maxWidth:500, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.18)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"22px 26px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontFamily:"Georgia, serif", fontSize:22, color:C.ink, fontWeight:700 }}>Add Resource</div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:"50%", border:`1px solid ${C.border}`, background:"transparent", cursor:"pointer", fontSize:14, color:C.mid, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
        <div style={{ padding:"22px 26px", display:"flex", flexDirection:"column", gap:18 }}>
          <div><label style={l}>URL</label><input type="url" placeholder="https://..." value={url} onChange={e=>handleUrl(e.target.value)} style={f}/></div>
          <div><label style={l}>Title <span style={{color:C.accent}}>*</span></label><input type="text" placeholder="Give this resource a name" value={title} onChange={e=>setTitle(e.target.value)} style={f}/></div>
          <div><label style={l}>Description</label><textarea placeholder="What is this useful for?" value={desc} onChange={e=>setDesc(e.target.value)} style={{...f,minHeight:80,resize:"vertical"}}/></div>
          <div>
            <label style={l}>Category <span style={{color:C.accent}}>*</span></label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {cats.map(([id,emoji,label]) => (
                <div key={id} onClick={()=>setCategory(id)} style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 13px", border:`1px solid ${category===id?C.accent:C.border}`, borderRadius:6, cursor:"pointer", background:category===id?C.accentLight:"#fff", transition:"all 0.15s" }}>
                  <span style={{fontSize:18}}>{emoji}</span>
                  <span style={{ fontSize:13, fontWeight:category===id?600:400, color:category===id?C.accent:C.ink }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div><label style={l}>Tags <span style={{opacity:0.5,textTransform:"none",letterSpacing:0,fontSize:11}}>comma separated</span></label><input type="text" placeholder="anatomy, lighting, poses" value={tags} onChange={e=>setTags(e.target.value)} style={f}/></div>
          <div><label style={l}>Source / Platform</label><input type="text" placeholder="Pinterest, YouTube, ArtStation…" value={source} onChange={e=>setSource(e.target.value)} style={f}/></div>
          {error && <div style={{ fontSize:13, color:C.accent, background:C.accentLight, padding:"10px 13px", borderRadius:6 }}>⚠️ {error}</div>}
        </div>
        <div style={{ padding:"16px 26px 24px", display:"flex", gap:10, justifyContent:"flex-end", borderTop:`1px solid ${C.border}` }}>
          <button onClick={onClose} style={{ padding:"10px 20px", border:`1px solid ${C.border}`, background:"transparent", borderRadius:6, fontFamily:"system-ui, sans-serif", fontSize:13, cursor:"pointer", color:C.mid }}>Cancel</button>
          <button onClick={handleSave} style={{ padding:"10px 24px", background:C.accent, color:"#fff", border:"none", borderRadius:6, fontFamily:"system-ui, sans-serif", fontSize:13, fontWeight:600, cursor:"pointer" }}>Save to Vault →</button>
        </div>
      </div>
    </div>
  );
}

// ── DETAIL MODAL ──
function DetailModal({ resource: r, onClose, onDelete, onUpdateThumbnail }) {
  const [thumbMode, setThumbMode] = useState(null); // null | "picker"
  const [scrubTime, setScrubTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [captureCanvas] = useState(() => document.createElement("canvas"));
  const videoRef = useState(null);
  const fileInputRef = useState(null);

  if (!r) return null;
  const meta = TYPE_META[r.type];
  const isVideo = !!(getYouTubeId(r.url) || getVimeoId(r.url) || r.url?.match(/\.(mp4|webm|ogg|mov)(\?|$)/i));
  const isMp4 = r.url?.match(/\.(mp4|webm|ogg|mov)(\?|$)/i);
  const ytId = getYouTubeId(r.url);
  const vimeoId = getVimeoId(r.url);

  // Upload image from device
  const handleFileUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { onUpdateThumbnail(r.id, ev.target.result); setThumbMode(null); };
    reader.readAsDataURL(file);
  };

  // Capture frame from mp4 video
  const captureFrame = () => {
    const vid = document.getElementById("detail-video-player");
    if (!vid) return;
    captureCanvas.width = vid.videoWidth;
    captureCanvas.height = vid.videoHeight;
    captureCanvas.getContext("2d").drawImage(vid, 0, 0);
    const dataUrl = captureCanvas.toDataURL("image/jpeg", 0.92);
    onUpdateThumbnail(r.id, dataUrl);
    setThumbMode(null);
  };

  const thumbnailSection = isVideo && (
    <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:16 }}>
      <div style={{ fontSize:11, letterSpacing:"0.15em", textTransform:"uppercase", color:C.mid, fontWeight:600, marginBottom:12 }}>Thumbnail</div>

      {/* Current thumbnail preview */}
      {r.customThumb && (
        <div style={{ marginBottom:12, borderRadius:8, overflow:"hidden", border:`1px solid ${C.border}`, height:120, position:"relative" }}>
          <img src={r.customThumb} alt="thumbnail" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
          <div style={{ position:"absolute", top:8, right:8 }}>
            <span style={{ fontSize:10, background:"rgba(0,0,0,0.6)", color:"white", padding:"3px 8px", borderRadius:100, fontWeight:600 }}>Custom</span>
          </div>
        </div>
      )}

      {/* Two options */}
      {thumbMode === null && (
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => fileInputRef[0]?.click()} style={{ flex:1, padding:"10px", border:`1px solid ${C.border}`, borderRadius:6, background:"#fff", cursor:"pointer", fontFamily:"system-ui, sans-serif", fontSize:12, fontWeight:500, color:C.ink, display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
            📁 Upload from device
          </button>
          {isMp4 && (
            <button onClick={() => setThumbMode("picker")} style={{ flex:1, padding:"10px", border:`1px solid ${C.border}`, borderRadius:6, background:"#fff", cursor:"pointer", fontFamily:"system-ui, sans-serif", fontSize:12, fontWeight:500, color:C.ink, display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
              🎞️ Pick a frame
            </button>
          )}
          {ytId && (
            <button onClick={() => setThumbMode("picker")} style={{ flex:1, padding:"10px", border:`1px solid ${C.border}`, borderRadius:6, background:"#fff", cursor:"pointer", fontFamily:"system-ui, sans-serif", fontSize:12, fontWeight:500, color:C.ink, display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
              🎞️ Pick a frame
            </button>
          )}
        </div>
      )}

      {/* Frame picker for mp4 */}
      {thumbMode === "picker" && isMp4 && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <video
            id="detail-video-player"
            src={r.url}
            style={{ width:"100%", borderRadius:6, border:`1px solid ${C.border}`, maxHeight:200 }}
            onLoadedMetadata={e => setVideoDuration(e.target.duration)}
            onSeeked={() => {}}
          />
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <div style={{ fontSize:12, color:C.mid }}>Scrub to the frame you want, then capture it.</div>
            <input type="range" min={0} max={videoDuration||100} step={0.1} value={scrubTime}
              onChange={e => {
                const t = parseFloat(e.target.value);
                setScrubTime(t);
                const vid = document.getElementById("detail-video-player");
                if (vid) vid.currentTime = t;
              }}
              style={{ width:"100%", accentColor: C.accent }}
            />
            <div style={{ fontSize:11, color:C.mid, textAlign:"right" }}>
              {Math.floor(scrubTime/60)}:{String(Math.floor(scrubTime%60)).padStart(2,"0")} / {Math.floor(videoDuration/60)}:{String(Math.floor(videoDuration%60)).padStart(2,"0")}
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={captureFrame} style={{ flex:1, padding:"10px", background:C.accent, color:"#fff", border:"none", borderRadius:6, fontFamily:"system-ui, sans-serif", fontSize:13, fontWeight:600, cursor:"pointer" }}>
              📸 Use this frame
            </button>
            <button onClick={() => setThumbMode(null)} style={{ padding:"10px 16px", background:"#fff", color:C.mid, border:`1px solid ${C.border}`, borderRadius:6, fontFamily:"system-ui, sans-serif", fontSize:13, cursor:"pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Frame picker for YouTube — show quality thumbnail options */}
      {thumbMode === "picker" && ytId && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ fontSize:12, color:C.mid, lineHeight:1.6 }}>
            YouTube doesn't allow frame scrubbing — but you can choose from the auto-generated thumbnails below, or upload your own image above.
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[
              ["Default",   `https://img.youtube.com/vi/${ytId}/default.jpg`],
              ["Medium",    `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`],
              ["High",      `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`],
              ["Max Res",   `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`],
            ].map(([label, src]) => (
              <div key={label} onClick={() => { onUpdateThumbnail(r.id, src); setThumbMode(null); }}
                style={{ borderRadius:6, overflow:"hidden", border:`1px solid ${C.border}`, cursor:"pointer", position:"relative" }}>
                <img src={src} alt={label} style={{ width:"100%", display:"block" }} onError={e => e.target.parentElement.style.display="none"}/>
                <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(0,0,0,0.55)", padding:"4px 8px", fontSize:10, color:"white", fontWeight:600 }}>{label}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setThumbMode(null)} style={{ padding:"9px", background:"#fff", color:C.mid, border:`1px solid ${C.border}`, borderRadius:6, fontFamily:"system-ui, sans-serif", fontSize:13, cursor:"pointer" }}>Cancel</button>
        </div>
      )}

      {/* Hidden file input */}
      <input ref={el => fileInputRef[0] = el} type="file" accept="image/*" style={{ display:"none" }} onChange={handleFileUpload}/>
    </div>
  );

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:"fixed", inset:0, background:"rgba(28,26,24,0.55)", backdropFilter:"blur(3px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ background:C.panel, borderRadius:12, width:"100%", maxWidth:580, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.18)" }}>

        {/* Banner */}
        {(() => {
          if (r.customThumb) return (
            <div style={{ height:180, borderRadius:"12px 12px 0 0", overflow:"hidden" }}>
              <img src={r.customThumb} alt="thumbnail" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
            </div>
          );
          if (ytId) return (
            <div style={{ borderRadius:"12px 12px 0 0", overflow:"hidden", background:"#000" }}>
              <iframe src={`https://www.youtube.com/embed/${ytId}?rel=0`} style={{ width:"100%", height:280, border:"none", display:"block" }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>
            </div>
          );
          if (vimeoId) return (
            <div style={{ borderRadius:"12px 12px 0 0", overflow:"hidden", background:"#000" }}>
              <iframe src={`https://player.vimeo.com/video/${vimeoId}`} style={{ width:"100%", height:280, border:"none", display:"block" }} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen/>
            </div>
          );
          if (isMp4) return (
            <div style={{ borderRadius:"12px 12px 0 0", overflow:"hidden", background:"#000" }}>
              <video id="detail-video-player" controls style={{ width:"100%", maxHeight:280, display:"block" }}><source src={r.url}/>Your browser does not support video.</video>
            </div>
          );
          if (r.palette) return (
            <div style={{ display:"flex", height:100, borderRadius:"12px 12px 0 0", overflow:"hidden" }}>
              {r.palette.map((col,i) => <div key={i} style={{ flex:1, background:col, display:"flex", alignItems:"flex-end", justifyContent:"center", paddingBottom:8 }}><span style={{ fontSize:9, color:"rgba(255,255,255,0.85)", fontWeight:600, textShadow:"0 1px 3px rgba(0,0,0,0.4)" }}>{col}</span></div>)}
            </div>
          );
          return <div style={{ height:100, background:r.imgColor, borderRadius:"12px 12px 0 0" }}/>;
        })()}

        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", padding:"22px 26px 0" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:meta.color, display:"inline-block" }}/>
              <span style={{ fontSize:10, letterSpacing:"0.15em", textTransform:"uppercase", color:C.mid, fontWeight:600 }}>{meta.label}</span>
            </div>
            <div style={{ fontFamily:"Georgia, serif", fontSize:24, color:C.ink, fontWeight:700, lineHeight:1.25, maxWidth:420 }}>{r.title}</div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:"50%", border:`1px solid ${C.border}`, background:"transparent", cursor:"pointer", fontSize:14, color:C.mid, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:4 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding:"18px 26px 26px", display:"flex", flexDirection:"column", gap:18 }}>
          <p style={{ fontSize:14, color:C.mid, lineHeight:1.75, margin:0 }}>{r.desc}</p>

          <div style={{ display:"flex", gap:24, padding:"14px 0", borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}` }}>
            {[["Source", r.source], ["Added by", r.addedBy], ["Date", r.date]].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase", color:C.mid, marginBottom:3, fontWeight:600 }}>{label}</div>
                <div style={{ fontSize:13, color:C.ink, fontWeight:500 }}>{val}</div>
              </div>
            ))}
          </div>

          {r.tags.length > 0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {r.tags.map(t => <span key={t} style={{ fontSize:11, padding:"4px 12px", background:C.cream, borderRadius:100, color:C.mid, border:`1px solid ${C.border}` }}>{t}</span>)}
            </div>
          )}

          {/* Thumbnail editor — only for video resources */}
          {thumbnailSection}

          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <a href={r.url} target="_blank" rel="noreferrer" style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"11px", background:C.accent, color:"#fff", borderRadius:6, fontFamily:"system-ui, sans-serif", fontSize:13, fontWeight:600, textDecoration:"none" }}>
              Open Resource ↗
            </a>
            <button onClick={()=>{ onDelete(r.id); onClose(); }} style={{ padding:"11px 18px", background:"#fff", color:"#DC2626", border:"1px solid #FCA5A5", borderRadius:6, fontFamily:"system-ui, sans-serif", fontSize:13, cursor:"pointer" }}>
              🗑 Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── RESOURCE CARD ──
function ResourceCard({ r, onClick }) {
  const [hovered, setHovered] = useState(false);
  const meta = TYPE_META[r.type] || TYPE_META.reference;

  const cardTop = () => {
    if (r.type !== "palette" && r.customThumb) {
      return (
        <div style={{ height:110, position:"relative", overflow:"hidden" }}>
          <img src={r.customThumb} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ width:0, height:0, borderTop:"7px solid transparent", borderBottom:"7px solid transparent", borderLeft:"12px solid white", marginLeft:3 }}/>
            </div>
          </div>
        </div>
      );
    }
    if (r.palette) {
      return <div style={{display:"flex",height:72}}>{r.palette.map((col,i)=><div key={i} style={{flex:1,background:col}}/>)}</div>;
    }
    if (r.type === "video") {
      const ytId = getYouTubeId(r.url);
      const vimeoId = getVimeoId(r.url);
      const thumbUrl = ytId
        ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
        : null;
      return (
        <div style={{ height:110, background:r.imgColor||"#D4E8F0", position:"relative", overflow:"hidden" }}>
          {thumbUrl && <img src={thumbUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} onError={e=>e.target.style.display="none"}/>}
          {!thumbUrl && <div style={{ width:"100%", height:"100%", background:"#1a1a2e", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{fontSize:28}}>🎬</span></div>}
          {/* Play button overlay */}
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(0,0,0,0.65)", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(2px)" }}>
              <div style={{ width:0, height:0, borderTop:"7px solid transparent", borderBottom:"7px solid transparent", borderLeft:"12px solid white", marginLeft:3 }}/>
            </div>
          </div>
        </div>
      );
    }
    return <div style={{height:100,background:r.imgColor}}/>;
  };

  return (
    <div onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onClick={onClick}
      style={{ background:"#fff", border:`1px solid ${hovered?"#C1440E":"#E4DDD6"}`, borderRadius:10, overflow:"hidden", cursor:"pointer", transition:"all 0.2s", transform:hovered?"translateY(-3px)":"none", boxShadow:hovered?"0 8px 24px rgba(0,0,0,0.09)":"0 1px 4px rgba(0,0,0,0.04)", breakInside:"avoid", marginBottom:16 }}>
      {cardTop()}
      <div style={{padding:"12px 14px 14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:7}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:meta.color,display:"inline-block"}}/>
          <span style={{fontSize:10,letterSpacing:"0.15em",textTransform:"uppercase",color:"#6B6560",fontWeight:600}}>{meta.label}</span>
          {getYouTubeId(r.url) || getVimeoId(r.url) || r.url?.match(/\.(mp4|webm|ogg|mov)(\?|$)/i)
            ? <span style={{fontSize:10,background:"#E0F2FE",color:"#0891B2",padding:"1px 7px",borderRadius:100,fontWeight:600,marginLeft:2}}>🎬 Video</span>
            : null
          }
        </div>
        <div style={{fontSize:14,fontWeight:600,color:"#1C1A18",lineHeight:1.35,marginBottom:7}}>{r.title}</div>
        <div style={{fontSize:11,color:"#6B6560",marginBottom:10}}>{r.source} · Added by {r.addedBy}</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
          {r.tags.map(t=><span key={t} style={{fontSize:10,padding:"3px 9px",background:"#F0EBE4",borderRadius:100,color:"#6B6560"}}>{t}</span>)}
        </div>
      </div>
    </div>
  );
}

// ── SIDEBAR ITEM ──
function SidebarItem({ cat, isActive, onClick }) {
  return (
    <div onClick={onClick} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 10px", borderRadius:6, cursor:"pointer", marginBottom:2, background:isActive?C.accentLight:"transparent", color:isActive?C.accent:C.ink, fontWeight:isActive?600:400, transition:"all 0.15s" }}>
      <span style={{display:"flex",alignItems:"center",gap:9,fontSize:13.5}}><span>{cat.emoji}</span>{cat.label}</span>
      <span style={{fontSize:10,padding:"2px 7px",borderRadius:100,background:isActive?"rgba(193,68,14,0.12)":C.cream,color:isActive?C.accent:C.mid,fontWeight:500}}>{cat.count}</span>
    </div>
  );
}

// ── APP ──
export default function App() {
  const [screen, setScreen] = useState("landing");
  const [tab, setTab] = useState("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupReason, setSignupReason] = useState("");
  const [pending, setPending] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [resources, setResources] = useState(INITIAL_RESOURCES);
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [showModal, setShowModal] = useState(false);
  const [detailResource, setDetailResource] = useState(null);
  const [toast, setToast] = useState("");
  const [adminTab, setAdminTab] = useState("requests");
// Load resources from Firebase when app starts
useEffect(() => {// Load access requests from Firebase
useEffect(() => {
  const loadRequests = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "requests"));
      const loadedRequests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequests(loadedRequests);
    } catch (error) {
      console.error("Error loading requests:", error);
    }
  };
  
  loadRequests();
}, []);
  const loadResources = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "resources"));
      const loadedResources = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // If database is empty, seed it with sample data
      if (loadedResources.length === 0) {
        console.log("Database empty, adding sample resources...");
        for (const resource of INITIAL_RESOURCES) {
          await addDoc(collection(db, "resources"), {
            type: resource.type,
            title: resource.title,
            desc: resource.desc,
            source: resource.source,
            url: resource.url,
            tags: resource.tags,
            addedBy: resource.addedBy,
            date: resource.date,
            palette: resource.palette,
            imgColor: resource.imgColor
          });
        }
        // Reload after seeding
        const newSnapshot = await getDocs(collection(db, "resources"));
        const newResources = newSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setResources(newResources);
      } else {
        setResources(loadedResources);
      }
    } catch (error) {
      console.error("Error loading resources:", error);
    }
  };
  
  loadResources();
}, []);
  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(""), 2800); };

  const handleLogin = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    console.log("Signed in:", user.email);
    
    // Check if user is approved
    const approvedSnapshot = await getDocs(collection(db, "approvedUsers"));
    const approvedEmails = approvedSnapshot.docs.map(doc => doc.data().email);
    
    // Admin emails always get access
    const adminEmails = ["expandvisionmedia@gmail.com", user.email.includes("admin")];
    const isAdmin = adminEmails.some(check => typeof check === "string" ? user.email === check : check);
    
    if (isAdmin) {
      setScreen("admin");
    } else if (approvedEmails.includes(user.email)) {
      setScreen("feed");
    } else {
      alert("Your access request is pending approval. Please contact the admin.");
      await auth.signOut();
    }
  } catch (error) {
    console.error("Sign in error:", error);
    alert("Sign in failed. Please try again.");
  }
};

  const handleAddResource = async (data) => {
  try {
    const newResource = {
      type: data.type,
      title: data.title,
      desc: data.desc,
      source: data.source,
      url: data.url,
      tags: data.tags,
      addedBy: auth.currentUser?.email || "You",
      date: new Date().toISOString().split("T")[0],
      palette: null,
      imgColor: IMG_COLORS[Math.floor(Math.random() * IMG_COLORS.length)],
    };
    
    const docRef = await addDoc(collection(db, "resources"), newResource);
    setResources(prev => [{ id: docRef.id, ...newResource }, ...prev]);
    showToast("✓ Saved to your vault!");
  } catch (error) {
    console.error("Error adding resource:", error);
    showToast("Failed to save resource");
  }
};

  const handleDelete = async (id) => {
  try {
    await deleteDoc(doc(db, "resources", id));
    setResources(prev => prev.filter(r => r.id !== id));
    showToast("Resource deleted.");
  } catch (error) {
    console.error("Error deleting resource:", error);
    showToast("Failed to delete resource");
  }
};

  const handleUpdateThumbnail = (id, thumbUrl) => {
    setResources(prev => prev.map(r => r.id === id ? {...r, customThumb: thumbUrl} : r));
    if (detailResource?.id === id) setDetailResource(prev => ({...prev, customThumb: thumbUrl}));
    showToast("✓ Thumbnail updated!");
  };

  const handleApprove = async (id) => {
  const req = requests.find(r => r.id === id);
  try {
    // Add to approved users collection
    await addDoc(collection(db, "approvedUsers"), {
      email: req.email,
      name: req.name,
      approvedDate: new Date().toISOString().split("T")[0]
    });
    
    // Update request status
    setRequests(prev => prev.map(r => r.id === id ? {...r, status: "approved"} : r));
    setMembers(prev => [...prev, { id: Date.now(), name: req.name, email: req.email, joined: req.date, saves: 0 }]);
    showToast("✓ Access approved!");
  } catch (error) {
    console.error("Error approving user:", error);
    showToast("Failed to approve user");
  }
};

  const handleDeny = id => {
    setRequests(prev => prev.map(r => r.id===id ? {...r, status:"denied"} : r));
    showToast("Request denied.");
  };
const handleSignupRequest = async () => {
  if (!signupName.trim() || !signupEmail.trim()) return;
  
  try {
    await addDoc(collection(db, "requests"), {
      name: signupName.trim(),
      email: signupEmail.trim(),
      reason: signupReason.trim() || "",
      date: new Date().toISOString().split("T")[0],
      status: "pending"
    });
    
    setPending(true);
    showToast("✓ Request submitted!");
  } catch (error) {
    console.error("Error submitting request:", error);
    showToast("Failed to submit request");
  }
};
  const categories = [
    { id:"all",       label:"All Resources",   emoji:"🗂️", count:resources.length },
    { id:"reference", label:"References",       emoji:"📸", count:resources.filter(r=>r.type==="reference").length },
    { id:"palette",   label:"Color Palettes",   emoji:"🎨", count:resources.filter(r=>r.type==="palette").length },
    { id:"tutorial",  label:"Tutorials",        emoji:"📖", count:resources.filter(r=>r.type==="tutorial").length },
    { id:"asset",     label:"Brushes & Assets", emoji:"🖌️", count:resources.filter(r=>r.type==="asset").length },
  ];
  const savedBy = [
    { id:"mine",    label:"My Saves",       emoji:"👤", count:resources.filter(r=>r.addedBy==="You").length },
    { id:"friends", label:"Friends' Saves", emoji:"👥", count:resources.filter(r=>r.addedBy!=="You").length },
  ];
  const tags = ["anatomy","lighting","procreate","poses","color theory","perspective","faces","brushes"];

  let filtered = [...resources];
  if (activeCategory==="mine") filtered=filtered.filter(r=>r.addedBy==="You");
  else if (activeCategory==="friends") filtered=filtered.filter(r=>r.addedBy!=="You");
  else if (activeCategory!=="all") filtered=filtered.filter(r=>r.type===activeCategory);
  if (search.trim()) { const q=search.toLowerCase(); filtered=filtered.filter(r=>r.title.toLowerCase().includes(q)||r.source.toLowerCase().includes(q)||r.tags.some(t=>t.toLowerCase().includes(q))||r.desc.toLowerCase().includes(q)); }
  if (sort==="oldest") filtered.sort((a,b)=>new Date(a.date)-new Date(b.date));
  else if (sort==="title") filtered.sort((a,b)=>a.title.localeCompare(b.title));
  else filtered.sort((a,b)=>new Date(b.date)-new Date(a.date));

  const currentLabel = [...categories,...savedBy].find(c=>c.id===activeCategory)?.label || "All Resources";
  const inputStyle = { width:"100%", background:C.cream, border:`1px solid ${C.border}`, borderRadius:6, padding:"12px 14px", color:C.ink, fontFamily:"Georgia, serif", fontSize:15, outline:"none", boxSizing:"border-box" };
  const labelStyle = { fontSize:11, letterSpacing:"0.18em", textTransform:"uppercase", color:C.mid, marginBottom:6, display:"block", fontFamily:"system-ui, sans-serif" };

  // ── LANDING ──
  if (screen === "landing") return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"system-ui, sans-serif", padding:24 }}>
      <div style={{ display:"flex", width:"100%", maxWidth:820, background:C.panel, borderRadius:16, overflow:"hidden", boxShadow:"0 8px 48px rgba(0,0,0,0.09)", border:`1px solid ${C.border}` }}>
        <div style={{ flex:1, background:C.accent, padding:52, display:"flex", flexDirection:"column", justifyContent:"space-between", gap:32 }}>
          <div style={{ fontFamily:"Georgia, serif", fontSize:13, letterSpacing:"0.25em", color:"rgba(255,255,255,0.6)", textTransform:"uppercase" }}>ArtVault</div>
          <div>
            <div style={{ fontFamily:"Georgia, serif", fontSize:46, lineHeight:1.1, color:"#fff", marginBottom:20 }}>Your art<br/>resources,<br/><em>all in one place.</em></div>
            <p style={{ fontSize:14, color:"rgba(255,255,255,0.75)", lineHeight:1.75, marginBottom:28 }}>A private hub for you and your friends to collect, organise, and study art resources from every corner of the internet.</p>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {["References","Palettes","Tutorials","Brushes"].map(tag=><span key={tag} style={{fontSize:11,padding:"5px 12px",background:"rgba(255,255,255,0.18)",borderRadius:100,color:"rgba(255,255,255,0.9)"}}>{tag}</span>)}
            </div>
          </div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>Invite-only · Private</div>
        </div>
        <div style={{ width:360, padding:48, display:"flex", flexDirection:"column", gap:24, boxSizing:"border-box" }}>
          <div style={{ display:"flex", background:C.cream, borderRadius:8, padding:4 }}>
            {[["login","Sign In"],["signup","Request Access"]].map(([id,label])=>(
              <button key={id} onClick={()=>{setTab(id);setPending(false);}} style={{ flex:1,padding:"9px 4px",borderRadius:6,border:"none",cursor:"pointer",background:tab===id?C.panel:"transparent",color:tab===id?C.ink:C.mid,fontWeight:tab===id?600:400,fontSize:12,fontFamily:"system-ui, sans-serif",boxShadow:tab===id?"0 1px 4px rgba(0,0,0,0.08)":"none",transition:"all 0.18s" }}>{label}</button>
            ))}
          </div>
          {tab==="login" && (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div><label style={labelStyle}>Email</label><input type="email" placeholder="you@gmail.com" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={inputStyle}/></div>
              <div><label style={labelStyle}>Password</label><input type="password" placeholder="••••••••" value={loginPass} onChange={e=>setLoginPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={inputStyle}/></div>
              <button onClick={handleLogin} style={{width:"100%",background:C.accent,color:"#fff",border:"none",borderRadius:6,padding:"13px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"system-ui, sans-serif"}}>Sign In →</button> <button onClick={handleLogin} style={{width:"100%",background:"#fff",color:C.ink,border:`1px solid ${C.border}`,borderRadius:6,padding:"13px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"system-ui, sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:12}}>
                <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
                Sign in with Google
              </button>
              <p style={{fontSize:12,color:C.mid,textAlign:"center"}}>No access yet? <span onClick={()=>setTab("signup")} style={{color:C.accent,cursor:"pointer",fontWeight:600}}>Request an invite</span></p>
              <div style={{background:C.cream,borderRadius:8,padding:"10px 14px",fontSize:12,color:C.mid,lineHeight:1.6}}>💡 <strong>Demo:</strong> type "admin" in email for Admin Panel, or any email for the Feed.</div>
            </div>
          )}
          {tab==="signup" && !pending && (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{background:C.accentLight,border:`1px solid ${C.border}`,borderRadius:8,padding:"12px 14px",fontSize:13,color:C.mid,lineHeight:1.6}}>🔒 Private space — the owner reviews all requests before granting access.</div>
              {[["Your Name","text","First Last",signupName,setSignupName],["Email Address","email","you@gmail.com",signupEmail,setSignupEmail],["Why do you want access?","text","I'm a friend of...",signupReason,setSignupReason]].map(([lbl,type,ph,val,set])=>(
                <div key={lbl}><label style={labelStyle}>{lbl}</label><input type={type} placeholder={ph} value={val} onChange={e=>set(e.target.value)} style={inputStyle}/></div>
              ))}
              <onClick={handleSignupRequest} style={{width:"100%",background:C.accent,color:"#fff",border:"none",borderRadius:6,padding:"13px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"system-ui, sans-serif"}}>Send Request</button>
            </div>
          )}
          {tab==="signup" && pending && (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{width:48,height:48,borderRadius:"50%",background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>⏳</div>
              <div style={{fontFamily:"Georgia, serif",fontSize:22,color:C.ink,marginBottom:4}}>Request sent!</div>
              <p style={{fontSize:14,color:C.mid,lineHeight:1.7}}>The admin will review your request and notify you once approved.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── FEED ──
  if (screen === "feed") return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"system-ui, sans-serif"}}>
      <Navbar onAdmin={()=>setScreen("admin")} onSignOut={()=>setScreen("landing")} onAddResource={()=>setShowModal(true)}/>
      <div style={{display:"flex"}}>
        <aside style={{width:220,background:C.panel,borderRight:`1px solid ${C.border}`,minHeight:"calc(100vh - 58px)",padding:"24px 12px",boxSizing:"border-box",flexShrink:0}}>
          <div style={{fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:C.mid,padding:"4px 10px 10px",fontWeight:600}}>Browse</div>
          {categories.map(cat=><SidebarItem key={cat.id} cat={cat} isActive={activeCategory===cat.id} onClick={()=>setActiveCategory(cat.id)}/>)}
          <div style={{height:1,background:C.border,margin:"14px 0"}}/>
          <div style={{fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:C.mid,padding:"4px 10px 10px",fontWeight:600}}>Saved By</div>
          {savedBy.map(cat=><SidebarItem key={cat.id} cat={cat} isActive={activeCategory===cat.id} onClick={()=>setActiveCategory(cat.id)}/>)}
          <div style={{height:1,background:C.border,margin:"14px 0"}}/>
          <div style={{fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:C.mid,padding:"4px 10px 10px",fontWeight:600}}>Popular Tags</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,padding:"0 6px"}}>
            {tags.map(tag=><span key={tag} onClick={()=>setSearch(tag)} style={{fontSize:11,padding:"4px 10px",background:search===tag?C.accentLight:C.cream,color:search===tag?C.accent:C.mid,borderRadius:100,cursor:"pointer",border:`1px solid ${search===tag?C.accent:C.border}`,fontWeight:search===tag?600:400}}>{tag}</span>)}
          </div>
        </aside>
        <main style={{flex:1,padding:"32px 28px"}}>
          <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:20}}>
            <div>
              <div style={{fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:C.mid,marginBottom:4}}>Collection</div>
              <div style={{fontFamily:"Georgia, serif",fontSize:32,color:C.ink,fontWeight:700}}>{currentLabel}</div>
            </div>
            <select value={sort} onChange={e=>setSort(e.target.value)} style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 12px",fontSize:12,color:C.ink,fontFamily:"system-ui, sans-serif",cursor:"pointer",outline:"none"}}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">A → Z</option>
            </select>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 16px",marginBottom:20}}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="#6B6560" strokeWidth="1.5"/><path d="M10 10l3 3" stroke="#6B6560" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by title, tag, or source…" style={{border:"none",outline:"none",width:"100%",fontSize:14,fontFamily:"system-ui, sans-serif",color:C.ink,background:"transparent"}}/>
            {search && <span onClick={()=>setSearch("")} style={{cursor:"pointer",color:C.mid,fontSize:13,fontWeight:600}}>✕</span>}
          </div>
          <div style={{fontSize:12,color:C.mid,marginBottom:20}}>{filtered.length} {filtered.length===1?"resource":"resources"}{search ? ` matching "${search}"` : ""}</div>
          {filtered.length===0 ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 0",gap:12,textAlign:"center"}}>
              <div style={{fontSize:44,opacity:0.4}}>🔍</div>
              <div style={{fontFamily:"Georgia, serif",fontSize:22,color:C.ink}}>Nothing found</div>
              <p style={{fontSize:14,color:C.mid,maxWidth:260}}>Try a different search term or clear the filter.</p>
              <button onClick={()=>{setSearch("");setActiveCategory("all");}} style={{marginTop:8,background:C.accent,color:"#fff",border:"none",borderRadius:6,padding:"9px 20px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"system-ui, sans-serif"}}>Clear filters</button>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:16 }}>
              {filtered.map(r=><ResourceCard key={r.id} r={r} onClick={()=>setDetailResource(r)}/>)}
            </div>
          )}
        </main>
      </div>
      {showModal && <AddModal onClose={()=>setShowModal(false)} onSave={handleAddResource}/>}
      {detailResource && <DetailModal resource={detailResource} onClose={()=>setDetailResource(null)} onDelete={id=>{handleDelete(id);setDetailResource(null);}} onUpdateThumbnail={handleUpdateThumbnail}/>}
      <Toast message={toast}/>
    </div>
  );

  // ── ADMIN ──
  if (screen === "admin") {
    const pendingCount  = requests.filter(r=>r.status==="pending").length;
    const approvedCount = requests.filter(r=>r.status==="approved").length;

    return (
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:"system-ui, sans-serif"}}>
        <Navbar onAdmin={()=>{}} onSignOut={()=>setScreen("landing")} onAddResource={()=>{}} showAdd={false}/>
        <div style={{maxWidth:720,margin:"0 auto",padding:"44px 32px"}}>
          <button onClick={()=>setScreen("feed")} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",fontSize:13,color:C.mid,fontFamily:"system-ui, sans-serif",marginBottom:32,padding:0}}>← Back to Feed</button>
          <div style={{marginBottom:32}}>
            <div style={{fontSize:11,letterSpacing:"0.18em",textTransform:"uppercase",color:C.accent,fontWeight:600,marginBottom:8}}>Admin Panel</div>
            <div style={{fontFamily:"Georgia, serif",fontSize:36,color:C.ink,fontWeight:700,marginBottom:8}}>Manage Vault</div>
          </div>

          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:36}}>
            {[[pendingCount,"Pending","⏳","#FEF3C7","#D97706"],[approvedCount,"Approved","✓",C.greenLight,C.green],[members.length,"Members","👥",C.accentLight,C.accent]].map(([n,label,icon,bg,col])=>(
              <div key={label} style={{background:bg,borderRadius:10,padding:"18px 20px",border:`1px solid ${C.border}`}}>
                <div style={{fontSize:13,marginBottom:4}}>{icon}</div>
                <div style={{fontFamily:"Georgia, serif",fontSize:34,color:col,fontWeight:700,lineHeight:1}}>{n}</div>
                <div style={{fontSize:11,letterSpacing:"0.12em",textTransform:"uppercase",color:col,opacity:0.8,marginTop:4,fontWeight:600}}>{label}</div>
              </div>
            ))}
          </div>

          {/* Admin tabs */}
          <div style={{display:"flex",background:C.cream,borderRadius:8,padding:4,marginBottom:28,width:"fit-content"}}>
            {[["requests","Access Requests"],["members","Members"]].map(([id,label])=>(
              <button key={id} onClick={()=>setAdminTab(id)} style={{padding:"8px 20px",borderRadius:6,border:"none",cursor:"pointer",background:adminTab===id?C.panel:"transparent",color:adminTab===id?C.ink:C.mid,fontWeight:adminTab===id?600:400,fontSize:13,fontFamily:"system-ui, sans-serif",boxShadow:adminTab===id?"0 1px 4px rgba(0,0,0,0.08)":"none",transition:"all 0.18s"}}>{label}</button>
            ))}
          </div>

          {/* Requests tab */}
          {adminTab === "requests" && (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:11,letterSpacing:"0.18em",textTransform:"uppercase",color:C.mid,fontWeight:600,marginBottom:6}}>Signup Requests</div>
              {requests.map(req=>(
                <div key={req.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 20px",background:C.panel,border:`1px solid ${req.status==="approved"?"#86EFAC":req.status==="denied"?"#FCA5A5":C.border}`,borderRadius:10,opacity:req.status==="denied"?0.55:1,transition:"all 0.2s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:14}}>
                    <div style={{width:40,height:40,borderRadius:"50%",background:req.status==="approved"?C.greenLight:req.status==="denied"?"#FEE2E2":C.cream,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                      {req.status==="approved"?"✓":req.status==="denied"?"✕":"👤"}
                    </div>
                    <div>
                      <div style={{fontSize:15,fontWeight:600,color:C.ink,marginBottom:3}}>{req.name}</div>
                      <div style={{fontSize:12,color:C.mid}}>{req.email}</div>
                      {req.reason && <div style={{fontSize:12,color:C.mid,marginTop:3,fontStyle:"italic"}}>"{req.reason}"</div>}
                      <div style={{fontSize:11,color:C.mid,opacity:0.6,marginTop:2}}>Requested {req.date}</div>
                    </div>
                  </div>
                  <div style={{flexShrink:0,marginLeft:16}}>
                    {req.status==="pending" && (
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>handleApprove(req.id)} style={{padding:"9px 18px",background:C.green,color:"#fff",border:"none",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"system-ui, sans-serif"}}>✓ Approve</button>
                        <button onClick={()=>handleDeny(req.id)} style={{padding:"9px 18px",background:"#fff",color:C.mid,border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,cursor:"pointer",fontFamily:"system-ui, sans-serif"}}>Deny</button>
                      </div>
                    )}
                    {req.status==="approved" && <span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,fontWeight:600,color:C.green,background:C.greenLight,padding:"6px 14px",borderRadius:100}}>✓ Approved</span>}
                    {req.status==="denied" && <span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,fontWeight:600,color:"#DC2626",background:"#FEE2E2",padding:"6px 14px",borderRadius:100}}>✕ Denied</span>}
                  </div>
                </div>
              ))}
              {requests.every(r=>r.status!=="pending") && <div style={{textAlign:"center",padding:"24px 0",color:C.mid,fontSize:14}}>🎉 All requests have been reviewed!</div>}
            </div>
          )}

          {/* Members tab */}
          {adminTab === "members" && (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:11,letterSpacing:"0.18em",textTransform:"uppercase",color:C.mid,fontWeight:600,marginBottom:6}}>Current Members</div>
              {members.map((m,i)=>(
                <div key={m.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",background:C.panel,border:`1px solid ${C.border}`,borderRadius:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:14}}>
                    <div style={{width:40,height:40,borderRadius:"50%",background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:C.accent,flexShrink:0}}>
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{fontSize:15,fontWeight:600,color:C.ink,marginBottom:3}}>{m.name} {i===0 && <span style={{fontSize:10,background:C.accentLight,color:C.accent,padding:"2px 8px",borderRadius:100,fontWeight:600,marginLeft:6}}>Admin</span>}</div>
                      <div style={{fontSize:12,color:C.mid}}>{m.email}</div>
                      <div style={{fontSize:11,color:C.mid,opacity:0.6,marginTop:2}}>Joined {m.joined}</div>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:20,fontWeight:700,color:C.ink,fontFamily:"Georgia, serif"}}>{m.saves}</div>
                    <div style={{fontSize:11,color:C.mid}}>saves</div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
        <Toast message={toast}/>
      </div>
    );
  }
}
