using PetConnect.Data.Models;

namespace PetConnect.Dtos.UserContactInfo;

public class CreateUserContactInfoDto
{
    public required string Value { get; set; }

    public required ContactInfoType Type { get; set; }
}