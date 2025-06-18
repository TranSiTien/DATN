using Microsoft.Extensions.Options;
using PetConnect.External.Storage.Abstractions;

namespace PetConnect.External.Storage;

public class LocalStorageOptions
{
    public const string SectionName = "LocalStorage";
    public required string BasePath { get; set; }
    public required string BaseUrl { get; set; }
}

public class LocalStorageService : IStorageService
{
    private readonly string _basePath;
    private readonly string _baseUrl;
    private readonly ILogger<LocalStorageService> _logger;

    public LocalStorageService(IOptions<LocalStorageOptions> options, ILogger<LocalStorageService> logger)
    {
        _logger = logger;
        _basePath = options.Value.BasePath ?? throw new ArgumentNullException(nameof(options.Value.BasePath), "LocalStorage:BasePath cannot be null.");
        _baseUrl = options.Value.BaseUrl ?? throw new ArgumentNullException(nameof(options.Value.BaseUrl), "LocalStorage:BaseUrl cannot be null.");

        // Ensure the base path ends with a directory separator
        if (!_basePath.EndsWith(Path.DirectorySeparatorChar))
        {
            _basePath += Path.DirectorySeparatorChar;
        }

        // Ensure the base URL ends with a forward slash
        if (!_baseUrl.EndsWith('/'))
        {
            _baseUrl += '/';
        }

        // Ensure the base directory exists
        if (!Directory.Exists(_basePath))
        {
            try
            {
                Directory.CreateDirectory(_basePath);
                _logger.LogInformation("Created base storage directory: {Path}", _basePath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create base storage directory: {Path}", _basePath);
                throw; // Re-throw to prevent service startup if directory cannot be created
            }
        }
    }

    public async Task<FileMetadata> UploadFileAsync(string containerName, FileToUpload file)
    {
        // Sanitize containerName to prevent path traversal issues
        containerName = containerName.Replace("..", "").TrimStart('/', '\\'); // Fixed: Escaped backslash
        var containerPath = Path.Combine(_basePath, containerName);

        // Ensure the container directory exists
        if (!Directory.Exists(containerPath))
        {
            try
            {
                Directory.CreateDirectory(containerPath);
                _logger.LogInformation("Created container directory: {Path}", containerPath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create container directory: {Path}", containerPath);
                throw;
            }
        }

        var uniqueFileName = $"{Guid.NewGuid()}{GetFileExtension(file.MimeType)}";
        var filePath = Path.Combine(containerPath, uniqueFileName);
        var fileUrl = $"{_baseUrl}{containerName}/{uniqueFileName}"; // Construct URL relative to base URL

        _logger.LogInformation("Attempting to save file to: {FilePath}", filePath);

        try
        {
            await using var fileStream = new FileStream(filePath, FileMode.Create);
            await file.Stream.CopyToAsync(fileStream);
            _logger.LogInformation("Successfully saved file to: {FilePath}", filePath);

            return new FileMetadata
            {
                FileId = Path.Combine(containerName, uniqueFileName).Replace('\\', '/'), // Fixed: Escaped backslash
                FileUrl = fileUrl
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save file to: {FilePath}", filePath);
            // Consider deleting the partial file if upload fails mid-way
            if (System.IO.File.Exists(filePath))
            {
                try { System.IO.File.Delete(filePath); } catch { /* Ignore delete error */ }
            }
            throw; // Re-throw the exception to signal failure
        }
    }

    public Task<FileMetadata?> GetFileMetadataAsync(string fileId)
    {
        // fileId is expected to be the relative path (e.g., "container/filename.ext")
        var filePath = Path.Combine(_basePath, fileId.Replace('/', Path.DirectorySeparatorChar));

        if (!System.IO.File.Exists(filePath))
        {
            _logger.LogWarning("File not found for metadata retrieval: {FileId}", fileId);
            return Task.FromResult<FileMetadata?>(null);
        }

        // Construct the URL based on the fileId
        var fileUrl = $"{_baseUrl}{fileId}";

        var metadata = new FileMetadata
        {
            FileId = fileId,
            FileUrl = fileUrl
        };

        return Task.FromResult<FileMetadata?>(metadata);
    }

    public async Task<FileMetadata> ReplaceFileAsync(string fileId, FileToUpload file)
    {
        // fileId is expected to be the relative path (e.g., "container/filename.ext")
        var filePath = Path.Combine(_basePath, fileId.Replace('/', Path.DirectorySeparatorChar));

        if (!System.IO.File.Exists(filePath))
        {
            _logger.LogError("File not found for replacement: {FileId}", fileId);
            throw new FileNotFoundException("File to replace not found.", fileId);
        }

        _logger.LogInformation("Attempting to replace file at: {FilePath}", filePath);

        try
        {
            // Overwrite the existing file
            await using var fileStream = new FileStream(filePath, FileMode.Create); // FileMode.Create will overwrite or create
            await file.Stream.CopyToAsync(fileStream);
            _logger.LogInformation("Successfully replaced file at: {FilePath}", filePath);

            // Construct the URL based on the fileId
            var fileUrl = $"{_baseUrl}{fileId}";

            return new FileMetadata
            {
                FileId = fileId,
                FileUrl = fileUrl
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to replace file at: {FilePath}", filePath);
            throw; // Re-throw the exception to signal failure
        }
    }

    public Task DeleteFileAsync(string fileId)
    {
        // fileId is expected to be the relative path (e.g., "container/filename.ext")
        var filePath = Path.Combine(_basePath, fileId.Replace('/', Path.DirectorySeparatorChar));

        if (System.IO.File.Exists(filePath))
        {
            try
            {
                System.IO.File.Delete(filePath);
                _logger.LogInformation("Successfully deleted file: {FileId}", fileId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete file: {FileId}", fileId);
                // Decide if you want to throw or just log the error
                // throw; 
            }
        }
        else
        {
            _logger.LogWarning("Attempted to delete non-existent file: {FileId}", fileId);
        }

        return Task.CompletedTask;
    }

    private static string GetFileExtension(string mimeType)
    {
        // Basic mapping, can be expanded
        return mimeType.ToLowerInvariant() switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            "image/gif" => ".gif",
            "image/webp" => ".webp",
            // Add other common types as needed
            _ => string.Empty // Or throw an exception for unsupported types
        };
    }
}
