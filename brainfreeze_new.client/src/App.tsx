import { Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Navigationbar';
import Simon from './pages/Simon';
import Home from './pages/Home';
import CardFlip from './pages/CardFlip';
import NRG from './pages/NRG';
import Scoreboard from './pages/Scoreboard';
import Login from './Login';
import PrivateRoute from './components/PrivateRoute';

function App() {
    const location = useLocation();

    const shouldShowHeader = location.pathname !== "/" && location.pathname !== "/home";
    
    return (
        <div className="App">
            {shouldShowHeader && <Header />}
            <Routes>
                <Route path="/" element={<Login />} />
                <Route element={<PrivateRoute />}>
                    <Route path="/home" element={<Home />} />
                    <Route path="/card-flip" element={<CardFlip />} />
                    <Route path="/simon" element={<Simon />} />
                    <Route path="/nrg" element={<NRG />} />
                    <Route path="/scoreboard" element={<Scoreboard />} />
                </Route>
            </Routes>
        </div>
    );
}

export default App;
