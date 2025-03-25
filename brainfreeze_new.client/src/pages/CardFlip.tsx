import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import './CardFlip.css';
import backgroundMusic from '../assets/music_game_3.mp3';
import { WebsocketSingleton } from "./websocketSingleton";

const socketsingleton: WebsocketSingleton = WebsocketSingleton.instance;

const CardFlip = () => {
  const { isMultiplayer } = useParams();
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<boolean[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [matchedCards, setMatchedCards] = useState<boolean[]>([]);
  const [moveCount, setMoveCount] = useState<number>(0);
  const [highScore, setHighScore] = useState<number | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false); // Mute/unmute state
  const [id] = useState<number | null>(Number(localStorage.getItem("ID")));
  const [gameLost, setGameLost] = useState<boolean>(false);
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const navigate = useNavigate();

  if(isMultiplayer){
    socketsingleton.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "game_lost") {
        console.log("Game lost...");
        setGameLost(true);
        setGameEnded(true);
      } 
    };
  }
  
  const audioRef = useRef<HTMLAudioElement | null>(null); // Reference for the audio element

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

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

  const fetchShuffledImages = async () => {
    try {
        const response = await fetch(`${backendUrl}cardflip/shuffledImages`);
      if (!response.ok) {
        throw new Error(`https error! Status: ${response.status}`);
      }

      const data = await response.json();

      setTimeout(() => {
        setImages(data.shuffledImages);
        setFlippedCards(new Array(data.shuffledImages.length).fill(false));  // Reset flipped state
        setMatchedCards(new Array(data.shuffledImages.length).fill(false));  // Reset matched state
        setIsResetting(false);
        setIsReady(true); 
      }, 500);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const setIdForScore = async () => {
    try {
        const response = await fetch(`${backendUrl}Scoreboards/get-by-id/${id}`);
      if (!response.ok) {
        console.log(response);
        throw new Error(`https error! Status: ${response.status}`);
      }

      const user = await response.json();
      setHighScore(user.cardflipScore);
      localStorage.setItem("CardFlip", user.cardflipScore);

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
          const updatedUser = { ...user, cardflipScore: finalScore };

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

  useEffect(() => {
    setIdForScore();
    submitInitScore(Number(highScore));
    fetchShuffledImages();
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
    if (audioRef.current) {
      audioRef.current.volume = 0.3;
      audioRef.current.loop = true;

      // Apply mute/unmute immediately based on the state
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
  }, [isMuted]); // Ensure this effect runs whenever `isMuted` changes


  const handleCardClick = (index: number) => {
    if (isResetting || selectedCards.length === 2 || matchedCards[index]) return;

    const newFlippedCards = [...flippedCards];
    newFlippedCards[index] = true;
    setFlippedCards(newFlippedCards);

    const newSelectedCards = [...selectedCards, index];
    setSelectedCards(newSelectedCards);

    if (newSelectedCards.length === 2) {
      setMoveCount((prevCount) => prevCount + 1);
      checkForMatch(newSelectedCards);
    }
  };

  const checkForMatch = (selected: number[]) => {
    const [firstIndex, secondIndex] = selected;
    if (images[firstIndex] === images[secondIndex]) {
      const newMatchedCards = [...matchedCards];
      newMatchedCards[firstIndex] = true;
      newMatchedCards[secondIndex] = true;
      setMatchedCards(newMatchedCards);
      setSelectedCards([]);

      if (newMatchedCards.every(Boolean)) {
        if(isMultiplayer){
          socketsingleton.socket.send(JSON.stringify({ type: "game_won" }));
        }
        submitScore(moveCount + 1);
        setGameEnded(true);
      }
    } else {
      setTimeout(() => {
        const newFlippedCards = [...flippedCards];
        newFlippedCards[firstIndex] = false;
        newFlippedCards[secondIndex] = false;
        setFlippedCards(newFlippedCards);
        setSelectedCards([]);
      }, 1000);
    }
  };

    const submitInitScore = async (initScore: number) => {
        try {
            if (initScore && initScore !== highScore) {
                console.log("Submitting initial score: ", initScore);
                const response = await fetch(`${backendUrl}cardflip/submitInitScore`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ score: initScore }),
                });
                console.log(response);
            }
        } catch (err) {
            setError('Failed to submit score');
        }
    };

    const submitScore = async (finalScore: number) => {
        try {
            console.log("Submitting score: ", finalScore);
            const response = await fetch(`${backendUrl}cardflip/submitScore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score: finalScore }),
            });
            if (response.ok) {
                const data = await response.json();
                if (data.newHighScore) {
                    console.log("New Highscore!");
                    setHighScore(finalScore);
                    putDbHighScore(finalScore);
                    localStorage.setItem("CardFlip", String(finalScore));
                }
            }
        } catch (err) {
            setError('Failed to submit score');
        }
    };



  const resetGame = () => {
    setIsReady(false);
    setIsResetting(true);
    setMoveCount(0);
    setSelectedCards([]);
    setFlippedCards(new Array(images.length).fill(true));
    setTimeout(fetchShuffledImages, 500);
  };

  return (
    <div>
      <div style={{filter: `blur(${gameEnded ? "10px" : "0"})`, pointerEvents: (gameEnded ? "none" : "auto"),
        userSelect: (gameEnded ? "none" : "auto")
      }}>
        <h2>Card Flip Game</h2>

        {error && <div style={{ color: 'red' }}>{error}</div>}

        <audio ref={audioRef} src={backgroundMusic} loop />

        <div className="score-board">
          <p>Moves: {moveCount}</p>
          {highScore !== null && <p>High Score: {highScore}</p>}
          <button onClick={resetGame}>Restart Game</button>
        </div>

        <div className="grid-container">
          {images.length > 0 && isReady ? (
            images.map((imageUrl, index) => (
              <div
                key={index}
                className={`card ${flippedCards[index] || matchedCards[index] ? 'flipped' : ''}`}
                onClick={() => handleCardClick(index)}
              >
                <div className="card-inner">
                  <div className="card-front">
                    <div className="placeholder"></div>
                  </div>
                  <div className="card-back">
                    <img src={`/${imageUrl}`} alt={`Image ${index + 1}`} className="grid-image" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p>Loading images...</p>
          )}
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
          {gameLost ? <h2>You lose</h2> : <h2>You won! 🎉🎉</h2>}
          <button onClick={() => navigate('/home')}>Back to Home</button>
        </div>
      )}
    </div>
  );
};

export default CardFlip;
