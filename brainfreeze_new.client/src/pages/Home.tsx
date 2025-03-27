import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Home.css';

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
            const response = await fetch(`${backendUrl}Users/id/${id}`);
            if (!response.ok) {
                throw new Error(`Error fetching user: ${response.statusText}`);
            }
            const user = await response.json();
            if (user) {
                setID(user.id.toString());
                setUsername(user.username);
                console.log(`User ID: ${user.id}, Username: ${user.username}`);
            } else {
                console.warn(`User not found.`);
            }
        } catch (error) {
            console.error("Error fetching user:", error);
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
                Welcome To BRAINFREEZE!<br />
                Select a game to play!<br />And remember...
            </p>
            <div className="button-grid">
                <Link to="/card-flip/false">
                    <button className="game-button" onClick={setSecureId}>Card Flip</button>
                </Link>
                <Link to="/simon/false">
                    <button className="game-button" onClick={setSecureId}>Simon</button>
                </Link>
                <Link to="/nrg/false">
                    <button className="game-button" onClick={setSecureId}>NRG</button>
                </Link>
                <Link to="/scoreboard">
                    <button className="game-button" onClick={setSecureId}>Scoreboard</button>
                </Link>
                <Link to="/multiplayer">
                    <button className="game-button" onClick={setSecureId}>Multiplayer</button>
                </Link>
            </div>

            <div className="settings-container">
                <button className="clear-button" onClick={handleClearTokens}>
                    <i className="fa fa-times-circle" aria-hidden="true"></i>
                    Logout
                </button>
            </div>
        </div>
    );
}
