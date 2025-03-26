/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect,useRef} from 'react';
import './NRG.css';
import Grid from '../assets/Grid-1000-10-2-100.png';
import backgroundMusic from '../assets/music_game_1.mp3'; // Make sure the path is correct
import { useNavigate, useParams } from 'react-router-dom';
import { WebsocketSingleton } from './websocketSingleton';

interface Data {
  createdList: number[];
  level: number;
  expectedList: number[]; 
  difficulty: 'VeryEasy' | 'Easy' | 'Medium' | 'Hard' | 'Nightmare' | 'Impossible';
}

const defaultLevel = '4';
const socketsingleton: WebsocketSingleton = WebsocketSingleton.instance;
const scoreList = new Array();

function NRG() {
  const { isMultiplayer } = useParams();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [datas, setData] = useState<Data>();
  const [dataString1, setDataString1] = useState<string>(''); 
  const [dataString2, setDataString2] = useState<string>(''); 
  const [id] = useState<number | null>(Number(localStorage.getItem("ID")));
  const [highScore, setHighScore] = useState<number | null>(4);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const [gameLost, setGameLost] = useState<number>(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate(); 

  if(isMultiplayer){
    socketsingleton.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "nrg_score") {
        scoreList.push(data.score);
      } 
      else if(data.type === "game_end"){
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

    const setIdForScore = async () => {
        try {
            const response = await fetch(`${backendUrl}Scoreboards/get-by-id/${id}`);
            if (!response.ok) {
                console.log(response);
                throw new Error(`https error! Status: ${response.status}`);
            }

            const user = await response.json();
            setHighScore(user.nrgScore);
            localStorage.setItem("CardFlip", user.nrgScore);

        } catch (error) {
            console.log(error);
        }
    };

    const putDbHighScore = async (finalScore: number) => {
        try {
            console.log("Updating user score");
            const fetchResponse = await fetch(`${backendUrl}Scoreboards/get-by-id/${id}`);
            if (!fetchResponse.ok) {
                throw new Error(`Error fetching user: ${fetchResponse.statusText}`);
            }

            const user = await fetchResponse.json();
            if (user) {
                const updatedUser = { ...user, nrgScore: finalScore };

                const putResponse = await fetch(`${backendUrl}Scoreboards/${id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(updatedUser),
                });

                if (!putResponse.ok) {
                    throw new Error(`Error updating user: ${putResponse.statusText}`);
                }

                console.log(`User with ID ${id} updated successfully.`);
            } else {
                console.warn(`User with ID ${id} not found.`);
            }
        } catch (error) {
            console.error("Error updating user score:", error);
        }
    };

  const fetchMuteStatus = async () => {
    try {
        const response = await fetch(`${backendUrl}Mute`);
      if (!response.ok) {
        throw new Error(`https error! Status: ${response.status}`);
      }

      const data = await response.json();
      if (data.isMuted === true) {
        setIsMuted(true); 
      }
      else{
        setIsMuted(false);
      }
    } catch (err: any) {
      console.error('Failed to fetch mute status:', err);
    }
  };

  useEffect(() => {
    setIdForScore();
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
        setData(data);
        const dataString1 = data.createdList.join(', ');
        setDataString1(dataString1);
    } catch (error) {
        console.error('Failed to fetch data:', error);
    }
  };

  async function postData(data : Data) 
  {
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

      if(results.message == "Loser!"){
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
        console.error('Error in API request: ', response.statusText);
      }
    } 
    catch (error) {
      console.error("Failed to fetch data", error);
    }
  } 
  
  const handleArray = () => {
    if (datas && datas.level >=4) {
      for(let i=0; i<datas.level; i++){
        flashButton(datas.createdList[i]);
      }
      setTimeout(() => {setFlashingButtons(Array(25).fill(false));},2000);
    } 
    else{
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

  const restartGame = () => {
    setData(undefined);
    setDataString1('');
    setDataString2('');
    setFlashingButtons(Array(25).fill(false));
    populateData(); 
  };

    return (
      <div>
      <div className='center' style={{filter: `blur(${gameEnded ? "10px" : "0"})`, pointerEvents: (gameEnded ? "none" : "auto"),
          userSelect: (gameEnded ? "none" : "auto")
        }}>
        <><div className="block" >
              <audio ref={audioRef} src={backgroundMusic} loop />
              <div className='image-container1'>
              <img src={Grid} className="imageGrid"/>
              {buttonPositions.map((pos, index) => (
            <button
                  key={index}
                  className={`grid-block ${flashingButtons[index] ? 'activated' : ''}`}
                  style={{ top: pos.top, left: pos.left, width: '100px', height: '100px' }}
                  onClick={() => {
                      flashButton(index);
                      if (datas) {
                        const updatedData = {
                            ...datas,
                            expectedList: Array.isArray(datas.expectedList) ? [...datas.expectedList, index] : [index],
                        };
                        setData(updatedData);
                        const dataString2 = updatedData.expectedList.join(', ');
                        setDataString2(dataString2);
                        if(updatedData.createdList.length==updatedData.expectedList.length){
                          setFlashingButtons(Array(25).fill(false));
                          postData(updatedData);
              
                        }
                      }
                  }}
            >
            {datas && datas.createdList.includes(index)? datas.createdList.indexOf(index) + 1 : ''}
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