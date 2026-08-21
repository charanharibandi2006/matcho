import { createContext, useContext, useState, useEffect, useRef } from "react";

const LiveMatchContext = createContext();

const INITIAL_MATCHES = [];

const INITIAL_NOTIFICATIONS = [];

const INITIAL_TOURNAMENTS = [];

const INITIAL_PROFILES = {
  player: {
    name: "Alex Player",
    email: "alex.player@example.com",
    phone: "9876543210",
    bio: "Competitive badminton player. Always up for a good rally.",
    location: "Hyderabad",
    avatar: "🏸",
    role: "Player",
  },
  organizer: {
    name: "Organizer Admin",
    email: "organizer.admin@example.com",
    phone: "9123456780",
    bio: "Running multi-sport tournaments across the city.",
    location: "Hyderabad",
    avatar: "🏆",
    role: "Organizer",
  },
};

const INITIAL_PLAYER_STATS = {};

const getPlayerStatsKey = (name) => name.trim().toLowerCase();

const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);

const buildRoundRobinFixtures = (players) => {
  const fixtures = [];
  players.forEach((player, index) => {
    players.slice(index + 1).forEach((opponent) => fixtures.push([player, opponent]));
  });
  return fixtures;
};

const COLOR_PALETTE = [
  "linear-gradient(120deg,#ffb26b,#7e3ff2)",
  "linear-gradient(120deg,#21b566,#2f6fed)",
  "linear-gradient(120deg,#ff4b4b,#ffb300)",
  "linear-gradient(120deg,#00c6ff,#7e3ff2)",
  "linear-gradient(120deg,#f857a6,#ff5858)",
];

export function LiveMatchProvider({ children }) {
  const receivedRemoteUpdate = useRef(false);
  const [matches, setMatches] = useState(() => {
    try {
      const saved = localStorage.getItem("matcho_live_matches");

      if (!saved) return INITIAL_MATCHES;

      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return INITIAL_MATCHES;

      return parsed.filter(
        (match) => !["m-101", "m-102", "m-103", "m-104"].includes(String(match?.id))
      );
    } catch {
      return INITIAL_MATCHES;
    }
  });

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem("matcho_notifications");

      if (!saved) return INITIAL_NOTIFICATIONS;

      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return INITIAL_NOTIFICATIONS;

      return parsed.filter(
        (notification) => !["n1", "n2", "n3"].includes(String(notification?.id))
      );
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  const [tournaments, setTournaments] = useState(() => {
    try {
      const saved = localStorage.getItem("matcho_tournaments");

      if (!saved) return INITIAL_TOURNAMENTS;

      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return INITIAL_TOURNAMENTS;

      return parsed.filter(
        (tournament) => !String(tournament?.id || "").startsWith("t-20")
      );
    } catch {
      return INITIAL_TOURNAMENTS;
    }
  });

  const [profiles, setProfiles] = useState(() => {
    const saved = localStorage.getItem("matcho_profiles");
    return saved ? JSON.parse(saved) : INITIAL_PROFILES;
  });

  const [playerStats, setPlayerStats] = useState(() => {
    const saved = localStorage.getItem("matcho_player_stats");
    return saved ? JSON.parse(saved) : INITIAL_PLAYER_STATS;
  });
  const [registrations, setRegistrations] = useState(() => {
    const saved = localStorage.getItem("matcho_tournament_registrations");
    return saved ? JSON.parse(saved) : {};
  });

  const [activeScoringMatch, setActiveScoringMatch] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [scoreHistory, setScoreHistory] = useState({});

  // Sync tournaments & profiles to LocalStorage
  useEffect(() => {
    localStorage.setItem("matcho_tournaments", JSON.stringify(tournaments));
  }, [tournaments]);

  useEffect(() => {
    localStorage.setItem("matcho_profiles", JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem("matcho_player_stats", JSON.stringify(playerStats));
  }, [playerStats]);

  useEffect(() => {
    localStorage.setItem("matcho_tournament_registrations", JSON.stringify(registrations));
  }, [registrations]);

  // Sync state to LocalStorage and BroadcastChannel for cross-tab real-time sync
  useEffect(() => {
    localStorage.setItem("matcho_live_matches", JSON.stringify(matches));
    localStorage.setItem("matcho_notifications", JSON.stringify(notifications));

    if (window.BroadcastChannel && !receivedRemoteUpdate.current) {
      const channel = new BroadcastChannel("matcho_realtime_channel");
      channel.postMessage({ type: "MATCHES_UPDATED", payload: matches });
      channel.close();
    }

    receivedRemoteUpdate.current = false;
  }, [matches, notifications]);

  // Listen for multi-tab updates
  useEffect(() => {
    if (!window.BroadcastChannel) return;
    const channel = new BroadcastChannel("matcho_realtime_channel");
    channel.onmessage = (event) => {
      if (event.data?.type === "MATCHES_UPDATED") {
        receivedRemoteUpdate.current = true;
        setMatches(event.data.payload);
      }
    };
    return () => channel.close();
  }, []);

  // Real-time live match simulator (randomly updates point every few seconds if enabled)
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setMatches((prevMatches) => {
        return prevMatches.map((match) => {
          if (match.status !== "LIVE") return match;

          // 40% chance for this match to score a point
          if (Math.random() > 0.6) {
            const isP1 = Math.random() > 0.45;
            let updatedP1 = { ...match.player1 };
            let updatedP2 = { ...match.player2 };
            let notifText = "";

            if (match.sport === "badminton" || match.sport === "tabletennis") {
              if (isP1) {
                updatedP1.score += 1;
                notifText = `Point for ${match.player1.name}! (${updatedP1.score}-${updatedP2.score})`;
              } else {
                updatedP2.score += 1;
                notifText = `Point for ${match.player2.name}! (${updatedP1.score}-${updatedP2.score})`;
              }
            } else if (match.sport === "football") {
              if (isP1) {
                updatedP1.score += 1;
                notifText = `GOAL for ${match.player1.name}! Score: ${updatedP1.score}-${updatedP2.score}`;
              } else {
                updatedP2.score += 1;
                notifText = `GOAL for ${match.player2.name}! Score: ${updatedP1.score}-${updatedP2.score}`;
              }
            } else if (match.sport === "tennis") {
              const points = ["0", "15", "30", "40", "GAME"];
              if (isP1) {
                let idx = points.indexOf(String(updatedP1.score));
                updatedP1.score = points[Math.min(idx + 1, points.length - 1)];
                notifText = `Point ${match.player1.name} (${updatedP1.score} - ${updatedP2.score})`;
              } else {
                let idx = points.indexOf(String(updatedP2.score));
                updatedP2.score = points[Math.min(idx + 1, points.length - 1)];
                notifText = `Point ${match.player2.name} (${updatedP1.score} - ${updatedP2.score})`;
              }
            }

            if (notifText && (match.sport === "badminton" || match.sport === "tabletennis")) {
              return { ...match, player1: updatedP1, player2: updatedP2, server: isP1 ? "p1" : "p2" };
            }

            if (notifText) {
              setNotifications((prev) => [
                { id: `n-${Date.now()}`, text: notifText, time: "Just now", type: "score" },
                ...prev.slice(0, 19),
              ]);
            }

            return {
              ...match,
              player1: updatedP1,
              player2: updatedP2,
            };
          }
          return match;
        });
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Update match score manually (from Organizer controller)
  const updateMatchScore = (matchId, targetPlayer, increment = 1) => {
    setMatches((prev) =>
      prev.map((match) => {
        if (match.id !== matchId) return match;

        setScoreHistory((h) => ({
          ...h,
          [matchId]: [...(h[matchId] || []), { player1: { ...match.player1 }, player2: { ...match.player2 } }],
        }));

        let p1 = { ...match.player1 };
        let p2 = { ...match.player2 };
        let notifMsg = "";

        if (targetPlayer === 1) {
          if (typeof p1.score === "number") {
            p1.score = Math.max(0, p1.score + increment);
          }
          notifMsg = `${p1.score} - ${p2.score} ${p1.name} +${increment}`;
        } else if (targetPlayer === 2) {
          if (typeof p2.score === "number") {
            p2.score = Math.max(0, p2.score + increment);
          }
          notifMsg = `${p1.score} - ${p2.score} ${p2.name} +${increment}`;
        }

        if (notifMsg) {
          setNotifications((n) => [
            { id: `n-${Date.now()}`, text: notifMsg, time: "Just now", type: "manual", matchId },
            ...n,
          ]);
        }

        return { ...match, player1: p1, player2: p2, ...(increment > 0 ? { server: targetPlayer === 1 ? "p1" : "p2" } : {}) };
      })
    );
  };

  const changeServer = (matchId) => {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        return { ...m, server: m.server === "p1" ? "p2" : "p1" };
      })
    );
  };

  const undoLastPoint = (matchId) => {
    const history = scoreHistory[matchId];
    if (!history || history.length === 0) return;
    const last = history[history.length - 1];
    setScoreHistory((h) => ({
      ...h,
      [matchId]: h[matchId].slice(0, -1),
    }));
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        return { ...m, player1: last.player1, player2: last.player2 };
      })
    );
  };

  const recordPlayerStats = (match, winnerName) => {
    if (!match.participants) return;

    const p1Won = winnerName === match.player1.name;
    const p1Sets = match.player1.setScores?.filter((score, index) => score > (match.player2.setScores?.[index] ?? 0)).length || 0;
    const p2Sets = match.player2.setScores?.filter((score, index) => score > (match.player1.setScores?.[index] ?? 0)).length || 0;
    const updateParticipants = (names, won, setsWon, setsLost, pointsFor, pointsAgainst) => {
      names.forEach((name) => {
        const key = getPlayerStatsKey(name);
        setPlayerStats((previous) => {
          const current = previous[key] || { name, matches: 0, wins: 0, losses: 0, setsWon: 0, setsLost: 0, pointsFor: 0, pointsAgainst: 0 };
          return {
            ...previous,
            [key]: {
              ...current,
              matches: current.matches + 1,
              wins: current.wins + (won ? 1 : 0),
              losses: current.losses + (won ? 0 : 1),
              setsWon: current.setsWon + setsWon,
              setsLost: current.setsLost + setsLost,
              pointsFor: current.pointsFor + (Number(pointsFor) || 0),
              pointsAgainst: current.pointsAgainst + (Number(pointsAgainst) || 0),
            },
          };
        });
      });
    };

    const p1Points = match.player1.setScores?.reduce((total, score) => total + (Number(score) || 0), 0) || Number(match.player1.score) || 0;
    const p2Points = match.player2.setScores?.reduce((total, score) => total + (Number(score) || 0), 0) || Number(match.player2.score) || 0;
    updateParticipants(match.participants.player1, p1Won, p1Sets, p2Sets, p1Points, p2Points);
    updateParticipants(match.participants.player2, !p1Won, p2Sets, p1Sets, p2Points, p1Points);
  };

  const finishMatch = (matchId, winnerName) => {
    const match = matches.find((item) => item.id === matchId);
    if (!match || match.status === "COMPLETED") return;

    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        return { ...m, status: "COMPLETED", winner: winnerName };
      })
    );
    setNotifications((n) => [
      { id: `n-${Date.now()}`, text: `Match finished! Winner: ${winnerName}`, time: "Just now", type: "winner" },
      ...n,
    ]);
    recordPlayerStats(match, winnerName);
  };

  const completeCurrentSet = (matchId) => {
    const match = matches.find((item) => item.id === matchId);
    if (!match || match.status !== "LIVE" || typeof match.player1.score !== "number" || typeof match.player2.score !== "number" || match.player1.score === match.player2.score) return;

    const bestOf = match.bestOf || 3;
    const setIndex = (match.currentSet || 1) - 1;
    const p1SetScores = [...(match.player1.setScores || Array(bestOf).fill(0))];
    const p2SetScores = [...(match.player2.setScores || Array(bestOf).fill(0))];
    p1SetScores[setIndex] = match.player1.score;
    p2SetScores[setIndex] = match.player2.score;
    const p1Sets = p1SetScores.filter((score, index) => score > (p2SetScores[index] ?? 0)).length;
    const p2Sets = p2SetScores.filter((score, index) => score > (p1SetScores[index] ?? 0)).length;
    const setsToWin = Math.ceil(bestOf / 2);
    const winnerName = p1Sets >= setsToWin ? match.player1.name : p2Sets >= setsToWin ? match.player2.name : null;
    const updatedMatch = {
      ...match,
      player1: { ...match.player1, score: winnerName ? match.player1.score : 0, setScores: p1SetScores },
      player2: { ...match.player2, score: winnerName ? match.player2.score : 0, setScores: p2SetScores },
      currentSet: winnerName ? match.currentSet : setIndex + 2,
      ...(winnerName ? { status: "COMPLETED", winner: winnerName } : {}),
    };

    setMatches((previous) => previous.map((item) => item.id === matchId ? updatedMatch : item));
    setNotifications((previous) => [
      { id: `n-${Date.now()}`, text: winnerName ? `Match finished! Winner: ${winnerName}` : `Set ${setIndex + 1} completed in ${match.player1.name} vs ${match.player2.name}.`, time: "Just now", type: winnerName ? "winner" : "score", matchId },
      ...previous,
    ]);
    if (winnerName) recordPlayerStats(updatedMatch, winnerName);
  };

  const toggleSimulation = () => {
    setIsSimulating((prev) => !prev);
  };

  // Create a new tournament (used by the Organizer "Create Tournament" flow)
  const addTournament = (tournamentData) => {
    const id = `t-${Date.now()}`;
    const color = COLOR_PALETTE[tournaments.length % COLOR_PALETTE.length];
    const newTournament = {
      id,
      status: "Upcoming",
      participants: 0,
      registrationCode: `MCH-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      color,
      ...tournamentData,
    };

    setTournaments((prev) => [newTournament, ...prev]);
    setNotifications((n) => [
      { id: `n-${Date.now()}`, text: `New tournament created: ${newTournament.name}`, time: "Just now", type: "match" },
      ...n,
    ]);

    return newTournament;
  };

 const registerForTournament = (registrationCode, participant) => {
  const code = registrationCode.trim().toUpperCase();

  const tournament = tournaments.find(
    (item) => item.registrationCode === code
  );

  if (!tournament) {
    return {
      ok: false,
      message: "Tournament registration ID was not found.",
    };
  }

  if (tournament.status === "Completed") {
    return {
      ok: false,
      message: "Registration is closed for this tournament.",
    };
  }

  const current = registrations[tournament.id] || [];

  // Duplicate registrations are allowed for now.
  // The tournament maxParticipants limit is still enforced below.

  if (
    tournament.maxParticipants &&
    current.length >= tournament.maxParticipants
  ) {
    return {
      ok: false,
      message: "This tournament is full.",
    };
  }

  const entry = {
    id: `r-${Date.now()}`,
    name: participant.name,
    email: participant.email,
  };

  setRegistrations((previous) => ({
    ...previous,
    [tournament.id]: [
      ...(previous[tournament.id] || []),
      entry,
    ],
  }));

  setTournaments((previous) =>
    previous.map((item) =>
      item.id === tournament.id
        ? {
            ...item,
            participants:
              (registrations[item.id] || []).length + 1,
          }
        : item
    )
  );

  setNotifications((previous) => [
    {
      id: `n-${Date.now()}`,
      text: `${participant.name} joined ${tournament.name}.`,
      time: "Just now",
      type: "match",
    },
    ...previous,
  ]);

  return {
    ok: true,
    tournament,
  };
};

  // Create an organizer-managed fixture that can be opened in the scoring dashboard.
  const createMatch = (matchData) => {
    const id = `m-${Date.now()}`;
    const newMatch = {
      id,
      status: "LIVE",
      startedAt: Date.now(),
      currentSet: 1,
      bestOf: matchData.bestOf || 3,
      matchType: matchData.matchType || "singles",
      server: "p1",
      player1: { id: `${id}-p1`, name: matchData.player1Name, score: 0, setScores: Array(matchData.bestOf || 3).fill(0) },
      player2: { id: `${id}-p2`, name: matchData.player2Name, score: 0, setScores: Array(matchData.bestOf || 3).fill(0) },
      ...matchData,
    };

    setMatches((prev) => [newMatch, ...prev]);
    setNotifications((prev) => [
      { id: `n-${Date.now()}`, text: `${newMatch.player1.name} vs ${newMatch.player2.name} is now live.`, time: "Just now", type: "match", matchId: id },
      ...prev.slice(0, 19),
    ]);

    return newMatch;
  };

  const startMatch = (matchId) => {
    setMatches((previous) => previous.map((match) => match.id === matchId ? { ...match, status: "LIVE", startedAt: Date.now() } : match));
  };

  const generateTournamentFixtures = (tournamentId, format) => {
    const tournament = tournaments.find((item) => item.id === tournamentId);
    const players = shuffle(registrations[tournamentId] || []);
    if (!tournament || players.length < 2) return { ok: false, message: "Register at least two players before generating fixtures." };
    if (matches.some((match) => match.tournamentId === tournamentId)) return { ok: false, message: "Fixtures have already been generated for this tournament." };

    const newFixtures = [];
    const addFixture = (player1, player2, round, pool = null, stage = "League") => {
      const id = `m-${Date.now()}-${newFixtures.length}`;
      newFixtures.push({
        id, tournamentId, tournament: tournament.name, sport: tournament.sport, sportName: tournament.sportName, sportIcon: tournament.sportIcon,
        category: tournament.category, round, pool, stage, status: "SCHEDULED", currentSet: 1, bestOf: 3, matchType: "singles", server: "p1",
        player1: { id: `${id}-p1`, name: player1.name, score: 0, setScores: [0, 0, 0] },
        player2: { id: `${id}-p2`, name: player2.name, score: 0, setScores: [0, 0, 0] },
        participants: { player1: [player1.name], player2: [player2.name] }, court: "To be assigned",
      });
    };

    if (format === "Group Stage + Knockout") {
      if (players.length < 4) return { ok: false, message: "Group stage + knockout needs at least four registered players." };
      const midpoint = Math.ceil(players.length / 2);
      const pools = [players.slice(0, midpoint), players.slice(midpoint)];
      pools.forEach((poolPlayers, poolIndex) => buildRoundRobinFixtures(poolPlayers).forEach(([player1, player2], index) => addFixture(player1, player2, `Pool ${poolIndex === 0 ? "A" : "B"} Match ${index + 1}`, poolIndex === 0 ? "A" : "B", "Group Stage")));
    } else if (format === "Round Robin") {
      buildRoundRobinFixtures(players).forEach(([player1, player2], index) => addFixture(player1, player2, `League Match ${index + 1}`));
    } else {
      for (let index = 0; index < players.length - 1; index += 2) addFixture(players[index], players[index + 1], `Round 1 Match ${index / 2 + 1}`, null, "Knockout");
    }

    setMatches((previous) => [...newFixtures, ...previous]);
    setTournaments((previous) => previous.map((item) => item.id === tournamentId ? { ...item, format, fixturesGenerated: true } : item));
    return { ok: true, count: newFixtures.length };
  };

  const generateKnockoutFixtures = (tournamentId, qualifiers) => {
    const tournament = tournaments.find((item) => item.id === tournamentId);
    if (!tournament || qualifiers.length < 2) return { ok: false, message: "At least two qualified players are required." };
    if (matches.some((match) => match.tournamentId === tournamentId && match.stage === "Knockout")) return { ok: false, message: "Knockout fixtures have already been generated." };
    const newFixtures = [];
    for (let index = 0; index < qualifiers.length - 1; index += 2) {
      const player1 = qualifiers[index];
      const player2 = qualifiers[index + 1];
      const id = `m-${Date.now()}-ko-${index}`;
      newFixtures.push({ id, tournamentId, tournament: tournament.name, sport: tournament.sport, sportName: tournament.sportName, sportIcon: tournament.sportIcon, category: tournament.category, round: qualifiers.length === 4 ? `Semi-final ${index / 2 + 1}` : `Knockout Match ${index / 2 + 1}`, stage: "Knockout", status: "SCHEDULED", currentSet: 1, bestOf: 3, matchType: "singles", server: "p1", player1: { id: `${id}-p1`, name: player1.name, score: 0, setScores: [0, 0, 0] }, player2: { id: `${id}-p2`, name: player2.name, score: 0, setScores: [0, 0, 0] }, participants: { player1: [player1.name], player2: [player2.name] }, court: "To be assigned" });
    }
    setMatches((previous) => [...newFixtures, ...previous]);
    return { ok: true, count: newFixtures.length };
  };

  // Update a player or organizer profile
  const updateProfile = (role, updates) => {
    setProfiles((prev) => ({
      ...prev,
      [role]: { ...prev[role], ...updates },
    }));
  };

  return (
    <LiveMatchContext.Provider
      value={{
        matches,
        notifications,
        tournaments,
        addTournament,
        createMatch,
        startMatch,
        generateTournamentFixtures,
        generateKnockoutFixtures,
        profiles,
        playerStats,
        registrations,
        registerForTournament,
        updateProfile,
        activeScoringMatch,
        setActiveScoringMatch,
        updateMatchScore,
        finishMatch,
        completeCurrentSet,
        changeServer,
        undoLastPoint,
        isSimulating,
        toggleSimulation,
      }}
    >
      {children}
    </LiveMatchContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLiveMatch() {
  return useContext(LiveMatchContext);
}