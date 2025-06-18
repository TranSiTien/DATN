namespace PetConnect.External.Storage.Abstractions;

public class FileToUpload
{
    public required Stream Stream { get; set; }
    public required string MimeType { get; set; }
}
