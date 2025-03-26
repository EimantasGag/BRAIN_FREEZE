using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using brainfreeze_new.Server.Models;

namespace brainfreeze_new.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ScoreboardsController : ControllerBase
    {
        private readonly AppDBContext _context;

        public ScoreboardsController(AppDBContext context)
        {
            _context = context;
        }

        // GET: api/Scoreboards
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Scoreboard>>> GetScores()
        {
            var scores = await _context.Scores.ToListAsync();
            return Ok(scores);
        }

        [HttpGet("MaxScore/{userId}/{gameType}")]
        public async Task<ActionResult> GetMaxScore(int userId, int gameType)
        {
            var query = _context.Scores
                .Join(
                    _context.Games,
                    s => s.GameId,
                    g => g.Id,
                    (s, g) => new { Score = s, Game = g }
                )
                .Where(x => x.Score.UserId == userId && x.Game.Type == gameType)
                .Select(x => x.Score.Score);

            int maxScore = 0;
            if (await query.AnyAsync())
            {
                maxScore = await query.MaxAsync();
            }

            return Ok(new { maxScore });
        }

        [HttpPost]
        public async Task<ActionResult<Scoreboard>> PostScoreboard(Scoreboard scoreboard)
        {
            scoreboard.Timestamp = DateTime.Now;
            _context.Scores.Add(scoreboard);
            await _context.SaveChangesAsync();

            return Ok(scoreboard);
        }
    }
}
