using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using brainfreeze_new.Server.Models;
using brainfreeze_new.Server.Services; // Add this for AchievementService

namespace brainfreeze_new.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ScoreController : ControllerBase
    {
        private readonly ScoreboardDBContext _context;
        private readonly AchievementService _achievementService; // Replace AchievementsController with AchievementService
        private readonly ILogger<ScoreController> _logger;

        public ScoreController(ScoreboardDBContext context, AchievementService achievementService, ILogger<ScoreController> logger)
        {
            _context = context;
            _achievementService = achievementService; // Update to use AchievementService
            _logger = logger;
        }

        [HttpPost("evaluate")]
        public async Task<IActionResult> EvaluateScore([FromBody] ScoreEvaluationRequest request)
        {
            try
            {
                int score = CalculateScore(request.UserInput, request.Pattern, request.Difficulty);

                if (!int.TryParse(Request.Headers["UserId"], out int userId))
                {
                    return BadRequest("UserId header is required and must be an integer.");
                }

                string gameType = Request.Headers["GameType"].ToString() ?? "Unknown";
                bool isMultiplayer = bool.TryParse(Request.Headers["IsMultiplayer"], out bool multi) && multi;
                bool isWinner = isMultiplayer && bool.TryParse(Request.Headers["IsWinner"], out bool win) && win;

                var scoreboard = await _context.Scoreboards.FirstOrDefaultAsync(s => s.Id == userId);
                if (scoreboard == null)
                {
                    scoreboard = new Scoreboard
                    {
                        Id = userId,
                        Username = "User" + userId,
                        Email = "unknown@example.com",
                        SimonScore = 0,
                        CardflipScore = 0,
                        NrgScore = 0
                    };
                    _context.Scoreboards.Add(scoreboard);
                }

                switch (gameType.ToLower())
                {
                    case "simon":
                        scoreboard.SimonScore = Math.Max(scoreboard.SimonScore, score);
                        break;
                    case "cardflip":
                        scoreboard.CardflipScore = Math.Max(scoreboard.CardflipScore, score);
                        break;
                    case "nrg":
                        scoreboard.NrgScore = Math.Max(scoreboard.NrgScore, score);
                        break;
                    case "multiplayer":
                        break;
                }

                var gameHistory = new GameHistory
                {
                    UserId = userId,
                    GameType = gameType,
                    Score = score,
                    IsWinner = isWinner
                };
                _context.GameHistories.Add(gameHistory);

                await _context.SaveChangesAsync();

                await _achievementService.CheckAndUpdateAchievements(userId); // Update to use AchievementService

                return Ok(new ScoreResponse { Score = score });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error evaluating score for user");
                return StatusCode(500, "Error evaluating score");
            }
        }

        [HttpPost("log")]
        public async Task<IActionResult> LogGameCompletion([FromBody] GameLogRequest request)
        {
            try
            {
                var scoreboard = await _context.Scoreboards.FirstOrDefaultAsync(s => s.Id == request.UserId);
                if (scoreboard == null)
                {
                    scoreboard = new Scoreboard
                    {
                        Id = request.UserId,
                        Username = "User" + request.UserId,
                        Email = "unknown@example.com",
                        SimonScore = 0,
                        CardflipScore = 0,
                        NrgScore = 0
                    };
                    _context.Scoreboards.Add(scoreboard);
                }

                var gameHistory = new GameHistory
                {
                    UserId = request.UserId,
                    GameType = request.GameType,
                    Score = request.Score,
                    IsWinner = request.IsWinner
                };
                _context.GameHistories.Add(gameHistory);

                await _context.SaveChangesAsync();

                await _achievementService.CheckAndUpdateAchievements(request.UserId); // Update to use AchievementService

                return Ok(new { message = "Game completion logged" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error logging game completion for user {UserId}", request.UserId);
                return StatusCode(500, "Error logging game completion");
            }
        }

        private static int CalculateScore(int[] userInput, int[] pattern, DifficultyLevel difficulty)
        {
            int baseScore = 0;

            for (int i = 0; i < pattern.Length; i++)
            {
                if (i < userInput.Length && userInput[i] == pattern[i])
                {
                    baseScore++;
                }
                else
                {
                    return 0;
                }
            }

            int difficultyMultiplier = difficulty switch
            {
                DifficultyLevel.VeryEasy => 1,
                DifficultyLevel.Easy => 2,
                DifficultyLevel.Normal => 3,
                DifficultyLevel.Hard => 4,
                DifficultyLevel.Nightmare => 5,
                DifficultyLevel.Impossible => 6,
                _ => 1
            };

            return baseScore * difficultyMultiplier;
        }
    }

    public class ScoreEvaluationRequest
    {
        public required int[] UserInput { get; set; }
        public required int[] Pattern { get; set; }
        public DifficultyLevel Difficulty { get; set; }
    }

    public class ScoreResponse
    {
        public int Score { get; set; }
    }

    public class GameLogRequest
    {
        public int UserId { get; set; }
        public string GameType { get; set; } = string.Empty;
        public int Score { get; set; }
        public bool IsWinner { get; set; }
    }
}