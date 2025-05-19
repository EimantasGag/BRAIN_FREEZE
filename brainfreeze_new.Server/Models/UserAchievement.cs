namespace brainfreeze_new.Server.Models
{
    public class UserAchievement
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int AchievementId { get; set; }
        public Achievement Achievement { get; set; } // Navigation property
        public bool IsUnlocked { get; set; }
        public DateTime? UnlockedAt { get; set; }
    }
}