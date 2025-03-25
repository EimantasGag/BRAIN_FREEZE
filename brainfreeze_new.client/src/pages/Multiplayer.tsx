import { useState, useEffect } from "react";
import { WebsocketSingleton } from "./websocketSingleton";
import { Link, useNavigate } from "react-router-dom";

const socketsingleton: WebsocketSingleton = WebsocketSingleton.instance;

export default function Multiplayer() {
  const [username, setUsername] = useState<string>("");
  const [playerCount, setPlayerCount] = useState<number>(0);
  const [joined, setJoined] = useState<boolean>(false);
  const [waitingTime, setWaitingTime] = useState<number>(-1);
  const navigate = useNavigate();

  useEffect(() => {
    socketsingleton.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Message received from server: " + data.playerCount);
      if (data.type === "update_users") {
        setPlayerCount(data.playerCount);
      } else if (data.type === "game_start") {
        console.log("Game starting...");
        if(data.game == "cardflip"){
          navigate("/card-flip/true");
        }
        else if(data.game == "simon"){
          navigate("/simon/true");
        }

      } else if(data.type === "countdown") {
        setWaitingTime(data.seconds);
      }
    };

    return () => {
      socketsingleton.socket.send(JSON.stringify({ type: "leave_lobby"}));
      setJoined(false);
    };
  }, []);

  const joinLobby = () => {
    if (username.trim()) {
      socketsingleton.socket.send(JSON.stringify({ type: "join_lobby" }));
      setJoined(true);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      {!joined ? (
      <div>
        <input
        type="text"
        placeholder="Enter username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="border p-2 w-full"
        />
        <button
        onClick={joinLobby}
        className="bg-blue-500 text-white p-2 w-full mt-2"
        >
        Join Lobby
        </button>
      </div>
      ) : (
      <div>
        <div>
        <h2 className="text-xl font-bold">Lobby</h2>
        {waitingTime == -1 ? (<p>Waiting for other users...</p>) : (<p>Game starting in {waitingTime} seconds...</p>)}
        <p className="text-gray-600">Users in lobby: {playerCount}</p>
        </div>
        </div>
      )}
    </div>
  );
}