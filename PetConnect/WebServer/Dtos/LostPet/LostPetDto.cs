using PetConnect.Dtos.Shared;
using PetConnect.External.Storage.Abstractions;

namespace PetConnect.Dtos.LostPet;

public class LostPetDto
{
    public Guid Id { get; set; }

    public required string Name { get; set; }

    public string? Description { get; set; }

    public required PointDto LastSeenLocation { get; set; }

    public string? LocationName { get; set; }

    public required DateTimeOffset LastSeenDateTime { get; set; }

    public required string Status { get; set; }

    public string? ModeratorFeedback { get; set; }

    public Guid FinderId { get; set; }

    public ICollection<FileMetadata> Images { get; set; } = new List<FileMetadata>();
    
    // Similarity score from image matching (null if not from image search)
    public double? SimilarityScore { get; set; }
}