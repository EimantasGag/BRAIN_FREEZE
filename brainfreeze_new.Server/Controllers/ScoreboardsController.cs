using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using brainfreeze_new.Server.Models;
using brainfreeze_new.Server.Exceptions;

namespace brainfreeze_new.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ScoreboardsController : ControllerBase
    {
        private readonly ScoreboardDBContext _context;

        public ScoreboardsController(ScoreboardDBContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Scoreboard>>> Getscoreboards()
        {
            return await _context.Scoreboards.ToListAsync();
        }

        [HttpGet("get-by-id/{id}")]
        public async Task<ActionResult<object>> GetScoreboardById(int id)
        {
            try
            {
                var scoreboard = await _context.Scoreboards.FindAsync(id);
                if (scoreboard == null)
                    throw new ResourceNotFoundException($"Scoreboard with ID {id} not found.");

                var gameHistory = await _context.GameHistories
                    .Where(gh => gh.UserId == id)
                    .ToListAsync();

                var totalGames = gameHistory.Count;
                var multiplayerMatches = gameHistory.Count(gh => gh.GameType.ToLower() == "multiplayer");

                return Ok(new
                {
                    scoreboard.Id,
                    scoreboard.Username,
                    scoreboard.Email,
                    JoinDate = scoreboard.CreatedAt.ToString("MM/dd/yyyy"),
                    TotalGames = totalGames,
                    MultiplayerMatches = multiplayerMatches
                });
            }
            catch (ResourceNotFoundException ex)
            {
                LogException(ex);
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                LogException(ex);
                return StatusCode(StatusCodes.Status500InternalServerError, "An unexpected error occurred.");
            }
        }

        [HttpGet("get-by-username/{username}")]
        public async Task<ActionResult<Scoreboard>> GetScoreboardByUsername(string username)
        {
            if (string.IsNullOrEmpty(username))
            {
                return BadRequest("Username is required");
            }

            try
            {
                var scoreboard = await _context.Scoreboards
                    .FirstOrDefaultAsync(s => s.Username == username);

                if (scoreboard == null)
                {
                    throw new ResourceNotFoundException($"Scoreboard with username '{username}' not found.");
                }

                return scoreboard;
            }
            catch (ResourceNotFoundException ex)
            {
                LogException(ex);
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                LogException(ex);
                return StatusCode(StatusCodes.Status500InternalServerError, "An unexpected error occurred.");
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutScoreboard(int id, Scoreboard scoreboard)
        {
            scoreboard.Id = id;

            _context.Entry(scoreboard).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ScoreboardExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        [HttpPost]
        public async Task<ActionResult<Scoreboard>> PostScoreboard(Scoreboard scoreboard)
        {
            try
            {
                _context.Scoreboards.Add(scoreboard);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetScoreboardById), new { id = scoreboard.Id }, scoreboard);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, "Error creating user: " + ex.Message);
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteScoreboard(int id)
        {
            var scoreboard = await _context.Scoreboards.FindAsync(id);
            if (scoreboard == null)
            {
                return NotFound();
            }

            _context.Scoreboards.Remove(scoreboard);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool ScoreboardExists(int id)
        {
            return _context.Scoreboards.Any(e => e.Id == id);
        }

        private void LogException(Exception ex)
        {
            string basePath = AppDomain.CurrentDomain.BaseDirectory;
            string directoryPath = Path.Combine(basePath, "logs");
            string logPath = Path.Combine(directoryPath, "logs.log");
            if (!Directory.Exists(directoryPath))
            {
                Directory.CreateDirectory(directoryPath);
            }

            System.IO.File.AppendAllText(logPath, $"{DateTime.Now}: {ex.Message}{Environment.NewLine}{ex.StackTrace}{Environment.NewLine}");
        }
    }
}