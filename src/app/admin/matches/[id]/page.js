"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Save, Check, AlertTriangle, X } from "lucide-react";

export default function MatchDetailAdmin() {
  const { id } = useParams();

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");

  // Players per group
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);

  // Football — state terpisah per tim per kategori
  const [homeGoals, setHomeGoals] = useState([]);
  const [awayGoals, setAwayGoals] = useState([]);
  const [homeYellow, setHomeYellow] = useState([]);
  const [awayYellow, setAwayYellow] = useState([]);
  const [homeRed, setHomeRed] = useState([]);
  const [awayRed, setAwayRed] = useState([]);

  // Badminton
  const [sets, setSets] = useState([{ home: "", away: "" }]);
  const [badmintonHomePlayers, setBadmintonHomePlayers] = useState(["", ""]);
  const [badmintonAwayPlayers, setBadmintonAwayPlayers] = useState(["", ""]);

  // Volleyball
  const [volleyballHomePlayers, setVolleyballHomePlayers] = useState(["", "", "", "", "", ""]);
  const [volleyballAwayPlayers, setVolleyballAwayPlayers] = useState(["", "", "", "", "", ""]);

  // Chess
  const [chessHomePlayer, setChessHomePlayer] = useState("");
  const [chessAwayPlayer, setChessAwayPlayer] = useState("");
  const [chessScoreText, setChessScoreText] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/matches/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat data laga");
        setMatch(data);
        if (data.home_score !== null) setHomeScore(data.home_score.toString());
        if (data.away_score !== null) setAwayScore(data.away_score.toString());

        // Fetch players for each group directly by group ID
        const [resHome, resAway] = await Promise.all([
          fetch(`/api/players?group_id=${data.home_group_id}`),
          fetch(`/api/players?group_id=${data.away_group_id}`)
        ]);
        const homePlayersData = await resHome.json();
        const awayPlayersData = await resAway.json();
        setHomePlayers(Array.isArray(homePlayersData) ? homePlayersData : []);
        setAwayPlayers(Array.isArray(awayPlayersData) ? awayPlayersData : []);

        // Populate existing details
        if (data.details) {
          const d = data.details;

          // Football — parse ke state terpisah home/away
          if (d.goals) {
            setHomeGoals((d.goals.filter(g => g.team === "home" || !g.team)).map(g => g.player || ""));
            setAwayGoals((d.goals.filter(g => g.team === "away")).map(g => g.player || ""));
          }
          if (d.yellow_cards) {
            // Support both object format {player, team} and legacy string format
            const yellows = d.yellow_cards.map(c => typeof c === "object" ? c : { player: c, team: "home" });
            setHomeYellow(yellows.filter(c => c.team === "home" || !c.team).map(c => c.player || ""));
            setAwayYellow(yellows.filter(c => c.team === "away").map(c => c.player || ""));
          }
          if (d.red_cards) {
            const reds = d.red_cards.map(c => typeof c === "object" ? c : { player: c, team: "home" });
            setHomeRed(reds.filter(c => c.team === "home" || !c.team).map(c => c.player || ""));
            setAwayRed(reds.filter(c => c.team === "away").map(c => c.player || ""));
          }

          // Badminton & Table Tennis
          if (d.sets) setSets(d.sets.map(s => ({ home: s.home ?? "", away: s.away ?? "" })));
          if (d.home_players && (data.sport_icon === "badminton" || data.sport_icon === "tabletennis")) setBadmintonHomePlayers(d.home_players.length ? d.home_players : ["", ""]);
          if (d.away_players && (data.sport_icon === "badminton" || data.sport_icon === "tabletennis")) setBadmintonAwayPlayers(d.away_players.length ? d.away_players : ["", ""]);

          // Volleyball
          if (d.home_players && (data.sport_icon === "volleyball" || data.sport_icon === "volly")) setVolleyballHomePlayers(d.home_players.length ? d.home_players : ["", "", "", "", "", ""]);
          if (d.away_players && (data.sport_icon === "volleyball" || data.sport_icon === "volly")) setVolleyballAwayPlayers(d.away_players.length ? d.away_players : ["", "", "", "", "", ""]);

          // Chess
          if (d.home_players?.[0] !== undefined && data.sport_icon === "chess") setChessHomePlayer(d.home_players[0] || "");
          if (d.away_players?.[0] !== undefined && data.sport_icon === "chess") setChessAwayPlayer(d.away_players[0] || "");
          if (d.score_text) setChessScoreText(d.score_text || "");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchData();
  }, [id]);

  // Badminton helpers
  function addSet() { setSets([...sets, { home: "", away: "" }]); }
  function updateSet(i, field, val) { const u = [...sets]; u[i] = { ...u[i], [field]: val }; setSets(u); }
  function removeSet(i) { setSets(sets.filter((_, idx) => idx !== i)); }

  // Generic list helpers
  function addToList(list, setList) { setList([...list, ""]); }
  function updateList(list, setList, i, val) { const u = [...list]; u[i] = val; setList(u); }
  function removeFromList(list, setList, i) { setList(list.filter((_, idx) => idx !== i)); }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      setSuccessMsg("");

      let details = {};
      const icon = match.sport_icon;

      if (icon === "football") {
        details = {
          goals: [
            ...homeGoals.filter(Boolean).map(name => ({ player: name, team: "home" })),
            ...awayGoals.filter(Boolean).map(name => ({ player: name, team: "away" })),
          ],
          yellow_cards: [
            ...homeYellow.filter(Boolean).map(name => ({ player: name, team: "home" })),
            ...awayYellow.filter(Boolean).map(name => ({ player: name, team: "away" })),
          ],
          red_cards: [
            ...homeRed.filter(Boolean).map(name => ({ player: name, team: "home" })),
            ...awayRed.filter(Boolean).map(name => ({ player: name, team: "away" })),
          ],
        };
      } else if (icon === "badminton" || icon === "tabletennis") {
        details = {
          sets: sets.map(s => ({ home: s.home === "" ? 0 : parseInt(s.home), away: s.away === "" ? 0 : parseInt(s.away) })),
          home_players: badmintonHomePlayers.filter(p => p.trim()),
          away_players: badmintonAwayPlayers.filter(p => p.trim()),
        };
      } else if (icon === "volleyball" || icon === "volly") {
        details = {
          sets: sets.map(s => ({ home: s.home === "" ? 0 : parseInt(s.home), away: s.away === "" ? 0 : parseInt(s.away) })),
          home_players: volleyballHomePlayers.filter(p => p.trim()),
          away_players: volleyballAwayPlayers.filter(p => p.trim()),
        };
      } else if (icon === "chess") {
        details = {
          home_players: [chessHomePlayer.trim()],
          away_players: [chessAwayPlayer.trim()],
          score_text: chessScoreText.trim(),
        };
      }

      const res = await fetch(`/api/matches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ details, home_score: homeScore, away_score: awayScore }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan detail");
      setSuccessMsg("Detail pertandingan berhasil disimpan!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-24">
      <div className="h-10 w-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (!match) return (
    <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
      <AlertTriangle className="h-10 w-10 text-red-400" />
      <p className="text-red-400 font-bold">{error || "Laga tidak ditemukan."}</p>
      <Link href="/admin" className="text-indigo-400 text-sm font-bold hover:underline">← Kembali ke Admin</Link>
    </div>
  );

  const homeName = match.home_group_name;
  const awayName = match.away_group_name;
  const icon = match.sport_icon;

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 min-w-0 max-w-3xl mx-auto w-full">

      <Link href="/admin" className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider mb-6 w-fit transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Admin
      </Link>

      {/* Match Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 mb-6 shadow">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
          Input Detail Laga — {match.match_date}
        </p>
        <div className="flex items-center justify-between gap-4">
          <span className="font-black text-lg text-white truncate">{homeName}</span>
          <span className="text-2xl font-black text-indigo-400 shrink-0">{match.home_score ?? "-"} - {match.away_score ?? "-"}</span>
          <span className="font-black text-lg text-white truncate text-right">{awayName}</span>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl mb-4 text-xs font-bold">
          <div className="flex items-center gap-2"><Check className="h-4 w-4" /><span>{successMsg}</span></div>
          <button onClick={() => setSuccessMsg("")}><X className="h-4 w-4" /></button>
        </div>
      )}
      {error && (
        <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl mb-4 text-xs font-bold">
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /><span>{error}</span></div>
          <button onClick={() => setError("")}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Final Score Inputs */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 mb-6 shadow flex flex-col md:flex-row items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{homeName} (Skor Akhir)</label>
          <input
            type="number" min="0" placeholder="0"
            value={homeScore}
            onChange={e => setHomeScore(e.target.value)}
            className="w-24 bg-slate-950 border border-indigo-800 focus:border-indigo-500 text-2xl font-black text-white px-4 py-3 rounded-2xl outline-none text-center"
          />
        </div>
        <span className="text-xl font-black text-slate-600 hidden md:block">-</span>
        <div className="flex flex-col items-center gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{awayName} (Skor Akhir)</label>
          <input
            type="number" min="0" placeholder="0"
            value={awayScore}
            onChange={e => setAwayScore(e.target.value)}
            className="w-24 bg-slate-950 border border-purple-800 focus:border-purple-500 text-2xl font-black text-white px-4 py-3 rounded-2xl outline-none text-center"
          />
        </div>
      </div>

      {/* ===== FOOTBALL — 2-COLUMN LAYOUT ===== */}
      {icon === "football" && (
        <>
          {/* Pencetak Gol */}
          <TwoColSection
            emoji="⚽"
            title="Pencetak Gol"
            homeName={homeName}
            awayName={awayName}
            homeList={homeGoals}
            awayList={awayGoals}
            homePlayers={homePlayers}
            awayPlayers={awayPlayers}
            onHomeAdd={() => addToList(homeGoals, setHomeGoals)}
            onAwayAdd={() => addToList(awayGoals, setAwayGoals)}
            onHomeChange={(i, v) => updateList(homeGoals, setHomeGoals, i, v)}
            onAwayChange={(i, v) => updateList(awayGoals, setAwayGoals, i, v)}
            onHomeRemove={(i) => removeFromList(homeGoals, setHomeGoals, i)}
            onAwayRemove={(i) => removeFromList(awayGoals, setAwayGoals, i)}
            emptyLabel="Belum ada data gol."
          />

          {/* Kartu Kuning */}
          <TwoColSection
            emoji="🟨"
            title="Kartu Kuning"
            homeName={homeName}
            awayName={awayName}
            homeList={homeYellow}
            awayList={awayYellow}
            homePlayers={homePlayers}
            awayPlayers={awayPlayers}
            onHomeAdd={() => addToList(homeYellow, setHomeYellow)}
            onAwayAdd={() => addToList(awayYellow, setAwayYellow)}
            onHomeChange={(i, v) => updateList(homeYellow, setHomeYellow, i, v)}
            onAwayChange={(i, v) => updateList(awayYellow, setAwayYellow, i, v)}
            onHomeRemove={(i) => removeFromList(homeYellow, setHomeYellow, i)}
            onAwayRemove={(i) => removeFromList(awayYellow, setAwayYellow, i)}
            emptyLabel="Belum ada kartu kuning."
            accentColor="amber"
          />

          {/* Kartu Merah */}
          <TwoColSection
            emoji="🟥"
            title="Kartu Merah"
            homeName={homeName}
            awayName={awayName}
            homeList={homeRed}
            awayList={awayRed}
            homePlayers={homePlayers}
            awayPlayers={awayPlayers}
            onHomeAdd={() => addToList(homeRed, setHomeRed)}
            onAwayAdd={() => addToList(awayRed, setAwayRed)}
            onHomeChange={(i, v) => updateList(homeRed, setHomeRed, i, v)}
            onAwayChange={(i, v) => updateList(awayRed, setAwayRed, i, v)}
            onHomeRemove={(i) => removeFromList(homeRed, setHomeRed, i)}
            onAwayRemove={(i) => removeFromList(awayRed, setAwayRed, i)}
            emptyLabel="Belum ada kartu merah."
            accentColor="red"
          />
        </>
      )}

      {/* ===== BADMINTON & TABLE TENNIS PLAYERS ONLY ===== */}
      {(icon === "badminton" || icon === "tabletennis") && (
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 mb-4 shadow">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
            <span className="text-lg">{icon === "badminton" ? "🏸" : "🏓"}</span>
            <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Pemain Bertanding</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">{homeName}</p>
              {badmintonHomePlayers.map((p, i) => (
                <select
                  key={i}
                  value={p}
                  onChange={e => { const u = [...badmintonHomePlayers]; u[i] = e.target.value; setBadmintonHomePlayers(u); }}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs font-bold text-white px-3 py-2.5 rounded-xl outline-none appearance-none cursor-pointer"
                >
                  <option value="">-- Pilih Pemain {i + 1} --</option>
                  {homePlayers.map(pl => (
                    <option key={pl.id} value={pl.name}>{pl.name}</option>
                  ))}
                </select>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2">{awayName}</p>
              {badmintonAwayPlayers.map((p, i) => (
                <select
                  key={i}
                  value={p}
                  onChange={e => { const u = [...badmintonAwayPlayers]; u[i] = e.target.value; setBadmintonAwayPlayers(u); }}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 text-xs font-bold text-white px-3 py-2.5 rounded-xl outline-none appearance-none cursor-pointer"
                >
                  <option value="">-- Pilih Pemain {i + 1} --</option>
                  {awayPlayers.map(pl => (
                    <option key={pl.id} value={pl.name}>{pl.name}</option>
                  ))}
                </select>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== VOLLEYBALL PLAYERS ONLY ===== */}
      {(icon === "volleyball" || icon === "volly") && (
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 mb-4 shadow">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
            <span className="text-lg">🏐</span>
            <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Pemain Bertanding (Input Manual)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">{homeName}</p>
              {volleyballHomePlayers.map((p, i) => (
                <input
                  key={i}
                  type="text"
                  placeholder={`Nama Pemain ${i + 1}`}
                  value={p}
                  onChange={e => { const u = [...volleyballHomePlayers]; u[i] = e.target.value; setVolleyballHomePlayers(u); }}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs font-bold text-white px-3 py-2.5 rounded-xl outline-none"
                />
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2">{awayName}</p>
              {volleyballAwayPlayers.map((p, i) => (
                <input
                  key={i}
                  type="text"
                  placeholder={`Nama Pemain ${i + 1}`}
                  value={p}
                  onChange={e => { const u = [...volleyballAwayPlayers]; u[i] = e.target.value; setVolleyballAwayPlayers(u); }}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 text-xs font-bold text-white px-3 py-2.5 rounded-xl outline-none"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== BADMINTON, TABLE TENNIS & VOLLEYBALL SET SCORES ===== */}
      {(icon === "badminton" || icon === "tabletennis" || icon === "volleyball" || icon === "volly") && (
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 mb-4 shadow">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-lg">{icon === "volleyball" || icon === "volly" ? "🏐" : (icon === "tabletennis" ? "🏓" : "🏸")}</span>
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Skor Per Set</h3>
            </div>
            <button
              onClick={addSet}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase cursor-pointer transition-all"
            >
              <Plus className="h-3.5 w-3.5" /><span>Tambah Set</span>
            </button>
          </div>
          <div className="space-y-2">
            {sets.length === 0 && <p className="text-center text-slate-600 text-xs font-bold uppercase tracking-wider py-3">Belum ada set.</p>}
            {sets.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-500 uppercase w-12 shrink-0">Set {i + 1}</span>
                <input
                  type="number" min="0" placeholder="0"
                  value={s.home}
                  onChange={e => updateSet(i, "home", e.target.value)}
                  className="w-full bg-slate-950 border border-indigo-800 focus:border-indigo-500 text-xs font-bold text-white px-4 py-2.5 rounded-xl outline-none text-center"
                />
                <span className="text-slate-500 font-black shrink-0">-</span>
                <input
                  type="number" min="0" placeholder="0"
                  value={s.away}
                  onChange={e => updateSet(i, "away", e.target.value)}
                  className="w-full bg-slate-950 border border-purple-800 focus:border-purple-500 text-xs font-bold text-white px-4 py-2.5 rounded-xl outline-none text-center"
                />
                <button onClick={() => removeSet(i)} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== CHESS ===== */}
      {icon === "chess" && (
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 mb-4 shadow">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
            <span className="text-lg">♟️</span>
            <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Detail Pertandingan Catur</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">{homeName}</p>
              <select
                value={chessHomePlayer}
                onChange={e => setChessHomePlayer(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs font-bold text-white px-3 py-2.5 rounded-xl outline-none appearance-none cursor-pointer"
              >
                <option value="">-- Pilih Pemain --</option>
                {homePlayers.map(pl => (
                  <option key={pl.id} value={pl.name}>{pl.name}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2">{awayName}</p>
              <select
                value={chessAwayPlayer}
                onChange={e => setChessAwayPlayer(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 text-xs font-bold text-white px-3 py-2.5 rounded-xl outline-none appearance-none cursor-pointer"
              >
                <option value="">-- Pilih Pemain --</option>
                {awayPlayers.map(pl => (
                  <option key={pl.id} value={pl.name}>{pl.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Keterangan Skor (opsional)</p>
            <input
              type="text"
              placeholder="cth: 1.5 - 0.5"
              value={chessScoreText}
              onChange={e => setChessScoreText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs font-bold text-white px-4 py-2.5 rounded-xl outline-none transition-all placeholder-slate-700"
            />
          </div>
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-black text-sm uppercase tracking-wider transition-all shadow-lg cursor-pointer"
      >
        {saving
          ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          : <><Save className="h-4 w-4" /><span>Simpan Detail Pertandingan</span></>
        }
      </button>

    </div>
  );
}

// ---- Sub-components ----

/**
 * TwoColSection — Layout 2 kolom (home/away) untuk setiap section sepak bola
 * Setiap kolom punya tombol tambah dan daftar dropdown pemainnya sendiri
 */
function TwoColSection({
  emoji, title,
  homeName, awayName,
  homeList, awayList,
  homePlayers, awayPlayers,
  onHomeAdd, onAwayAdd,
  onHomeChange, onAwayChange,
  onHomeRemove, onAwayRemove,
  emptyLabel,
  accentColor = "indigo"
}) {
  const homeEmpty = homeList.length === 0;
  const awayEmpty = awayList.length === 0;
  const isEmpty = homeEmpty && awayEmpty;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 mb-4 shadow">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-800">
        <span className="text-lg">{emoji}</span>
        <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex-1">{title}</h3>
      </div>

      {isEmpty && (
        <p className="text-center text-slate-600 text-xs font-bold uppercase tracking-wider py-2 mb-4">{emptyLabel}</p>
      )}

      {/* 2 Columns */}
      <div className="grid grid-cols-2 gap-4">
        {/* Home Column */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{homeName}</p>
            <button
              onClick={onHomeAdd}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white font-bold text-[10px] uppercase tracking-wide transition-all cursor-pointer"
            >
              <Plus className="h-3 w-3" /><span>Tambah</span>
            </button>
          </div>
          <div className="space-y-2">
            {homeEmpty && (
              <p className="text-slate-700 text-[10px] font-bold italic text-center py-2">— kosong —</p>
            )}
            {homeList.map((name, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={name}
                  onChange={e => onHomeChange(i, e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs font-bold text-white px-3 py-2.5 rounded-xl outline-none appearance-none cursor-pointer"
                >
                  <option value="">-- Pilih Pemain --</option>
                  {homePlayers.map(pl => (
                    <option key={pl.id} value={pl.name}>{pl.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => onHomeRemove(i)}
                  className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Away Column */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">{awayName}</p>
            <button
              onClick={onAwayAdd}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white font-bold text-[10px] uppercase tracking-wide transition-all cursor-pointer"
            >
              <Plus className="h-3 w-3" /><span>Tambah</span>
            </button>
          </div>
          <div className="space-y-2">
            {awayEmpty && (
              <p className="text-slate-700 text-[10px] font-bold italic text-center py-2">— kosong —</p>
            )}
            {awayList.map((name, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={name}
                  onChange={e => onAwayChange(i, e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-purple-500 text-xs font-bold text-white px-3 py-2.5 rounded-xl outline-none appearance-none cursor-pointer"
                >
                  <option value="">-- Pilih Pemain --</option>
                  {awayPlayers.map(pl => (
                    <option key={pl.id} value={pl.name}>{pl.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => onAwayRemove(i)}
                  className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
