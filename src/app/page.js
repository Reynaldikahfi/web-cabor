"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trophy,
  Calendar,
  Users,
  LogIn,
  Award,
  Shield,
  Clock,
  ChevronRight,
  Sparkles,
  Info
} from "lucide-react";

export default function Home() {
  const [sports, setSports] = useState([]);
  const [selectedSport, setSelectedSport] = useState(null);
  const [activeTab, setActiveTab] = useState("klasemen"); // klasemen, jadwal, pemain
  const [matches, setMatches] = useState([]);
  const [groups, setGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [scheduleFilter, setScheduleFilter] = useState("all"); // all, finished, upcoming
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    finishedCount: 0,
    upcomingCount: 0,
  });

  // Load sports initially
  useEffect(() => {
    async function initData() {
      try {
        setLoading(true);
        const [resSports, resAllGroups] = await Promise.all([
          fetch("/api/sports"),
          fetch("/api/groups")
        ]);
        const sportsData = await resSports.json();
        const allGroupsData = await resAllGroups.json();

        setAllGroups(Array.isArray(allGroupsData) ? allGroupsData : []);

        if (Array.isArray(sportsData)) {
          setSports(sportsData);
          if (sportsData.length > 0) {
            setSelectedSport(sportsData[0]);
          }
        } else {
          setSports([]);
          console.error("API Error (sports):", sportsData);
        }
      } catch (err) {
        console.error("Error initializing dashboard sports:", err);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  // Fetch matches & groups when selectedSport changes
  useEffect(() => {
    if (!selectedSport) return;

    async function fetchSportDetails() {
      try {
        setLoading(true);
        const [resMatches, resGroups] = await Promise.all([
          fetch(`/api/matches?sport_id=${selectedSport.id}`),
          fetch(`/api/groups?sport_id=${selectedSport.id}`)
        ]);

        const matchesData = await resMatches.json();
        const groupsData = await resGroups.json();

        const matchesArray = Array.isArray(matchesData) ? matchesData : [];
        const groupsArray = Array.isArray(groupsData) ? groupsData : [];

        setMatches(matchesArray);
        setGroups(groupsArray);

        // Calculate some micro stats
        const finished = matchesArray.filter(m => m.status === 'finished').length;
        const upcoming = matchesArray.filter(m => m.status === 'upcoming').length;
        setStats({
          finishedCount: finished,
          upcomingCount: upcoming
        });

      } catch (err) {
        console.error("Error fetching sport details:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSportDetails();
  }, [selectedSport]);

  // Compute standings in real time
  const standings = (() => {
    if (!groups.length) return [];

    const map = {};
    groups.forEach(g => {
      map[g.id] = {
        id: g.id,
        name: g.name,
        pool: g.pool || 'A',
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        setPointsFor: 0,
        setPointsAgainst: 0,
        setPointsDiff: 0,
        setsWon: 0,
        setsLost: 0,
        setRatio: 0,
        points: 0,
      };
    });

    const isVolleyball = selectedSport?.icon === 'volleyball' || selectedSport?.icon === 'volly';

    // Populate stats from finished matches
    matches.forEach(m => {
      if (m.status !== "finished") return;

      const homeId = m.home_group_id;
      const awayId = m.away_group_id;

      if (!map[homeId] || !map[awayId]) return;

      const homeScore = m.home_score ?? 0;
      const awayScore = m.away_score ?? 0;

      // Update played
      map[homeId].played += 1;
      map[awayId].played += 1;

      if (isVolleyball) {
        // In volleyball, scores represent sets won.
        // homeScore and awayScore should be 3-0, 3-1, 3-2, 2-3, 1-3, 0-3
        map[homeId].setsWon += homeScore;
        map[homeId].setsLost += awayScore;
        map[awayId].setsWon += awayScore;
        map[awayId].setsLost += homeScore;

        if (homeScore > awayScore) {
          map[homeId].won += 1;
          map[awayId].lost += 1;

          if (homeScore === 3 && awayScore === 2) {
            map[homeId].points += 2;
            map[awayId].points += 1;
          } else {
            map[homeId].points += 3;
            map[awayId].points += 0;
          }
        } else {
          map[awayId].won += 1;
          map[homeId].lost += 1;

          if (awayScore === 3 && homeScore === 2) {
            map[awayId].points += 2;
            map[homeId].points += 1;
          } else {
            map[awayId].points += 3;
            map[homeId].points += 0;
          }
        }
      } else {
        // Standard soccer/chess/badminton logic
        map[homeId].goalsFor += homeScore;
        map[homeId].goalsAgainst += awayScore;
        map[awayId].goalsFor += awayScore;
        map[awayId].goalsAgainst += homeScore;

        if (homeScore > awayScore) {
          map[homeId].won += 1;
          map[awayId].lost += 1;
          map[homeId].points += 3;
        } else if (homeScore < awayScore) {
          map[awayId].won += 1;
          map[homeId].lost += 1;
          map[awayId].points += 3;
        } else {
          map[homeId].drawn += 1;
          map[awayId].drawn += 1;
          map[homeId].points += 1;
          map[awayId].points += 1;
        }
      }

      if (m.details?.sets) {
        m.details.sets.forEach(set => {
          map[homeId].setPointsFor += set.home || 0;
          map[homeId].setPointsAgainst += set.away || 0;
          map[awayId].setPointsFor += set.away || 0;
          map[awayId].setPointsAgainst += set.home || 0;
        });
      }
    });

    // Compute goalDifference / setRatio and convert to array
    const list = Object.values(map).map(item => {
      item.goalDifference = item.goalsFor - item.goalsAgainst;
      item.setPointsDiff = item.setPointsFor - item.setPointsAgainst;
      if (item.setsLost === 0) {
        item.setRatio = item.setsWon;
      } else {
        item.setRatio = parseFloat((item.setsWon / item.setsLost).toFixed(3));
      }
      return item;
    });

    function getHeadToHeadWinner(teamAId, teamBId, matchesList) {
      const h2hMatch = matchesList.find(m =>
        m.status === "finished" &&
        ((m.home_group_id === teamAId && m.away_group_id === teamBId) ||
          (m.home_group_id === teamBId && m.away_group_id === teamAId))
      );
      if (!h2hMatch) return 0;
      const aIsHome = h2hMatch.home_group_id === teamAId;
      const aScore = aIsHome ? h2hMatch.home_score : h2hMatch.away_score;
      const bScore = aIsHome ? h2hMatch.away_score : h2hMatch.home_score;
      if (aScore > bScore) return -1;
      if (aScore < bScore) return 1;
      return 0;
    }

    const sorted = list.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;

      const icon = selectedSport?.icon;
      if (icon === 'football') {
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return getHeadToHeadWinner(a.id, b.id, matches) || a.name.localeCompare(b.name);
      }
      if (icon === 'badminton' || icon === 'tabletennis') {
        if (b.setPointsDiff !== a.setPointsDiff) return b.setPointsDiff - a.setPointsDiff;
        return a.name.localeCompare(b.name);
      }
      if (icon === 'volleyball' || icon === 'volly') {
        if (b.setPointsFor !== a.setPointsFor) return b.setPointsFor - a.setPointsFor;
        return getHeadToHeadWinner(a.id, b.id, matches) || a.name.localeCompare(b.name);
      }
      if (icon === 'chess') {
        return getHeadToHeadWinner(a.id, b.id, matches) || a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });

    return {
      poolA: sorted.filter(t => t.pool === 'A'),
      poolB: sorted.filter(t => t.pool === 'B')
    };
  })();

  // Filter schedule matches
  const filteredMatches = matches.filter(m => {
    if (scheduleFilter === "finished") return m.status === "finished";
    if (scheduleFilter === "upcoming") return m.status === "upcoming";
    return true;
  });

  // Group matches by date for beautiful presentation
  const groupedMatches = filteredMatches.reduce((groupsObj, match) => {
    const date = match.match_date;
    if (!groupsObj[date]) {
      groupsObj[date] = [];
    }
    groupsObj[date].push(match);
    return groupsObj;
  }, {});

  const topScorers = (() => {
    if (selectedSport?.icon !== "football") return [];
    const map = {};
    matches.forEach(m => {
      if (m.status !== "finished" || !m.details?.goals) return;
      m.details.goals.forEach(g => {
        if (!g.player) return;
        if (!map[g.player]) map[g.player] = { name: g.player, goals: 0, group: "" };
        map[g.player].goals += 1;
        if (!map[g.player].group) {
          map[g.player].group = g.team === "home" ? m.home_group_name : m.away_group_name;
        }
      });
    });
    return Object.values(map).sort((a, b) => b.goals - a.goals);
  })();

  const cardStats = (() => {
    if (selectedSport?.icon !== "football") return [];
    const map = {};
    matches.forEach(m => {
      if (m.status !== "finished" || !m.details) return;

      (m.details.yellow_cards || []).forEach(c => {
        const name = typeof c === 'object' ? c.player : c;
        const team = typeof c === 'object' ? c.team : "";
        if (!name) return;
        if (!map[name]) map[name] = { name, yellow: 0, red: 0, group: "" };
        map[name].yellow += 1;
        if (!map[name].group && team) {
          map[name].group = team === "home" ? m.home_group_name : m.away_group_name;
        }
      });

      (m.details.red_cards || []).forEach(c => {
        const name = typeof c === 'object' ? c.player : c;
        const team = typeof c === 'object' ? c.team : "";
        if (!name) return;
        if (!map[name]) map[name] = { name, yellow: 0, red: 0, group: "" };
        map[name].red += 1;
        if (!map[name].group && team) {
          map[name].group = team === "home" ? m.home_group_name : m.away_group_name;
        }
      });
    });

    return Object.values(map).sort((a, b) => b.red - a.red || b.yellow - a.yellow);
  })();

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  const getSportIcon = (iconName) => {
    switch (iconName) {
      case "football":
        return "⚽";
      case "badminton":
        return "🏸";
      case "tabletennis":
        return "🏓";
      case "chess":
        return "♟️";
      case "volleyball":
      case "volly":
        return "🏐";
      default:
        return "🏆";
    }
  };

  const renderTable = (poolData) => {
    const isVolleyball = selectedSport?.icon === 'volleyball' || selectedSport?.icon === 'volly';
    return (
      <div className="overflow-x-auto rounded-2xl border border-slate-200/60 bg-white/40">
        <table className="w-full border-collapse text-left text-sm font-medium">
          <thead>
            <tr className="bg-slate-100/50 border-b border-slate-200/50 text-slate-500 font-bold uppercase tracking-wider">
              <th className="px-4 py-3 text-center">POS</th>
              <th className="px-4 py-3">TIM</th>
              <th className="px-4 py-3 text-center">M</th>
              <th className="px-4 py-3 text-center text-emerald-500">W</th>
              {!isVolleyball && <th className="px-4 py-3 text-center text-amber-500">D</th>}
              <th className="px-4 py-3 text-center text-red-500">L</th>
              {selectedSport?.icon === 'football' && (
                <>
                  <th className="px-4 py-3 text-center hidden md:table-cell">GM</th>
                  <th className="px-4 py-3 text-center hidden md:table-cell">GK</th>
                  <th className="px-4 py-3 text-center">SG</th>
                </>
              )}
              <th className="px-4 py-3 text-center font-extrabold text-indigo-600">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/50">
            {poolData.length === 0 ? (
              <tr><td colSpan={selectedSport?.icon === 'football' ? 10 : 7} className="px-4 py-8 text-center text-slate-400 font-bold">Belum ada tim</td></tr>
            ) : (
              poolData.map((team, index) => {
                const pos = index + 1;
                const isQualified = pos <= 2;
                return (
                  <tr key={team.id} className={`hover:bg-slate-500/5 transition-colors duration-150 ${isQualified ? "bg-emerald-500/10" : ""}`}>
                    <td className="px-4 py-3 text-center font-bold text-slate-500">{pos}</td>
                    <td className="px-4 py-3 font-black text-slate-800">
                      <div className="flex items-center gap-2">
                        {isQualified && <Award className="h-4 w-4 text-emerald-500" />}
                        <span>{team.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">{team.played}</td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-500">{team.won}</td>
                    {!isVolleyball && <td className="px-4 py-3 text-center font-bold text-amber-500">{team.drawn}</td>}
                    <td className="px-4 py-3 text-center font-bold text-red-500">{team.lost}</td>
                    {selectedSport?.icon === 'football' && (
                      <>
                        <td className="px-4 py-3 text-center hidden md:table-cell text-slate-400">{team.goalsFor}</td>
                        <td className="px-4 py-3 text-center hidden md:table-cell text-slate-400">{team.goalsAgainst}</td>
                        <td className="px-4 py-3 text-center font-bold">
                          <span className={team.goalDifference > 0 ? "text-emerald-500" : team.goalDifference < 0 ? "text-red-500" : "text-slate-400"}>
                            {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                          </span>
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-center font-black text-indigo-600 text-base">{team.points}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 gradient-bg-dark flex flex-col font-sans transition-colors duration-300">

      {/* HEADER SECTION */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/50 shadow-sm backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-15 w-15 rounded-2xl flex items-center justify-center text-white shadow-md glow-indigo">
              {/* <Trophy className="h-5 w-5 animate-pulse"/> */}
              <img src="assets/logo.png" alt="Logo" className="h-15 w-15" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 bg-clip-text text-transparent">
                Tournament Olahraga IKT37
              </span>
              <span className="block text-xs font-semibold text-slate-500 tracking-widest uppercase mt-0.5">
                By Pegasus 2026
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/admin/login" className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md glow-indigo hover:-translate-y-0.5">
              <LogIn className="h-4 w-4" />
              <span>Admin</span>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO BANNER SECTION */}
      <section className="relative overflow-hidden pt-12 pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="glass-panel p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden border border-slate-200/60 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-8 glow-indigo">
          <div className="absolute inset-0 bg-radial-gradient(circle at top right, rgba(99,102,241,0.06), transparent 50%) pointer-events-none" />

          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 text-xs font-semibold uppercase tracking-wider mb-4 border border-indigo-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Turnamen Antar Grup Ronda</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none text-slate-900">
              Satu Tekad, Satu Jiwa, <br />
              <span className="gradient-text-indigo">Raih Kemenangan Utama!</span>
            </h1>

            <p className="mt-4 text-base md:text-lg text-slate-500 font-medium leading-relaxed">
              Selamat datang di Website Informasi Turnamen Olahraga 2026. Pantau klasemen, jadwal pertandingan mendatang, dan detail susunan pemain terbaik grup ronda Anda!
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 border border-slate-200/50">
                <span className="text-2xl">⚽</span>
                <div>
                  <span className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Sepak Bola</span>
                  <span className="text-xs font-bold text-slate-600">11 Pemain / Grup</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 border border-slate-200/50">
                <span className="text-2xl">🏸</span>
                <div>
                  <span className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Bulutangkis</span>
                  <span className="text-xs font-bold text-slate-600">2 Pemain / Grup</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 border border-slate-200/50">
                <span className="text-2xl">♟️</span>
                <div>
                  <span className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Catur</span>
                  <span className="text-xs font-bold text-slate-600">1 Pemain / Grup</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 border border-slate-200/50">
                <span className="text-2xl">🏐</span>
                <div>
                  <span className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Volly</span>
                  <span className="text-xs font-bold text-slate-600">6 Pemain / Grup</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 border border-slate-200/50">
                <span className="text-2xl">🏓</span>
                <div>
                  <span className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Tenis Meja</span>
                  <span className="text-xs font-bold text-slate-600">2 Pemain / Grup</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-row lg:flex-col items-center gap-4 bg-slate-100/50 border border-slate-200/40 p-6 rounded-3xl self-stretch justify-around lg:justify-center">
            <div className="text-center">
              <span className="block text-3xl font-extrabold text-indigo-600">{stats.finishedCount + stats.upcomingCount}</span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Total Laga</span>
            </div>
            <div className="w-px h-8 lg:w-8 lg:h-px bg-slate-200" />
            <div className="text-center">
              <span className="block text-3xl font-extrabold text-emerald-500">{stats.finishedCount}</span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Selesai</span>
            </div>
            <div className="w-px h-8 lg:w-8 lg:h-px bg-slate-200" />
            <div className="text-center">
              <span className="block text-3xl font-extrabold text-purple-500">{stats.upcomingCount}</span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Akan Datang</span>
            </div>
          </div>
        </div>
      </section>

      {/* SPORTS SELECTOR CARDS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-6">
        <h2 className="text-xs font-bold uppercase text-slate-400 tracking-widest mb-3">
          Cabang Olahraga
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sports.map((sport) => {
            const isSelected = selectedSport?.id === sport.id;
            return (
              <button
                key={sport.id}
                onClick={() => setSelectedSport(sport)}
                className={`p-6 rounded-3xl text-left border transition-all duration-300 flex items-center justify-between group overflow-hidden relative cursor-pointer ${isSelected
                  ? "bg-slate-900 border-indigo-600 text-white shadow-xl glow-indigo -translate-y-1" : "bg-white/60 border-slate-200/50 hover:bg-white hover:border-slate-300 shadow-sm"}`}
              >
                <div className="relative z-10">
                  <span className="block text-xs font-bold tracking-wider text-slate-400 uppercase group-hover:text-indigo-400 transition-colors">
                    CABANG
                  </span>
                  <span className="block text-2xl font-black mt-1">
                    {sport.name}
                  </span>
                </div>
                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-4xl shadow-inner transition-all duration-300 ${isSelected
                  ? "bg-indigo-600/20 text-white scale-110" : "bg-slate-100 text-slate-500 group-hover:scale-115 group-hover:bg-slate-200"}`}>
                  {getSportIcon(sport.icon)}
                </div>
                {isSelected && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 blur-xl pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* DASHBOARD CARD & TABS CONTAINER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-8 mb-16 flex-1 flex flex-col">
        <div className="glass-panel rounded-[2rem] border border-slate-200/50 shadow-xl overflow-hidden flex-1 flex flex-col glow-violet">

          {/* Dashboard Header & Tabs */}
          <div className="border-b border-slate-200/50 bg-slate-50/50 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedSport ? getSportIcon(selectedSport.icon) : "🏆"}</span>
              <div>
                <h3 className="font-extrabold text-xl">
                  {selectedSport ? selectedSport.name : "Memuat..."}
                </h3>
                <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase mt-0.5">
                  Informasi & Statistik
                </p>
              </div>
            </div>

            {/* Sub-Tabs Selector */}
            <div className="flex bg-slate-200/60 p-1.5 rounded-2xl self-start md:self-auto shadow-inner overflow-x-auto max-w-full">
              {[
                { id: "klasemen", label: "Klasemen", icon: Trophy, show: true },
                { id: "topskor", label: "Top Skor", icon: Award, show: selectedSport?.icon === "football" },
                { id: "kartu", label: "Kartu", icon: Shield, show: selectedSport?.icon === "football" },
                { id: "jadwal", label: "Jadwal & Hasil", icon: Calendar, show: true },
                { id: "pemain", label: "Daftar Pemain", icon: Users, show: true },
              ].filter(t => t.show).map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all relative ${isActive
                      ? "bg-white text-indigo-600 shadow-md scale-102" : "text-slate-500 hover:text-slate-800 hover:bg-white/30"}`}
                  >
                    <TabIcon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CONTENT ACCORDING TO TABS */}
          <div className="p-6 md:p-8 flex-1 flex flex-col">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
                <div className="h-10 w-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
                <span className="text-sm font-semibold text-slate-400 tracking-wider">MEMUAT DATA...</span>
              </div>
            ) : (
              <>
                {/* 1. TABS KLASEMEN */}
                {activeTab === "klasemen" && (
                  <div className="flex-1">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      <div>
                        <h3 className="text-sm font-black uppercase text-indigo-600 mb-4 tracking-widest flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Group A</h3>
                        {renderTable(standings.poolA || [])}
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase text-purple-600 mb-4 tracking-widest flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Group B</h3>
                        {renderTable(standings.poolB || [])}
                      </div>
                    </div>

                    <div className="mt-6 flex items-center gap-2 bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
                      <Info className="h-5 w-5 text-indigo-500 flex-shrink-0" />
                      <p className="text-xs text-indigo-600 font-medium">
                        <strong>Aturan Klasemen:</strong> Peringkat 1 dan 2 dari masing-masing grup lolos ke Fase Knockout.
                        {selectedSport?.icon === 'volleyball' || selectedSport?.icon === 'volly' ? (
                          <span> Khusus <strong>Volly</strong>, peringkat diurutkan berdasarkan: 1. Jumlah Kemenangan (W) desc, 2. Poin (PTS) desc, 3. Rasio Set desc, 4. Nama grup. Sistem Poin Volly: Menang 3-0 / 3-1 = 3 Poin, Menang 3-2 = 2 Poin, Kalah 2-3 = 1 Poin, Kalah 0-3 / 1-3 = 0 Poin.</span>
                        ) : (
                          <span> Peringkat diurutkan berdasarkan: 1. Poin (PTS) desc, 2. Selisih Gol/Poin (SG) desc, 3. Gol/Poin Memasukkan (GM) desc.</span>
                        )}
                      </p>
                    </div>

                    {/* KNOCKOUT BRACKET SECTION */}
                    <div className="mt-12 pt-10 border-t border-slate-200/60">
                      <h2 className="text-2xl font-black text-center mb-8 flex items-center justify-center gap-2">
                        <Trophy className="h-6 w-6 text-amber-500" />
                        Fase Knockout
                      </h2>
                      <div className="flex flex-col md:flex-row items-center md:items-stretch justify-center gap-4 md:gap-8 overflow-x-auto pb-8">
                        {/* Semifinal */}
                        <div className="flex flex-col gap-8 w-64 shrink-0">
                          <h4 className="text-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Semifinal</h4>
                          {['SF1', 'SF2'].map((sf, idx) => {
                            const sfMatch = matches.find(m => m.stage === 'semifinal' && (idx === 0 ? m.home_group_id === (standings.poolA?.[0]?.id) : m.home_group_id === (standings.poolB?.[0]?.id)))
                              || matches.filter(m => m.stage === 'semifinal')[idx];
                            return (
                              <div key={sf} className="bg-white border border-slate-200/50 p-4 rounded-2xl shadow-sm relative">
                                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                                  <span className="font-semibold text-sm truncate w-32">{sfMatch?.home_group_name || (idx === 0 ? "Juara Grup A" : "Juara Grup B")}</span>
                                  <span className="font-black">{sfMatch?.home_score ?? '-'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="font-semibold text-sm truncate w-32">{sfMatch?.away_group_name || (idx === 0 ? "Runner-up Grup B" : "Runner-up Grup A")}</span>
                                  <span className="font-black">{sfMatch?.away_score ?? '-'}</span>
                                </div>
                                <div className="absolute top-1/2 -right-4 md:-right-8 w-4 md:w-8 h-px bg-slate-300 hidden md:block"></div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Lines Connectors (Desktop) */}
                        <div className="hidden md:flex flex-col justify-between w-8 shrink-0 relative py-12">
                          <div className="border-r-2 border-t-2 border-b-2 border-slate-300 h-full rounded-r-lg w-full absolute right-0"></div>
                          <div className="w-8 h-px bg-slate-300 absolute top-1/2 -right-8"></div>
                        </div>

                        {/* Final */}
                        <div className="flex flex-col justify-center gap-8 w-64 shrink-0">
                          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl shadow-md relative glow-amber">
                            <h4 className="text-center text-xs font-bold text-amber-600 uppercase tracking-widest mb-4 flex items-center justify-center gap-1"><Award className="w-4 h-4" /> Final</h4>
                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-amber-500/20">
                              <span className="font-semibold text-sm truncate w-32">{matches.find(m => m.stage === 'final')?.home_group_name || "Pemenang SF1"}</span>
                              <span className="font-black text-amber-600">{matches.find(m => m.stage === 'final')?.home_score ?? '-'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-sm truncate w-32">{matches.find(m => m.stage === 'final')?.away_group_name || "Pemenang SF2"}</span>
                              <span className="font-black text-amber-600">{matches.find(m => m.stage === 'final')?.away_score ?? '-'}</span>
                            </div>
                          </div>

                          <div className="bg-slate-100 border border-slate-200/50 p-4 rounded-2xl shadow-sm mt-4">
                            <h4 className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Perebutan Juara 3</h4>
                            <div className="flex justify-between items-center mb-1 pb-1 border-b border-slate-200">
                              <span className="font-medium text-xs truncate w-32">{matches.find(m => m.stage === 'third_place')?.home_group_name || "Kalah SF1"}</span>
                              <span className="font-bold text-xs">{matches.find(m => m.stage === 'third_place')?.home_score ?? '-'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-xs truncate w-32">{matches.find(m => m.stage === 'third_place')?.away_group_name || "Kalah SF2"}</span>
                              <span className="font-bold text-xs">{matches.find(m => m.stage === 'third_place')?.away_score ?? '-'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1A. TABS TOP SKOR */}
                {activeTab === "topskor" && selectedSport?.icon === "football" && (
                  <div className="flex-1 max-w-4xl mx-auto w-full">
                    <h2 className="text-2xl font-black text-center mb-8 flex items-center justify-center gap-2">
                      <Award className="h-6 w-6 text-emerald-500" />
                      Top Skor Sepak Bola
                    </h2>
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/60 bg-white/40">
                      <table className="w-full border-collapse text-left text-sm font-medium">
                        <thead>
                          <tr className="bg-slate-100/50 border-b border-slate-200/50 text-slate-500 font-bold uppercase tracking-wider">
                            <th className="px-4 py-3 text-center w-16">#</th>
                            <th className="px-4 py-3">Pemain</th>
                            <th className="px-4 py-3">Grup</th>
                            <th className="px-4 py-3 text-center font-extrabold text-emerald-600">⚽ Gol</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/50">
                          {topScorers.length === 0 ? (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-bold">Belum ada data pencetak gol.</td></tr>
                          ) : (
                            topScorers.map((player, index) => (
                              <tr key={player.name} className="hover:bg-slate-500/5 transition-colors duration-150">
                                <td className="px-4 py-3 text-center font-bold text-slate-500">{index + 1}</td>
                                <td className="px-4 py-3 font-black text-slate-800">{player.name}</td>
                                <td className="px-4 py-3 text-slate-600">{player.group || "-"}</td>
                                <td className="px-4 py-3 text-center font-black text-emerald-600 text-base">{player.goals}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 1B. TABS KARTU */}
                {activeTab === "kartu" && selectedSport?.icon === "football" && (
                  <div className="flex-1 max-w-4xl mx-auto w-full">
                    <h2 className="text-2xl font-black text-center mb-8 flex items-center justify-center gap-2">
                      <Shield className="h-6 w-6 text-red-500" />
                      Statistik Kartu
                    </h2>
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/60 bg-white/40">
                      <table className="w-full border-collapse text-left text-sm font-medium">
                        <thead>
                          <tr className="bg-slate-100/50 border-b border-slate-200/50 text-slate-500 font-bold uppercase tracking-wider">
                            <th className="px-4 py-3 text-center w-16">#</th>
                            <th className="px-4 py-3">Pemain</th>
                            <th className="px-4 py-3">Grup</th>
                            <th className="px-4 py-3 text-center text-amber-500">🟨 Kuning</th>
                            <th className="px-4 py-3 text-center text-red-500">🟥 Merah</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/50">
                          {cardStats.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-bold">Belum ada data kartu.</td></tr>
                          ) : (
                            cardStats.map((player, index) => (
                              <tr key={player.name} className="hover:bg-slate-500/5 transition-colors duration-150">
                                <td className="px-4 py-3 text-center font-bold text-slate-500">{index + 1}</td>
                                <td className="px-4 py-3 font-black text-slate-800">{player.name}</td>
                                <td className="px-4 py-3 text-slate-600">{player.group || "-"}</td>
                                <td className="px-4 py-3 text-center font-black text-amber-500">{player.yellow}</td>
                                <td className="px-4 py-3 text-center font-black text-red-500">{player.red}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 2. TABS JADWAL & HASIL */}
                {activeTab === "jadwal" && (
                  <div className="flex-1">

                    {/* Status Filter Trigger */}
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                      {[
                        { id: "all", label: "Semua Laga" },
                        { id: "finished", label: "Selesai" },
                        { id: "upcoming", label: "Akan Datang" }
                      ].map(filter => (
                        <button
                          key={filter.id}
                          onClick={() => setScheduleFilter(filter.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${scheduleFilter === filter.id
                            ? "bg-slate-900 text-white border-transparent shadow-md" : "bg-white/40 border-slate-200/50 text-slate-500"}`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>

                    {filteredMatches.length === 0 ? (
                      <div className="text-center py-16 text-slate-400 font-bold border border-dashed border-slate-200 rounded-2xl">
                        Tidak ditemukan pertandingan yang cocok.
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {Object.entries(groupedMatches).map(([date, matchesList]) => (
                          <div key={date}>
                            <h4 className="text-xs font-extrabold tracking-widest text-slate-400 uppercase border-b border-slate-200/40 pb-2 mb-4">
                              {formatDate(date)}
                            </h4>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {matchesList.map((match) => {
                                const isFinished = match.status === "finished";
                                return (
                                  <div
                                    key={match.id}
                                    className="p-5 rounded-2xl bg-white border border-slate-200/50 shadow-sm flex flex-col gap-4 group hover:border-slate-300 transition-all hover:shadow-md hover-lift">
                                    <div className="flex justify-between items-center gap-4 w-full">
                                      <div className="flex-1 flex flex-col">
                                        <div className="flex items-center gap-2 mb-3">
                                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-400 uppercase border border-slate-200/20">
                                            {match.stage === 'group' ? 'Babak Penyisihan' : match.stage.replace('_', '')}
                                          </span>
                                          {isFinished ? (
                                            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-[10px] font-bold text-indigo-500 border border-indigo-500/20">
                                              Selesai
                                            </span>
                                          ) : (
                                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-[10px] font-bold text-amber-500 border border-amber-500/20 inline-flex items-center gap-1">
                                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                                              Akan Datang
                                            </span>
                                          )}
                                        </div>

                                        <div className="grid grid-cols-5 items-center gap-2">
                                          <span className="col-span-2 font-black text-sm text-slate-800 truncate" title={match.home_group_name}>
                                            {match.home_group_name}
                                          </span>
                                          <span className="col-span-1 text-center text-xs font-bold text-slate-400">
                                            VS
                                          </span>
                                          <span className="col-span-2 font-black text-sm text-slate-800 text-right truncate" title={match.away_group_name}>
                                            {match.away_group_name}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-2xl border border-slate-200/40 min-w-[70px]">
                                        {isFinished ? (
                                          <span className="text-lg font-black tracking-wider gradient-text-indigo">
                                            {match.home_score} - {match.away_score}
                                          </span>
                                        ) : (
                                          <div className="flex flex-col items-center text-slate-400">
                                            <Clock className="h-4 w-4 mb-0.5" />
                                            <span className="text-[10px] font-bold tracking-wider">{match.match_time || "--:--"}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {isFinished && match.details && (
                                      <div className="pt-3 border-t border-slate-100 mt-1">
                                        {selectedSport?.icon === 'football' && (
                                          <div className="grid grid-cols-2 gap-2 text-xs">

                                            {/* KOLOM KIRI - Home */}
                                            <div className="space-y-1 text-left border-r border-slate-100 pr-2">
                                              {(match.details.goals || [])
                                                .filter(g => g.team === "home" || !g.team)
                                                .map((g, i) => (
                                                  <div key={'gh-' + i} className="flex items-center gap-1 text-slate-600 font-medium">
                                                    <span>⚽</span>
                                                    <span>{g.player}</span>
                                                  </div>
                                                ))
                                              }
                                              {(match.details.yellow_cards || [])
                                                .filter(c => typeof c === 'object' ? (c.team === "home" || !c.team) : true)
                                                .map((c, i) => {
                                                  const name = typeof c === 'object' ? c.player : c.replace(/\s+\d+'?$/, '');
                                                  return (
                                                    <div key={'yh-' + i} className="flex items-center gap-1 text-slate-600 font-medium">
                                                      <span>🟨</span>
                                                      <span>{name}</span>
                                                    </div>
                                                  );
                                                })
                                              }
                                              {(match.details.red_cards || [])
                                                .filter(c => typeof c === 'object' ? (c.team === "home" || !c.team) : true)
                                                .map((c, i) => {
                                                  const name = typeof c === 'object' ? c.player : c.replace(/\s+\d+'?$/, '');
                                                  return (
                                                    <div key={'rh-' + i} className="flex items-center gap-1 text-slate-600 font-medium">
                                                      <span>🟥</span>
                                                      <span>{name}</span>
                                                    </div>
                                                  );
                                                })
                                              }
                                            </div>

                                            {/* KOLOM KANAN - Away */}
                                            <div className="space-y-1 text-right pl-2">
                                              {(match.details.goals || [])
                                                .filter(g => g.team === "away")
                                                .map((g, i) => (
                                                  <div key={'ga-' + i} className="flex items-center justify-end gap-1 text-slate-600 font-medium">
                                                    <span>{g.player}</span>
                                                    <span>⚽</span>
                                                  </div>
                                                ))
                                              }
                                              {(match.details.yellow_cards || [])
                                                .filter(c => typeof c === 'object' && c.team === "away")
                                                .map((c, i) => {
                                                  const name = typeof c === 'object' ? c.player : c;
                                                  return (
                                                    <div key={'ya-' + i} className="flex items-center justify-end gap-1 text-slate-600 font-medium">
                                                      <span>{name}</span>
                                                      <span>🟨</span>
                                                    </div>
                                                  );
                                                })
                                              }
                                              {(match.details.red_cards || [])
                                                .filter(c => typeof c === 'object' && c.team === "away")
                                                .map((c, i) => {
                                                  const name = typeof c === 'object' ? c.player : c;
                                                  return (
                                                    <div key={'ra-' + i} className="flex items-center justify-end gap-1 text-slate-600 font-medium">
                                                      <span>{name}</span>
                                                      <span>🟥</span>
                                                    </div>
                                                  );
                                                })
                                              }
                                            </div>

                                          </div>
                                        )}

                                        {(selectedSport?.icon === 'badminton' || selectedSport?.icon === 'volleyball' || selectedSport?.icon === 'volly') && (
                                          <div className="flex flex-col gap-3 pt-1">
                                            <div className="flex justify-center gap-2 flex-wrap text-xs font-bold text-slate-500">
                                              {match.details.sets?.map((s, i) => (
                                                <span key={i} className="px-2.5 py-1 bg-slate-100 rounded-md shadow-sm border border-slate-200">
                                                  S{i + 1}: {s.home} - {s.away}
                                                </span>
                                              ))}
                                            </div>
                                            {selectedSport?.icon === 'badminton' && match.details.home_players && (
                                              <div className="flex justify-between text-xs font-bold text-slate-600 px-2">
                                                <div className="flex flex-col gap-1">
                                                  {match.details.home_players?.map((p, i) => <span key={i}>{p}</span>)}
                                                </div>
                                                <div className="flex flex-col gap-1 text-right">
                                                  {match.details.away_players?.map((p, i) => <span key={i}>{p}</span>)}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {selectedSport?.icon === 'chess' && (
                                          <div className="flex flex-col gap-2 pt-1">
                                            <div className="text-center text-xs font-extrabold text-slate-400 tracking-widest">{match.details.score_text}</div>
                                            <div className="flex justify-between text-xs font-bold text-slate-600 px-4">
                                              <span>{match.details.home_players?.[0]}</span>
                                              <span>{match.details.away_players?.[0]}</span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                )}

                {/* 3. TABS PEMAIN */}
                {activeTab === "pemain" && (
                  <div className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {allGroups.map((g) => (
                        <div
                          key={g.id}
                          className="rounded-3xl border border-slate-200/60 bg-white/40 p-5 shadow-sm hover:border-slate-300 transition-all group">
                          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-200/40">
                            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-sm font-black border border-indigo-500/20">
                              {g.id}
                            </div>
                            <span className="font-extrabold text-base text-slate-800 flex-1">
                              {g.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-400 border border-slate-200/30">
                              Pool {g.pool}
                            </span>
                          </div>

                          {g.players?.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2 font-medium">Belum ada pemain terdaftar.</p>
                          ) : (
                            <ul className="space-y-2">
                              {g.players?.map((p, idx) => (
                                <li
                                  key={p.id}
                                  className="flex items-center justify-between text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100/50 border border-slate-200/30 group-hover:border-indigo-500/10 transition-all hover:bg-slate-100 hover:scale-101">
                                  <span className="text-slate-400 font-bold mr-2">#{idx + 1}</span>
                                  <span className="flex-1 text-slate-700 font-bold truncate">{p.name}</span>
                                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER SECTION */}
      <footer className="w-full bg-slate-900 text-slate-400 py-8 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <span className="font-black text-sm text-white tracking-widest uppercase">
              Tournament Olahraga 2026
            </span>
            <span className="text-xs text-slate-600 font-bold">|</span>
            <span className="text-xs font-medium">Tournament Management Console © 2026</span>
          </div>
          <p className="text-xs text-slate-600 font-semibold tracking-wider uppercase">
            By RCK
          </p>
        </div>
      </footer>
    </div>
  );
}