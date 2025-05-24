using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace brainfreeze_new.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddPasswordToScoreboard : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Password",
                table: "Scoreboards",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Password",
                table: "Scoreboards");
        }
    }
}
