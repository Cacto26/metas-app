"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/");
    router.refresh();
  }

  return (
    <div style={{ minHeight:"100vh", background:"#f9fafb", display:"flex", alignItems:"center", justifyContent:"center", padding:16, fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ position:"fixed", top:"-15%", right:"-10%", width:480, height:480, borderRadius:"50%", background:"radial-gradient(circle,#dcfce7,transparent 65%)", opacity:0.55, pointerEvents:"none" }} />
      <div style={{ position:"fixed", bottom:"-12%", left:"-8%", width:360, height:360, borderRadius:"50%", background:"radial-gradient(circle,#dcfce7,transparent 65%)", opacity:0.4, pointerEvents:"none" }} />

      <div className="slide-up" style={{ width:"100%", maxWidth:390 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <div style={{ width:44, height:44, borderRadius:14, background:"#16a34a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, boxShadow:"0 6px 20px rgba(22,163,74,0.3)" }}>🎯</div>
            <span style={{ fontSize:26, fontWeight:800, color:"#111827", letterSpacing:"-0.04em" }}>metas<span style={{ color:"#16a34a" }}>.app</span></span>
          </div>
          <p style={{ color:"#9ca3af", fontSize:13 }}>Evolua junto. Em público. Com propósito.</p>
        </div>

        <div style={{ background:"#fff", borderRadius:22, padding:"28px 24px", boxShadow:"0 8px 32px rgba(0,0,0,0.07)", border:"1px solid #f3f4f6" }}>
          <div style={{ display:"flex", gap:4, background:"#f3f4f6", borderRadius:12, padding:4, marginBottom:22 }}>
            <span style={{ flex:1, textAlign:"center", padding:"8px 0", borderRadius:9, background:"#fff", color:"#111827", fontWeight:700, fontSize:13, boxShadow:"0 1px 4px rgba(0,0,0,0.09)" }}>Entrar</span>
            <Link href="/register" style={{ flex:1, textAlign:"center", padding:"8px 0", borderRadius:9, color:"#9ca3af", fontWeight:500, fontSize:13, textDecoration:"none" }}>Cadastrar</Link>
          </div>

          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Field label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="você@email.com" required />
            <Field label="Senha"  type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            {error && <p style={{ color:"#ef4444", fontSize:12, background:"#fef2f2", borderRadius:8, padding:"8px 12px" }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ background:"#16a34a", color:"#fff", border:"none", borderRadius:12, padding:"12px 0", fontSize:13, fontWeight:700, cursor:"pointer", marginTop:4, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Entrando..." : "Entrar na plataforma →"}
            </button>
          </form>

          <div style={{ textAlign:"center", marginTop:14 }}>
            <Link href="/register" style={{ color:"#9ca3af", fontSize:12 }}>Não tem conta? Cadastre-se</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      <label style={{ fontSize:10, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</label>
      <input {...props} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ border: focused ? "1.5px solid #16a34a" : "1.5px solid #e5e7eb", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#111827", outline:"none", transition:"border-color 0.15s", background:"#fff" }} />
    </div>
  );
}
