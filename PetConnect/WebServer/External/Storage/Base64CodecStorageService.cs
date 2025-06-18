using System.Text;
using PetConnect.External.Storage.Abstractions;

namespace PetConnect.External.Storage;

public class Base64CodecStorageService : IStorageService
{
    private readonly IStorageService _inner;

    public Base64CodecStorageService(IStorageService inner)
    {
        _inner = inner;
    }

    public async Task<FileMetadata> UploadFileAsync(string containerName, FileToUpload file)
    {
        var result = await _inner.UploadFileAsync(containerName, file);
        result.FileId = ToBase64(result.FileId);
        return result;
    }

    public async Task<FileMetadata?> GetFileMetadataAsync(string fileId)
    {
        var rawFileId = ToRaw(fileId);
        return await _inner.GetFileMetadataAsync(rawFileId);
    }

    public async Task<FileMetadata> ReplaceFileAsync(string fileId, FileToUpload file)
    {
        var rawFileId = ToRaw(fileId);
        var result = await _inner.ReplaceFileAsync(rawFileId, file);
        result.FileId = ToBase64(result.FileId);
        return result;
    }

    public async Task DeleteFileAsync(string fileId)
    {
        var rawFileId = ToRaw(fileId);
        await _inner.DeleteFileAsync(rawFileId);
    }

    private string ToBase64(string raw)
    {
        var bytes = Encoding.UTF8.GetBytes(raw);
        return Convert.ToBase64String(bytes);
    }

    private string ToRaw(string base64)
    {
        var bytes = Convert.FromBase64String(base64);
        return Encoding.UTF8.GetString(bytes);
    }
}