using System.Text.Json.Serialization;

namespace PetConnect.Dtos.FoundPet;

public class SimilarFoundPetsResponse
{
    [JsonPropertyName("matches")]
    public List<SimilarPetMatch> Matches { get; set; } = new List<SimilarPetMatch>();
} 