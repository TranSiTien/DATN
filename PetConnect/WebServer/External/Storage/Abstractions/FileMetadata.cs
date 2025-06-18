namespace PetConnect.External.Storage.Abstractions;

public class FileMetadata
{
    /// <summary>
    /// The unique identifier or path of the stored file.
    /// </summary>
    public required string FileId { get; set; }

    /// <summary>
    /// The publicly accessible URL for the stored file.
    /// </summary>
    public required string FileUrl { get; set; }
}
