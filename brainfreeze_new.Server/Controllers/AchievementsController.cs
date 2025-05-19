using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using brainfreeze_new.Server.Models;

namespace brainfreeze_new.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AchievementsController : ControllerBase
    {
        private readonly ScoreboardDBContext _context;
        private readonly ILogger<AchievementsController> _logger;

        public AchievementsController(ScoreboardDBContext context, ILogger<AchievementsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetUserAchievements(int userId)
        {
            try
            {
                var userAchievements = await _context.UserAchievements
                    .Where(ua => ua.UserId == userId)
                    .Include(ua => ua.Achievement)
                    .ToListAsync();

                var allAchievements = await _context.Achievements.ToListAsync();

                var result = allAchievements.Select(a =>
                {
                    var userAchievement = userAchievements.FirstOrDefault(ua => ua.AchievementId == a.Id);
                    return new
                    {
                        a.Id,
                        a.Name,
                        a.Description,
                        a.UnlockCondition,
                        IsUnlocked = userAchievement != null && userAchievement.IsUnlocked,
                        UnlockedAt = userAchievement?.UnlockedAt
                    };
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching achievements for user {UserId}", userId);
                return StatusCode(500, "An unexpected error occurred.");
            }
        }
    }
}