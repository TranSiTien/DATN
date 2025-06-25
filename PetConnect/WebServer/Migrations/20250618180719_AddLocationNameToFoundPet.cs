using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PetConnect.Migrations
{
    /// <inheritdoc />
    public partial class AddLocationNameToFoundPet : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LocationName",
                table: "FoundPets",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LocationName",
                table: "FoundPets");
        }
    }
}
