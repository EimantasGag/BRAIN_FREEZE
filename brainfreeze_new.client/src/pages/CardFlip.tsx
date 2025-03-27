import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import backgroundMusic from '../assets/music_game_3.mp3';
import './CardFlip.css';
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
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [id] = useState<number | null>(Number(localStorage.getItem("ID")));
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const [gameLost, setGameLost] = useState<boolean>(false);
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // Multiplayer messaging if needed
  if (isMultiplayer) {
    socketsingleton.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "game_lost") {
        console.log("Game lost...");
        setGameLost(true);
        setGameEnded(true);
      }
    };
  }

  // Poll the mute status from the backend
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

  // Get the shuffled images for the game
  const fetchShuffledImages = async () => {
    try {
      const response = await fetch(`${backendUrl}cardflip/shuffledImages`);
      if (!response.ok) {
        throw new Error(`https error! Status: ${response.status}`);
      }
      const data = await response.json();
      setTimeout(() => {
        setImages(data.shuffledImages);
        setFlippedCards(new Array(data.shuffledImages.length).fill(false));
        setMatchedCards(new Array(data.shuffledImages.length).fill(false));
        setIsResetting(false);
        setIsReady(true);
      }, 500);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Create a new game using the new Game endpoint (game type 0, isMultiplayer false)
  const createGame = async () => {
    try {
      const response = await fetch(`${backendUrl}Game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: 0, isMultiplayer: false }),
      });
      if (!response.ok) {
        throw new Error(`https error! Status: ${response.status}`);
      }
      const gameData = await response.json();
      localStorage.setItem("gameId", String(gameData.id));
      console.log("Game created with ID:", gameData.id);
    } catch (err: any) {
      console.error("Failed to create game:", err);
    }
  };

  // Fetch the user's high score using the new endpoint
  // Assumes that GET api/Scoreboards/MaxScore/{userId} returns an object { maxScore: number }
  const fetchHighScore = async () => {
    try {
      if (id) {
        const response = await fetch(`${backendUrl}Scoreboards/MaxScore/${id}/0`);
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

  useEffect(() => {
    createGame();
    fetchShuffledImages();
    fetchMuteStatus();
    fetchHighScore();

    const muteCheckInterval = setInterval(fetchMuteStatus, 1000);
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

  // Handle when a card is clicked
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

  // Check if the two selected cards match
  const checkForMatch = (selected: number[]) => {
    const [firstIndex, secondIndex] = selected;
    if (images[firstIndex] === images[secondIndex]) {
      const newMatchedCards = [...matchedCards];
      newMatchedCards[firstIndex] = true;
      newMatchedCards[secondIndex] = true;
      setMatchedCards(newMatchedCards);
      setSelectedCards([]);

      if (newMatchedCards.every(Boolean)) {
        if (isMultiplayer) {
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

  // Submit the final score by creating a new scoreboard entry with the userId, gameId, and score.
  // Then, update the high score by fetching the max score from the new endpoint.
  const submitScore = async (finalScore: number) => {
    try {
      console.log("Submitting score: ", finalScore);
      const gameId = localStorage.getItem("gameId");
      const response = await fetch(`${backendUrl}Scoreboards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, gameId: gameId, score: finalScore }),
      });
      if (!response.ok) {
        throw new Error(`https error! Status: ${response.status}`);
      }
      // Update the high score after submitting the new score
      await fetchHighScore();
    } catch (err: any) {
      setError("Failed to submit score");
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
      <div
        style={{
          filter: `blur(${gameEnded ? "10px" : "0"})`,
          pointerEvents: gameEnded ? "none" : "auto",
          userSelect: gameEnded ? "none" : "auto"
        }}
      >
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
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}
        >
          {gameLost ? <h2>You lose</h2> : <h2>You won! 🎉🎉</h2>}
          <button onClick={() => navigate('/home')}>Back to Home</button>
        </div>
      )}
    </div>
  );
};

export default CardFlip;
