namespace brainfreeze_new.Server.Models
{
    public class Achievement
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty; // e.g., "Simoneer"
        public string Description { get; set; } = string.Empty; // e.g., "Complete 10 Simon games"
        public string UnlockCondition { get; set; } = string.Empty; // e.g., "Win 2 multiplayer matches to unlock"
        public string Type { get; set; } = string.Empty; // e.g., "SimonGamesCompleted", "MultiplayerWins"
        public int TargetValue { get; set; } // e.g., 10 for "Complete 10 Simon games"
    }
}