using Microsoft.AspNetCore.Http;

namespace PetConnect.Dtos.FoundPet;

public class SearchFoundPetDto
{
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public DateTimeOffset? FromDate { get; set; }
    public DateTimeOffset? ToDate { get; set; }
    public int DistanceInKilometers { get; set; } = 10; // Default value
    public IFormFile? SearchImage { get; set; }
} 