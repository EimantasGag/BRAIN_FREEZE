/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import Grid from '../assets/Grid-1000-10-2-100.png';
import backgroundMusic from '../assets/music_game_1.mp3'; // Make sure the path is correct
import { useNavigate, useParams } from 'react-router-dom';
import { WebsocketSingleton } from './websocketSingleton';
import './NRG.css';


interface Data {
  createdList: number[];
  level: number;
  expectedList: number[];
  difficulty: 'VeryEasy' | 'Easy' | 'Medium' | 'Hard' | 'Nightmare' | 'Impossible';
}

const defaultLevel = '4';
const socketsingleton: WebsocketSingleton = WebsocketSingleton.instance;
const scoreList = new Array();
const defaultLevel = 4;

function NRG() {
  const { isMultiplayer } = useParams();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [datas, setData] = useState<Data>();
  const [dataString1, setDataString1] = useState<string>('');
  const [dataString2, setDataString2] = useState<string>('');
  const [id] = useState<number | null>(Number(localStorage.getItem("ID")));
  const [highScore, setHighScore] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const [gameLost, setGameLost] = useState<number>(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();

  if (isMultiplayer) {
    socketsingleton.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "nrg_score") {
        scoreList.push(data.score);
      }
      else if (data.type === "game_end") {
        console.log("Game ended...");
        console.log("Other players results: " + scoreList);
        setGameEnded(true);
        if (scoreList.length > 0) {
          const maxScore = Math.max(...scoreList);
          if (maxScore > datas?.level!) {
            setGameLost(1);
          } else {
            setGameLost(0);
          }
        }
      }
    };
  }

  const sendNRGScore = () => {
    if (isMultiplayer) {
      console.log("Sending NRG score...: " + datas?.level);
      socketsingleton.socket.send(JSON.stringify({ type: "nrg_score", score: datas?.level }));
    }
  };

  const [flashingButtons, setFlashingButtons] = useState(Array(25).fill(false));
  const buttonPositions = [
    { top: '0.2%', left: '0%' },
    { top: '0.2%', left: '20%' },
    { top: '0.2%', left: '40%' },
    { top: '0.2%', left: '60%' },
    { top: '0.2%', left: '80%' },

    { top: '20%', left: '0%' },
    { top: '20%', left: '20%' },
    { top: '20%', left: '40%' },
    { top: '20%', left: '60%' },
    { top: '20%', left: '80%' },

    { top: '39.8%', left: '0%' },
    { top: '39.8%', left: '20%' },
    { top: '39.8%', left: '40%' },
    { top: '39.8%', left: '60%' },
    { top: '39.8%', left: '80%' },

    { top: '59.6%', left: '0%' },
    { top: '59.6%', left: '20%' },
    { top: '59.6%', left: '40%' },
    { top: '59.6%', left: '60%' },
    { top: '59.6%', left: '80%' },

    { top: '79.3%', left: '0%' },
    { top: '79.3%', left: '20%' },
    { top: '79.3%', left: '40%' },
    { top: '79.3%', left: '60%' },
    { top: '79.3%', left: '80%' },
  ];

  const createGame = async (): Promise<number | null> => {
    try {
      const response = await fetch(`${backendUrl}Game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Type: 1, isMultiplayer: false }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server returned ${response.status}: ${errorText}`);
        throw new Error(`Error creating game record: ${response.status} ${response.statusText}`);
      }

      const gameData = await response.json();
      localStorage.setItem("gameId", String(gameData.id));
      console.log("Game created with ID:", gameData.id);
      return gameData.id;
    } catch (err: any) {
      console.error("Failed to create game:", err);
      return null;
    }
  };

  // Modified submitScore function
  const submitScore = async (finalScore: number) => {
    try {
      console.log("Submitting score: ", finalScore);

      // First, ensure we have a valid gameId
      let gameId = localStorage.getItem("gameId");
      let gameIdNum: number | null = gameId ? parseInt(gameId) : null;

      // If no valid gameId exists, create a new game
      if (!gameIdNum) {
        console.log("No game ID found, creating a new game");
        gameIdNum = await createGame();
        if (!gameIdNum) {
          throw new Error("Failed to create a game record");
        }
      }

      // Make sure we have a valid user ID
      if (!id) {
        console.error("User ID is missing");
        return;
      }

      // Create the properly formatted payload with PascalCase properties
      const scorePayload = {
        UserId: id,
        GameId: gameIdNum,
        Score: finalScore
      };

      console.log("Sending score payload:", scorePayload);

      const response = await fetch(`${backendUrl}Scoreboards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scorePayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server returned ${response.status}: ${errorText}`);
        throw new Error(`Error posting score: ${response.status} ${response.statusText}`);
      }

      console.log("Score submitted successfully");
      // Update the high score after submitting the new score
      await fetchHighScore();
    } catch (err: any) {
      console.error("Failed to submit score:", err);
    }
  };

  // --- Fetch the high score for gametype 1 ---
  const fetchHighScore = async () => {
    try {
      if (id) {
        const response = await fetch(`${backendUrl}Scoreboards/MaxScore/${id}/1`);
        if (!response.ok) {
          throw new Error(`https error! Status: ${response.status}`);
        }
        const data = await response.json();
        setHighScore(data.maxScore);
      }
    } catch (err: any) {
      console.error("Failed to fetch high score:", err);
    }
  };



  const fetchMuteStatus = async () => {
    try {
      const response = await fetch(`${backendUrl}Mute`);
      if (!response.ok) {
        throw new Error(`https error! Status: ${response.status}`);
      }
      const data = await response.json();
      setIsMuted(data.isMuted === true);
    } catch (err: any) {
      console.error('Failed to fetch mute status:', err);
    }
  };

  useEffect(() => {
    // Remove automatic game creation on mount.
    // Instead, we populate the first sequence and mute status.
    fetchHighScore();
    populateData();
    fetchMuteStatus();

    const muteCheckInterval = setInterval(fetchMuteStatus, 1000); // Check every second
    return () => {
      clearInterval(muteCheckInterval);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    handleArray();
  }, [datas?.createdList]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.3;
      audioRef.current.loop = true;
      if (isMuted) {
        audioRef.current.pause();
        audioRef.current.muted = true;
      } else {
        audioRef.current.muted = false;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error("Autoplay prevented:", error);
          });
        }
      }
    }
  }, [isMuted]);

  const populateData = async () => {
    try {
      console.log('Populating data');
      const response = await fetch(`${backendUrl}NRG`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const results = await response.json();
      const data: Data = results.data;
      console.log(results.message);
      // Reset any previous attempt
      data.expectedList = [];
      setData(data);
      const dataString1 = data.createdList.join(', ');
      setDataString1(dataString1);
      setDataString2('');
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  async function postData(data: Data) {
    try {
      console.log('Posting data:', JSON.stringify(data));
      const response = await fetch(`${backendUrl}NRG`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const results = await response.json();
        const result = results.data;
        console.log(results.message);

        if (results.message == "Loser!") {
          sendNRGScore();
          setGameEnded(true);
        }

        if (datas?.level != null && highScore != null) {
          if (results.message == "Congrats player!" && datas?.level > highScore) {
            putDbHighScore(datas?.level);
          }
        }
        console.log('API response: ', result);
        setData(result);
        const dataString1 = result.createdList.join(', ');
        setDataString1(dataString1);
        const dataString2 = result.expectedList.join(', ');
        setDataString2(dataString2);
      }
      else {
        const results = await response.json();
        const result: Data = results.data;
        console.log(results.message);
        setData(result);
        const dataString1 = result.createdList.join(', ');
        setDataString1(dataString1);
        const dataString2 = result.expectedList.join(', ');
        setDataString2(dataString2);
        // Note: We no longer create a game or submit a score here.
      } else {
        console.error('Error in API request: ', response.statusText);
      }
    } catch (error) {
      console.error("Failed to post data", error);
    }
  }

  const handleArray = () => {
    if (datas && datas.level >= defaultLevel) {
      for (let i = 0; i < datas.level; i++) {
        flashButton(datas.createdList[i]);
      }
      setTimeout(() => { setFlashingButtons(Array(25).fill(false)); }, 2000);
    } else {
      console.error("Data is either undefined or doesn't have enough elements");
    }
  };

  const flashButton = (index: number) => {
    setFlashingButtons((prev) => {
      const newState = [...prev];
      newState[index] = true;
      return newState;
    });
  };

  // Modified restartGame to reset the game state and flash the initial sequence
  const restartGame = () => {
    setData(undefined);
    setDataString1('');
    setDataString2('');
    setFlashingButtons(Array(25).fill(false));
    populateData();
  };

  return (
    <div>
      <div className='center' style={{
        filter: `blur(${gameEnded ? "10px" : "0"})`, pointerEvents: (gameEnded ? "none" : "auto"),
        userSelect: (gameEnded ? "none" : "auto")
      }}>
        <><div className="block" >
          <audio ref={audioRef} src={backgroundMusic} loop />
          <div className='image-container1'>
            <img src={Grid} className="imageGrid" />
            {buttonPositions.map((pos, index) => (
              <button
                key={index}
                className={`grid-block ${flashingButtons[index] ? 'activated' : ''}`}
                style={{ top: pos.top, left: pos.left, width: '100px', height: '100px' }}
                onClick={() => {
                  if (datas) {
                    // Determine the next expected button in the sequence
                    const nextExpectedIndex = datas.createdList[datas.expectedList.length];
                    if (index === nextExpectedIndex) {
                      // Correct button pressed—update expectedList
                      const updatedData = {
                        ...datas,
                        expectedList: [...datas.expectedList, index],
                      };
                      setData(updatedData);
                      const newDataString2 = updatedData.expectedList.join(', ');
                      setDataString2(newDataString2);
                      // When the full sequence is entered correctly, post the new sequence
                      if (updatedData.expectedList.length === updatedData.createdList.length) {
                        setFlashingButtons(Array(25).fill(false));
                        postData(updatedData);
                      }
                    } else {
                      // Incorrect button pressed – notify user
                      alert("Wrong sequence, try again!");
                      // If the level is higher than the default level, create a game and submit the score.
                      // The score submitted will be the current level minus one.
                      if (datas.level > defaultLevel) {
                        createGame();
                        submitScore(datas.level - 1);
                      }
                      // Reset the game back to the initial state and flash the sequence again.
                      restartGame();
                    }
                  }
                }}
              >
                {datas && datas.createdList.includes(index) ? datas.createdList.indexOf(index) + 1 : ''}
              </button>
            ))}
            <div className="level-text">Level: {datas?.level ?? defaultLevel}</div>
            {!isMultiplayer && (
              <>
                <div>{dataString1}</div>
                <div>{dataString2}</div>
                <button onClick={handleArray}></button>
                <div
                  className="restart-button"
                  onClick={restartGame}
                  role="button"
                  aria-label="Restart Game"
                />
                <div >(index starts from zero)</div>
              </>
            )}
          </div>
        </div>
        </>
      </div>
      {gameEnded && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          {gameLost == -1 ? <h2>Waiting for other players...</h2> : (gameLost == 0 ? <h2>You won! 🎉🎉</h2> : <h2>You lost</h2>)}
          <button onClick={() => navigate('/home')}>Back to Home</button>
        </div>
      )}
    </div>
  );
}
export default NRG;