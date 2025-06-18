using System.ComponentModel.DataAnnotations;

namespace PetConnect.Data.Models;

public class GeneralUser
{
    public Guid Id { get; init; }

    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = null!;

    public virtual ICollection<LostPet> LostPets { get; set; } = new List<LostPet>();

    public virtual ICollection<UserContactInfo> ContactInfos { get; set; } = new List<UserContactInfo>();

    public virtual ICollection<FoundPet> FoundPets { get; set; } = new List<FoundPet>();
}