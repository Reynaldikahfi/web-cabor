"use client";

import { useState, useEffect } from "react";
import {
  Trophy,
  Calendar,
  Users,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Check,
  Clock,
  Download,
  FileText,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Info,
  FileSpreadsheet,
  Settings
} from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdminDashboard() {
  // Tabs and general state
  const [activeSubTab, setActiveSubTab] = useState("overview"); // overview, matches, players, reports, account
  
  // Account Form
  const [accountForm, setAccountForm] = useState({
    oldPassword: "",
    newUsername: "",
    newPassword: ""
  });
  
  const [sports, setSports] = useState([]);
  const [selectedSport, setSelectedSport] = useState(null);
  const [groups, setGroups] = useState([]);
  const [matches, setMatches] = useState([]);

  // Dashboard statistics
  const [dashboardStats, setDashboardStats] = useState({
    totalMatches: 0,
    finishedMatches: 0,
    upcomingMatches: 0,
    totalPlayers: 0,
    totalGroups: 0,
    totalSports: 0
  });

  // Modal and form states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Match Form Modal
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null); // if null, we are ADDING. if match object, we are UPDATING
  const [matchForm, setMatchForm] = useState({
    sport_id: "",
    match_date: "",
    match_time: "",
    home_group_id: "",
    away_group_id: "",
    home_score: "",
    away_score: "",
    stage: "group",
    status: "upcoming"
  });

  // Roster states
  const [selectedGroupRoster, setSelectedGroupRoster] = useState("");
  const [rosterPlayers, setRosterPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [editingPlayerName, setEditingPlayerName] = useState("");

  // Fetch initial lookups
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [resSports, resStats] = await Promise.all([
          fetch("/api/sports"),
          fetch("/api/dashboard/stats")
        ]);

        const sportsData = await resSports.json();
        const statsData = await resStats.json();

        setSports(sportsData);
        setDashboardStats(statsData);

        if (sportsData.length > 0) {
          setSelectedSport(sportsData[0]);
        }
      } catch (err) {
        console.error("Error loading admin dashboard stats/sports:", err);
        setError("Gagal memuat konfigurasi awal.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Fetch sport-specific details (matches, rosters) when selectedSport changes
  useEffect(() => {
    if (!selectedSport) return;
    refreshMatchesAndRosters();
  }, [selectedSport]);

  // Fetch Roster players when selectedGroupRoster changes
  useEffect(() => {
    if (!selectedGroupRoster) {
      setRosterPlayers([]);
      return;
    }
    fetchRosterPlayers();
  }, [selectedGroupRoster]);

  async function refreshMatchesAndRosters() {
    try {
      const [resMatches, resGroups] = await Promise.all([
        fetch(`/api/matches?sport_id=${selectedSport.id}`),
        fetch(`/api/groups?sport_id=${selectedSport.id}`)
      ]);
      const matchesData = await resMatches.json();
      const groupsData = await resGroups.json();

      setMatches(matchesData);
      setGroups(groupsData);

      if (groupsData.length > 0 && !selectedGroupRoster) {
        setSelectedGroupRoster(groupsData[0].id.toString());
      }
    } catch (err) {
      console.error("Error refreshing matches/groups:", err);
    }
  }

  async function fetchRosterPlayers() {
    try {
      // Ambil semua grup tanpa filter sport (tampilkan pemain sekali saja)
      const res = await fetch(`/api/groups`);
      const data = await res.json();
      const matchedGroup = data.find(g => g.id.toString() === selectedGroupRoster.toString());
      if (matchedGroup) {
        // Deduplikasi: satu nama hanya tampil sekali (karena tiap pemain ada di beberapa sport)
        const seen = new Set();
        const unique = (matchedGroup.players || []).filter(p => {
          if (seen.has(p.name)) return false;
          seen.add(p.name);
          return true;
        });
        setRosterPlayers(unique);
      }
    } catch (err) {
      console.error("Error loading roster:", err);
    }
  }

  async function handleUpdatePool(groupId, pool) {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pool }),
      });
      if (!res.ok) throw new Error('Gagal mengubah pool');
      setSuccessMsg(`Grup berhasil dipindah ke Pool ${pool}`);
      refreshMatchesAndRosters(); // refresh data groups
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function refreshDashboardStats() {
    try {
      const res = await fetch("/api/dashboard/stats");
      const data = await res.json();
      setDashboardStats(data);
    } catch (err) {
      console.error("Error updating stats:", err);
    }
  }

  // Handle Match Form Submission (Create or Update)
  async function handleMatchFormSubmit(e) {
    e.preventDefault();
    if (!matchForm.sport_id || !matchForm.match_date || !matchForm.home_group_id || !matchForm.away_group_id) {
      setError("Kolom berlabel bintang (*) wajib diisi!");
      return;
    }

    if (matchForm.home_group_id === matchForm.away_group_id) {
      setError("Grup kandang dan tandang tidak boleh sama!");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccessMsg("");

      const isEditing = !!editingMatch;
      const url = isEditing ? `/api/matches/${editingMatch.id}` : "/api/matches";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(matchForm)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan pertandingan");
      }

      setSuccessMsg(isEditing ? "Pertandingan berhasil diperbarui!" : "Pertandingan baru berhasil ditambahkan!");
      setShowMatchModal(false);
      setEditingMatch(null);
      refreshMatchesAndRosters();
      refreshDashboardStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  // Open Match Modal for Creating
  function openAddMatchModal() {
    setEditingMatch(null);
    setMatchForm({
      sport_id: selectedSport ? selectedSport.id.toString() : "",
      match_date: new Date().toISOString().split("T")[0],
      match_time: "19.00",
      home_group_id: "",
      away_group_id: "",
      home_score: "",
      away_score: "",
      stage: "group",
      status: "upcoming"
    });
    setError("");
    setSuccessMsg("");
    setShowMatchModal(true);
  }

  // Open Match Modal for Editing
  function openEditMatchModal(match) {
    setEditingMatch(match);
    setMatchForm({
      sport_id: match.sport_id.toString(),
      match_date: match.match_date,
      match_time: match.match_time || "",
      home_group_id: match.home_group_id.toString(),
      away_group_id: match.away_group_id.toString(),
      home_score: match.home_score !== null ? match.home_score.toString() : "",
      away_score: match.away_score !== null ? match.away_score.toString() : "",
      stage: match.stage || "group",
      status: match.status || "upcoming"
    });
    setError("");
    setSuccessMsg("");
    setShowMatchModal(true);
  }

  // Delete Match
  async function handleDeleteMatch(id) {
    if (!window.confirm("Apakah Anda yakin ingin menghapus pertandingan ini secara permanen?")) return;

    try {
      setActionLoading(true);
      setError("");
      setSuccessMsg("");

      const res = await fetch(`/api/matches/${id}`, {
        method: "DELETE"
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus pertandingan");
      }

      setSuccessMsg("Pertandingan berhasil dihapus!");
      refreshMatchesAndRosters();
      refreshDashboardStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  // Add Player to Roster
  async function handleAddPlayer(e) {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    try {
      setActionLoading(true);
      setError("");

      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPlayerName.trim(),
          group_id: parseInt(selectedGroupRoster),
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal menambahkan pemain");
      }

      setSuccessMsg("Pemain berhasil ditambahkan ke semua cabang olahraga!");
      setNewPlayerName("");
      fetchRosterPlayers();
      refreshDashboardStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  // Start Editing Player Inline
  function startEditPlayer(player) {
    setEditingPlayerId(player.id);
    setEditingPlayerName(player.name);
  }

  // Save Player Name Edit
  async function handleSavePlayerEdit(id) {
    if (!editingPlayerName.trim()) return;

    try {
      setActionLoading(true);
      setError("");

      const res = await fetch(`/api/players/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingPlayerName.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal mengubah nama pemain");
      }

      setSuccessMsg("Nama pemain berhasil diperbarui!");
      setEditingPlayerId(null);
      fetchRosterPlayers();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  // Delete Player from Roster
  async function handleDeletePlayer(id) {
    if (!window.confirm("Apakah Anda yakin ingin menghapus pemain ini dari roster?")) return;

    try {
      setActionLoading(true);
      setError("");

      const res = await fetch(`/api/players/${id}`, {
        method: "DELETE"
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus pemain");
      }

      setSuccessMsg("Pemain berhasil dihapus!");
      fetchRosterPlayers();
      refreshDashboardStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  // Update Account Function
  async function handleUpdateAccount(e) {
    e.preventDefault();
    if (!accountForm.oldPassword || !accountForm.newUsername || !accountForm.newPassword) {
      setError("Semua field wajib diisi");
      return;
    }
    
    try {
      setActionLoading(true);
      setError("");
      const res = await fetch("/api/admin/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah akun");
      
      setSuccessMsg("Akun berhasil diperbarui. Silakan login kembali dengan kredensial baru.");
      setAccountForm({ oldPassword: "", newUsername: "", newPassword: "" });
      
      setTimeout(async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/admin/login";
      }, 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  const isVolleyball = selectedSport?.icon === 'volleyball' || selectedSport?.icon === 'volly';

  // Compute standings in real time
  const standings = (() => {
    if (!groups.length) return [];

    const map = {};
    groups.forEach(g => {
      map[g.id] = {
        id: g.id,
        name: g.name,
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
    matches.forEach(m => {
      if (m.status !== "finished") return;

      const homeId = m.home_group_id;
      const awayId = m.away_group_id;

      if (!map[homeId] || !map[awayId]) return;

      const homeScore = m.home_score ?? 0;
      const awayScore = m.away_score ?? 0;

      map[homeId].played += 1;
      map[awayId].played += 1;

      if (isVolleyball) {
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

    return list.sort((a, b) => {
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
  })();

  // ------------------ REPORTS EXPORT LOGIC ------------------

  // 1. EXCEL EXPORT
  function handleExcelExport() {
    try {
      const sportName = selectedSport ? selectedSport.name : "Turnamen";
      const wb = XLSX.utils.book_new();

      // Standings sheet
      const dataStandings = standings.map((item, index) => {
        if (selectedSport?.icon === 'football') {
          return {
            "Peringkat": index + 1,
            "Grup Ronda": item.name,
            "Main (P)": item.played,
            "Menang (W)": item.won,
            "Seri (D)": item.drawn,
            "Kalah (L)": item.lost,
            "Gol/Poin Memasukkan (GF)": item.goalsFor,
            "Gol/Poin Kemasukan (GA)": item.goalsAgainst,
            "Selisih Gol/Poin (GD)": item.goalDifference,
            "Poin (PTS)": item.points
          };
        } else {
          return {
            "Peringkat": index + 1,
            "Grup Ronda": item.name,
            "Main (P)": item.played,
            "Menang (W)": item.won,
            "Seri (D)": item.drawn,
            "Kalah (L)": item.lost,
            "Poin (PTS)": item.points
          };
        }
      });
      const wsStandings = XLSX.utils.json_to_sheet(dataStandings);
      XLSX.utils.book_append_sheet(wb, wsStandings, "Klasemen " + sportName);

      // Matches sheet
      const dataMatches = matches.map(item => ({
        "Hari/Tanggal": item.match_date,
        "Waktu (WIB)": item.match_time || "--.--",
        "Grup Kandang (Home)": item.home_group_name,
        "Skor Kandang": item.home_score !== null ? item.home_score : "-",
        "Skor Tandang": item.away_score !== null ? item.away_score : "-",
        "Grup Tandang (Away)": item.away_group_name,
        "Babak / Tahap": item.stage === 'group' ? 'Babak Penyisihan' : item.stage,
        "Status Laga": item.status === 'finished' ? 'Selesai' : 'Akan Datang'
      }));
      const wsMatches = XLSX.utils.json_to_sheet(dataMatches);
      XLSX.utils.book_append_sheet(wb, wsMatches, "Jadwal Pertandingan");

      XLSX.writeFile(wb, `Laporan_Turnamen_${sportName.replace(/\s+/g, '_')}_2026.xlsx`);
      setSuccessMsg("Laporan Excel berhasil diunduh!");
    } catch (err) {
      console.error("Excel generation error:", err);
      setError("Gagal menghasilkan file Excel.");
    }
  }

  // 2. PDF EXPORT (jsPDF + jsPDF-AutoTable)
  function handlePDFExport() {
    try {
      const sportName = selectedSport ? selectedSport.name : "Turnamen";
      const doc = new jsPDF("p", "mm", "a4");

      // Set Document Header Band
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 35, "F");

      // Header Texts
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text("LAPORAN RESMI TURNAMEN CABOR RCK 2026", 14, 15);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Cabang Olahraga: ${sportName}  |  Dibuat Tanggal: ${new Date().toLocaleDateString("id-ID")}`, 14, 22);

      // ----------------------------------------------------
      // Section 1: Standings Title & Table
      // ----------------------------------------------------
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("KLASEMEN LEAGUE AKHIR (REAL-TIME)", 14, 45);

      const standingsHeaders = selectedSport?.icon === 'football'
        ? [["POS", "GRUP RONDA", "MAIN", "MENANG", "SERI", "KALAH", "GM", "GK", "SG", "POIN"]]
        : [["POS", "GRUP RONDA", "MAIN", "MENANG", "SERI", "KALAH", "POIN"]];

      const standingsRows = standings.map((item, idx) => {
        if (selectedSport?.icon === 'football') {
          return [
            idx + 1,
            item.name,
            item.played,
            item.won,
            item.drawn,
            item.lost,
            item.goalsFor,
            item.goalsAgainst,
            item.goalDifference > 0 ? `+${item.goalDifference}` : item.goalDifference,
            item.points
          ];
        } else {
          return [
            idx + 1,
            item.name,
            item.played,
            item.won,
            item.drawn,
            item.lost,
            item.points
          ];
        }
      });

      autoTable(doc, {
        startY: 50,
        head: standingsHeaders,
        body: standingsRows,
        theme: "striped",
        headStyles: { fillColor: [99, 102, 241], halign: "center" }, // Violet HSL accent
        columnStyles: selectedSport?.icon !== 'football' ? {
          0: { halign: "center", fontStyle: "bold" },
          1: { fontStyle: "bold" },
          2: { halign: "center" },
          3: { halign: "center" },
          4: { halign: "center" },
          5: { halign: "center" },
          6: { halign: "center", fontStyle: "bold", textColor: [99, 102, 241] },
        } : {
          0: { halign: "center", fontStyle: "bold" },
          1: { fontStyle: "bold" },
          2: { halign: "center" },
          3: { halign: "center" },
          4: { halign: "center" },
          5: { halign: "center" },
          6: { halign: "center" },
          7: { halign: "center" },
          8: { halign: "center" },
          9: { halign: "center", fontStyle: "bold", textColor: [99, 102, 241] },
        },
        styles: { fontSize: 9 }
      });

      // ----------------------------------------------------
      // Section 2: Matches Title & Table
      // ----------------------------------------------------
      const finalYAfterStandings = doc.lastAutoTable.finalY || 120;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("JADWAL & HASIL LENGKAP PERTANDINGAN", 14, finalYAfterStandings + 10);

      const matchesHeaders = [["TANGGAL", "WAKTU", "TIM KANDANG", "SKOR", "TIM TANDANG", "BABAK", "STATUS"]];
      const matchesRows = matches.map(item => [
        item.match_date,
        item.match_time || "--.--",
        item.home_group_name,
        item.status === 'finished' ? `${item.home_score} - ${item.away_score}` : "VS",
        item.away_group_name,
        item.stage === 'group' ? 'Penyisihan' : item.stage,
        item.status === 'finished' ? 'Selesai' : 'Akan Datang'
      ]);

      autoTable(doc, {
        startY: finalYAfterStandings + 15, // Diubah ke nama variabel yang benar + offset
        head: matchesHeaders,
        body: matchesRows,
        theme: "grid",
        headStyles: { fillColor: [16, 185, 129], halign: "center" }, // Emerald HSL accent
        columnStyles: {
          0: { fontStyle: "bold" },
          1: { halign: "center" },
          2: { fontStyle: "bold" },
          3: { halign: "center", fontStyle: "bold" },
          4: { fontStyle: "bold" },
          5: { halign: "center" },
          6: { halign: "center" },
        },
        styles: { fontSize: 8.5 }
      });

      // ----------------------------------------------------
      // Section 3: Footer Signature (Tanda Tangan)
      // ----------------------------------------------------
      const finalYAfterMatches = doc.lastAutoTable.finalY || 250;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);

      // Menggunakan variabel finalYAfterMatches secara konsisten
      doc.text("Mengetahui,", 14, finalYAfterMatches + 15);
      doc.text("Ketua Panitia Pelaksana 2026", 14, finalYAfterMatches + 20);
      doc.text("_______________________________", 14, finalYAfterMatches + 40);

      // Simpan Dokumen
      doc.save(`Laporan_Turnamen_${sportName.replace(/\s+/g, '_')}_2026.pdf`);
      setSuccessMsg("Laporan PDF berhasil diunduh!");

    } catch (err) {
      console.error("PDF generation error:", err);
      setError("Gagal menghasilkan file PDF.");
    }
  }

  function getSportIcon(iconName) {
    switch (iconName) {
      case "football": return "⚽";
      case "badminton": return "🏸";
      case "tabletennis": return "🏓";
      case "chess": return "♟️";
      case "volleyball":
      case "volly":
        return "🏐";
      default: return "🏆";
    }
  }

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 min-w-0">

      {/* SUCCESS / ERROR ALERTS */}
      {successMsg && (
        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl mb-6 text-xs font-bold relative animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="h-4.5 w-4.5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-400 hover:text-white cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl mb-6 text-xs font-bold relative animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-red-400 hover:text-white cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* DASHBOARD TOP HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            WORKSPACE OPERASIONAL
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
            Pusat Pengendalian dan Pencatatan Turnamen
          </p>
        </div>

        {/* Cabor Switcher */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl self-start lg:self-auto shadow shadow-slate-950">
          {sports.map(s => {
            const isSelected = selectedSport?.id === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSport(s)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase transition-all cursor-pointer ${isSelected
                  ? "bg-indigo-600 text-white shadow shadow-indigo-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
              >
                <span className="mr-1.5">{getSportIcon(s.icon)}</span>
                <span>{s.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ADMIN SUB-TABS SELECTOR */}
      <div className="flex border-b border-slate-800/80 mb-6 overflow-x-auto gap-2 pb-px flex-shrink-0">
        {[
          { id: "overview", label: "Overview Stats", icon: TrendingUp },
          { id: "matches", label: "Pertandingan", icon: Calendar },
          { id: "players", label: "Roster Pemain", icon: Users },
          { id: "reports", label: "Laporan", icon: FileText },
          { id: "account", label: "Pengaturan Akun", icon: Settings },
        ].map(tab => {
          const TabIcon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id);
                setError("");
                setSuccessMsg("");
              }}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex-shrink-0 ${isActive
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-200"
                }`}
            >
              <TabIcon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* LOADING INDICATOR */}
      {loading ? (
        <div className="flex-1 flex flex-col justify-center items-center py-20 gap-4">
          <div className="h-10 w-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">Memuat data operasional...</span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">

          {/* 1. OVERVIEW STATS TAB */}
          {activeSubTab === "overview" && (
            <div className="space-y-6">
              {/* Metrics cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { label: "Total Pemain Terdaftar", val: dashboardStats.totalPlayers, icon: Users, color: "glow-indigo border-indigo-500/20" },
                  { label: "Pertandingan Selesai", val: dashboardStats.finishedMatches, icon: Trophy, color: "glow-emerald border-emerald-500/20" },
                  { label: "Pertandingan Mendatang", val: dashboardStats.upcomingMatches, icon: Clock, color: "glow-violet border-purple-500/20" },
                ].map((card, idx) => {
                  const CardIcon = card.icon;
                  return (
                    <div
                      key={idx}
                      className={`p-6 rounded-[2rem] bg-slate-900 border ${card.color} shadow flex items-center justify-between hover-lift group`}
                    >
                      <div>
                        <span className="block text-slate-500 text-xs font-bold uppercase tracking-wider">
                          {card.label}
                        </span>
                        <span className="block text-4xl font-black mt-2 text-white">
                          {card.val}
                        </span>
                      </div>
                      <div className="h-14 w-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:scale-110 group-hover:bg-slate-700/80 transition-all duration-300">
                        <CardIcon className="h-6 w-6" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live mini standings summary */}
              <div className="glass-panel p-6 rounded-[2rem] border border-slate-800 bg-slate-900/20 mt-8">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-indigo-400" />
                    <h3 className="font-extrabold text-base text-white">
                      Peringkat Saat Ini ({selectedSport?.name})
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">REAL-TIME STANDINGS</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-medium">
                    <thead>
                      <tr className="text-slate-500 font-bold uppercase tracking-wider border-b border-slate-800/50 pb-2">
                        <th className="py-2.5 text-center w-12">POS</th>
                        <th className="py-2.5">GRUP RONDA</th>
                        <th className="py-2.5 text-center">MAIN</th>
                        <th className="py-2.5 text-center">MENANG</th>
                        {selectedSport?.icon === 'football' && <th className="py-2.5 text-center">SERI</th>}
                        <th className="py-2.5 text-center">KALAH</th>
                        {selectedSport?.icon === 'football' && (
                          <th className="py-2.5 text-center">SG</th>
                        )}
                        <th className="py-2.5 text-center font-bold text-indigo-400">POIN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {standings.map((team, idx) => (
                        <tr key={team.id} className="hover:bg-slate-800/30">
                          <td className="py-3 text-center font-black text-slate-500">{idx + 1}</td>
                          <td className="py-3 font-bold text-slate-200">{team.name}</td>
                          <td className="py-3 text-center">{team.played}</td>
                          <td className="py-3 text-center text-emerald-500 font-bold">{team.won}</td>
                          {selectedSport?.icon === 'football' && <td className="py-3 text-center text-amber-500 font-bold">{team.drawn}</td>}
                          <td className="py-3 text-center text-red-500 font-bold">{team.lost}</td>
                          {selectedSport?.icon === 'football' && (
                            <td className="py-3 text-center font-bold">{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</td>
                          )}
                          <td className="py-3 text-center font-black text-indigo-400">{team.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2. MATCHES CRUD TAB */}
          {activeSubTab === "matches" && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-400" />
                  <h2 className="font-extrabold text-base text-white">Kelola Daftar Pertandingan ({selectedSport?.name})</h2>
                </div>
                <button
                  onClick={openAddMatchModal}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wide transition-all shadow hover:-translate-y-0.5 cursor-pointer"
                >
                  <Plus className="h-4.5 w-4.5" />
                  <span>Tambah Laga</span>
                </button>
              </div>

              {/* Table list of matches */}
              <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/20">
                <table className="w-full text-left text-xs font-semibold">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="px-5 py-4 w-12 text-center">ID</th>
                      <th className="px-5 py-4">TANGGAL</th>
                      <th className="px-5 py-4">WAKTU</th>
                      <th className="px-5 py-4">TIM KANDANG</th>
                      <th className="px-5 py-4 text-center">SKOR</th>
                      <th className="px-5 py-4">TIM TANDANG</th>
                      <th className="px-5 py-4">BABAK</th>
                      <th className="px-5 py-4">STATUS</th>
                      <th className="px-5 py-4 text-right">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {matches.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-5 py-12 text-center text-slate-500 font-bold uppercase tracking-wider">
                          Belum ada jadwal pertandingan terdaftar.
                        </td>
                      </tr>
                    ) : (
                      matches.map(m => (
                        <tr key={m.id} className="hover:bg-slate-800/30">
                          <td className="px-5 py-4 text-center text-slate-600 font-bold">#{m.id}</td>
                          <td className="px-5 py-4 font-bold text-slate-300">{m.match_date}</td>
                          <td className="px-5 py-4 font-medium text-slate-400">{m.match_time || "--:--"}</td>
                          <td className="px-5 py-4 font-bold text-slate-200">{m.home_group_name}</td>
                          <td className="px-5 py-4 text-center font-black">
                            {m.status === "finished" ? (
                              <span className="gradient-text-indigo text-sm">{m.home_score} - {m.away_score}</span>
                            ) : (
                              <span className="text-slate-600 font-bold text-xs uppercase">VS</span>
                            )}
                          </td>
                          <td className="px-5 py-4 font-bold text-slate-200">{m.away_group_name}</td>
                          <td className="px-5 py-4 text-slate-400 capitalize">{m.stage === 'group' ? 'Penyisihan' : m.stage}</td>
                          <td className="px-5 py-4">
                            {m.status === "finished" ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-[9px] font-bold text-emerald-400 border border-emerald-500/20">Selesai</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-[9px] font-bold text-amber-400 border border-amber-500/20">Mendatang</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditMatchModal(m)}
                                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
                                title="Edit Match Score / Info"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              {/* TAMBAHAN: Tombol Input Detail untuk cabor yang memiliki detail */}
                              {(selectedSport?.icon === "football" || selectedSport?.icon === "badminton" || selectedSport?.icon === "tabletennis" || selectedSport?.icon === "chess" || selectedSport?.icon === "volleyball" || selectedSport?.icon === "volly") && m.status === "finished" && (
                                <Link
                                  href={`/admin/matches/${m.id}`}
                                  className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all cursor-pointer"
                                  title="Input Detail Pertandingan"
                                >
                                  {getSportIcon(selectedSport?.icon)}
                                </Link>
                              )}
                              <button
                                onClick={() => handleDeleteMatch(m.id)}
                                className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                                title="Delete Match"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. ROSTERS CRUD TAB */}
          {activeSubTab === "players" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-y-auto">

              {/* Group selection list */}
              <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow flex flex-col min-h-[300px]">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
                  <Users className="h-5 w-5 text-indigo-400" />
                  <h3 className="font-extrabold text-base text-white">Pilih Grup Ronda</h3>
                </div>

                <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                  {groups.map(g => {
                    const isSelected = selectedGroupRoster.toString() === g.id.toString();
                    return (
                      <div
                        key={g.id}
                        className={`w-full p-4 text-left border rounded-2xl flex items-center justify-between font-bold text-xs uppercase tracking-wider transition-all ${isSelected
                          ? "bg-slate-950 border-indigo-500 text-white shadow shadow-indigo-500/10"
                          : "bg-slate-900/40 border-slate-800/50 text-slate-400"
                          }`}
                      >
                        <button onClick={() => setSelectedGroupRoster(g.id.toString())} className="flex-1 cursor-pointer text-left hover:text-white">
                          {g.name}
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-[10px] font-bold text-slate-500">
                            {g.players?.length || 0} Pemain
                          </span>
                          <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800/50">
                            <button
                              onClick={() => handleUpdatePool(g.id, 'A')}
                              className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${g.pool === 'A' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'
                                }`}
                            >
                              Grup A
                            </button>
                            <button
                              onClick={() => handleUpdatePool(g.id, 'B')}
                              className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${g.pool === 'B' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-white'
                                }`}
                            >
                              Grup B
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Players roster editor */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="font-extrabold text-base text-white">
                      Roster Pemain {selectedSport?.name}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                      Grup: {groups.find(g => g.id.toString() === selectedGroupRoster.toString())?.name || "-"}
                    </p>
                  </div>

                  {/* Add Player Inline Form */}
                  <form onSubmit={handleAddPlayer} className="flex gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Nama pemain baru..."
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      disabled={actionLoading}
                      className="flex-1 sm:w-48 bg-slate-950 border border-slate-800 focus:border-indigo-500 pl-4 pr-3 py-2 rounded-xl text-xs font-semibold text-white placeholder-slate-700 outline-none transition-all outline-none"
                    />
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase transition-all shadow cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Tambah</span>
                    </button>
                  </form>
                </div>

                {/* Players List */}
                <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/20 p-4">
                  {rosterPlayers.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 font-bold uppercase tracking-wider text-xs">
                      Belum ada pemain terdaftar untuk grup ronda ini di cabang {selectedSport?.name}.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {rosterPlayers.map((player, idx) => {
                        const isEditing = editingPlayerId === player.id;

                        return (
                          <div
                            key={player.id}
                            className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-sm flex items-center justify-between gap-3 group hover:border-slate-700 transition-all"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-slate-600 font-black text-xs">#{idx + 1}</span>

                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingPlayerName}
                                  onChange={(e) => setEditingPlayerName(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 pl-3 pr-2 py-1.5 rounded-xl text-xs font-bold text-white outline-none"
                                />
                              ) : (
                                <span className="font-extrabold text-xs text-slate-200 truncate">
                                  {player.name}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSavePlayerEdit(player.id)}
                                    className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer"
                                    title="Save changes"
                                  >
                                    <Save className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingPlayerId(null)}
                                    className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                                    title="Cancel"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEditPlayer(player)}
                                    className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
                                    title="Edit name"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePlayer(player.id)}
                                    className="p-2 rounded-xl bg-red-500/10 text-red-450 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                                    title="Delete Player"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2 bg-indigo-950/20 border border-indigo-900/30 p-3 rounded-2xl">
                  <Info className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                  <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wide">
                    Pemain yang ditambahkan otomatis terdaftar di semua cabang olahraga (Sepak Bola, Bulutangkis, Catur).
                  </p>
                </div>

              </div>

            </div>
          )}

          {/* 4. REPORTS & EXPORT TAB */}
          {activeSubTab === "reports" && (
            <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 shadow max-w-2xl mx-auto w-full text-center">
              <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
                <FileSpreadsheet className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-black text-white">Ekspor Laporan Turnamen Resmi</h2>
              <p className="text-slate-500 text-xs mt-2 max-w-md mx-auto font-medium">
                Unduh salinan klasemen saat ini dan jadwal/hasil pertandingan lengkap untuk cabang olahraga **{selectedSport?.name}** dalam format professional siap cetak.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                <button
                  onClick={handleExcelExport}
                  className="flex items-center justify-center gap-2.5 p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all hover:scale-102 hover:-translate-y-0.5 cursor-pointer hover:shadow-lg hover:shadow-emerald-500/5 glow-indigo"
                >
                  <span className="text-lg">📊</span>
                  <div className="text-left">
                    <span className="block font-black text-slate-200">UNDUH EXCEL (.XLSX)</span>
                    <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Spreadsheet Data Lengkap</span>
                  </div>
                </button>

                <button
                  onClick={handlePDFExport}
                  className="flex items-center justify-center gap-2.5 p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-red-500 text-white font-bold text-xs uppercase tracking-wider transition-all hover:scale-102 hover:-translate-y-0.5 cursor-pointer hover:shadow-lg hover:shadow-red-500/5 glow-indigo"
                >
                  <FileText className="h-5 w-5 text-red-500" />
                  <div className="text-left">
                    <span className="block font-black text-slate-200">UNDUH PDF (.PDF)</span>
                    <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Format Laporan Siap Cetak</span>
                  </div>
                </button>
              </div>

              <div className="mt-8 border-t border-slate-800/80 pt-6">
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                  PORTAL GENERATOR DOKUMEN RESMI CABOR 2026
                </p>
              </div>
            </div>
          )}

          {/* 5. PENGATURAN AKUN TAB */}
          {activeSubTab === "account" && (
            <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 shadow max-w-xl mx-auto w-full">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
                <Settings className="h-6 w-6 text-indigo-400" />
                <h2 className="font-extrabold text-lg text-white">Ubah Kredensial Admin</h2>
              </div>
              
              <form onSubmit={handleUpdateAccount} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Password Saat Ini *</label>
                  <input
                    type="password"
                    required
                    value={accountForm.oldPassword}
                    onChange={(e) => setAccountForm({ ...accountForm, oldPassword: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-sm font-bold text-white px-4 py-3 rounded-xl outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Username Baru *</label>
                  <input
                    type="text"
                    required
                    value={accountForm.newUsername}
                    onChange={(e) => setAccountForm({ ...accountForm, newUsername: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-sm font-bold text-white px-4 py-3 rounded-xl outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Password Baru *</label>
                  <input
                    type="password"
                    required
                    value={accountForm.newPassword}
                    onChange={(e) => setAccountForm({ ...accountForm, newPassword: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-sm font-bold text-white px-4 py-3 rounded-xl outline-none transition-colors"
                  />
                </div>
                
                <div className="pt-4 mt-2 border-t border-slate-800">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all shadow glow-indigo cursor-pointer"
                  >
                    {actionLoading ? (
                      <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Simpan & Logout</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      )}

      {/* ------------------ MATCH FORM MODAL ------------------ */}
      {showMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg glass-panel bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative glow-indigo">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-6">
              <div>
                <h3 className="font-extrabold text-lg text-white">
                  {editingMatch ? "Input Hasil & Skor Laga" : "Buat Pertandingan Baru"}
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                  Cabang: {selectedSport?.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowMatchModal(false);
                  setEditingMatch(null);
                }}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleMatchFormSubmit} className="space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tanggal *</label>
                  <input
                    type="date"
                    required
                    value={matchForm.match_date}
                    onChange={(e) => setMatchForm({ ...matchForm, match_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs font-bold text-white pl-4 pr-3 py-3 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Waktu WIB</label>
                  <input
                    type="text"
                    placeholder="19.30"
                    value={matchForm.match_time}
                    onChange={(e) => setMatchForm({ ...matchForm, match_time: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs font-bold text-white pl-4 pr-3 py-3 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tim Kandang *</label>
                  <select
                    required
                    value={matchForm.home_group_id}
                    onChange={(e) => setMatchForm({ ...matchForm, home_group_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs font-bold text-white px-3 py-3 rounded-xl outline-none appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Pilih Grup</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tim Tandang *</label>
                  <select
                    required
                    value={matchForm.away_group_id}
                    onChange={(e) => setMatchForm({ ...matchForm, away_group_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs font-bold text-white px-3 py-3 rounded-xl outline-none appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Pilih Grup</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status and stage */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Babak *</label>
                  <select
                    required
                    value={matchForm.stage}
                    onChange={(e) => setMatchForm({ ...matchForm, stage: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs font-bold text-white px-3 py-3 rounded-xl outline-none appearance-none cursor-pointer"
                  >
                    <option value="group">Penyisihan Grup</option>
                    <option value="semi-final">Semi Final</option>
                    <option value="final">Grand Final</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Status Laga *</label>
                  <select
                    required
                    value={matchForm.status}
                    onChange={(e) => setMatchForm({ ...matchForm, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs font-bold text-white px-3 py-3 rounded-xl outline-none appearance-none cursor-pointer"
                  >
                    <option value="upcoming">Akan Datang</option>
                    <option value="finished">Selesai</option>
                  </select>
                </div>
              </div>

              {/* Score Input: only relevant or active when finished */}
              {matchForm.status === "finished" && (
                <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-900/30 space-y-3">
                  <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                    Catat Skor Pertandingan
                  </span>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Skor Tim Kandang</label>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        value={matchForm.home_score}
                        onChange={(e) => setMatchForm({ ...matchForm, home_score: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs font-bold text-white pl-4 pr-3 py-3 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Skor Tim Tandang</label>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        value={matchForm.away_score}
                        onChange={(e) => setMatchForm({ ...matchForm, away_score: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs font-bold text-white pl-4 pr-3 py-3 rounded-xl outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-800/80 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowMatchModal(false);
                    setEditingMatch(null);
                  }}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-bold text-xs uppercase transition-all shadow glow-indigo cursor-pointer flex items-center gap-1.5"
                >
                  {actionLoading ? (
                    <div className="h-3.5 w-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{editingMatch ? "Simpan Perubahan" : "Terbitkan Laga"}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
