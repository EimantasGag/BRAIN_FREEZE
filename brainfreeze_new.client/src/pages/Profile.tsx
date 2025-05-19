import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Profile.css';
import userIcon from '../assets/react.svg'; // Replace with actual user icon

interface UserData {
  username: string;
  email: string;
  joinDate: string;
  totalGames: number;
  multiplayerMatches: number;
}

interface Achievement {
  id: number;
  name: string;
  description: string;
  unlockCondition: string;
  isUnlocked: boolean;
  unlockedAt?: string;
}

const Profile: React.FC = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [id, setID] = useState<string | null>(localStorage.getItem('ID'));
  const [userData, setUserData] = useState<UserData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const fetchUserData = async () => {
    try {
      const tempid = localStorage.getItem('ID');
      setID(tempid);
      const response = await fetch(`${backendUrl}Scoreboards/get-by-id/${id}`);
      if (!response.ok) {
        throw new Error(`Error fetching user data: ${response.statusText}`);
      }

      const data = await response.json();
      setUserData({
        username: data.username || 'Guest',
        email: data.email,
        joinDate: data.joinDate,
        totalGames: data.totalGames,
        multiplayerMatches: data.multiplayerMatches,
      });
      setID(data.id.toString());
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUserData({
        username: 'Guest',
        email: 'Loading...',
        joinDate: 'Loading...',
        totalGames: 0,
        multiplayerMatches: 0,
      });
    }
  };

  const fetchAchievements = async () => {
    try {
      const response = await fetch(`${backendUrl}Achievements/user/${id}`);
      if (!response.ok) {
        throw new Error(`Error fetching achievements: ${response.statusText}`);
      }

      const data = await response.json();
      setAchievements(data);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      setAchievements([]);
    }
  };

  useEffect(() => {
    if (id) {
      fetchUserData();
      fetchAchievements();
    }
  }, [id]);

  return (
    <div className="profile-container">
      <div className="profile-left">
        <img src={userIcon} alt="User Icon" className="user-icon" />
        <h1 className="username">{userData?.username || 'Loading...'}</h1>
        <div className="account-info">
          <h2>Account Information</h2>
          <p>
            <strong>Email:</strong> {userData?.email}
          </p>
          <p>
            <strong>Date joined:</strong> {userData?.joinDate}
          </p>
          <p>
            <strong>Total games played:</strong> {userData?.totalGames}
          </p>
          <p>
            <strong>Multiplayer matches played:</strong> {userData?.multiplayerMatches}
          </p>
        </div>
      </div>
      <div className="profile-right">
        <h2>Achievements</h2>
        <div className="achievements-grid">
          {achievements.map((achievement) => (
            <div key={achievement.id} className="achievement-item">
              <div className={`achievement-icon ${achievement.isUnlocked ? 'unlocked' : 'locked'}`}>
                {achievement.isUnlocked ? '🏆' : '🔒'}
              </div>
              <p className="achievement-name">{achievement.name}</p>
              <p className="achievement-description">
                {achievement.isUnlocked ? achievement.description : achievement.unlockCondition}
              </p>
            </div>
          ))}
        </div>
      </div>
      <Link to="/home">
        <button className="game-button">Back to Home</button>
      </Link>
    </div>
  );
};

export default Profile;