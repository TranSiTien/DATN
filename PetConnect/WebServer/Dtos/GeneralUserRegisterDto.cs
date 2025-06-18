namespace PetConnect.Dtos;

public class GeneralUserRegisterDto
{
    public required string Username { get; init; }
    public required string Password { get; init; }
    public required string Name { get; init; }
}