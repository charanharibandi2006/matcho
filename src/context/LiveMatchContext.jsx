import { createContext, useContext, useState, useEffect } from "react";

const LiveMatchContext = createContext();

const INITIAL_MATCHES = [
  {
    id: "m-101",
    sport: "badminton",
    sportName: "Badminton",
    sportIcon: "🏸",
    tournament: "Summer Badminton Cup 2026",
    category: "Men's Singles",
    round: "Semi-Final 1",
    player1: { id: "p1", name: "Rahul Sharma", score: 18, setScores: [21, 19, 18] },
    player2: { id: "p2", name: "Karan Mehta", score: 16, setScores: [18, 21, 16] },
    currentSet: 3,
    status: "LIVE",
    court: "Court 1",
    startTime: "7:30 PM",
    server: "p1",
  },
  {
    id: "m-102",
    sport: "football",
    sportName: "Football",
    sportIcon: "⚽",
    tournament: "Corporate Super Cup 2026",
    category: "7v7 Knockout",
    round: "Quarter-Final",
    player1: { id: "t1", name: "Tech Strikers FC", score: 2, setScores: [] },
    player2: { id: "t2", name: "Apex Warriors", score: 1, setScores: [] },
    minute: "68'",
    status: "LIVE",
    field: "Main Turf A",
    startTime: "8:00 PM",
  },
  {
    id: "m-103",
    sport: "tennis",
    sportName: "Tennis",
    sportIcon: "🎾",
    tournament: "City Grand Slam 2026",
    category: "Men's Singles",
    round: "Final",
    player1: { id: "p3", name: "Vikram Malhotra", score: "40", setScores: [6, 4, 3] },
    player2: { id: "p4", name: "Anish Verma", score: "30", setScores: [4, 6, 2] },
    currentSet: 3,
    status: "LIVE",
    court: "Center Court",
    startTime: "6:00 PM",
    server: "p3",
  },
  {
    id: "m-104",
    sport: "cricket",
    sportName: "Cricket",
    sportIcon: "🏏",
    tournament: "Premier T20 Trophy 2026",
    category: "Corporate T20",
    round: "Match 12",
    player1: { id: "c1", name: "Deccan Chargers", score: "154/4", overs: "17.2" },
    player2: { id: "c2", name: "Hyd Titans", score: "148/8", overs: "20.0" },
    status: "LIVE",
    field: "Stadium 1",
    startTime: "5:00 PM",
  }
];

const INITIAL_NOTIFICATIONS = [
  { id: "n1", text: "Rahul Sharma won Set 1 (21-18) against Karan Mehta", time: "2 mins ago", type: "score" },
  { id: "n2", text: "Tech Strikers FC scored a GOAL! (2-1)", time: "5 mins ago", type: "goal" },
  { id: "n3", text: "Summer Badminton Cup Semi-Final is now LIVE on Court 1", time: "15 mins ago", type: "match" },
];

const INITIAL_TOURNAMENTS = [
  {
    id: "t-201",
    name: "Summer Badminton Cup 2026",
    sport: "badminton",
    sportName: "Badminton",
    sportIcon: "🏸",
    category: "Men's Singles",
    format: "Knockout",
    startDate: "2026-07-10",
    endDate: "2026-07-20",
    location: "Hyderabad",
    maxParticipants: 32,
    participants: 32,
    description: "Annual summer badminton knockout for singles players.",
    status: "Ongoing",
    color: "linear-gradient(120deg,#ffb26b,#7e3ff2)",
  },
  {
    id: "t-202",
    name: "Corporate Super Cup 2026",
    sport: "football",
    sportName: "Football",
    sportIcon: "⚽",
    category: "7v7 Knockout",
    format: "Knockout",
    startDate: "2026-08-01",
    endDate: "2026-08-15",
    location: "Bangalore",
    maxParticipants: 16,
    participants: 16,
    description: "Corporate 7-a-side football knockout tournament.",
    status: "Ongoing",
    color: "linear-gradient(120deg,#21b566,#2f6fed)",
  },
  {
    id: "t-203",
    name: "City Grand Slam 2026",
    sport: "tennis",
    sportName: "Tennis",
    sportIcon: "🎾",
    category: "Men's Singles",
    format: "Round Robin + Knockout",
    startDate: "2026-08-15",
    endDate: "2026-08-25",
    location: "Mumbai",
    maxParticipants: 64,
    participants: 64,
    description: "City-wide tennis grand slam event.",
    status: "Upcoming",
    color: "linear-gradient(120deg,#ff4b4b,#ffb300)",
  },
];

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

const COLOR_PALETTE = [
  "linear-gradient(120deg,#ffb26b,#7e3ff2)",
  "linear-gradient(120deg,#21b566,#2f6fed)",
  "linear-gradient(120deg,#ff4b4b,#ffb300)",
  "linear-gradient(120deg,#00c6ff,#7e3ff2)",
  "linear-gradient(120deg,#f857a6,#ff5858)",
];

export function LiveMatchProvider({ children }) {
  const [matches, setMatches] = useState(() => {
    const saved = localStorage.getItem("matcho_live_matches");
    return saved ? JSON.parse(saved) : INITIAL_MATCHES;
  });

  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("matcho_notifications");
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [tournaments, setTournaments] = useState(() => {
    const saved = localStorage.getItem("matcho_tournaments");
    return saved ? JSON.parse(saved) : INITIAL_TOURNAMENTS;
  });

  const [profiles, setProfiles] = useState(() => {
    const saved = localStorage.getItem("matcho_profiles");
    return saved ? JSON.parse(saved) : INITIAL_PROFILES;
  });

  const [activeScoringMatch, setActiveScoringMatch] = useState(null);
  const [isSimulating, setIsSimulating] = useState(true);

  // Sync tournaments & profiles to LocalStorage
  useEffect(() => {
    localStorage.setItem("matcho_tournaments", JSON.stringify(tournaments));
  }, [tournaments]);

  useEffect(() => {
    localStorage.setItem("matcho_profiles", JSON.stringify(profiles));
  }, [profiles]);

  // Sync state to LocalStorage and BroadcastChannel for cross-tab real-time sync
  useEffect(() => {
    localStorage.setItem("matcho_live_matches", JSON.stringify(matches));
    localStorage.setItem("matcho_notifications", JSON.stringify(notifications));

    if (window.BroadcastChannel) {
      const channel = new BroadcastChannel("matcho_realtime_channel");
      channel.postMessage({ type: "MATCHES_UPDATED", payload: matches });
      return () => channel.close();
    }
  }, [matches, notifications]);

  // Listen for multi-tab updates
  useEffect(() => {
    if (!window.BroadcastChannel) return;
    const channel = new BroadcastChannel("matcho_realtime_channel");
    channel.onmessage = (event) => {
      if (event.data?.type === "MATCHES_UPDATED") {
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

        let p1 = { ...match.player1 };
        let p2 = { ...match.player2 };
        let notifMsg = "";

        if (targetPlayer === 1) {
          if (typeof p1.score === "number") {
            p1.score = Math.max(0, p1.score + increment);
          }
          notifMsg = `Score updated for ${p1.name}`;
        } else if (targetPlayer === 2) {
          if (typeof p2.score === "number") {
            p2.score = Math.max(0, p2.score + increment);
          }
          notifMsg = `Score updated for ${p2.name}`;
        }

        if (notifMsg) {
          setNotifications((n) => [
            { id: `n-${Date.now()}`, text: notifMsg, time: "Just now", type: "manual" },
            ...n,
          ]);
        }

        return { ...match, player1: p1, player2: p2 };
      })
    );
  };

  const finishMatch = (matchId, winnerName) => {
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
        profiles,
        updateProfile,
        activeScoringMatch,
        setActiveScoringMatch,
        updateMatchScore,
        finishMatch,
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
