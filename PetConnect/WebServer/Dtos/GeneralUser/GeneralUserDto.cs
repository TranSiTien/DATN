namespace PetConnect.Dtos.GeneralUser;

public class GeneralUserDto
{
    public required string Id { get; set; }
    public string? Name { get; set; } // Made nullable
    public required string Email { get; set; }
}
