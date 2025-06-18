using PetConnect.External.Storage.Abstractions;

namespace PetConnect.External.Storage.Abstractions;

public interface IStorageService
{
    Task<FileMetadata> UploadFileAsync(string containerName, FileToUpload file);
    Task<FileMetadata?> GetFileMetadataAsync(string fileId);
    Task<FileMetadata> ReplaceFileAsync(string fileId, FileToUpload file);
    Task DeleteFileAsync(string fileId);
}
