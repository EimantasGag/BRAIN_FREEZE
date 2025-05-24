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

        _logger.LogInformation("User {UserId}: Found {Count} existing achievements in UserAchievements", userId, userAchievements.Count);

        var gameHistory = await _context.GameHistories
            .Where(gh => gh.UserId == userId)
            .ToListAsync();

        // Calculate stats
        int simonGamesCompleted = gameHistory.Count(gh => gh.GameType.ToLower() == "simon" && gh.Score > 0);
        int multiplayerWins = gameHistory.Count(gh => gh.GameType.ToLower() == "multiplayer" && gh.IsWinner);

        // Log for debugging
        _logger.LogInformation("User {UserId}: Simon games completed = {SimonGamesCompleted}, Multiplayer wins = {MultiplayerWins}", userId, simonGamesCompleted, multiplayerWins);

        // Calculate cumulative Simon score for debugging
        int totalSimonScore = gameHistory
            .Where(gh => gh.GameType.ToLower() == "simon")
            .Sum(gh => gh.Score);
        _logger.LogInformation("User {UserId}: Total Simon score = {TotalSimonScore}", userId, totalSimonScore);

        var achievements = await _context.Achievements.ToListAsync();

        foreach (var achievement in achievements)
        {
            if (userAchievements.Any(ua => ua.AchievementId == achievement.Id && ua.IsUnlocked))
            {
                _logger.LogInformation("User {UserId}: Achievement {AchievementName} already unlocked, skipping", userId, achievement.Name);
                continue;
            }

            bool unlocked = false;
            switch (achievement.Type)
            {
                case "SimonGamesCompleted":
                    _logger.LogInformation("Checking SimonGamesCompleted for user {UserId}: {SimonGamesCompleted} >= {TargetValue}", userId, simonGamesCompleted, achievement.TargetValue);
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

        // Check if another process modified UserAchievements
        var updatedUserAchievements = await _context.UserAchievements
            .Where(ua => ua.UserId == userId)
            .ToListAsync();
        if (updatedUserAchievements.Count != userAchievements.Count)
        {
            _logger.LogWarning("User {UserId}: UserAchievements count changed from {OldCount} to {NewCount} during CheckAndUpdateAchievements", userId, userAchievements.Count, updatedUserAchievements.Count);
        }
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error updating achievements for user {UserId}", userId);
        throw;
    }
}
        

    }

    
}