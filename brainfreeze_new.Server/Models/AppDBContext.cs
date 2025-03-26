using Microsoft.EntityFrameworkCore;

namespace brainfreeze_new.Server.Models
{
    public class AppDBContext(DbContextOptions<AppDBContext> options) : DbContext(options)
    {
        public DbSet<Scoreboard> Scores { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Game> Games { get; set; }
    }
}
