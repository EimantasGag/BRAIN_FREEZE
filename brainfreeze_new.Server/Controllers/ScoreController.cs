using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using brainfreeze_new.Server.Models;
using brainfreeze_new.Server.Services;

namespace brainfreeze_new.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ScoreController : ControllerBase
    {
        private readonly ScoreboardDBContext _context;
        private readonly ILogger<ScoreController> _logger;
        private readonly AchievementService _achievementService;

        public ScoreController(ScoreboardDBContext context, ILogger<ScoreController> logger, AchievementService achievementService)
        {
            _context = context;
            _logger = logger;
            _achievementService = achievementService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrEmpty(request.Username) || string.IsNullOrEmpty(request.Password))
            {
                return BadRequest("Username and password are required.");
            }

            try
            {
                var user = await _context.Scoreboards
                    .FirstOrDefaultAsync(s => s.Username == request.Username);

                if (user == null)
                {
                    // New user: Create a new account with the provided password
                    user = new Scoreboard
                    {
                        Username = request.Username,
                        Email = $"{request.Username}@example.com", // Placeholder email
                        Password = PasswordService.HashPassword(request.Password),
                        SimonScore = 0,
                        CardflipScore = 0,
                        NrgScore = 0
                    };
                    _context.Scoreboards.Add(user);
                    await _context.SaveChangesAsync();

                    return Ok(new LoginResponse
                    {
                        UserId = user.Id,
                        Username = user.Username,
                        Message = "User created and logged in successfully."
                    });
                }
                else
                {
                    // Existing user: Verify the password
                    if (string.IsNullOrEmpty(user.Password))
                    {
                        // Handle existing users without a password (from before this update)
                        user.Password = PasswordService.HashPassword(request.Password);
                        await _context.SaveChangesAsync();

                        return Ok(new LoginResponse
                        {
                            UserId = user.Id,
                            Username = user.Username,
                            Message = "Password set and logged in successfully."
                        });
                    }

                    if (PasswordService.VerifyPassword(request.Password, user.Password))
                    {
                        return Ok(new LoginResponse
                        {
                            UserId = user.Id,
                            Username = user.Username,
                            Message = "Login successful."
                        });
                    }
                    else
                    {
                        return Unauthorized(new { Message = "Incorrect password." });
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login for username {Username}", request.Username);
                return StatusCode(500, "Error during login.");
            }
        }

        [HttpGet("gamehistory/{userId}")]
        public async Task<ActionResult<IEnumerable<GameHistory>>> GetGameHistory(int userId)
        {
            var gameHistory = await _context.GameHistories
                .Where(gh => gh.UserId == userId)
                .ToListAsync();

            return Ok(gameHistory);
        }

        [HttpPost("evaluate")]
        public async Task<IActionResult> EvaluateScore([FromBody] ScoreEvaluationRequest request)
        {
            try
            {
                _logger.LogInformation("EvaluateScore called: UserInput={UserInput}, Pattern={Pattern}, Difficulty={Difficulty}",
                    string.Join(",", request.UserInput), string.Join(",", request.Pattern), request.Difficulty);

                int score = CalculateScore(request.UserInput, request.Pattern, request.Difficulty);
                _logger.LogInformation("EvaluateScore - Calculated score: {Score}", score);

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
                        Password = string.Empty, // New users via this endpoint (e.g., Simon game) may need to set a password later
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

                await _achievementService.CheckAndUpdateAchievements(userId);

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
                _logger.LogInformation("LogGameCompletion called: UserId={UserId}, GameType={GameType}, Score={Score}, IsWinner={IsWinner}",
                    request.UserId, request.GameType, request.Score, request.IsWinner);

                var scoreboard = await _context.Scoreboards.FirstOrDefaultAsync(s => s.Id == request.UserId);
                if (scoreboard == null)
                {
                    scoreboard = new Scoreboard
                    {
                        Id = request.UserId,
                        Username = "User" + request.UserId,
                        Email = "unknown@example.com",
                        Password = string.Empty,
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

                await _achievementService.CheckAndUpdateAchievements(request.UserId);

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

        [HttpDelete("user/{username}")]
    public async Task<IActionResult> DeleteUser(string username)
    {
        try
        {
            var user = await _context.Scoreboards
                .FirstOrDefaultAsync(s => s.Username == username);

            if (user == null)
            {
                return NotFound(new { Message = $"User with username {username} not found." });
            }

            _context.Scoreboards.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new { Message = $"User {username} deleted successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting user with username {Username}", username);
            return StatusCode(500, "Error deleting user.");
        }
    }
    }

    

    public class ScoreEvaluationRequest
    {
        public int[] UserInput { get; set; } = [];
        public int[] Pattern { get; set; } = [];
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

    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class LoginResponse
    {
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}