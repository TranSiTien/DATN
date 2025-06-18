using PetConnect.Data.Models;

namespace PetConnect.Dtos.UserContactInfo;

public class UpdateUserContactInfoDto
{
    public required string Value { get; set; }
    public required ContactInfoType Type { get; set; }
}
