using PetConnect.Data.Models;

namespace PetConnect.Dtos.UserContactInfo;

public class UserContactInfoDto
{
    public Guid Id { get; set; }

    public required string Value { get; set; }

    public required ContactInfoType Type { get; set; }

    public bool IsPrimary { get; set; }
}