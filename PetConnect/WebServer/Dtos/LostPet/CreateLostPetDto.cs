namespace PetConnect.Dtos.LostPet;

public class CreateLostPetDto
{
    public required string Name { get; set; }

    public string? Description { get; set; }

    public required double LastSeenLatitude { get; set; }

    public required double LastSeenLongitude { get; set; }

    public required DateTimeOffset LastSeenDateTime { get; set; }

    public string? LocationName { get; set; }

    public List<IFormFile> Images { get; set; } = new();
}