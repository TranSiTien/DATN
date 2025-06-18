using PetConnect.Dtos.Shared;
using PetConnect.External.Storage.Abstractions;

namespace PetConnect.Dtos.FoundPet;

public class FoundPetDto
{
    public Guid Id { get; set; }

    public string? Description { get; set; }

    public required PointDto FoundLocation { get; set; }

    public required DateTimeOffset FoundDateTime { get; set; }

    public required string Status { get; set; }

    public string? ModeratorFeedback { get; set; }

    public Guid FinderId { get; set; }

    public double? SimilarityScore { get; set; }

    public ICollection<FileMetadata> Images { get; set; } = new List<FileMetadata>();
}

public class CreateFoundPetDto
{
    public string? Description { get; set; }

    public double FoundLatitude { get; set; }

    public double FoundLongitude { get; set; }

    public DateTimeOffset FoundDateTime { get; set; }

    public List<IFormFile> Images { get; set; } = new();
}