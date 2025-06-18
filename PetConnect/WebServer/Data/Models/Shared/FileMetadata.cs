using System.Text.Json.Serialization;

namespace PetConnect.Data.Models.Shared;

public class FileMetadata
{
    [JsonPropertyName("fileId")]
    public required string FileId { get; set; }

    [JsonPropertyName("fileName")]
    public required string FileName { get; set; }
}