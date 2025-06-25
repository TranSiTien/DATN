using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetConnect.Configuration;
using PetConnect.Data;
using PetConnect.Data.Models;
using PetConnect.Dtos.FoundPet;
using PetConnect.Dtos.Shared;
using PetConnect.External.Storage.Abstractions;
using PetConnect.Services;
using System.Net.Http;
using System.Net.Http.Headers;
using Microsoft.Extensions.Configuration;
using System.Text.Json;
using ModelFileMetadata = PetConnect.Data.Models.Shared.FileMetadata; // Alias for DB model

namespace PetConnect.Controllers;

[Route("api/[controller]")]
[ApiController]
public class FoundPetsController : ControllerBase
{
    private const int DefaultSearchRadiusInKilometers = 10;

    private readonly AppDbContext _dbContext;
    private readonly GISContext _gisContext;
    private readonly ILogger<FoundPetsController> _logger;
    private readonly IMapper _mapper;
    private readonly IStorageService _storageService;
    private readonly UserService _userService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public FoundPetsController(AppDbContext dbContext, UserService userService,
        IStorageService storageService, ILogger<FoundPetsController> logger, IMapper mapper, GISContext gisContext,
        IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _dbContext = dbContext;
        _userService = userService;
        _storageService = storageService;
        _logger = logger;
        _mapper = mapper;
        _gisContext = gisContext;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FoundPetDto>>> GetFoundPets(double? latitude, double? longitude,
        DateTimeOffset? fromDate, DateTimeOffset? toDate, Guid? userId, int distanceInKilometers = DefaultSearchRadiusInKilometers)
    {
        var query = _dbContext.FoundPets
            .Include(fp => fp.Images)
            .Include(fp => fp.Finder)
            .AsQueryable();
            
        // Filter by userId if provided
        if (userId.HasValue)
        {
            query = query.Where(fp => fp.Finder.Id == userId.Value);
        }

        if (latitude != null && longitude != null)
        {
            var searchPoint = _gisContext.WGS84ToWebMercator(longitude.Value, latitude.Value);
            query = query.Where(fp => fp.FoundLocation.IsWithinDistance(searchPoint, distanceInKilometers * 1000));
        }

        if (fromDate != null)
        {
            var fromDateUtc = fromDate.Value.ToUniversalTime();
            query = query.Where(fp => fp.FoundDateTime >= fromDateUtc);
        }

        if (toDate != null)
        {
            var toDateUtc = toDate.Value.ToUniversalTime();
            query = query.Where(fp => fp.FoundDateTime <= toDateUtc);
        }

        var foundPets = await query.ToListAsync();

        return Ok(foundPets.Select(MapToDto));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<FoundPetDto>> GetFoundPet(Guid id)
    {
        var foundPet = await _dbContext.FoundPets
            .Include(fp => fp.Images)
            .Include(fp => fp.Finder)
            .FirstOrDefaultAsync(fp => fp.Id == id);

        if (foundPet == null)
            return NotFound();

        return Ok(MapToDto(foundPet));
    }

    [HttpPost("search")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<IEnumerable<FoundPetDto>>> SearchFoundPets([FromForm] SearchFoundPetDto searchParams)
    {
        var query = _dbContext.FoundPets
            .Include(fp => fp.Images)
            .Include(fp => fp.Finder)
            .AsQueryable();

        if (searchParams.Latitude != null && searchParams.Longitude != null)
        {
            var searchPoint = _gisContext.WGS84ToWebMercator(searchParams.Longitude.Value, searchParams.Latitude.Value);
            query = query.Where(fp => fp.FoundLocation.IsWithinDistance(searchPoint, searchParams.DistanceInKilometers * 1000));
        }

        if (searchParams.FromDate != null)
        {
            var fromDateUtc = searchParams.FromDate.Value.ToUniversalTime();
            query = query.Where(fp => fp.FoundDateTime >= fromDateUtc);
            _logger.LogInformation("Filtering found pets with FoundDateTime >= {FromDate} (UTC)", fromDateUtc);
        }
        else
        {
            _logger.LogInformation("No start date filter applied for found pets");
        }

        if (searchParams.ToDate != null)
        {
            var toDateUtc = searchParams.ToDate.Value.ToUniversalTime();
            query = query.Where(fp => fp.FoundDateTime <= toDateUtc);
            _logger.LogInformation("Filtering found pets with FoundDateTime <= {ToDate} (UTC)", toDateUtc);
        }
        else
        {
            _logger.LogInformation("No end date filter applied for found pets");
        }

        var queryString = query.ToQueryString();
        _logger.LogInformation("SQL Query for found pets search: {Query}", queryString);

        List<FoundPet> foundPets = await query.ToListAsync();
        _logger.LogInformation("Initial database query for found pets returned {Count} results", foundPets.Count);

        foreach (var pet in foundPets)
        {
            _logger.LogDebug("Found pet (initial query): ID={Id}, FoundDateTime={FoundDateTime}",
                pet.Id, pet.FoundDateTime);
        }

        if (searchParams.SearchImage != null && searchParams.SearchImage.Length > 0)
        {
            try
            {
                _logger.LogInformation("Performing image-based search for similar found pets");

                var petIds = foundPets.Select(p => p.Id.ToString()).ToList();

                if (!petIds.Any())
                {
                    _logger.LogInformation("No found pets to search in image similarity - initial filters returned empty set");
                    return Ok(new List<FoundPetDto>());
                }

                var client = _httpClientFactory.CreateClient();
                using var formData = new MultipartFormDataContent();

                var streamContent = new StreamContent(searchParams.SearchImage.OpenReadStream());
                streamContent.Headers.ContentType = new MediaTypeHeaderValue(searchParams.SearchImage.ContentType);
                formData.Add(streamContent, "image", searchParams.SearchImage.FileName);

                _logger.LogInformation("Adding search image to request for found pets: {FileName} ({ContentType}, {Size} bytes)",
                    searchParams.SearchImage.FileName,
                    searchParams.SearchImage.ContentType,
                    searchParams.SearchImage.Length);

                var aiServerUrl = _configuration["AiServer:SearchSimilarCatsUrl"]
                                  ?? "http://localhost:8000/search/similar-pets-by-image";

                var uriBuilder = new UriBuilder(aiServerUrl);
                var queryParams = System.Web.HttpUtility.ParseQueryString(uriBuilder.Query);
                queryParams["namespace"] = "found-cats";
                queryParams["top_k"] = "5";
                queryParams["candidates_k"] = "40";

                _logger.LogInformation("Adding {Count} found pet IDs as search targets", petIds.Count);
                foreach (var petId in petIds)
                {
                    queryParams.Add("target_pet_ids", petId);
                    _logger.LogDebug("Added target found pet ID: {PetId}", petId);
                }

                uriBuilder.Query = queryParams.ToString();
                var finalUrl = uriBuilder.ToString();

                _logger.LogInformation("Calling AI server for image similarity search for found pets at: {Url}", finalUrl);

                var requestStartTime = DateTimeOffset.UtcNow;
                var response = await client.PostAsync(finalUrl, formData);
                var requestDuration = DateTimeOffset.UtcNow - requestStartTime;

                _logger.LogInformation("AI server responded for found pets in {Duration}ms with status code {StatusCode}",
                    requestDuration.TotalMilliseconds,
                    (int)response.StatusCode);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Successfully received response from AI server for found pets");
                    var jsonContent = await response.Content.ReadAsStringAsync();
                    _logger.LogInformation("AI server raw response for found pets: {Response}", jsonContent);

                    var similarPetsResponse = JsonSerializer.Deserialize<SimilarFoundPetsResponse>(
                        jsonContent,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                    if (similarPetsResponse != null)
                    {
                        _logger.LogInformation("Deserialized response for found pets - Match count: {Count}",
                            similarPetsResponse.Matches?.Count ?? 0);
                    }
                    else
                    {
                        _logger.LogWarning("Failed to deserialize AI server response for found pets");
                    }

                    if (similarPetsResponse?.Matches != null && similarPetsResponse.Matches.Any())
                    {
                        _logger.LogInformation("AI server returned {Count} matches for found pets", similarPetsResponse.Matches.Count);

                        foreach (var match in similarPetsResponse.Matches)
                        {
                            _logger.LogInformation("Match (Found Pet): Pet ID {PetId} with score {Score}", match.PetId, match.BestScore);
                        }

                        var matchedIdsStrings = similarPetsResponse.Matches.Select(m => m.PetId).ToList();
                        _logger.LogInformation("AI server matched IDs for found pets (strings): {MatchedIds}", string.Join(", ", matchedIdsStrings));
                        
                        var parsedGuidIds = new List<Guid>();
                        foreach (var idStr in matchedIdsStrings)
                        {
                            if (Guid.TryParse(idStr, out var guidId))
                            {
                                parsedGuidIds.Add(guidId);
                            }
                            else
                            {
                                _logger.LogWarning("Could not parse PetId '{PetIdStr}' as Guid from AI response.", idStr);
                            }
                        }
                         _logger.LogInformation("AI server matched IDs for found pets (GUIDs): {MatchedIds}", string.Join(", ", parsedGuidIds));


                        _logger.LogInformation("Database found pet IDs for comparison: {DatabaseIds}",
                            string.Join(", ", foundPets.Select(p => p.Id.ToString())));

                        foundPets = foundPets.Where(p => parsedGuidIds.Contains(p.Id)).ToList();
                        _logger.LogInformation("Filtered by GUID: found {Count} matching found pets", foundPets.Count);


                        if (foundPets.Any())
                        {
                            var petsWithScores = foundPets
                                .Join(
                                    similarPetsResponse.Matches,
                                    pet => pet.Id.ToString(),
                                    match => match.PetId,
                                    (pet, match) => new { Pet = pet, Score = match.BestScore })
                                .OrderBy(x => x.Score)
                                .ToList();

                            foundPets = petsWithScores.Select(x => x.Pet).ToList();
                            var petScores = petsWithScores.ToDictionary(x => x.Pet.Id, x => x.Score);

                            _logger.LogInformation("Final result set for found pets contains {Count} pets after image similarity filtering", foundPets.Count);

                            return Ok(foundPets.Select(fp =>
                            {
                                var dto = MapToDto(fp);
                                if (petScores.TryGetValue(fp.Id, out var score))
                                {
                                    dto.SimilarityScore = score;
                                }
                                return dto;
                            }));
                        }
                         _logger.LogInformation("Final result set for found pets contains {Count} pets after image similarity filtering (no valid matches post-join or GUID filter)", foundPets.Count);
                    }
                    else
                    {
                        _logger.LogInformation("AI server found no matching found pets");
                    }
                }
                else
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Failed to get matches from AI server for found pets. Status: {StatusCode}. Response: {Response}",
                        response.StatusCode, responseContent);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error performing image-based search for found pets");
            }
        }

        return Ok(foundPets.Select(MapToDto));
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<FoundPetDto>> CreateFoundPet([FromForm] CreateFoundPetDto createFoundPetDto)
    {
        var user = await _userService.GetGeneralUserAsync(User);
        var webMercatorPoint =
            _gisContext.WGS84ToWebMercator(createFoundPetDto.FoundLongitude, createFoundPetDto.FoundLatitude);

        // Use AutoMapper to map from DTO to Entity
        var foundPet = _mapper.Map<FoundPet>(createFoundPetDto);

        // Set properties not mapped by AutoMapper
        foundPet.Id = Guid.NewGuid();
        foundPet.FoundLocation = webMercatorPoint;
        foundPet.Status = FoundPetStatus.Pending; // Assuming FoundPetStatus enum/constants exist
        foundPet.LocationName = createFoundPetDto.LocationName;
        foundPet.Finder = user;

        _dbContext.FoundPets.Add(foundPet);
        await _dbContext.SaveChangesAsync(); // Save FoundPet first to get ID

        var uploadedImageMetadata = new List<(ModelFileMetadata Metadata, IFormFile FormFile)>();

        if (createFoundPetDto.Images != null)
        {
            foreach (var formFile in createFoundPetDto.Images)
            {
                if (formFile.Length == 0) continue;

                try
                {
                    var fileMetadataAbstraction = await _storageService.UploadFileAsync($"found-pet-images/{foundPet.Id}",
                        new FileToUpload
                        {
                            MimeType = formFile.ContentType,
                            Stream = formFile.OpenReadStream()
                        });

                    var modelMetadata = _mapper.Map<ModelFileMetadata>(fileMetadataAbstraction);
                    foundPet.Images.Add(new FoundPetImage // Assuming FoundPetImage entity exists
                    {
                        Metadata = modelMetadata
                    });
                    uploadedImageMetadata.Add((modelMetadata, formFile));
                }
                catch (Exception e)
                {
                    _logger.LogError(e, "Error uploading image for found pet {FoundPetId}", foundPet.Id);
                }
            }
        }

        await _dbContext.SaveChangesAsync(); // Save image references

        if (uploadedImageMetadata.Any()) // Only send if there are images
        {
            try
            {
                _logger.LogInformation("Attempting to send found pet data to AI server for Pet ID: {PetId}", foundPet.Id);
                var client = _httpClientFactory.CreateClient();
                using var formData = new MultipartFormDataContent();

                formData.Add(new StringContent(foundPet.Id.ToString()), "cat_id");

                foreach (var (metadata, formFile) in uploadedImageMetadata)
                {
                    formFile.OpenReadStream().Position = 0; // Reset stream position
                    var streamContent = new StreamContent(formFile.OpenReadStream());
                    streamContent.Headers.ContentType = new MediaTypeHeaderValue(formFile.ContentType);
                    var fileName = metadata.FileName ?? formFile.FileName;
                    formData.Add(streamContent, "images", fileName);
                    _logger.LogDebug("Adding image {FileName} ({ContentType}) to AI request for Found Pet ID: {PetId}", fileName, formFile.ContentType, foundPet.Id);
                }

                // Read AI server URL from configuration - IMPORTANT: Use a specific key for found pets
                var aiServerUrl = _configuration["AiServer:UploadFoundPetUrl"]; 
                if (string.IsNullOrEmpty(aiServerUrl))
                {
                    _logger.LogWarning("AI Server URL ('AiServer:UploadFoundPetUrl') is not configured. Skipping AI server submission.");
                }
                else
                {
                    _logger.LogInformation("Sending found pet data to AI server at {Url} for Pet ID: {PetId}", aiServerUrl, foundPet.Id);
                    var response = await client.PostAsync(aiServerUrl, formData);
                    _logger.LogDebug("AI - {aiServerUrl}: {formData}", aiServerUrl, formData);
                    if (response.IsSuccessStatusCode)
                    {
                        _logger.LogInformation("Successfully sent data to AI server for Found Pet ID: {PetId}. Status: {StatusCode}", foundPet.Id, response.StatusCode);
                    }
                    else
                    {
                        var responseContent = await response.Content.ReadAsStringAsync();
                        _logger.LogError("Failed to send data to AI server for Found Pet ID: {PetId}. Status: {StatusCode}. Response: {Response}", foundPet.Id, response.StatusCode, responseContent);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending found pet data to AI server for Pet ID: {PetId}", foundPet.Id);
            }
        }
        // --- End send data to AI server ---

        return Ok(MapToDto(foundPet));
    }

    private FoundPetDto MapToDto(FoundPet foundPet)
    {
        var foundPetDto = _mapper.Map<FoundPetDto>(foundPet);
        var foundLocationWebMercator = _gisContext.WebMercatorToWGS84(foundPet.FoundLocation);
        foundPetDto.FoundLocation = _mapper.Map<PointDto>(foundLocationWebMercator);
        
        // Ensure FinderId is properly set from the Finder
        if (foundPet.Finder != null)
        {
            foundPetDto.FinderId = foundPet.Finder.Id;
        }

        return foundPetDto;
    }
    
    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteFoundPet(Guid id)
    {
        // Skip authentication for now
        // var user = await _userService.GetGeneralUserAsync(User);
        // if (user == null)
        // {
        //     return Unauthorized("User not authenticated");
        // }
        
        var foundPet = await _dbContext.FoundPets
            .Include(fp => fp.Images)
            .FirstOrDefaultAsync(fp => fp.Id == id);
            
        if (foundPet == null)
        {
            return NotFound($"Found pet with ID {id} not found");
        }
        
        // Skip owner check for now
        // if (foundPet.Finder.Id != user.Id)
        // {
        //     return Forbid("You are not authorized to delete this pet");
        // }
        
        // Delete associated images from storage
        foreach (var image in foundPet.Images)
        {
            try
            {
                await _storageService.DeleteFileAsync(image.Metadata.FileId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting image {FileId} for found pet {FoundPetId}", 
                    image.Metadata.FileId, foundPet.Id);
                // Continue with deletion even if image deletion fails
            }
        }
        
        // Remove from database
        _dbContext.FoundPets.Remove(foundPet);
        await _dbContext.SaveChangesAsync();
        
        return NoContent();
    }
    
    [HttpPut("{id}")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<FoundPetDto>> UpdateFoundPet(Guid id, [FromForm] UpdateFoundPetDto updateFoundPetDto)
    {
        var user = await _userService.GetGeneralUserAsync(User);
        if (user == null)
        {
            return Unauthorized("User not authenticated");
        }
        
        var foundPet = await _dbContext.FoundPets
            .Include(fp => fp.Images)
            .Include(fp => fp.Finder)
            .FirstOrDefaultAsync(fp => fp.Id == id);
            
        if (foundPet == null)
        {
            return NotFound($"Found pet with ID {id} not found");
        }
        
        if (foundPet.Finder.Id != user.Id)
        {
            return Forbid("You are not authorized to update this pet");
        }
        
        // Update fields using mapper
        _mapper.Map(updateFoundPetDto, foundPet);
        
        // Update location if provided
        if (updateFoundPetDto.FoundLatitude != 0 && updateFoundPetDto.FoundLongitude != 0)
        {
            var webMercatorPoint = _gisContext.WGS84ToWebMercator(
                updateFoundPetDto.FoundLongitude, 
                updateFoundPetDto.FoundLatitude);
            foundPet.FoundLocation = webMercatorPoint;
        }
        
        // Handle image deletions
        if (updateFoundPetDto.ImagesToDelete != null && updateFoundPetDto.ImagesToDelete.Any())
        {
            foreach (var imageId in updateFoundPetDto.ImagesToDelete)
            {
                var imageToDelete = foundPet.Images
                    .FirstOrDefault(img => img.Metadata.FileId == imageId);
                
                if (imageToDelete != null)
                {
                    try
                    {
                        await _storageService.DeleteFileAsync(imageToDelete.Metadata.FileId);
                        foundPet.Images.Remove(imageToDelete);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error deleting image {FileId} for found pet {FoundPetId}", 
                            imageToDelete.Metadata.FileId, foundPet.Id);
                    }
                }
            }
        }
        
        // Handle new images
        if (updateFoundPetDto.Images != null && updateFoundPetDto.Images.Any())
        {
            foreach (var formFile in updateFoundPetDto.Images)
            {
                if (formFile.Length == 0) continue;

                try
                {
                    var fileMetadataAbstraction = await _storageService.UploadFileAsync($"found-pet-images/{foundPet.Id}",
                        new FileToUpload
                        {
                            MimeType = formFile.ContentType,
                            Stream = formFile.OpenReadStream()
                        });

                    var modelMetadata = _mapper.Map<ModelFileMetadata>(fileMetadataAbstraction);
                    foundPet.Images.Add(new FoundPetImage
                    {
                        Metadata = modelMetadata
                    });
                }
                catch (Exception e)
                {
                    _logger.LogError(e, "Error uploading image for found pet {FoundPetId}", foundPet.Id);
                }
            }
        }
        
        await _dbContext.SaveChangesAsync();
        
        return Ok(MapToDto(foundPet));
    }

    [HttpPut("{id}/status")]
    public async Task<ActionResult<FoundPetDto>> UpdateFoundPetStatus(Guid id, [FromBody] UpdatePetStatusDto updateStatusDto)
    {
        // Skip authentication for now
        // var user = await _userService.GetGeneralUserAsync(User);
        // if (user == null)
        // {
        //     return Unauthorized("User not authenticated");
        // }
        
        var foundPet = await _dbContext.FoundPets
            .Include(fp => fp.Images)
            .Include(fp => fp.Finder)
            .FirstOrDefaultAsync(fp => fp.Id == id);
            
        if (foundPet == null)
        {
            return NotFound($"Found pet with ID {id} not found");
        }
        
        // Skip owner check for now
        // if (foundPet.Finder.Id != user.Id)
        // {
        //     return Forbid("You are not authorized to update this pet's status");
        // }
        
        // Update the status
        var validStatuses = new[] 
        { 
            FoundPetStatus.Pending,
            FoundPetStatus.Claimed 
        };
        
        if (validStatuses.Contains(updateStatusDto.Status))
        {
            foundPet.Status = updateStatusDto.Status;
        }
        else
        {
            return BadRequest($"Invalid status: {updateStatusDto.Status}. Valid values are: {string.Join(", ", validStatuses)}");
        }
        
        await _dbContext.SaveChangesAsync();
        
        return Ok(MapToDto(foundPet));
    }
}