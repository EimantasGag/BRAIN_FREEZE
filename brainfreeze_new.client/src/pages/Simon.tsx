/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import Follow from '../assets/Follow.png';
import Keypad from '../assets/Keypad.png';
import './Simon.css';

import { useNavigate, useParams } from 'react-router-dom';
import backgroundMusic from '../assets/music_game_2.mp3';
import { WebsocketSingleton } from './websocketSingleton';

enum Difficulty {
  MainStart = 1,
  VeryEasy = 4,
  Easy = 5,
  Medium = 6,
  Hard = 7,
  Nightmare = 8,
  Impossible = 9,
  Custom = 0,
}

interface Data {
  createdList: number[];
  level: number;
  expectedList: number[];
}

enum GameMode {
  Main = 'Main',
  Practice = 'Practice'
}

const socketsingleton: WebsocketSingleton = WebsocketSingleton.instance;
const scoreList = new Array();

const GAME_TYPE_SIMON = 2;

function Simon() {
  const { isMultiplayer } = useParams();
  const [datas, setData] = useState<Data>();
  const [flashingButtons, setFlashingButtons] = useState(Array(9).fill(false));
  const [score, setScore] = useState<number>(0);
  const [hasFlashed, setHasFlashed] = useState<boolean>(false);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.Main);
  const [currentDifficulty, setCurrentDifficulty] = useState<Difficulty>(Difficulty.MainStart);
  const [id] = useState<string | null>(localStorage.getItem("ID"));
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const [gameLost, setGameLost] = useState<number>(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();

  if (isMultiplayer) {
    socketsingleton.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "simon_score") {
        scoreList.push(data.score);
      }
      else if (data.type === "game_end") {
        console.log("Game ended...");
        console.log("Other players results: " + scoreList);
        setGameEnded(true);
        if (scoreList.length > 0) {
          const maxScore = Math.max(...scoreList);
          if (maxScore >= score) {
            setGameLost(1);
          } else {
            setGameLost(0);
          }
        }
      }
    };
  }

  // New function: post a game record using the GameController endpoint.
  const postGameRecord = async (): Promise<{ id: number } | null> => {
    const gamePayload = {
      Type: GAME_TYPE_SIMON,
      isMultiplayer: false,
    };
    try {
      const response = await fetch(`${backendUrl}Game`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gamePayload),
      });
      if (!response.ok) {
        throw new Error("Error adding game record: " + response.statusText);
      }
      const game = await response.json();
      console.log("Game record added:", game);
      return game; // expects a game object with an "id" property
    } catch (error) {
      console.error("Error posting game record:", error);
      return null;
    }
  };

  // New function: post a scoreboard record using the ScoreboardsController endpoint.
  const postScoreRecord = async (gameId: number | null) => {
    if (!id) {
      console.error("User ID is missing");
      return;
    }

    // If gameId is null, we need to create a game record first
    if (gameId === null) {
      console.log("No game ID provided, creating a game record first");
      const game = await postGameRecord();
      if (!game) {
        console.error("Failed to create game record, cannot post score");
        return;
      }
      gameId = game.id;
    }

    const scorePayload = {
      UserId: parseInt(id),
      GameId: gameId, // Now we're guaranteed to have a valid gameId
      Score: score
    };

    try {
      console.log('Posting score with payload:', scorePayload);
      const response = await fetch(`${backendUrl}Scoreboards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scorePayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server returned ${response.status}: ${errorText}`);
        throw new Error(`Error posting score record: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Score record added:", result);
      return result;
    } catch (error) {
      console.error("Error posting score record:", error);
      throw error; // Re-throw to allow handling in the calling function
    }
  };

  // Modified handleGameLoss function
  const handleGameLoss = async () => {
    try {
      if (datas && datas.level > 1) {
        const game = await postGameRecord();
        if (game) {
          await postScoreRecord(game.id);
        } else {
          console.error("Failed to create game record");
        }
      } else {
        // Always create a game record even for early losses
        await postScoreRecord(null);
      }
      console.log("Game loss handled successfully");
    } catch (error) {
      console.error("Failed to handle game loss:", error);
    }
  };

  const fetchMuteStatus = async () => {
    try {
      const response = await fetch(`${backendUrl}Mute`);
      if (!response.ok) {
        throw new Error(`http error! Status: ${response.status}`);
      }

      const data = await response.json();
      if (data.isMuted === true) {
        setIsMuted(true);
      }
      else {
        setIsMuted(false);
      }
    } catch (err: any) {
      console.error('Failed to fetch mute status:', err);
    }
  };

  const contents = datas === undefined
    ? <p><em>Loading... </em></p>
    : (
      <div>
        <h2>{gameMode}</h2>
        <p>Difficulty selected: {Difficulty[currentDifficulty]}</p>
        {score !== null && <h2>Your Score: {score}</h2>}
      </div>
    );

  const buttonPositions = [
    { top: '40%', left: '28.5%' },
    { top: '40%', left: '51%' },
    { top: '40%', left: '71%' },
    { top: '58%', left: '28.5%' },
    { top: '58%', left: '51%' },
    { top: '58%', left: '71%' },
    { top: '77.5%', left: '28.5%' },
    { top: '77.5%', left: '51%' },
    { top: '77.5%', left: '71%' },
  ];

  useEffect(() => {
    fetchSimonScore();
    populateData();

    fetchMuteStatus();

    const muteCheckInterval = setInterval(fetchMuteStatus, 1000);

    return () => {
      clearInterval(muteCheckInterval);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    if (datas && !hasFlashed) {
      setTimeout(() => {
        handleArray();
        setHasFlashed(true);
      }, 1000);
    }
  }, [datas, hasFlashed]);

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

  useEffect(() => {
    if (datas) {
      console.log('Game mode or difficulty changed, populating new data...');
      setHasFlashed(false);
      setData(undefined);
      populateData();
    }
  }, [gameMode, currentDifficulty]);

  const fetchSimonScore = async () => {
    try {
      const response = await fetch(`${backendUrl}Scoreboards/MaxScore/${id}/${GAME_TYPE_SIMON}`);
      if (!response.ok) {
        throw new Error(`Error fetching scores: ${response.statusText}`);
      }

      const user = await response.json();

      if (user) {
        localStorage.setItem("Simon", user.simonScore);
        console.log(user.simonScore);
      } else {
        console.warn(`User with ID ${user.id} not found.`);
      }
    } catch (error) {
      console.error("Error fetching user scores:", error);
    }
  };

  const evaluateScore = async (userInput: number[], datas: Data) => {

    if (!datas) return;
    console.log("Expected Pattern:", datas.expectedList);
    console.log("User Input:", userInput);
    try {
      const response = await fetch(`${backendUrl}score/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput,
          pattern: datas.expectedList,
          difficulty: currentDifficulty,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error evaluating score: ${response.statusText}`);
      }

      const result = await response.json();
      setScore(result.score);

    } catch (error) {
      console.error('Failed to evaluate score:', error);
    }
  };

  const populateData = async () => {
    try {
      console.log('Populating data');
      const response = await fetch(`${backendUrl}Data?level=${currentDifficulty}`, {
        method: 'GET'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const results = await response.json();
      const data: Data = results.data;
      console.log(results.message);
      setData(data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const handleArray = () => {
    if (datas && datas.level >= 1) {
      for (let i = 0; i < datas.level; i++) {
        setTimeout(() => { handleFlash(datas.createdList[i] - 1); }, i * 400);
      }
    }
    else {
      console.error("Data is either undefined or doesn't have enough elements");
    }
  };

  const handleFlash = (index: number) => {
    setFlashingButtons((prev) => {
      const newState = [...prev];
      newState[index] = true;
      return newState;
    });

    setTimeout(() => {
      setFlashingButtons((prev) => {
        const newState = [...prev];
        newState[index] = false;
        return newState;
      });
    }, 200);
  };

  async function postData(data: Data) {
    console.log("SIMON GAME LOST");
    try {
      console.log('Posting data:', JSON.stringify(data));
      const payload = {
        ...data,
        difficulty: currentDifficulty
      };

      const response = await fetch(`${backendUrl}Data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const results = await response.json();
        setData(results.data);
      } else {
        console.error('Error in API request:', response.statusText);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
  }

  const togglePracticeMode = () => {
    setGameMode(GameMode.Practice);
    setCurrentDifficulty(Difficulty.VeryEasy);
    setScore(0);
    console.log('Switching to practice mode');
  };

  const toggleMainMode = () => {
    setGameMode(GameMode.Main);
    setCurrentDifficulty(Difficulty.MainStart);
    setScore(0);
    console.log('Switching to main mode');
  };

  const handleDifficultyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDifficulty = Number(event.target.value) as Difficulty;
    setCurrentDifficulty(selectedDifficulty);
  };

  return (
    <>
      {!isMultiplayer && (
        <>
          <div className="controls" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <button
              onClick={gameMode === GameMode.Practice ? toggleMainMode : togglePracticeMode}
              style={{ width: '250px', height: '60px' }}
            >
              {gameMode === GameMode.Practice ? 'Switch to main mode' : 'Switch to practice mode'}
            </button>
          </div>
          <audio ref={audioRef} src={backgroundMusic} loop />
          <div className="controls" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            {gameMode === GameMode.Practice && (
              <select
                value={currentDifficulty}
                onChange={handleDifficultyChange}
                style={{ marginBottom: '10px' }}
              >
                <option value="4">Very Easy</option>
                <option value="5">Easy</option>
                <option value="6">Medium</option>
                <option value="7">Hard</option>
                <option value="8">Nightmare</option>
                <option value="9">Impossible</option>
                <option value="0">Custom</option>
              </select>
            )}
          </div>
        </>
      )}
      <div>
        <div className='center' style={{
          filter: `blur(${gameEnded ? "10px" : "0"})`, pointerEvents: (gameEnded ? "none" : "auto"),
          userSelect: (gameEnded ? "none" : "auto")
        }}>
          <div>
            <div className="image-container">
              <img src={Follow} alt="Follow Image" className="image" />
              {buttonPositions.map((pos, index) => (
                <button
                  key={index}
                  className={`image-button ${flashingButtons[index] ? 'flashing' : ''}`}
                  style={{ top: pos.top, left: pos.left, width: '50px', height: '50px' }}
                />
              ))}
            </div>
            <div className="image-container">
              <img src={Keypad} alt="Keypad Image" className="image" />
              {buttonPositions.map((pos, index) => (
                <button
                  key={index}
                  className="image-button"
                  style={{ top: pos.top, left: pos.left, width: '50px', height: '50px' }}
                  onClick={() => {
                    handleFlash(index);
                    if (datas) {
                      const updatedUserInput = [...datas.expectedList, index + 1];
                      const updatedData = {
                        ...datas,
                        expectedList: Array.isArray(datas.expectedList) ? [...datas.expectedList, index + 1] : [index + 1],
                      };
                      setData(updatedData);
                      postData(updatedData);
                      if (updatedUserInput.length === datas.createdList.length) {
                        if (JSON.stringify(updatedUserInput) === JSON.stringify(datas.createdList)) {
                          evaluateScore(updatedUserInput, updatedData);
                          setHasFlashed(false);
                        }
                        else {
                          console.log("Game Lost...");
                          setGameEnded(true);
                          // Instead of sending score via websockets, add the game/score records.
                          handleGameLoss();
                        }
                      }
                    }
                  }}
                />
              ))}
            </div>
            <div>{contents}</div>
          </div>
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
            {gameLost === -1 ? <h2>Waiting for other players...</h2> : (gameLost === 0 ? <h2>You won! 🎉🎉</h2> : <h2>You lost</h2>)}
            <button onClick={() => navigate('/home')}>Back to Home</button>
          </div>
        )}
      </div>
    </>
  );
}

export default Simon;