using System.ComponentModel.DataAnnotations.Schema;
using PetConnect.Data.Models.Shared;

namespace PetConnect.Data.Models;

public class FoundPetImage
{
    public Guid Id { get; set; }

    [Column(TypeName = "jsonb")]
    public required FileMetadata Metadata { get; set; }

    public virtual FoundPet FoundPet { get; set; } = null!;
}