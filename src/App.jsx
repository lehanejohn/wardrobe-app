import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Data ────────────────────────────────────────────────────────────────────

const FAMILY_MEMBERS = ["Mum", "Dad", "Ella", "Jake"];

const CLOTHING_TYPES = [
  "T-Shirt","Jumper","Shirt","Dress","Skirt","Trousers","Jeans",
  "Shorts","Jacket","Coat","Shoes","Boots","Trainers","Pyjamas",
  "Swimwear","Underwear","Socks","Other"
];

const SIZES = [
  "Age 0-3m","Age 3-6m","Age 6-12m","Age 12-18m","Age 18-24m",
  "Age 2-3","Age 3-4","Age 4-5","Age 5-6","Age 6-7","Age 7-8",
  "Age 8-9","Age 9-10","Age 10-11","Age 11-12",
  "XS","S","M","L","XL","XXL",
  "6","8","10","12","14","16","18","Other"
];

const DECISIONS = [
  { value:"keep",      label:"Keep",           emoji:"✅", color:"#2d6a4f", bg:"#d8f3dc" },
  { value:"seasonal",  label:"Store Away",      emoji:"📦", color:"#6a4c93", bg:"#e9e0f7" },
  { value:"donate",    label:"Donate",          emoji:"🤝", color:"#e07c24", bg:"#fde8d0" },
  { value:"charity",   label:"Charity Shop",    emoji:"💛", color:"#b5861c", bg:"#fdf3d0" },
  { value:"vinted",    label:"Sell on Vinted",  emoji:"💰", color:"#1a6b3c", bg:"#d0f0e0" },
  { value:"undecided", label:"Undecided",        emoji:"🤔", color:"#666",    bg:"#efefef" },
];

const MEMBER_STYLE = {
  Mum:  { bg:"#fce8f3", color:"#9c3e6e" },
  Dad:  { bg:"#e8eeff", color:"#3e5a9c" },
  Ella: { bg:"#fff0e8", color:"#9c5e3e" },
  Jake: { bg:"#eafce8", color:"#3e7c3e" },
};

const TYPE_EMOJI = {
  "T-Shirt":"👕","Jumper":"🧥","Shirt":"👔","Dress":"👗","Skirt":"👗",
  "Trousers":"👖","Jeans":"👖","Shorts":"🩳","Jacket":"🧥","Coat":"🧥",
  "Shoes":"👟","Boots":"👢","Trainers":"👟","Pyjamas":"😴",
  "Swimwear":"🩱","Underwear":"🩲","Socks":"🧦","Other":"👕"
};

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function fetchItems() {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("Fetch error:", error); return []; }
  return data.map(row => ({
    id:       row.id,
    member:   row.member,
    type:     row.type,
    colour:   row.colour,
    make:     row.make,
    size:     row.size,
    decision: row.decision,
    note:     row.note,
    imageUrl: row.image_url,
  }));
}

async function insertItem(item) {
  const { data, error } = await supabase
    .from("items")
    .insert([{
      member:    item.member,
      type:      item.type,
      colour:    item.colour,
      make:      item.make,
      size:      item.size,
      decision:  item.decision,
      note:      item.note,
      image_url: item.imageUrl?.startsWith("blob:") ? null : item.imageUrl,
    }])
    .select()
    .single();
  if (error) { console.error("Insert error:", error); return null; }
  return { ...item, id: data.id };
}

async function updateItem(item) {
  const { error } = await supabase
    .from("items")
    .update({
      member:    item.member,
      type:      item.type,
      colour:    item.colour,
      make:      item.make,
      size:      item.size,
      decision:  item.decision,
      note:      item.note,
      image_url: item.imageUrl?.startsWith("blob:") ? null : item.imageUrl,
    })
    .eq("id", item.id);
  if (error) console.error("Update error:", error);
}

async function deleteItem(id) {
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) console.error("Delete error:", error);
}

// ─── Shared components ────────────────────────────────────────────────────────

function MemberPill({ member, active, onClick }) {
  const s = MEMBER_STYLE[member] || { bg:"#eee", color:"#555" };
  return (
    <button onClick={onClick} style={{
      border:"none", borderRadius:99, padding:"8px 16px",
      background: active ? s.color : s.bg,
      color: active ? "#fff" : s.color,
      fontFamily:"inherit", fontSize:14, fontWeight:600, cursor:"pointer",
      whiteSpace:"nowrap", transition:"all 0.15s", flexShrink:0
    }}>{member}</button>
  );
}

function DecisionPill({ value }) {
  const d = DECISIONS.find(x => x.value === value) || DECISIONS[5];
  return (
    <span style={{
      background:d.bg, color:d.color, borderRadius:99, padding:"4px 10px",
      fontSize:11, fontWeight:700, fontFamily:"inherit", whiteSpace:"nowrap"
    }}>{d.emoji} {d.label}</span>
  );
}

function Label({ children }) {
  return (
    <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#a09080", marginBottom:6 }}>
      {children}
    </div>
  );
}

const inputStyle = {
  width:"100%", border:"1.5px solid #e5ddd0", borderRadius:12,
  padding:"12px 14px", fontSize:15, color:"#2a1a0a",
  background:"#faf6ef", fontFamily:"inherit", boxSizing:"border-box",
  WebkitAppearance:"none", appearance:"none", outline:"none"
};

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────

function Sheet({ onClose, children, title }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:200 }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(20,10,0,0.5)", backdropFilter:"blur(3px)" }} />
      <div style={{
        position:"absolute", bottom:0, left:0, right:0,
        background:"#fffdf8", borderRadius:"24px 24px 0 0",
        maxHeight:"92vh", overflowY:"auto",
        boxShadow:"0 -8px 40px rgba(0,0,0,0.18)"
      }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 4px" }}>
          <div style={{ width:40, height:4, borderRadius:99, background:"#ddd" }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 20px 16px" }}>
          <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:22, fontWeight:700, color:"#2a1a0a" }}>{title}</div>
          <button onClick={onClose} style={{ background:"#f0e8dc", border:"none", borderRadius:"50%", width:36, height:36, fontSize:20, color:"#a09080", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
        <div style={{ padding:"0 20px 40px" }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Tag form ─────────────────────────────────────────────────────────────────

function TagForm({ tags, setTags, imageUrl, loading, onSave, saveLabel, saving, extraTop }) {
  const canSave = tags.type.length > 0 && !saving;
  return (
    <div>
      {extraTop}

      {imageUrl && (
        <div style={{ borderRadius:16, overflow:"hidden", marginBottom:20, height:200, position:"relative" }}>
          <img src={imageUrl} alt="Upload" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          {loading && (
            <div style={{ position:"absolute", inset:0, background:"rgba(255,253,248,0.88)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 }}>
              <div style={{ width:36, height:36, border:"3px solid #e0d0b8", borderTopColor:"#8a6840", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
              <div style={{ fontSize:14, color:"#8a6840", fontStyle:"italic" }}>Analysing with AI…</div>
            </div>
          )}
        </div>
      )}
      {!imageUrl && (
        <div style={{ background:"#f4ede0", borderRadius:16, height:90, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20, fontSize:48 }}>
          {TYPE_EMOJI[tags.type] || "👕"}
        </div>
      )}

      <div style={{ marginBottom:18 }}>
        <Label>Belongs to</Label>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {FAMILY_MEMBERS.map(m => (
            <MemberPill key={m} member={m} active={tags.member===m} onClick={() => setTags(t=>({...t,member:m}))} />
          ))}
        </div>
      </div>

      <div style={{ marginBottom:18 }}>
        <Label>Type of clothing</Label>
        <select value={tags.type} onChange={e => setTags(t=>({...t,type:e.target.value}))} style={inputStyle}>
          <option value="">Select…</option>
          {CLOTHING_TYPES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:18 }}>
        <div>
          <Label>Colour</Label>
          <input value={tags.colour} onChange={e => setTags(t=>({...t,colour:e.target.value}))} placeholder="e.g. Navy" style={inputStyle} />
        </div>
        <div>
          <Label>Brand</Label>
          <input value={tags.make} onChange={e => setTags(t=>({...t,make:e.target.value}))} placeholder="e.g. Zara" style={inputStyle} />
        </div>
      </div>

      <div style={{ marginBottom:18 }}>
        <Label>Size</Label>
        <select value={tags.size} onChange={e => setTags(t=>({...t,size:e.target.value}))} style={inputStyle}>
          <option value="">Select…</option>
          {SIZES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ marginBottom:18 }}>
        <Label>Decision</Label>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {DECISIONS.map(d => (
            <button key={d.value} onClick={() => setTags(t=>({...t,decision:d.value}))} style={{
              border: tags.decision===d.value ? `2px solid ${d.color}` : "2px solid transparent",
              borderRadius:12, padding:"10px 8px",
              background: tags.decision===d.value ? d.bg : "#f4ede0",
              color: tags.decision===d.value ? d.color : "#888",
              fontFamily:"inherit", fontSize:13, fontWeight:600,
              cursor:"pointer", textAlign:"left", transition:"all 0.15s"
            }}>{d.emoji} {d.label}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom:24 }}>
        <Label>Note (optional)</Label>
        <input value={tags.note} onChange={e => setTags(t=>({...t,note:e.target.value}))} placeholder="Any extra details…" style={inputStyle} />
      </div>

      <button onClick={onSave} disabled={!canSave} style={{
        width:"100%", border:"none", borderRadius:16, padding:"16px 0",
        fontSize:16, fontWeight:700, fontFamily:"inherit",
        cursor: canSave ? "pointer" : "not-allowed",
        background: canSave ? "#2a1a0a" : "#d4c9b0",
        color: canSave ? "#fffdf8" : "#a09080",
        transition:"background 0.2s"
      }}>
        {saving ? "Saving…" : saveLabel}
      </button>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Add Sheet ────────────────────────────────────────────────────────────────

function AddSheet({ onClose, onSave }) {
  const [step, setStep]         = useState("pick");
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [tags, setTags]         = useState({ member:"Mum", type:"", colour:"", make:"", size:"", decision:"undecided", note:"" });

  const processFile = (file) => {
    if (!file) return;
    setImageUrl(URL.createObjectURL(file));
    setStep("tagging");
    const reader = new FileReader();
    reader.onload = async (e) => {
      const b64 = e.target.result.split(",")[1];
      setLoading(true);
      try {
        const res = await fetch("/api/analyse", {
          method:"POST", headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({
            model:"claude-sonnet-4-5", max_tokens:300,
            messages:[{ role:"user", content:[
              { type:"image", source:{ type:"base64", media_type:"image/jpeg", data:b64 } },
              { type:"text",  text:`Analyse this clothing photo. Return ONLY a JSON object with: type (one of: ${CLOTHING_TYPES.join(", ")}), colour (simple colour name), make (brand if visible else empty string), suggestedSize (if readable else empty string). No markdown, no explanation, just JSON.` }
            ]}]
          })
        });
        const data = await res.json();
        const text = data.content?.map(b=>b.text||"").join("") || "";
        const parsed = JSON.parse(text.replace(/```json|```/g,"").trim());
        setTags(t => ({ ...t, type:parsed.type||"", colour:parsed.colour||"", make:parsed.make||"", size:parsed.suggestedSize||"" }));
      } catch (_) {}
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    const saved = await insertItem({ imageUrl, ...tags });
    if (saved) onSave(saved);
    setSaving(false);
    onClose();
  };

  return (
    <Sheet onClose={onClose} title={step==="pick" ? "Add Clothing" : "Tag This Item"}>
      {step === "pick" && (
        <div>
          <p style={{ color:"#a09080", fontSize:14, marginTop:0, marginBottom:24 }}>How would you like to add a photo?</p>

          <label style={{ display:"flex", alignItems:"center", gap:16, background:"#2a1a0a", color:"#fffdf8", borderRadius:16, padding:"18px 20px", marginBottom:12, cursor:"pointer", position:"relative", overflow:"hidden" }}>
            <span style={{ fontSize:28 }}>📷</span>
            <div>
              <div style={{ fontWeight:700, fontSize:16 }}>Take a Photo</div>
              <div style={{ fontSize:13, opacity:0.6, marginTop:2 }}>Open your camera now</div>
            </div>
            <input type="file" accept="image/*" capture="environment" onChange={e=>processFile(e.target.files[0])}
              style={{ position:"absolute", inset:0, opacity:0, width:"100%", height:"100%", cursor:"pointer" }} />
          </label>

          <label style={{ display:"flex", alignItems:"center", gap:16, background:"#f0e8dc", color:"#2a1a0a", borderRadius:16, padding:"18px 20px", cursor:"pointer", position:"relative", overflow:"hidden" }}>
            <span style={{ fontSize:28 }}>🖼️</span>
            <div>
              <div style={{ fontWeight:700, fontSize:16 }}>Choose from Library</div>
              <div style={{ fontSize:13, color:"#a09080", marginTop:2 }}>Pick an existing photo</div>
            </div>
            <input type="file" accept="image/*" onChange={e=>processFile(e.target.files[0])}
              style={{ position:"absolute", inset:0, opacity:0, width:"100%", height:"100%", cursor:"pointer" }} />
          </label>
        </div>
      )}

      {step === "tagging" && (
        <TagForm
          tags={tags} setTags={setTags}
          imageUrl={imageUrl} loading={loading} saving={saving}
          saveLabel="Save to Wardrobe"
          onSave={handleSave}
        />
      )}
    </Sheet>
  );
}

// ─── Edit Sheet ───────────────────────────────────────────────────────────────

function EditSheet({ item, onClose, onUpdate, onDelete }) {
  const [tags, setTags]     = useState({ ...item });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const updated = { ...item, ...tags };
    await updateItem(updated);
    onUpdate(updated);
    setSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    await deleteItem(item.id);
    onDelete(item.id);
    onClose();
  };

  return (
    <Sheet onClose={onClose} title="Edit Item">
      <TagForm
        tags={tags} setTags={setTags}
        imageUrl={item.imageUrl} loading={false} saving={saving}
        saveLabel="Save Changes"
        onSave={handleSave}
        extraTop={
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
            <button onClick={handleDelete} style={{
              border:"none", borderRadius:10, padding:"8px 16px",
              background:"#fce8e8", color:"#c04040",
              fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer"
            }}>🗑 Delete</button>
          </div>
        }
      />
    </Sheet>
  );
}

// ─── Item Card ────────────────────────────────────────────────────────────────

function ItemCard({ item, onClick }) {
  const ms = MEMBER_STYLE[item.member] || { bg:"#eee", color:"#555" };
  return (
    <div onClick={onClick} style={{
      background:"#fffdf8", borderRadius:18, overflow:"hidden",
      boxShadow:"0 2px 10px rgba(0,0,0,0.07)", border:"1.5px solid #f0e8dc", cursor:"pointer"
    }}>
      <div style={{ height:150, background:"#f4ede0", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
        {item.imageUrl
          ? <img src={item.imageUrl} alt={item.type} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          : <span style={{ fontSize:44 }}>{TYPE_EMOJI[item.type]||"👕"}</span>
        }
        <div style={{ position:"absolute", bottom:8, left:8 }}>
          <DecisionPill value={item.decision} />
        </div>
      </div>
      <div style={{ padding:"12px 14px 14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
          <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:16, fontWeight:700, color:"#2a1a0a" }}>{item.type}</div>
          <span style={{ background:ms.bg, color:ms.color, borderRadius:99, padding:"3px 10px", fontSize:11, fontWeight:700 }}>{item.member}</span>
        </div>
        <div style={{ fontSize:13, color:"#a09080", lineHeight:1.4 }}>
          {[item.colour, item.make, item.size].filter(Boolean).join(" · ")}
        </div>
        {item.note ? <div style={{ fontSize:12, color:"#c0a878", marginTop:4, fontStyle:"italic" }}>{item.note}</div> : null}
      </div>
    </div>
  );
}

// ─── Search bar ───────────────────────────────────────────────────────────────

function SearchBar({ value, onChange }) {
  return (
    <div style={{ padding:"12px 16px 0", position:"relative" }}>
      <span style={{ position:"absolute", left:28, top:"50%", transform:"translateY(-10%)", fontSize:16, color:"#b0a090", pointerEvents:"none" }}>🔍</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search by type, colour, brand, size…"
        style={{ ...inputStyle, paddingLeft:40, fontSize:14, background:"#fffdf8", border:"1.5px solid #e5ddd0", borderRadius:14 }}
      />
      {value && (
        <button onClick={() => onChange("")} style={{
          position:"absolute", right:28, top:"50%", transform:"translateY(-50%)",
          background:"none", border:"none", fontSize:18, color:"#b0a090", cursor:"pointer", padding:0, lineHeight:1
        }}>×</button>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [items, setItems]            = useState([]);
  const [ready, setReady]            = useState(false);
  const [showAdd, setShowAdd]        = useState(false);
  const [editItem, setEditItem]      = useState(null);
  const [filterMember, setFilter]    = useState("All");
  const [filterDecision, setFilterD] = useState("All");
  const [search, setSearch]          = useState("");

  useEffect(() => {
    fetchItems().then(loaded => { setItems(loaded); setReady(true); });
  }, []);

  const handleAdd    = item    => setItems(prev => [item, ...prev]);
  const handleUpdate = updated => setItems(prev => prev.map(i => i.id===updated.id ? updated : i));
  const handleDelete = id      => setItems(prev => prev.filter(i => i.id!==id));

  const matchesSearch = (item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [item.type, item.colour, item.make, item.size, item.note, item.member]
      .some(f => f?.toLowerCase().includes(q));
  };

  const filtered = items.filter(i => {
    if (filterMember !== "All" && i.member !== filterMember) return false;
    if (filterDecision !== "All" && i.decision !== filterDecision) return false;
    if (!matchesSearch(i)) return false;
    return true;
  });

  const stats = {
    total:     items.length,
    keep:      items.filter(i => i.decision==="keep").length,
    undecided: items.filter(i => i.decision==="undecided").length,
  };

  if (!ready) return (
    <div style={{ minHeight:"100vh", background:"#faf5ec", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ textAlign:"center", color:"#a09080" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>👗</div>
        <div style={{ fontSize:15 }}>Loading your wardrobe…</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#faf5ec", fontFamily:"'DM Sans','Helvetica Neue',sans-serif", paddingBottom:110 }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background:"#2a1a0a", padding:"16px 20px 14px", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:26, color:"#fffdf8", fontWeight:800, letterSpacing:"-0.02em" }}>
          Wardrobe <span style={{ fontSize:14, fontWeight:400, color:"#8a7860", letterSpacing:"0.1em", textTransform:"uppercase" }}>Family</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, padding:"16px 16px 0" }}>
        {[
          { label:"Total",     value:stats.total,     color:"#2a1a0a" },
          { label:"Keeping",   value:stats.keep,      color:"#2d6a4f" },
          { label:"Undecided", value:stats.undecided, color:"#b5861c" },
        ].map(s => (
          <div key={s.label} style={{ background:"#fffdf8", borderRadius:16, padding:"14px 16px", border:"1.5px solid #f0e8dc" }}>
            <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:30, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:11, color:"#a09080", marginTop:4, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <SearchBar value={search} onChange={setSearch} />

      {/* Member filter */}
      <div style={{ display:"flex", gap:8, padding:"12px 16px 0", overflowX:"auto", scrollbarWidth:"none" }}>
        {["All", ...FAMILY_MEMBERS].map(m => {
          const ms = MEMBER_STYLE[m] || { bg:"#f0e8dc", color:"#2a1a0a" };
          const active = filterMember === m;
          return (
            <button key={m} onClick={() => setFilter(m)} style={{
              border:"none", borderRadius:99, padding:"9px 18px",
              background: active ? (m==="All" ? "#2a1a0a" : ms.color) : (m==="All" ? "#f0e8dc" : ms.bg),
              color: active ? "#fff" : (m==="All" ? "#2a1a0a" : ms.color),
              fontFamily:"inherit", fontSize:14, fontWeight:600,
              cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, transition:"all 0.15s"
            }}>{m}</button>
          );
        })}
      </div>

      {/* Decision filter */}
      <div style={{ display:"flex", gap:8, padding:"10px 16px 14px", overflowX:"auto", scrollbarWidth:"none" }}>
        {[{ value:"All", label:"All items", emoji:"👗" }, ...DECISIONS].map(d => {
          const active = filterDecision === d.value;
          return (
            <button key={d.value} onClick={() => setFilterD(d.value)} style={{
              border: active ? `2px solid ${d.color||"#2a1a0a"}` : "2px solid transparent",
              borderRadius:99, padding:"7px 14px",
              background: active ? (d.bg||"#2a1a0a") : "#f0e8dc",
              color: active ? (d.color||"#fffdf8") : "#888",
              fontFamily:"inherit", fontSize:12, fontWeight:600,
              cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, transition:"all 0.15s"
            }}>{d.emoji} {d.label}</button>
          );
        })}
      </div>

      {/* Count */}
      <div style={{ padding:"0 16px 12px", fontSize:13, color:"#a09080", fontWeight:500 }}>
        {search || filterMember !== "All" || filterDecision !== "All"
          ? `${filtered.length} of ${items.length} item${items.length!==1?"s":""}`
          : `${items.length} item${items.length!==1?"s":""}`
        }
      </div>

      {/* Grid */}
      <div style={{ padding:"0 16px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"60px 20px", color:"#c0a878" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>{search ? "🔍" : "👗"}</div>
            <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:20, color:"#8a6840", marginBottom:6 }}>
              {search ? "No results found" : "Nothing here yet"}
            </div>
            <div style={{ fontSize:14 }}>
              {search ? `No items match "${search}"` : "Tap the button below to add your first item"}
            </div>
            {search && (
              <button onClick={() => setSearch("")} style={{ marginTop:16, background:"#f0e8dc", border:"none", borderRadius:10, padding:"10px 20px", fontSize:14, color:"#2a1a0a", fontFamily:"inherit", fontWeight:600, cursor:"pointer" }}>
                Clear search
              </button>
            )}
          </div>
        ) : filtered.map(item => (
          <ItemCard key={item.id} item={item} onClick={() => setEditItem(item)} />
        ))}
      </div>

      {/* Floating Add Button */}
      <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)", zIndex:100 }}>
        <button onClick={() => setShowAdd(true)} style={{
          background:"#2a1a0a", color:"#fffdf8", border:"none",
          borderRadius:99, padding:"16px 32px", fontSize:16, fontWeight:700,
          fontFamily:"inherit", boxShadow:"0 8px 30px rgba(42,26,10,0.35)",
          cursor:"pointer", display:"flex", alignItems:"center", gap:10, whiteSpace:"nowrap"
        }}>
          <span style={{ fontSize:20 }}>+</span> Add Item
        </button>
      </div>

      {/* Sheets */}
      {showAdd && <AddSheet onClose={() => setShowAdd(false)} onSave={handleAdd} />}
      {editItem && (
        <EditSheet item={editItem} onClose={() => setEditItem(null)} onUpdate={handleUpdate} onDelete={handleDelete} />
      )}
    </div>
  );
}
