using System.ComponentModel.DataAnnotations;
using NetTopologySuite.Geometries;

namespace PetConnect.Data.Models;

public class FoundPet
{
    public Guid Id { get; set; }

    [StringLength(2500)]
    public string? Description { get; set; }

    public required Point FoundLocation { get; set; }
    
    public string? LocationName { get; set; }

    public required DateTimeOffset FoundDateTime { get; set; }

    [StringLength(50, MinimumLength = 1)]
    public required string Status { get; set; } = FoundPetStatus.Pending;

    [StringLength(2500)]
    public string? ModeratorFeedback { get; set; }

    public virtual GeneralUser Finder { get; set; } = null!;

    public virtual ICollection<FoundPetImage> Images { get; set; } = new List<FoundPetImage>();
}

public class FoundPetStatus
{
    public const string Pending = "Pending";
    public const string Claimed = "Claimed";
}