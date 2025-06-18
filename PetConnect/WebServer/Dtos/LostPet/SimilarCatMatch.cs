using System.Text.Json.Serialization;

namespace PetConnect.Dtos.LostPet;

public class SimilarCatMatch
{
    [JsonPropertyName("cat_id")]
    public string CatId { get; set; } = string.Empty;
    
    [JsonPropertyName("best_score")]
    public double BestScore { get; set; }
}

public class SimilarCatsResponse
{
    [JsonPropertyName("matches")]
    public List<SimilarCatMatch> Matches { get; set; } = new List<SimilarCatMatch>();
}