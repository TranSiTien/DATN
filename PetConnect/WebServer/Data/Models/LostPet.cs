using System.ComponentModel.DataAnnotations;
using NetTopologySuite.Geometries;

namespace PetConnect.Data.Models;

public class LostPet
{
    public Guid Id { get; set; }

    [StringLength(100, MinimumLength = 1)]
    public required string Name { get; set; }

    [StringLength(2500)]
    public string? Description { get; set; }

    public required Point LastSeenLocation { get; set; }

    public string? LocationName { get; set; }

    public required DateTimeOffset LastSeenDateTime { get; set; }

    [StringLength(50, MinimumLength = 1)]
    public required string Status { get; set; } = LostPetStatus.Pending;

    [StringLength(2500)]
    public string? ModeratorFeedback { get; set; }

    public virtual GeneralUser Finder { get; set; } = null!;

    public virtual ICollection<LostPetImage> Images { get; set; } = new List<LostPetImage>();
}

public class LostPetStatus
{
    public const string Pending = "Pending";
    public const string Found = "Found";
}