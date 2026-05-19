"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── utils ────────────────────────────────────────────────────────────────────
const pct = (cur, tgt) => Math.min(100, Math.round((cur / tgt) * 100));
const fmtDate = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day:"2-digit", month:"short" }) : "—";
const fmtTime = (ts) => new Date(ts).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit", second:"2-digit" });

const PALETTE = ["#16a34a","#0891b2","#7c3aed","#db2777","#ea580c","#65a30d"];
function colorFromId(id) {
  if (!id) return PALETTE[0];
  let h = 0;
  for (const c of id) h = c.charCodeAt(0) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}

// ─── small components ─────────────────────────────────────────────────────────
function Avatar({ initials = "?", size = 36, color = "#16a34a", online = false }) {
  return (
    <div style={{ position:"relative", flexShrink:0, width:size, height:size }}>
      <div style={{ width:size, height:size, borderRadius:"50%", background:color, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:size*0.35, letterSpacing:"0.03em" }}>
        {String(initials).toUpperCase().slice(0,2)}
      </div>
      {online && <div style={{ position:"absolute", bottom:0, right:0, width:size*0.28, height:size*0.28, borderRadius:"50%", background:"#22c55e", border:"2px solid #fff" }} />}
    </div>
  );
}

function ProgressBar({ current, target, height = 8, showPct = true, thick = false }) {
  const p = pct(current, target);
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(p), 80); return () => clearTimeout(t); }, [p]);
  const grad = p >= 80 ? "linear-gradient(90deg,#4ade80,#16a34a)" : p >= 50 ? "linear-gradient(90deg,#86efac,#22c55e)" : "linear-gradient(90deg,#bbf7d0,#86efac)";
  if (thick) return (
    <div style={{ height:14, borderRadius:99, background:"#dcfce7", overflow:"hidden", position:"relative" }}>
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,#86efac,#16a34a)", borderRadius:99, transformOrigin:"left", transform:`scaleX(${p/100})`, transition:"transform 0.9s cubic-bezier(0.34,1.4,0.64,1)" }} />
      <div style={{ position:"absolute", top:"50%", left:`${p}%`, transform:"translate(-50%,-50%)", width:18, height:18, borderRadius:"50%", background:"#16a34a", border:"3px solid #fff", boxShadow:"0 0 0 3px #86efac", transition:"left 0.9s cubic-bezier(0.34,1.4,0.64,1)", zIndex:1 }} />
    </div>
  );
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ flex:1, height, borderRadius:99, background:"#f0fdf4", overflow:"hidden", border:"1px solid #dcfce7" }}>
        <div style={{ width:`${w}%`, height:"100%", borderRadius:99, background:grad, transition:"width 0.9s cubic-bezier(0.34,1.4,0.64,1)" }} />
      </div>
      {showPct && <span style={{ fontSize:11, fontWeight:700, color: p>=80 ? "#16a34a" : "#9ca3af", minWidth:28, textAlign:"right", fontFamily:"'DM Mono',monospace" }}>{p}%</span>}
    </div>
  );
}

function ReactionBar({ reactions = [], goalId, goalType, userId, onReact }) {
  const counts = {};
  reactions.forEach(r => { counts[r.emoji] = (counts[r.emoji]||0) + 1; });
  const my = reactions.find(r => r.user_id === userId)?.emoji;
  return (
    <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
      {["👏","❤️","🔥"].map(emoji => {
        const n = counts[emoji] || 0;
        const active = my === emoji;
        return (
          <button key={emoji} onClick={() => userId && onReact(goalId, goalType, emoji)}
            style={{ display:"flex", alignItems:"center", gap:3, padding:"3px 9px", borderRadius:99, border: active ? "1.5px solid #16a34a" : "1.5px solid #e5e7eb", background: active ? "#f0fdf4" : "#fff", cursor: userId ? "pointer" : "default", fontSize:12, fontWeight:600, color: active ? "#16a34a" : "#9ca3af", transition:"all 0.16s", transform: active ? "scale(1.08)" : "scale(1)" }}>
            {emoji}{n > 0 && <span style={{ fontSize:10 }}>{n}</span>}
          </button>
        );
      })}
    </div>
  );
}

function InlineEditor({ goal, onSave, onCancel }) {
  const [val, setVal] = useState(goal.current);
  return (
    <div style={{ background:"#f0fdf4", borderRadius:12, padding:"14px 16px", border:"1.5px solid #bbf7d0", display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:12, color:"#6b7280" }}>Novo total:</span>
        <input type="number" value={val} min={0} max={goal.target} onChange={e => setVal(Number(e.target.value))}
          style={{ width:72, border:"1.5px solid #86efac", borderRadius:8, padding:"6px 10px", fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:700, color:"#16a34a", outline:"none", background:"#fff" }} />
        <span style={{ fontSize:12, color:"#9ca3af" }}>/ {goal.target} {goal.unit}</span>
        {val - goal.current > 0 && <span style={{ marginLeft:"auto", fontSize:11, color:"#16a34a", fontWeight:700, background:"#dcfce7", padding:"2px 8px", borderRadius:99 }}>+{val - goal.current}</span>}
      </div>
      <ProgressBar current={val} target={goal.target} height={6} showPct={false} />
      <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
        <button onClick={onCancel} style={{ fontSize:12, color:"#9ca3af", background:"none", border:"none", cursor:"pointer" }}>cancelar</button>
        <button onClick={() => onSave(val)} style={{ background:"#16a34a", color:"#fff", border:"none", borderRadius:8, padding:"7px 18px", fontSize:12, fontWeight:700, cursor:"pointer" }}>salvar</button>
      </div>
    </div>
  );
}

function GoalCard({ goal, reactions, userId, justUpdated, onReact, onUpdateProgress }) {
  const [editing, setEditing] = useState(false);
  const p = pct(goal.current, goal.target);
  const isOwner = userId === goal.created_by;
  const canEdit = goal.type === "global" ? !!userId : isOwner;
  return (
    <div style={{ background:"#fff", borderRadius:16, border: justUpdated ? "1.5px solid #86efac" : "1px solid #e5e7eb", padding:"18px 20px", display:"flex", flexDirection:"column", gap:12, position:"relative", overflow:"hidden", transition:"border-color 0.5s, box-shadow 0.5s", boxShadow: justUpdated ? "0 0 0 5px rgba(134,239,172,0.2)" : "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ position:"absolute", top:0, left:0, width:`${p}%`, height:3, background:"linear-gradient(90deg,#86efac,#16a34a)", transition:"width 0.9s cubic-bezier(0.34,1.4,0.64,1)" }} />
      <div style={{ display:"flex", alignItems:"flex-start", gap:10, paddingTop:4 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
            {p >= 100 && <span>🏆</span>}
            <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:"#111827", lineHeight:1.3 }}>{goal.title}</h3>
          </div>
          {goal.description && <p style={{ margin:0, fontSize:11, color:"#9ca3af", lineHeight:1.5 }}>{goal.description}</p>}
        </div>
        {goal.profile && <Avatar initials={goal.profile.avatar} size={28} color={colorFromId(goal.profile.id)} />}
      </div>
      <div style={{ display:"flex", alignItems:"baseline", gap:5 }}>
        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:20, fontWeight:700, color:"#111827" }}>{goal.current}</span>
        <span style={{ fontSize:11, color:"#9ca3af", fontFamily:"'DM Mono',monospace" }}>/ {goal.target} {goal.unit}</span>
      </div>
      <ProgressBar current={goal.current} target={goal.target} height={7} />
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:10, color:"#d1d5db" }}>prazo {fmtDate(goal.deadline)}</span>
        {canEdit && !editing && <button onClick={() => setEditing(true)} style={{ fontSize:10, fontWeight:700, color:"#16a34a", background:"none", border:"none", cursor:"pointer", textDecoration:"underline", textUnderlineOffset:2 }}>atualizar</button>}
      </div>
      {editing && <InlineEditor goal={goal} onSave={v => { onUpdateProgress(goal.id, goal.type, v); setEditing(false); }} onCancel={() => setEditing(false)} />}
      <ReactionBar reactions={reactions} goalId={goal.id} goalType={goal.type} userId={userId} onReact={onReact} />
    </div>
  );
}

function GlobalGoalCard({ goal, reactions, allUsers, userId, justUpdated, onReact, onUpdateProgress }) {
  const [editing, setEditing] = useState(false);
  const p = pct(goal.current, goal.target);
  return (
    <div style={{ background:"linear-gradient(135deg,#f0fdf4 0%,#fff 65%)", borderRadius:20, border: justUpdated ? "2px solid #22c55e" : "1.5px solid #bbf7d0", padding:"22px 24px", display:"flex", flexDirection:"column", gap:14, position:"relative", overflow:"hidden", boxShadow: justUpdated ? "0 0 0 6px rgba(34,197,94,0.12)" : "0 4px 16px rgba(22,163,74,0.07)", transition:"border-color 0.5s, box-shadow 0.5s" }}>
      <div style={{ position:"absolute", top:-50, right:-50, width:160, height:160, borderRadius:"50%", background:"radial-gradient(circle,#dcfce7,transparent 70%)", opacity:0.5, pointerEvents:"none" }} />
      <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
        <div style={{ width:38, height:38, borderRadius:12, background:"#16a34a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, boxShadow:"0 3px 10px rgba(22,163,74,0.3)" }}>🌍</div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
            <span style={{ fontSize:9, fontWeight:700, color:"#16a34a", background:"#dcfce7", borderRadius:99, padding:"2px 8px", letterSpacing:"0.08em", textTransform:"uppercase" }}>Meta Global</span>
            {justUpdated && <span className="fade-in" style={{ fontSize:9, fontWeight:700, color:"#fff", background:"#22c55e", borderRadius:99, padding:"2px 8px" }}>● AO VIVO</span>}
            {p >= 100 && <span>🏆</span>}
          </div>
          <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:"#111827" }}>{goal.title}</h3>
          {goal.description && <p style={{ margin:"3px 0 0", fontSize:11, color:"#9ca3af" }}>{goal.description}</p>}
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:32, fontWeight:800, color:"#16a34a", lineHeight:1 }}>{goal.current}</span>
        <span style={{ fontSize:13, color:"#9ca3af", fontFamily:"'DM Mono',monospace" }}>/ {goal.target} {goal.unit}</span>
      </div>
      <div>
        <ProgressBar current={goal.current} target={goal.target} thick />
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:10, color:"#9ca3af" }}>
          <span>prazo {fmtDate(goal.deadline)}</span>
          <span style={{ fontWeight:700, color:"#16a34a" }}>{p}% concluído</span>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ display:"flex" }}>
          {allUsers.slice(0,3).map((u,i) => (
            <div key={u.id} style={{ marginLeft: i===0 ? 0 : -7, zIndex:3-i, border:"2px solid #f0fdf4", borderRadius:"50%" }}>
              <Avatar initials={u.avatar} size={24} color={colorFromId(u.id)} />
            </div>
          ))}
        </div>
        <span style={{ fontSize:11, color:"#9ca3af" }}>todos contribuindo</span>
        {userId && !editing && <button onClick={() => setEditing(true)} style={{ marginLeft:"auto", fontSize:11, fontWeight:700, color:"#16a34a", background:"#dcfce7", border:"none", borderRadius:8, padding:"5px 12px", cursor:"pointer" }}>+ contribuir</button>}
      </div>
      {editing && <InlineEditor goal={goal} onSave={v => { onUpdateProgress(goal.id, "global", v); setEditing(false); }} onCancel={() => setEditing(false)} />}
      <ReactionBar reactions={reactions} goalId={goal.id} goalType="global" userId={userId} onReact={onReact} />
    </div>
  );
}

function ActivityFeed({ events }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = 0; }, [events.length]);
  const ICON = { progress:"📈", reaction:"👏", new_goal:"🎯", joined:"👋" };
  return (
    <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e5e7eb", overflow:"hidden" }}>
      <div style={{ padding:"13px 16px", borderBottom:"1px solid #f3f4f6", display:"flex", alignItems:"center", gap:8 }}>
        <div className="pulse-dot" style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e" }} />
        <span style={{ fontSize:11, fontWeight:700, color:"#374151", letterSpacing:"0.06em", textTransform:"uppercase" }}>Atividade ao vivo</span>
      </div>
      <div ref={ref} style={{ maxHeight:290, overflowY:"auto", padding:"6px 0" }}>
        {events.length === 0 && <div style={{ padding:"24px 16px", textAlign:"center", color:"#d1d5db", fontSize:12 }}>Aguardando atividade...</div>}
        {events.map((ev, i) => (
          <div key={ev.id} className={i===0 ? "slide-in-top" : ""} style={{ display:"flex", alignItems:"flex-start", gap:9, padding:"9px 14px", borderBottom: i < events.length-1 ? "1px solid #f9fafb" : "none" }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:colorFromId(ev.userId), display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#fff", flexShrink:0 }}>
              {String(ev.userAvatar||"?").toUpperCase().slice(0,2)}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ margin:0, fontSize:11, color:"#374151", lineHeight:1.5 }}>
                <strong style={{ color:colorFromId(ev.userId) }}>{ev.userName}</strong>{" "}
                <span style={{ color:"#6b7280" }}>{ev.message}</span>
              </p>
              <span style={{ fontSize:9, color:"#d1d5db", fontFamily:"'DM Mono',monospace" }}>{fmtTime(ev.ts)}</span>
            </div>
            <span style={{ fontSize:13, flexShrink:0 }}>{ICON[ev.type]||"•"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewGoalModal({ open, onClose, onCreate }) {
  const [type, setType]     = useState("individual");
  const [title, setTitle]   = useState("");
  const [desc, setDesc]     = useState("");
  const [target, setTarget] = useState("");
  const [unit, setUnit]     = useState("");
  const [deadline, setDeadline] = useState("");
  const [focused, setFocused]   = useState("");

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  function submit() {
    if (!title.trim() || !target) return;
    onCreate({ title: title.trim(), description: desc.trim(), target, unit: unit||"itens", deadline, type });
    setTitle(""); setDesc(""); setTarget(""); setUnit(""); setDeadline(""); setType("individual");
    onClose();
  }

  const fieldStyle = (name) => ({
    border: focused===name ? "1.5px solid #16a34a" : "1.5px solid #e5e7eb",
    borderRadius:10, padding:"9px 12px", fontSize:13, color:"#111827",
    outline:"none", transition:"border-color 0.15s", width:"100%", boxSizing:"border-box", background:"#fff",
  });

  return (
    <div className="fade-in" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.2)", backdropFilter:"blur(6px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
      <div className="slide-up" style={{ background:"#fff", borderRadius:22, padding:"28px 24px", width:"100%", maxWidth:440, boxShadow:"0 24px 60px rgba(0,0,0,0.14)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <h2 style={{ margin:0, fontWeight:800, fontSize:16, color:"#111827" }}>Nova Meta</h2>
          <button onClick={onClose} style={{ background:"#f3f4f6", border:"none", borderRadius:8, width:30, height:30, cursor:"pointer", fontSize:18, color:"#6b7280", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          {["individual","global"].map(t => (
            <button key={t} onClick={() => setType(t)} style={{ flex:1, padding:"9px 0", borderRadius:10, border: type===t ? "2px solid #16a34a" : "1.5px solid #e5e7eb", background: type===t ? "#f0fdf4" : "#fff", color: type===t ? "#16a34a" : "#6b7280", fontWeight: type===t ? 700 : 500, fontSize:13, cursor:"pointer", transition:"all 0.14s" }}>
              {t === "individual" ? "🧍 Individual" : "🌍 Global"}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
          {[
            ["Título","text",title,setTitle,"title","Ex: Correr 100km, ler 12 livros..."],
            ["Descrição (opcional)","text",desc,setDesc,"desc","Contexto ou motivação..."],
          ].map(([label,type,val,set,name,ph]) => (
            <div key={name} style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={{ fontSize:10, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</label>
              <input type={type} value={val} onChange={e => set(e.target.value)} placeholder={ph}
                onFocus={() => setFocused(name)} onBlur={() => setFocused("")} style={fieldStyle(name)} />
            </div>
          ))}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={{ fontSize:10, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:"0.05em" }}>Meta</label>
              <input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="100"
                onFocus={() => setFocused("target")} onBlur={() => setFocused("")} style={fieldStyle("target")} />
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={{ fontSize:10, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:"0.05em" }}>Unidade</label>
              <input type="text" value={unit} onChange={e => setUnit(e.target.value)} placeholder="km, livros..."
                onFocus={() => setFocused("unit")} onBlur={() => setFocused("")} style={fieldStyle("unit")} />
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <label style={{ fontSize:10, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:"0.05em" }}>Prazo</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
              onFocus={() => setFocused("deadline")} onBlur={() => setFocused("")} style={fieldStyle("deadline")} />
          </div>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <button onClick={onClose} style={{ flex:1, padding:"9px 0", borderRadius:10, border:"1.5px solid #e5e7eb", background:"none", color:"#6b7280", fontWeight:700, fontSize:13, cursor:"pointer" }}>Cancelar</button>
          <button onClick={submit} style={{ flex:2, padding:"9px 0", borderRadius:10, background:"#16a34a", border:"none", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>Criar Meta 🎯</button>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ label, count, accent, bg }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
      <div style={{ width:4, height:16, borderRadius:99, background:accent }} />
      <h2 style={{ margin:0, fontSize:12, fontWeight:700, color:"#374151", letterSpacing:"0.07em", textTransform:"uppercase" }}>{label}</h2>
      <span style={{ fontSize:10, color:accent, background:bg, padding:"2px 8px", borderRadius:99, fontWeight:700 }}>{count}</span>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();

  const [currentUser,     setCurrentUser]     = useState(null);
  const [globalGoals,     setGlobalGoals]     = useState([]);
  const [individualGoals, setIndividualGoals] = useState([]);
  const [allUsers,        setAllUsers]        = useState([]);
  const [reactions,       setReactions]       = useState([]);
  const [activityLog,     setActivityLog]     = useState([]);
  const [onlineUsers,     setOnlineUsers]     = useState([]);
  const [recentlyUpdated, setRecentlyUpdated] = useState({});
  const [view,            setView]            = useState("feed");
  const [goalModal,       setGoalModal]       = useState(false);
  const [toast,           setToast]           = useState(null);
  const [loading,         setLoading]         = useState(true);

  const userRef = useRef(null);
  useEffect(() => { userRef.current = currentUser; }, [currentUser]);

  const flash = useCallback((id) => {
    setRecentlyUpdated(p => ({ ...p, [id]: true }));
    setTimeout(() => setRecentlyUpdated(p => { const n = { ...p }; delete n[id]; return n; }), 2500);
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  const pushActivity = useCallback((ev) => {
    setActivityLog(p => [{ ...ev, id: Math.random().toString(36).slice(2), ts: Date.now() }, ...p].slice(0,30));
  }, []);

  // ── load initial data ────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profile) setCurrentUser(profile);

      const { data: profiles } = await supabase.from("profiles").select("*");
      if (profiles) setAllUsers(profiles);

      const { data: goals } = await supabase.from("goals").select("*, profile:profiles(*)").order("created_at", { ascending: false });
      if (goals) {
        setGlobalGoals(goals.filter(g => g.type === "global"));
        setIndividualGoals(goals.filter(g => g.type === "individual"));
      }

      const { data: rxns } = await supabase.from("reactions").select("*");
      if (rxns) setReactions(rxns);

      setLoading(false);
    }
    load();
  }, []);

  // ── Supabase Realtime ────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    const goalsCh = supabase.channel("goals-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "goals" }, async payload => {
        const { data } = await supabase.from("goals").select("*, profile:profiles(*)").eq("id", payload.new.id).single();
        if (!data) return;
        if (data.type === "global") setGlobalGoals(p => [data, ...p]);
        else setIndividualGoals(p => [data, ...p]);
        flash(data.id);
        pushActivity({ type:"new_goal", userId:data.created_by, userName:data.profile?.name??"Alguém", userAvatar:data.profile?.avatar??"?", message:`criou a meta "${data.title}"` });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "goals" }, payload => {
        const u = payload.new;
        setGlobalGoals(p => p.map(g => g.id === u.id ? { ...g, ...u } : g));
        setIndividualGoals(p => p.map(g => g.id === u.id ? { ...g, ...u } : g));
        flash(u.id);
      })
      .subscribe();

    const rxnCh = supabase.channel("reactions-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reactions" }, payload => {
        const r = payload.new;
        setReactions(p => [...p.filter(x => !(x.goal_id === r.goal_id && x.user_id === r.user_id)), r]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "reactions" }, payload => {
        const r = payload.old;
        setReactions(p => p.filter(x => x.id !== r.id));
      })
      .subscribe();

    const presenceCh = supabase.channel("online-users", { config: { presence: { key: "" } } });
    presenceCh
      .on("presence", { event: "sync" }, () => {
        const state = presenceCh.presenceState();
        const online = Object.values(state).flat().map(s => s.profile).filter(Boolean);
        setOnlineUsers(online);
      })
      .subscribe(async status => {
        if (status === "SUBSCRIBED" && userRef.current) {
          await presenceCh.track({ profile: userRef.current });
        }
      });

    return () => {
      supabase.removeChannel(goalsCh);
      supabase.removeChannel(rxnCh);
      supabase.removeChannel(presenceCh);
    };
  }, []);

  // ── handlers ─────────────────────────────────────────────────────────────
  const handleReact = useCallback(async (goalId, goalType, emoji) => {
    if (!currentUser) return;
    const supabase = createClient();
    const existing = reactions.find(r => r.goal_id === goalId && r.user_id === currentUser.id);
    if (existing?.emoji === emoji) {
      await supabase.from("reactions").delete().eq("id", existing.id);
    } else {
      if (existing) await supabase.from("reactions").delete().eq("id", existing.id);
      await supabase.from("reactions").insert({ goal_id: goalId, user_id: currentUser.id, emoji });
      pushActivity({ type:"reaction", userId:currentUser.id, userName:currentUser.name, userAvatar:currentUser.avatar, message:`reagiu ${emoji} em uma meta` });
    }
    showToast("Incentivo enviado " + emoji);
  }, [currentUser, reactions, showToast, pushActivity]);

  const handleUpdateProgress = useCallback(async (goalId, goalType, newVal) => {
    const supabase = createClient();
    const goals = goalType === "global" ? globalGoals : individualGoals;
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const clamped = Math.min(newVal, goal.target);
    await supabase.from("goals").update({ current: clamped }).eq("id", goalId);
    if (currentUser) pushActivity({ type:"progress", userId:currentUser.id, userName:currentUser.name, userAvatar:currentUser.avatar, message:`atualizou "${goal.title}" → ${clamped}/${goal.target} ${goal.unit}` });
    showToast("Progresso atualizado ✓");
  }, [globalGoals, individualGoals, currentUser, showToast, pushActivity]);

  const handleCreate = useCallback(async ({ title, description, target, unit, deadline, type }) => {
    if (!currentUser) return;
    const supabase = createClient();
    await supabase.from("goals").insert({ title, description: description||null, type, target: Number(target), unit, deadline: deadline||null, created_by: currentUser.id });
    showToast("Meta criada! 🎯");
  }, [currentUser, showToast]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ── derived ───────────────────────────────────────────────────────────────
  const myGoals    = individualGoals.filter(g => g.created_by === currentUser?.id);
  const otherGoals = individualGoals.filter(g => g.created_by !== currentUser?.id);
  const allGoals   = [...globalGoals, ...individualGoals];

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f9fafb", fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:36, marginBottom:12 }}>🎯</div>
        <p style={{ color:"#9ca3af", fontSize:13 }}>Carregando...</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#f9fafb", fontFamily:"'DM Sans',sans-serif" }}>

      {/* HEADER */}
      <header style={{ position:"sticky", top:0, zIndex:100, background:"rgba(255,255,255,0.94)", backdropFilter:"blur(14px)", borderBottom:"1px solid #e5e7eb", padding:"0 20px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>🎯</span>
          <span style={{ fontSize:16, fontWeight:800, color:"#111827", letterSpacing:"-0.04em" }}>metas<span style={{ color:"#16a34a" }}>.app</span></span>
        </div>
        <nav style={{ display:"flex", gap:2 }}>
          {[["feed","🏠 Feed"],["profile","👤 Perfil"]].map(([v,label]) => (
            <button key={v} onClick={() => setView(v)} style={{ padding:"5px 12px", borderRadius:8, border:"none", background: view===v ? "#f0fdf4" : "transparent", color: view===v ? "#16a34a" : "#6b7280", fontWeight: view===v ? 700 : 500, fontSize:12, cursor:"pointer", transition:"all 0.14s" }}>{label}</button>
          ))}
        </nav>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={() => setGoalModal(true)} style={{ padding:"5px 12px", borderRadius:10, border:"1.5px solid #bbf7d0", background:"#f0fdf4", color:"#16a34a", fontWeight:700, fontSize:12, cursor:"pointer" }}>+ Meta</button>
          <button onClick={handleLogout} title="Sair" style={{ background:"none", border:"none", cursor:"pointer" }}>
            {currentUser && <Avatar initials={currentUser.avatar} size={30} color={colorFromId(currentUser.id)} online />}
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="main-grid" style={{ maxWidth:1100, margin:"0 auto", padding:"22px 16px 80px", display:"grid", gridTemplateColumns:"1fr 290px", gap:22, alignItems:"start" }}>

        {/* LEFT */}
        <div style={{ minWidth:0 }}>
          {view === "feed" && (
            <>
              <section style={{ marginBottom:32 }}>
                <SectionHeader label="Metas Globais" count={globalGoals.length} accent="#16a34a" bg="#dcfce7" />
                {globalGoals.length === 0
                  ? <p style={{ color:"#d1d5db", fontSize:13, textAlign:"center", padding:"32px 0" }}>Nenhuma meta global ainda.</p>
                  : <div style={{ display:"grid", gap:14, gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))" }}>
                      {globalGoals.map(g => <GlobalGoalCard key={g.id} goal={g} reactions={reactions.filter(r => r.goal_id===g.id)} allUsers={allUsers} userId={currentUser?.id} justUpdated={!!recentlyUpdated[g.id]} onReact={handleReact} onUpdateProgress={handleUpdateProgress} />)}
                    </div>
                }
              </section>
              <section>
                <SectionHeader label="Metas Individuais" count={individualGoals.length} accent="#6b7280" bg="#f3f4f6" />
                <div style={{ display:"grid", gap:16, gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))" }}>
                  {[...myGoals,...otherGoals].map(g => {
                    const owner = allUsers.find(u => u.id === g.created_by);
                    return (
                      <div key={g.id}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:7 }}>
                          {owner && <Avatar initials={owner.avatar} size={20} color={colorFromId(owner.id)} />}
                          <span style={{ fontSize:11, fontWeight:700, color:"#374151" }}>{owner?.name??"Usuário"}</span>
                          {g.created_by === currentUser?.id && <span style={{ color:"#16a34a", fontSize:10, fontWeight:600 }}>• você</span>}
                        </div>
                        <GoalCard goal={g} reactions={reactions.filter(r => r.goal_id===g.id)} userId={currentUser?.id} justUpdated={!!recentlyUpdated[g.id]} onReact={handleReact} onUpdateProgress={handleUpdateProgress} />
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {view === "profile" && currentUser && (
            <div>
              <div style={{ background:"linear-gradient(135deg,#f0fdf4,#fff)", border:"1px solid #dcfce7", borderRadius:20, padding:22, marginBottom:22, display:"flex", alignItems:"center", gap:16 }}>
                <Avatar initials={currentUser.avatar} size={58} color={colorFromId(currentUser.id)} online />
                <div style={{ flex:1 }}>
                  <h2 style={{ margin:"0 0 12px", fontSize:19, fontWeight:800, color:"#111827" }}>{currentUser.name}</h2>
                  <div style={{ display:"flex", gap:20 }}>
                    {[[myGoals.length,"metas"],[myGoals.filter(g=>pct(g.current,g.target)>=100).length,"concluídas"],[myGoals.length>0?Math.round(myGoals.reduce((a,g)=>a+pct(g.current,g.target),0)/myGoals.length)+"%":"—","média"]].map(([val,label]) => (
                      <div key={label} style={{ textAlign:"center" }}>
                        <div style={{ fontSize:19, fontWeight:800, color:"#16a34a", fontFamily:"'DM Mono',monospace" }}>{val}</div>
                        <div style={{ fontSize:10, color:"#9ca3af" }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => setGoalModal(true)} style={{ padding:"6px 12px", borderRadius:10, border:"1.5px solid #bbf7d0", background:"#f0fdf4", color:"#16a34a", fontWeight:700, fontSize:11, cursor:"pointer", alignSelf:"flex-start" }}>+ Criar Meta</button>
              </div>
              <SectionHeader label="Minhas Metas" count={myGoals.length} accent="#374151" bg="#f3f4f6" />
              {myGoals.length === 0
                ? <div style={{ textAlign:"center", padding:"50px 0", color:"#d1d5db" }}><div style={{ fontSize:34, marginBottom:10 }}>🌱</div><p style={{ fontSize:13 }}>Nenhuma meta ainda. Crie a primeira!</p></div>
                : <div style={{ display:"grid", gap:14, gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))" }}>
                    {myGoals.map(g => <GoalCard key={g.id} goal={g} reactions={reactions.filter(r=>r.goal_id===g.id)} userId={currentUser.id} justUpdated={!!recentlyUpdated[g.id]} onReact={handleReact} onUpdateProgress={handleUpdateProgress} />)}
                  </div>
              }
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <aside className="sidebar" style={{ display:"flex", flexDirection:"column", gap:14, position:"sticky", top:70 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#fff", borderRadius:12, border:"1px solid #e5e7eb" }}>
            <div className="pulse-dot" style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e", flexShrink:0 }} />
            <span style={{ fontSize:11, color:"#9ca3af" }}>{onlineUsers.length > 0 ? `${onlineUsers.length} online agora` : "Só você por aqui"}</span>
            <div style={{ display:"flex", marginLeft:"auto" }}>
              {onlineUsers.slice(0,5).map((u,i) => (
                <div key={u.id} style={{ marginLeft: i===0?0:-6, zIndex:5-i, border:"2px solid #fff", borderRadius:"50%" }}>
                  <Avatar initials={u.avatar} size={22} color={colorFromId(u.id)} online />
                </div>
              ))}
            </div>
          </div>

          <ActivityFeed events={activityLog} />

          <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, padding:"14px 16px" }}>
            <p style={{ margin:"0 0 10px", fontSize:10, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:"0.07em" }}>Plataforma</p>
            {[["🎯","Metas ativas",allGoals.length],["👥","Participantes",allUsers.length],["👏","Incentivos",reactions.length],["✅","Concluídas",allGoals.filter(g=>pct(g.current,g.target)>=100).length]].map(([icon,label,val]) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:9, padding:"6px 0", borderBottom:"1px solid #f9fafb" }}>
                <span style={{ fontSize:13 }}>{icon}</span>
                <span style={{ flex:1, fontSize:11, color:"#6b7280" }}>{label}</span>
                <span style={{ fontSize:13, fontWeight:700, color:"#111827", fontFamily:"'DM Mono',monospace" }}>{val}</span>
              </div>
            ))}
          </div>
        </aside>
      </main>

      <NewGoalModal open={goalModal} onClose={() => setGoalModal(false)} onCreate={handleCreate} />

      {toast && (
        <div className="slide-up" style={{ position:"fixed", bottom:22, left:"50%", transform:"translateX(-50%)", background:"#111827", color:"#fff", padding:"10px 18px", borderRadius:12, fontSize:12, fontWeight:600, boxShadow:"0 8px 24px rgba(0,0,0,0.22)", zIndex:9999, whiteSpace:"nowrap" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
