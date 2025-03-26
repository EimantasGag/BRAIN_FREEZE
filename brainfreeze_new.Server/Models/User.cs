// create a user model with id, username

using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace brainfreeze_new.Server.Models
{
    [Index(nameof(Username), IsUnique = true)]
    public class User
    {
        [Key]
        public int Id { get; set; }
        [Column(TypeName = "varchar(100)")]
        public required String Username { get; set; }
    }
}