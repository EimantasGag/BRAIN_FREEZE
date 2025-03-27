import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
    // Make sure that VITE_BACKEND_URL does NOT already include the trailing "api/"
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const [username, setUsername] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("ID");
        if (token) {
            navigate("/home");
        } else {
            console.log("No user logged in, please login.");
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

    // Function to create a new user using POST /Users
    const createUser = async () => {
        try {
            const response = await fetch(`${backendUrl}Users`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                // The API expects a JSON string with the username in the body
                body: JSON.stringify(username),
            });

            if (!response.ok) {
                throw new Error(`Error creating user: ${response.statusText}`);
            }

            const newUser = await response.json();
            console.log("New user created:", newUser);
            return newUser.id;
        } catch (error) {
            console.error("Error creating new user:", error);
            return null;
        }
    };

    // Function to fetch a user by username (GET /Users/{username})
    const fetchUserByUsername = async () => {
        try {
            const response = await fetch(`${backendUrl}Users/${username}`);
            if (response.ok) {
                const user = await response.json();
                return user.id;
            } else if (response.status === 404) {
                // Silently create a new user if not found
                return await createUser();
            } else {
                throw new Error(`Error fetching user: ${response.statusText}`);
            }
        } catch (error) {
            console.error("Error fetching user by username:", error);
            return null;
        }
    };

    const handleLogin = async () => {
        if (!username.trim()) {
            alert("Please enter a username.");
            return;
        }

        const userId = await fetchUserByUsername();
        if (userId !== null) {
            localStorage.setItem("ID", userId.toString());
            console.log(`Logged in as user ID: ${userId}`);
            await fetchNewSessionId();
            navigate("/home");
        } else {
            alert("Failed to login. Please try again.");
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
                    <p>Please enter your username to start playing.</p>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter username"
                        className="login-input"
                        onKeyDown={handleKeyDown}
                    />
                    <button onClick={handleLogin} className="login-button">
                        Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
