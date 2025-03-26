// create game model with id and type and isMultiplayer boolean

using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace brainfreeze_new.Server.Models
{
    public class Game
    {
        [Key]
        public int Id { get; set; }

        public required int Type { get; set; }

        public required bool isMultiplayer { get; set; }
    }
}