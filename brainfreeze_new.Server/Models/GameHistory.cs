namespace brainfreeze_new.Server.Models
{
    public class GameHistory
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string GameType { get; set; } = string.Empty; // e.g., "Simon", "CardFlip", "NRG", "Multiplayer"
        public int Score { get; set; }
        public bool IsWinner { get; set; } // For multiplayer matches
        public DateTime PlayedAt { get; set; } = DateTime.UtcNow;
    }
}