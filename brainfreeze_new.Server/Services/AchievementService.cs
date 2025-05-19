using Microsoft.EntityFrameworkCore;
using brainfreeze_new.Server.Models;

namespace brainfreeze_new.Server.Services
{
    public class AchievementService
    {
        private readonly ScoreboardDBContext _context;
        private readonly ILogger<AchievementService> _logger;

        public AchievementService(ScoreboardDBContext context, ILogger<AchievementService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task CheckAndUpdateAchievements(int userId)
        {
            try
            {
                var userAchievements = await _context.UserAchievements
                    .Where(ua => ua.UserId == userId)
                    .ToListAsync();

                var gameHistory = await _context.GameHistories
                    .Where(gh => gh.UserId == userId)
                    .ToListAsync();

                // Calculate stats
                int simonGamesCompleted = gameHistory.Count(gh => gh.GameType.ToLower() == "simon" && gh.Score > 0);
                int multiplayerWins = gameHistory.Count(gh => gh.GameType.ToLower() == "multiplayer" && gh.IsWinner);

                var achievements = await _context.Achievements.ToListAsync();

                foreach (var achievement in achievements)
                {
                    if (userAchievements.Any(ua => ua.AchievementId == achievement.Id && ua.IsUnlocked))
                        continue;

                    bool unlocked = false;
                    switch (achievement.Type)
                    {
                        case "SimonGamesCompleted":
                            unlocked = simonGamesCompleted >= achievement.TargetValue;
                            break;
                        case "MultiplayerWins":
                            unlocked = multiplayerWins >= achievement.TargetValue;
                            break;
                    }

                    if (unlocked)
                    {
                        var userAchievement = new UserAchievement
                        {
                            UserId = userId,
                            AchievementId = achievement.Id,
                            IsUnlocked = true,
                            UnlockedAt = DateTime.UtcNow
                        };
                        _context.UserAchievements.Add(userAchievement);
                        _logger.LogInformation("Achievement {AchievementName} unlocked for user {UserId}", achievement.Name, userId);
                    }
                }

                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating achievements for user {UserId}", userId);
                throw;
            }
        }
    }
}