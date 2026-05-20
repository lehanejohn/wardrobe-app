import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Theme ────────────────────────────────────────────────────────────────────

const T = {
  bg:           "#f0f7ff",
  card:         "#ffffff",
  header:       "#0c3a5e",
  headerText:   "#e8f4ff",
  headerSub:    "#6aa3cc",
  primary:      "#0c3a5e",
  accent:       "#2196c4",
  accentLight:  "#e1f3fc",
  border:       "#cde4f5",
  inputBg:      "#f5fbff",
  inputBorder:  "#b8d9f0",
  textPrimary:  "#0c2a40",
  textSecondary:"#5a8aaa",
  textMuted:    "#8ab0c8",
  pillBg:       "#e1f0fa",
  statBorder:   "#cde4f5",
  shadow:       "rgba(12,58,94,0.12)",
  btnShadow:    "rgba(12,58,94,0.3)",
};

// ─── Member colours (ocean palette) ──────────────────────────────────────────

const MEMBER_COLOURS = [
  { bg:"#e0f0ff", color:"#1a5a8c" },
  { bg:"#e0f5f0", color:"#1a7a60" },
  { bg:"#f0e8ff", color:"#5a3a8c" },
  { bg:"#fff0e8", color:"#8c4a1a" },
  { bg:"#ffe8f0", color:"#8c1a4a" },
  { bg:"#f0ffe8", color:"#3a7a1a" },
  { bg:"#fff8e0", color:"#8c6a1a" },
  { bg:"#e8f0ff", color:"#1a3a8c" },
];

function getMemberStyle(name, memberList) {
  const idx = memberList.indexOf(name);
  return MEMBER_COLOURS[idx % MEMBER_COLOURS.length] || MEMBER_COLOURS[0];
}

// ─── Data ────────────────────────────────────────────────────────────────────

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
  { value:"keep",      label:"Keep",           emoji:"✅", color:"#1a6b4a", bg:"#d4f4e4" },
  { value:"seasonal",  label:"Store Away",      emoji:"📦", color:"#4a3a8c", bg:"#e4dff7" },
  { value:"donate",    label:"Donate",          emoji:"🤝", color:"#c45a10", bg:"#fde8d4" },
  { value:"charity",   label:"Charity Shop",    emoji:"💛", color:"#8c6a10", bg:"#fdf3d0" },
  { value:"vinted",    label:"Sell on Vinted",  emoji:"💰", color:"#0c6b3a", bg:"#d0f0e4" },
  { value:"undecided", label:"Undecided",        emoji:"🤔", color:"#5a7a8c", bg:"#e4eef5" },
];

const TYPE_EMOJI = {
  "T-Shirt":"👕","Jumper":"🧥","Shirt":"👔","Dress":"👗","Skirt":"👗",
  "Trousers":"👖","Jeans":"👖","Shorts":"🩳","Jacket":"🧥","Coat":"🧥",
  "Shoes":"👟","Boots":"👢","Trainers":"👟","Pyjamas":"😴",
  "Swimwear":"🩱","Underwear":"🩲","Socks":"🧦","Other":"👕"
};

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function fetchMembers() {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) { console.error("Members fetch error:", error); return ["Mum","Dad","Ella","Jake"]; }
  return data.map(r => r.name);
}

async function addMember(name) {
  const { error } = await supabase.from("members").insert([{ name }]);
  if (error) console.error("Add member error:", error);
}

async function removeMember(name) {
  const { error } = await supabase.from("members").delete().eq("name", name);
  if (error) console.error("Remove member error:", error);
}

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

async function uploadImage(file) {
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from("clothing-images")
    .upload(filename, file, { contentType: file.type });
  if (error) { console.error("Upload error:", error); return null; }
  const { data: urlData } = supabase.storage
    .from("clothing-images")
    .getPublicUrl(filename);
  return urlData.publicUrl;
}

async function insertItem(item, imageFile) {
  let imageUrl = null;
  if (imageFile) imageUrl = await uploadImage(imageFile);
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
      image_url: imageUrl,
    }])
    .select()
    .single();
  if (error) { console.error("Insert error:", error); return null; }
  return { ...item, id: data.id, imageUrl };
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

function MemberPill({ member, active, onClick, memberList }) {
  const s = getMemberStyle(member, memberList);
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
    <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:T.textMuted, marginBottom:6 }}>
      {children}
    </div>
  );
}

const inputStyle = {
  width:"100%", border:`1.5px solid ${T.inputBorder}`, borderRadius:12,
  padding:"12px 14px", fontSize:15, color:T.textPrimary,
  background:T.inputBg, fontFamily:"inherit", boxSizing:"border-box",
  WebkitAppearance:"none", appearance:"none", outline:"none"
};

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────

function Sheet({ onClose, children, title }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:200 }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(8,30,50,0.55)", backdropFilter:"blur(3px)" }} />
      <div style={{
        position:"absolute", bottom:0, left:0, right:0,
        background:T.card, borderRadius:"24px 24px 0 0",
        maxHeight:"92vh", overflowY:"auto",
        boxShadow:`0 -8px 40px ${T.shadow}`
      }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 4px" }}>
          <div style={{ width:40, height:4, borderRadius:99, background:T.border }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 20px 16px" }}>
          <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:22, fontWeight:700, color:T.textPrimary }}>{title}</div>
          <button onClick={onClose} style={{ background:T.accentLight, border:"none", borderRadius:"50%", width:36, height:36, fontSize:20, color:T.textSecondary, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
        <div style={{ padding:"0 20px 40px" }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Tag form ─────────────────────────────────────────────────────────────────

function TagForm({ tags, setTags, imageUrl, loading, onSave, saveLabel, saving, extraTop, memberList }) {
  const canSave = tags.type.length > 0 && !saving;
  return (
    <div>
      {extraTop}

      {imageUrl && (
        <div style={{ borderRadius:16, overflow:"hidden", marginBottom:20, height:200, position:"relative", background:T.pillBg }}>
          <img src={imageUrl} alt="Upload" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
          {loading && (
            <div style={{ position:"absolute", inset:0, background:"rgba(240,247,255,0.9)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 }}>
              <div style={{ width:36, height:36, border:`3px solid ${T.border}`, borderTopColor:T.accent, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
              <div style={{ fontSize:14, color:T.accent, fontStyle:"italic" }}>Analysing with AI…</div>
            </div>
          )}
        </div>
      )}
      {!imageUrl && (
        <div style={{ background:T.accentLight, borderRadius:16, height:90, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20, fontSize:48 }}>
          {TYPE_EMOJI[tags.type] || "👕"}
        </div>
      )}

      <div style={{ marginBottom:18 }}>
        <Label>Belongs to</Label>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {memberList.map(m => (
            <MemberPill key={m} member={m} active={tags.member===m} onClick={() => setTags(t=>({...t,member:m}))} memberList={memberList} />
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
              border: tags.decision===d.value ? `2px solid ${d.color}` : `2px solid transparent`,
              borderRadius:12, padding:"10px 8px",
              background: tags.decision===d.value ? d.bg : T.accentLight,
              color: tags.decision===d.value ? d.color : T.textSecondary,
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
        background: canSave ? T.primary : T.border,
        color: canSave ? "#fff" : T.textMuted,
        transition:"background 0.2s"
      }}>
        {saving ? "Saving…" : saveLabel}
      </button>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Add Sheet ────────────────────────────────────────────────────────────────

function AddSheet({ onClose, onSave, memberList }) {
  const [step, setStep]           = useState("pick");
  const [imageUrl, setImageUrl]   = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [tags, setTags]           = useState({ member: memberList[0] || "Mum", type:"", colour:"", make:"", size:"", decision:"undecided", note:"" });

  const processFile = (file) => {
    if (!file) return;
    setImageFile(file);
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
    const saved = await insertItem({ imageUrl, ...tags }, imageFile);
    if (saved) onSave(saved);
    setSaving(false);
    onClose();
  };

  return (
    <Sheet onClose={onClose} title={step==="pick" ? "Add Clothing" : "Tag This Item"}>
      {step === "pick" && (
        <div>
          <p style={{ color:T.textSecondary, fontSize:14, marginTop:0, marginBottom:24 }}>How would you like to add a photo?</p>

          <label style={{ display:"flex", alignItems:"center", gap:16, background:T.primary, color:"#fff", borderRadius:16, padding:"18px 20px", marginBottom:12, cursor:"pointer", position:"relative", overflow:"hidden" }}>
            <span style={{ fontSize:28 }}>📷</span>
            <div>
              <div style={{ fontWeight:700, fontSize:16 }}>Take a Photo</div>
              <div style={{ fontSize:13, opacity:0.6, marginTop:2 }}>Open your camera now</div>
            </div>
            <input type="file" accept="image/*" capture="environment" onChange={e=>processFile(e.target.files[0])}
              style={{ position:"absolute", inset:0, opacity:0, width:"100%", height:"100%", cursor:"pointer" }} />
          </label>

          <label style={{ display:"flex", alignItems:"center", gap:16, background:T.accentLight, color:T.primary, borderRadius:16, padding:"18px 20px", cursor:"pointer", position:"relative", overflow:"hidden" }}>
            <span style={{ fontSize:28 }}>🖼️</span>
            <div>
              <div style={{ fontWeight:700, fontSize:16 }}>Choose from Library</div>
              <div style={{ fontSize:13, color:T.textSecondary, marginTop:2 }}>Pick an existing photo</div>
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
          memberList={memberList}
        />
      )}
    </Sheet>
  );
}

// ─── Edit Sheet ───────────────────────────────────────────────────────────────

function EditSheet({ item, onClose, onUpdate, onDelete, memberList }) {
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
        memberList={memberList}
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

// ─── Settings Sheet ───────────────────────────────────────────────────────────

function SettingsSheet({ onClose, memberList, onMembersChange }) {
  const [newName, setNewName]   = useState("");
  const [saving, setSaving]     = useState(false);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name || memberList.includes(name)) return;
    setSaving(true);
    await addMember(name);
    onMembersChange([...memberList, name]);
    setNewName("");
    setSaving(false);
  };

  const handleRemove = async (name) => {
    await removeMember(name);
    onMembersChange(memberList.filter(m => m !== name));
  };

  return (
    <Sheet onClose={onClose} title="Settings">
      <div style={{ marginBottom:28 }}>
        <Label>Family Members</Label>
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
          {memberList.map((m, i) => {
            const s = getMemberStyle(m, memberList);
            return (
              <div key={m} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:s.bg, borderRadius:14, padding:"12px 16px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:s.color }} />
                  <span style={{ fontWeight:600, fontSize:15, color:s.color }}>{m}</span>
                </div>
                <button onClick={() => handleRemove(m)} style={{
                  background:"rgba(0,0,0,0.08)", border:"none", borderRadius:8,
                  padding:"5px 12px", fontSize:12, fontWeight:700,
                  color:s.color, cursor:"pointer", fontFamily:"inherit"
                }}>Remove</button>
              </div>
            );
          })}
        </div>

        <Label>Add New Member</Label>
        <div style={{ display:"flex", gap:10 }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key==="Enter" && handleAdd()}
            placeholder="Name…"
            style={{ ...inputStyle, flex:1 }}
          />
          <button onClick={handleAdd} disabled={!newName.trim() || saving} style={{
            background: newName.trim() ? T.primary : T.border,
            color: newName.trim() ? "#fff" : T.textMuted,
            border:"none", borderRadius:12, padding:"12px 20px",
            fontSize:14, fontWeight:700, fontFamily:"inherit", cursor: newName.trim() ? "pointer" : "not-allowed",
            whiteSpace:"nowrap"
          }}>
            {saving ? "…" : "Add"}
          </button>
        </div>
      </div>

      <div style={{ background:T.accentLight, borderRadius:14, padding:"14px 16px" }}>
        <div style={{ fontSize:13, color:T.textSecondary, lineHeight:1.6 }}>
          <strong style={{ color:T.textPrimary }}>Coming soon</strong><br />
          Kids' size tracking, growth alerts, Excel export, and friend circles are all on the roadmap.
        </div>
      </div>
    </Sheet>
  );
}

// ─── Item Card ────────────────────────────────────────────────────────────────

function ItemCard({ item, onClick, memberList }) {
  const ms = getMemberStyle(item.member, memberList);
  return (
    <div onClick={onClick} style={{
      background:T.card, borderRadius:18, overflow:"hidden",
      boxShadow:`0 2px 10px ${T.shadow}`, border:`1.5px solid ${T.border}`, cursor:"pointer"
    }}>
      <div style={{ height:150, background:T.accentLight, display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
        {item.imageUrl
          ? <img src={item.imageUrl} alt={item.type} style={{ width:"100%", height:"100%", objectFit:"contain" }} />
          : <span style={{ fontSize:44 }}>{TYPE_EMOJI[item.type]||"👕"}</span>
        }
        <div style={{ position:"absolute", bottom:8, left:8 }}>
          <DecisionPill value={item.decision} />
        </div>
      </div>
      <div style={{ padding:"12px 14px 14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
          <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:16, fontWeight:700, color:T.textPrimary }}>{item.type}</div>
          <span style={{ background:ms.bg, color:ms.color, borderRadius:99, padding:"3px 10px", fontSize:11, fontWeight:700 }}>{item.member}</span>
        </div>
        <div style={{ fontSize:13, color:T.textSecondary, lineHeight:1.4 }}>
          {[item.colour, item.make, item.size].filter(Boolean).join(" · ")}
        </div>
        {item.note ? <div style={{ fontSize:12, color:T.textMuted, marginTop:4, fontStyle:"italic" }}>{item.note}</div> : null}
      </div>
    </div>
  );
}

// ─── Search bar ───────────────────────────────────────────────────────────────

function SearchBar({ value, onChange }) {
  return (
    <div style={{ padding:"12px 16px 0", position:"relative" }}>
      <span style={{ position:"absolute", left:28, top:"50%", transform:"translateY(-10%)", fontSize:16, color:T.textMuted, pointerEvents:"none" }}>🔍</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search by type, colour, brand, size…"
        style={{ ...inputStyle, paddingLeft:40, fontSize:14, borderRadius:14 }}
      />
      {value && (
        <button onClick={() => onChange("")} style={{
          position:"absolute", right:28, top:"50%", transform:"translateY(-50%)",
          background:"none", border:"none", fontSize:18, color:T.textMuted, cursor:"pointer", padding:0, lineHeight:1
        }}>×</button>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [items, setItems]            = useState([]);
  const [members, setMembers]        = useState([]);
  const [ready, setReady]            = useState(false);
  const [showAdd, setShowAdd]        = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editItem, setEditItem]      = useState(null);
  const [filterMember, setFilter]    = useState("All");
  const [filterDecision, setFilterD] = useState("All");
  const [search, setSearch]          = useState("");

  useEffect(() => {
    Promise.all([fetchItems(), fetchMembers()]).then(([loadedItems, loadedMembers]) => {
      setItems(loadedItems);
      setMembers(loadedMembers);
      setReady(true);
    });
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
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ textAlign:"center", color:T.textMuted }}>
        <div style={{ fontSize:40, marginBottom:12 }}>👗</div>
        <div style={{ fontSize:15 }}>Loading your wardrobe…</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"'DM Sans','Helvetica Neue',sans-serif", paddingBottom:110 }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background:T.header, padding:"16px 20px 14px", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:26, color:T.headerText, fontWeight:800, letterSpacing:"-0.02em" }}>
            Wardrobe <span style={{ fontSize:14, fontWeight:400, color:T.headerSub, letterSpacing:"0.1em", textTransform:"uppercase" }}>Family</span>
          </div>
          <button onClick={() => setShowSettings(true)} style={{
            background:"rgba(255,255,255,0.1)", border:"none", borderRadius:10,
            padding:"8px 14px", fontSize:13, color:T.headerText,
            fontFamily:"inherit", fontWeight:600, cursor:"pointer"
          }}>⚙️ Settings</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, padding:"16px 16px 0" }}>
        {[
          { label:"Total",     value:stats.total,     color:T.primary },
          { label:"Keeping",   value:stats.keep,      color:"#1a6b4a" },
          { label:"Undecided", value:stats.undecided, color:"#8c6a10" },
        ].map(s => (
          <div key={s.label} style={{ background:T.card, borderRadius:16, padding:"14px 16px", border:`1.5px solid ${T.statBorder}` }}>
            <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:30, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:11, color:T.textMuted, marginTop:4, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <SearchBar value={search} onChange={setSearch} />

      {/* Member filter */}
      <div style={{ display:"flex", gap:8, padding:"12px 16px 0", overflowX:"auto", scrollbarWidth:"none" }}>
        {["All", ...members].map(m => {
          const ms = getMemberStyle(m, members);
          const active = filterMember === m;
          return (
            <button key={m} onClick={() => setFilter(m)} style={{
              border:"none", borderRadius:99, padding:"9px 18px",
              background: active ? (m==="All" ? T.primary : ms.color) : (m==="All" ? T.pillBg : ms.bg),
              color: active ? "#fff" : (m==="All" ? T.textPrimary : ms.color),
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
              border: active ? `2px solid ${d.color||T.primary}` : "2px solid transparent",
              borderRadius:99, padding:"7px 14px",
              background: active ? (d.bg||T.primary) : T.pillBg,
              color: active ? (d.color||"#fff") : T.textSecondary,
              fontFamily:"inherit", fontSize:12, fontWeight:600,
              cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, transition:"all 0.15s"
            }}>{d.emoji} {d.label}</button>
          );
        })}
      </div>

      {/* Count */}
      <div style={{ padding:"0 16px 12px", fontSize:13, color:T.textMuted, fontWeight:500 }}>
        {search || filterMember !== "All" || filterDecision !== "All"
          ? `${filtered.length} of ${items.length} item${items.length!==1?"s":""}`
          : `${items.length} item${items.length!==1?"s":""}`
        }
      </div>

      {/* Grid */}
      <div style={{ padding:"0 16px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"60px 20px", color:T.textMuted }}>
            <div style={{ fontSize:48, marginBottom:12 }}>{search ? "🔍" : "👗"}</div>
            <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:20, color:T.textSecondary, marginBottom:6 }}>
              {search ? "No results found" : "Nothing here yet"}
            </div>
            <div style={{ fontSize:14 }}>
              {search ? `No items match "${search}"` : "Tap the button below to add your first item"}
            </div>
            {search && (
              <button onClick={() => setSearch("")} style={{ marginTop:16, background:T.accentLight, border:"none", borderRadius:10, padding:"10px 20px", fontSize:14, color:T.primary, fontFamily:"inherit", fontWeight:600, cursor:"pointer" }}>
                Clear search
              </button>
            )}
          </div>
        ) : filtered.map(item => (
          <ItemCard key={item.id} item={item} onClick={() => setEditItem(item)} memberList={members} />
        ))}
      </div>

      {/* Floating Add Button */}
      <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)", zIndex:100 }}>
        <button onClick={() => setShowAdd(true)} style={{
          background:T.accent, color:"#fff", border:"none",
          borderRadius:99, padding:"16px 32px", fontSize:16, fontWeight:700,
          fontFamily:"inherit", boxShadow:`0 8px 30px ${T.btnShadow}`,
          cursor:"pointer", display:"flex", alignItems:"center", gap:10, whiteSpace:"nowrap"
        }}>
          <span style={{ fontSize:20 }}>+</span> Add Item
        </button>
      </div>

      {/* Sheets */}
      {showAdd && <AddSheet onClose={() => setShowAdd(false)} onSave={handleAdd} memberList={members} />}
      {showSettings && <SettingsSheet onClose={() => setShowSettings(false)} memberList={members} onMembersChange={setMembers} />}
      {editItem && (
        <EditSheet item={editItem} onClose={() => setEditItem(null)} onUpdate={handleUpdate} onDelete={handleDelete} memberList={members} />
      )}
    </div>
  );
}
