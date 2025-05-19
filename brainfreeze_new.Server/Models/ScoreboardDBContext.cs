using Microsoft.EntityFrameworkCore;

namespace brainfreeze_new.Server.Models
{
    public class ScoreboardDBContext : DbContext
    {
        public ScoreboardDBContext(DbContextOptions<ScoreboardDBContext> options) : base(options) { }

        public DbSet<Scoreboard> Scoreboards { get; set; }
        public DbSet<Achievement> Achievements { get; set; }
        public DbSet<UserAchievement> UserAchievements { get; set; }
        public DbSet<GameHistory> GameHistories { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Configure UserAchievement relationships
            modelBuilder.Entity<UserAchievement>()
                .HasKey(ua => new { ua.UserId, ua.AchievementId });

            modelBuilder.Entity<UserAchievement>()
                .HasOne(ua => ua.Achievement)
                .WithMany()
                .HasForeignKey(ua => ua.AchievementId);

            // Seed initial achievements
            modelBuilder.Entity<Achievement>().HasData(
                new Achievement { Id = 1, Name = "Simoneer", Description = "Complete 10 Simon games", Type = "SimonGamesCompleted", TargetValue = 10, UnlockCondition = "" },
                new Achievement { Id = 2, Name = "Simoneer", Description = "Complete 10 Simon games", Type = "SimonGamesCompleted", TargetValue = 10, UnlockCondition = "" },
                new Achievement { Id = 3, Name = "Simoneer", Description = "Complete 10 Simon games", Type = "SimonGamesCompleted", TargetValue = 10, UnlockCondition = "" },
                new Achievement { Id = 4, Name = "Simoneer", Description = "Complete 10 Simon games", Type = "SimonGamesCompleted", TargetValue = 10, UnlockCondition = "" },
                new Achievement { Id = 5, Name = "Simoneer", Description = "Complete 10 Simon games", Type = "SimonGamesCompleted", TargetValue = 10, UnlockCondition = "" },
                new Achievement { Id = 6, Name = "Simoneer", Description = "Complete 10 Simon games", Type = "SimonGamesCompleted", TargetValue = 10, UnlockCondition = "" },
                new Achievement { Id = 7, Name = "Simoneer", Description = "Complete 10 Simon games", Type = "SimonGamesCompleted", TargetValue = 10, UnlockCondition = "" },
                new Achievement { Id = 8, Name = "Multiplayer Pro", Description = "Win 2 multiplayer matches", Type = "MultiplayerWins", TargetValue = 2, UnlockCondition = "Win 2 multiplayer matches to unlock" },
                new Achievement { Id = 9, Name = "Multiplayer Pro", Description = "Win 2 multiplayer matches", Type = "MultiplayerWins", TargetValue = 2, UnlockCondition = "Win 2 multiplayer matches to unlock" }
            );
        }
    }
}