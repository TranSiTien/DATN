namespace PetConnect.Data.Models;

public class UserContactInfo
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public required string Value { get; set; }

    public required ContactInfoType Type { get; set; }

    public bool IsPrimary { get; set; } = false;

    public virtual GeneralUser User { get; set; } = null!;

    public Guid UserId { get; set; }
}