using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace PetConnect.Migrations
{
    /// <inheritdoc />
    public partial class AddLostPet : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:postgis", ",,");

            migrationBuilder.CreateTable(
                name: "LostPets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(2500)", maxLength: 2500, nullable: true),
                    LastSeenLocation = table.Column<Point>(type: "geometry", nullable: false),
                    LastSeenDateTime = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ModeratorFeedback = table.Column<string>(type: "character varying(2500)", maxLength: 2500, nullable: true),
                    FinderId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LostPets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LostPets_GeneralUsers_FinderId",
                        column: x => x.FinderId,
                        principalTable: "GeneralUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LostPet_LastSeenDateTime",
                table: "LostPets",
                column: "LastSeenDateTime");

            migrationBuilder.CreateIndex(
                name: "IX_LostPet_LastSeenLocation",
                table: "LostPets",
                column: "LastSeenLocation")
                .Annotation("Npgsql:IndexMethod", "GIST");

            migrationBuilder.CreateIndex(
                name: "IX_LostPet_Status",
                table: "LostPets",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_LostPets_FinderId",
                table: "LostPets",
                column: "FinderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LostPets");

            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:PostgresExtension:postgis", ",,");
        }
    }
}
