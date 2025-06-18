using System.ComponentModel.DataAnnotations;

namespace PetConnect.Dtos.Shared;

public class UpdatePetStatusDto
{
    [Required]
    public required string Status { get; set; }
} 