using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;
using PetConnect.Data.Models.Shared;

#nullable disable

namespace PetConnect.Migrations
{
    /// <inheritdoc />
    public partial class AddFoundPet : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LostPetImage_LostPets_LostPetId",
                table: "LostPetImage");

            migrationBuilder.DropPrimaryKey(
                name: "PK_LostPetImage",
                table: "LostPetImage");

            migrationBuilder.RenameTable(
                name: "LostPetImage",
                newName: "LostPetImages");

            migrationBuilder.RenameIndex(
                name: "IX_LostPetImage_LostPetId",
                table: "LostPetImages",
                newName: "IX_LostPetImages_LostPetId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_LostPetImages",
                table: "LostPetImages",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "FoundPets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Description = table.Column<string>(type: "character varying(2500)", maxLength: 2500, nullable: true),
                    FoundLocation = table.Column<Point>(type: "geometry", nullable: false),
                    FoundDateTime = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ModeratorFeedback = table.Column<string>(type: "character varying(2500)", maxLength: 2500, nullable: true),
                    FinderId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FoundPets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FoundPets_GeneralUsers_FinderId",
                        column: x => x.FinderId,
                        principalTable: "GeneralUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FoundPetImages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Metadata = table.Column<FileMetadata>(type: "jsonb", nullable: false),
                    FoundPetId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FoundPetImages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FoundPetImages_FoundPets_FoundPetId",
                        column: x => x.FoundPetId,
                        principalTable: "FoundPets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FoundPetImages_FoundPetId",
                table: "FoundPetImages",
                column: "FoundPetId");

            migrationBuilder.CreateIndex(
                name: "IX_FoundPets_FinderId",
                table: "FoundPets",
                column: "FinderId");

            migrationBuilder.AddForeignKey(
                name: "FK_LostPetImages_LostPets_LostPetId",
                table: "LostPetImages",
                column: "LostPetId",
                principalTable: "LostPets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LostPetImages_LostPets_LostPetId",
                table: "LostPetImages");

            migrationBuilder.DropTable(
                name: "FoundPetImages");

            migrationBuilder.DropTable(
                name: "FoundPets");

            migrationBuilder.DropPrimaryKey(
                name: "PK_LostPetImages",
                table: "LostPetImages");

            migrationBuilder.RenameTable(
                name: "LostPetImages",
                newName: "LostPetImage");

            migrationBuilder.RenameIndex(
                name: "IX_LostPetImages_LostPetId",
                table: "LostPetImage",
                newName: "IX_LostPetImage_LostPetId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_LostPetImage",
                table: "LostPetImage",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_LostPetImage_LostPets_LostPetId",
                table: "LostPetImage",
                column: "LostPetId",
                principalTable: "LostPets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
