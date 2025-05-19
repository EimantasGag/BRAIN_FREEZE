using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace brainfreeze_new.Server.Models
{
    public class Scoreboard
    {
        [Key]
        public int Id { get; set; }

        public int Place { get; set; }

        [Column(TypeName = "varchar(100)")] // Changed to varchar for PostgreSQL compatibility
        public string? Username { get; set; }

        public string Email { get; set; } = string.Empty;

        [Column(TypeName = "timestamp with time zone")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public int SimonScore { get; set; }

        public int CardflipScore { get; set; }

        public int NrgScore { get; set; }
    }
}