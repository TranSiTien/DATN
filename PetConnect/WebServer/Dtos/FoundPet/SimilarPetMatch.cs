using System.Text.Json.Serialization;

namespace PetConnect.Dtos.FoundPet;

public class SimilarPetMatch
{
    [JsonPropertyName("cat_id")] // Changed to cat_id, assuming AI server uses this consistently
    public string PetId { get; set; } = string.Empty;

    [JsonPropertyName("best_score")]
    public double BestScore { get; set; }
} 