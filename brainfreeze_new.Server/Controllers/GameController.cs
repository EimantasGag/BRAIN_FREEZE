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
    public class GameController : ControllerBase
    {
        private readonly AppDBContext _context;

        public GameController(AppDBContext context)
        {
            _context = context;
        }

        // GET: api/Game
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Game>>> GetGames()
        {
            var games = await _context.Games.ToListAsync();
            return Ok(games);
        }

        // GET: api/Game/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Game>> GetGame(int id)
        {
            var game = await _context.Games.FindAsync(id);

            if (game == null)
            {
                return NotFound();
            }

            return Ok(game);
        }

        // GET: api/Game/Type/5
        [HttpGet("Type/{type}")]
        public async Task<ActionResult<IEnumerable<Game>>> GetGameByType(int type)
        {
            var games = await _context.Games.Where(g => g.Type == type).ToListAsync();

            if (games == null || games.Count == 0)
            {
                return NotFound();
            }

            return Ok(games);
        }

        // POST: api/Game
        [HttpPost]
        public async Task<ActionResult<Game>> PostGame(Game game)
        {
            _context.Games.Add(game);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetGame", new { id = game.Id }, game);
        }
    }
}
