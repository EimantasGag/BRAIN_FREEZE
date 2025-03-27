import {
    Box,
    createTheme,
    Paper,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    Tabs,
    TextField,
    ThemeProvider,
} from '@mui/material';
import axios from 'axios';
import { useEffect, useState } from 'react';

interface ScoreboardEntry {
    id: number;
    userId: number;
    gameId: number;
    score: number;
    timestamp: string;
    // Augmented fields
    username?: string;
    gameType?: number;
}

interface User {
    id: number;
    username: string;
}

interface Game {
    id: number;
    type: number;
    isMultiplayer: boolean;
}

type Order = 'asc' | 'desc';

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
    },
});

const ScoreboardTable = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    // State for fetched data
    const [scoreboardData, setScoreboardData] = useState<ScoreboardEntry[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [games, setGames] = useState<Game[]>([]);

    // State for UI controls
    const [selectedTab, setSelectedTab] = useState<number>(0);
    const [filterText, setFilterText] = useState<string>('');
    const [order, setOrder] = useState<Order>('asc');
    const [orderBy, setOrderBy] = useState<'username' | 'score' | 'timestamp'>('score');

    // Fetch data from API endpoints
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [scoreRes, userRes, gameRes] = await Promise.all([
                    axios.get<ScoreboardEntry[]>(`${backendUrl}Scoreboards`),
                    axios.get<User[] | any>(`${backendUrl}Users`),
                    axios.get<Game[] | any>(`${backendUrl}Game`),
                ]);

                const scores = scoreRes.data;

                // If userRes.data is not an array, attempt to extract the array from a known property
                const userData: User[] = Array.isArray(userRes.data)
                    ? userRes.data
                    : (userRes.data.users || userRes.data.value || []);
                const gameData: Game[] = Array.isArray(gameRes.data)
                    ? gameRes.data
                    : (gameRes.data.games || gameRes.data.value || []);

                // Log the data shape for debugging purposes
                console.log('Users:', userData);
                console.log('Games:', gameData);

                // Create maps for quick lookup
                const userMap = new Map(userData.map(user => [user.id, user.username]));
                const gameMap = new Map(gameData.map(game => [game.id, game.type]));

                // Combine the data so each scoreboard entry gets its username and gameType
                const combinedData = scores.map(score => ({
                    ...score,
                    username: userMap.get(score.userId),
                    gameType: gameMap.get(score.gameId),
                }));

                setScoreboardData(combinedData);
                setUsers(userData);
                setGames(gameData);
            } catch (error) {
                console.error('Error fetching data', error);
            }
        };

        fetchData();
    }, []);

    // Filter entries for the currently selected game type and by username filter text
    const filteredData = scoreboardData.filter(entry => {
        const matchesGameType = entry.gameType === selectedTab;
        const matchesFilter = entry.username
            ? entry.username.toLowerCase().includes(filterText.toLowerCase())
            : false;
        return matchesGameType && matchesFilter;
    });

    // Sort data based on the column selected
    const sortData = (data: ScoreboardEntry[]) => {
        return data.sort((a, b) => {
            let aValue: any, bValue: any;
            if (orderBy === 'username') {
                aValue = a.username || '';
                bValue = b.username || '';
            } else if (orderBy === 'score') {
                aValue = a.score;
                bValue = b.score;
            } else if (orderBy === 'timestamp') {
                aValue = new Date(a.timestamp).getTime();
                bValue = new Date(b.timestamp).getTime();
            }
            if (aValue < bValue) return order === 'asc' ? -1 : 1;
            if (aValue > bValue) return order === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const handleSortRequest = (property: 'username' | 'score' | 'timestamp') => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    // Helper to format the timestamp as "yyyy-mm-dd hh-mm"
    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
    };

    return (
        <ThemeProvider theme={darkTheme}>
            <Paper
                sx={{
                    padding: 2,
                    mt: 4,
                    backgroundColor: 'background.default',
                    color: 'text.primary',
                }}
            >
                <Tabs
                    value={selectedTab}
                    onChange={(event, newValue) => setSelectedTab(newValue)}
                    indicatorColor="primary"
                    textColor="inherit"
                >
                    <Tab label="Cards" value={0} />
                    <Tab label="NGR" value={1} />
                    <Tab label="Simon" value={2} />
                </Tabs>

                <Box sx={{ mt: 2, mb: 2 }}>
                    <TextField
                        label="Filter by Username"
                        variant="outlined"
                        fullWidth
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        InputLabelProps={{ style: { color: '#fff' } }}
                        InputProps={{
                            style: { color: '#fff' },
                        }}
                    />
                </Box>

                <TableContainer component={Paper} sx={{ backgroundColor: 'background.paper' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sortDirection={orderBy === 'username' ? order : false}>
                                    <TableSortLabel
                                        active={orderBy === 'username'}
                                        direction={orderBy === 'username' ? order : 'asc'}
                                        onClick={() => handleSortRequest('username')}
                                    >
                                        Username
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sortDirection={orderBy === 'score' ? order : false}>
                                    <TableSortLabel
                                        active={orderBy === 'score'}
                                        direction={orderBy === 'score' ? order : 'asc'}
                                        onClick={() => handleSortRequest('score')}
                                    >
                                        Score
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sortDirection={orderBy === 'timestamp' ? order : false}>
                                    <TableSortLabel
                                        active={orderBy === 'timestamp'}
                                        direction={orderBy === 'timestamp' ? order : 'asc'}
                                        onClick={() => handleSortRequest('timestamp')}
                                    >
                                        Timestamp
                                    </TableSortLabel>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortData(filteredData).map((entry) => (
                                <TableRow key={entry.id}>
                                    <TableCell>{entry.username}</TableCell>
                                    <TableCell>{entry.score}</TableCell>
                                    <TableCell>{formatTimestamp(entry.timestamp)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </ThemeProvider>
    );
};

export default ScoreboardTable;
