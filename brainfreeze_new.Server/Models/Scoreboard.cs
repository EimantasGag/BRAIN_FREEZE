using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace brainfreeze_new.Server.Models
{
    public class Scoreboard
    {
        [Key]
        public int Id { get; set; }

        [ForeignKey("User")]
        public int UserId { get; set; }

        [ForeignKey("Game")]
        public int GameId { get; set; }

        [Column(TypeName = "varchar(100)")]
        public required int Score { get; set; }

        [Column(TypeName = "timestamp without time zone")]
        public DateTime Timestamp { get; set; } = DateTime.Now;


    }
}
