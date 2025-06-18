using System.ComponentModel.DataAnnotations.Schema;
using PetConnect.Data.Models.Shared;

namespace PetConnect.Data.Models;

public class LostPetImage
{
    public Guid Id { get; set; }

    [Column(TypeName = "jsonb")]
    public required FileMetadata Metadata { get; set; }

    public virtual LostPet LostPet { get; set; } = null!;
}