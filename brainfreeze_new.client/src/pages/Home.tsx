import { Link, useNavigate } from 'react-router-dom';
import './Home.css';
import { useEffect, useState } from 'react';

export default function Home() {

    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const navigate = useNavigate();
    const [id, setID] = useState<string | null>(localStorage.getItem("ID"));
    const [username, setUsername] = useState<string | null>(null);

    const handleClearTokens = () => {
        localStorage.clear();
        console.log('Token cleared!');
        navigate('/');
    };

    const fetchUsername = async () => {
        try {
            const tempid = localStorage.getItem("ID");
            setID(tempid);
            const response = await fetch(`${backendUrl}Scoreboards/get-by-id/${id}`);
            if (!response.ok) {
                throw new Error(`Error fetching scores: ${response.statusText}`);
            }

            const user = await response.json();

            if (user) {
                setID(user.id.toString());
                setUsername(user.username);
                console.log(`User ID: ${user.id}, Username: ${user.username}`);
            } else {
                console.warn(`User ID not found.`);
            }
        } catch (error) {
            console.error("Error fetching user scores:", error);
        }
    };

    useEffect(() => {
        fetchUsername();
    }, []);

    const setSecureId = () => {
        if (id) {
            localStorage.setItem("ID", id);
            console.log(`ID reset to: ${id}`);
        } else {
            console.error("No user ID found to set securely.");
        }
    };

    return (
        <div className="button-container">
            <p>
                Welcome To BRAINFREEZE, {username ? username : "Guest"}!<br />
                Select a game to play!<br />And remember...
            </p>
            <div className="button-grid">
                <Link to="/card-flip">
                    <button className="game-button" onClick={setSecureId}>Card Flip</button>
                </Link>
                <Link to="/simon">
                    <button className="game-button" onClick={setSecureId}>Simon</button>
                </Link>
                <Link to="/nrg">
                    <button className="game-button" onClick={setSecureId}>NRG</button>
                </Link>
                <Link to="/scoreboard">
                    <button className="game-button" onClick={setSecureId}>Scoreboard</button>
                </Link>
            </div>

            <div className="settings-container">
                <button className="clear-button" onClick={handleClearTokens}>
                    <i className="fa fa-times-circle" aria-hidden="true"></i>
                    Clear Tokens
                </button>
            </div>
            <p>
                SessionID {localStorage.getItem("sessionId")}
            </p>
        </div>
    );
}
