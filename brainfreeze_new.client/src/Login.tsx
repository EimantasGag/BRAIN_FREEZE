import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState(""); // Added password state
    const [error, setError] = useState(""); // Added error state for displaying messages
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("ID");
        if (token) {
            navigate("/home");
        } else {
            console.log("User not found, returning to login");
        }
    }, [navigate]);

    const fetchNewSessionId = async () => {
        try {
            const response = await fetch(`${backendUrl}session/new`);
            if (!response.ok) {
                throw new Error(`Error fetching session ID: ${response.statusText}`);
            }

            const data = await response.json();
            if (data.sessionId) {
                localStorage.setItem("sessionId", data.sessionId);
                console.log("New session ID stored:", data.sessionId);
            } else {
                console.error("Session ID not found in response.");
            }
        } catch (error) {
            console.error("Error fetching new session ID:", error);
        }
    };

    const handleLogin = async () => {
        if (!username.trim()) {
            setError("Please enter a username.");
            return;
        }
        if (!password.trim()) {
            setError("Please enter a password.");
            return;
        }

        try {
            setError(""); // Clear any previous error
            const response = await fetch(`${backendUrl}Score/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username,
                    password,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Login failed.");
            }

            const user = await response.json();
            localStorage.setItem("ID", user.userId.toString());
            localStorage.setItem("Username", user.username);
            console.log(`Logged in as user ID: ${user.userId}`);

            await fetchNewSessionId();
            navigate("/home");
        } catch (error: any) {
            if (error.message === "Failed to fetch") {
                console.log("Entering offline mode");
                localStorage.setItem("ID", "-1");
                console.log(`Logged in as user ID: -1`);
                navigate("/home");
            } else {
                setError(error.message);
                console.error("Login error:", error);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleLogin();
        }
    };

    return (
        <div className="center">
            <div className="login-container">
                <div className="login-box">
                    <h2>Welcome to BRAINFREEZE</h2>
                    <p>Please enter your username and password to start playing.</p>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter username"
                        className="login-input"
                        onKeyDown={handleKeyDown}
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="login-input"
                        onKeyDown={handleKeyDown}
                    />
                    {error && <p style={{ color: "red" }}>{error}</p>}
                    <button onClick={handleLogin} className="login-button">
                        Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;