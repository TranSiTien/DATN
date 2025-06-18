using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration; // Added for IConfiguration
using PetConnect.Configuration;
using PetConnect.Data;
using PetConnect.Data.Models;
using PetConnect.Dtos.LostPet;
using PetConnect.Dtos.Shared;
using PetConnect.External.Storage.Abstractions;
using PetConnect.Services;
using System.Net.Http;
using System.Net.Http.Headers;
using ModelFileMetadata = PetConnect.Data.Models.Shared.FileMetadata; // Alias for DB model

namespace PetConnect.Controllers;

[Route("api/[controller]")]
[ApiController]
public class LostPetsController : ControllerBase
{
    private const int DefaultSearchRadiusInKilometers = 10;

    private readonly AppDbContext _dbContext;
    private readonly GISContext _gisContext;
    private readonly ILogger<LostPetsController> _logger;
    private readonly IMapper _mapper;
    private readonly IStorageService _storageService;
    private readonly UserService _userService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration; // Added

    public LostPetsController(AppDbContext dbContext, UserService userService,
        IStorageService storageService, ILogger<LostPetsController> logger, IMapper mapper, GISContext gisContext,
        IHttpClientFactory httpClientFactory, IConfiguration configuration) // Added configuration
    {
        _dbContext = dbContext;
        _userService = userService;
        _storageService = storageService;
        _logger = logger;
        _mapper = mapper;
        _gisContext = gisContext;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration; // Added
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<LostPetDto>>> GetLostPets(double? latitude, double? longitude,
        DateTimeOffset? fromDate, DateTimeOffset? toDate, int distanceInKilometers = DefaultSearchRadiusInKilometers)
    {
        var query = _dbContext.LostPets
            .Include(lp => lp.Images)
            .Include(lp => lp.Finder)
            .AsQueryable();

        if (latitude != null && longitude != null)
        {
            var searchPoint = _gisContext.WGS84ToWebMercator(longitude.Value, latitude.Value);
            query = query.Where(lp => lp.LastSeenLocation.IsWithinDistance(searchPoint, distanceInKilometers * 1000));
        }

        if (fromDate != null)
        {
            var fromDateUtc = fromDate.Value.ToUniversalTime(); // Convert to UTC
            query = query.Where(lp => lp.LastSeenDateTime >= fromDateUtc);
        }

        if (toDate != null)
        {
            var toDateUtc = toDate.Value.ToUniversalTime(); // Convert to UTC
            query = query.Where(lp => lp.LastSeenDateTime <= toDateUtc);
        }

        var lostPets = await query.ToListAsync();

        return Ok(lostPets.Select(MapToDto));
    }

    [HttpPost("search")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<IEnumerable<LostPetDto>>> SearchLostPets([FromForm] SearchLostPetDto searchParams)
    {
        var query = _dbContext.LostPets
            .Include(lp => lp.Images)
            .Include(lp => lp.Finder)
            .AsQueryable();

        if (searchParams.Latitude != null && searchParams.Longitude != null)
        {
            var searchPoint = _gisContext.WGS84ToWebMercator(searchParams.Longitude.Value, searchParams.Latitude.Value);
            query = query.Where(lp => lp.LastSeenLocation.IsWithinDistance(searchPoint, searchParams.DistanceInKilometers * 1000));
        }

        // More flexible date filtering - only apply date filters if they are provided,
        // and log what dates we're actually using
        if (searchParams.FromDate != null)
        {
            var fromDateUtc = searchParams.FromDate.Value.ToUniversalTime(); // Convert to UTC
            query = query.Where(lp => lp.LastSeenDateTime >= fromDateUtc);
            _logger.LogInformation("Filtering cats with LastSeenDateTime >= {FromDate} (UTC)", fromDateUtc);
        }
        else
        {
            _logger.LogInformation("No start date filter applied");
        }

        if (searchParams.ToDate != null)
        {
            var toDateUtc = searchParams.ToDate.Value.ToUniversalTime(); // Convert to UTC
            query = query.Where(lp => lp.LastSeenDateTime <= toDateUtc);
            _logger.LogInformation("Filtering cats with LastSeenDateTime <= {ToDate} (UTC)", toDateUtc);
        }
        else
        {
            _logger.LogInformation("No end date filter applied");
        }

        // Log the SQL query
        var queryString = query.ToQueryString();
        _logger.LogInformation("SQL Query for lost pets search: {Query}", queryString);

        // Execute query and log the results before image filtering
        List<LostPet> lostPets = await query.ToListAsync();
        _logger.LogInformation("Initial database query returned {Count} results", lostPets.Count);
        
        // Log each pet found for debugging
        foreach (var pet in lostPets)
        {
            _logger.LogDebug("Found pet: ID={Id}, Name={Name}, LastSeenDateTime={LastSeen}", 
                pet.Id, pet.Name, pet.LastSeenDateTime);
        }

        // If a search image is provided, use the AI server to find similar cats
        if (searchParams.SearchImage != null && searchParams.SearchImage.Length > 0)
        {
            try
            {
                _logger.LogInformation("Performing image-based search for similar cats");
                
                // Get all cat IDs from our filtered results
                var catIds = lostPets.Select(p => p.Id.ToString()).ToList();
                
                // If we have no cats in the filter, there's nothing to search with AI
                if (!catIds.Any())
                {
                    _logger.LogInformation("No cats to search in image similarity - initial filters returned empty set");
                    return Ok(new List<LostPetDto>());
                }
                
                // Prepare the HTTP request to the AI server
                var client = _httpClientFactory.CreateClient();
                using var formData = new MultipartFormDataContent();
                
                // Add the search image to the form data
                var streamContent = new StreamContent(searchParams.SearchImage.OpenReadStream());
                streamContent.Headers.ContentType = new MediaTypeHeaderValue(searchParams.SearchImage.ContentType);
                formData.Add(streamContent, "image", searchParams.SearchImage.FileName);
                
                _logger.LogInformation("Adding search image to request: {FileName} ({ContentType}, {Size} bytes)", 
                    searchParams.SearchImage.FileName,
                    searchParams.SearchImage.ContentType,
                    searchParams.SearchImage.Length);
                
                // Add all the cat IDs from our initial filter as query parameters
                var aiServerUrl = _configuration["AiServer:SearchSimilarCatsUrl"] 
                    ?? "http://localhost:8000/search/similar-cats-by-image";
                
                var uriBuilder = new UriBuilder(aiServerUrl);
                var query1 = System.Web.HttpUtility.ParseQueryString(uriBuilder.Query);
                query1["namespace"] = "lost-cats";
                query1["top_k"] = "5";
                query1["candidates_k"] = "40";
                
                // Add each cat_id as a separate query parameter and log them
                _logger.LogInformation("Adding {Count} cat IDs as search targets", catIds.Count);
                foreach (var catId in catIds)
                {
                    query1.Add("target_cat_ids", catId);
                    _logger.LogDebug("Added target cat ID: {CatId}", catId);
                }
                
                uriBuilder.Query = query1.ToString();
                var finalUrl = uriBuilder.ToString();
                
                _logger.LogInformation("Calling AI server for image similarity search at: {Url}", finalUrl);
                
                var requestStartTime = DateTimeOffset.UtcNow;
                var response = await client.PostAsync(finalUrl, formData);
                var requestDuration = DateTimeOffset.UtcNow - requestStartTime;
                
                _logger.LogInformation("AI server responded in {Duration}ms with status code {StatusCode}", 
                    requestDuration.TotalMilliseconds, 
                    (int)response.StatusCode);
                
                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Successfully received response from AI server");
                    
                    // Deserialize the response
                    var jsonContent = await response.Content.ReadAsStringAsync();
                    
                    // Always log the raw JSON response at Information level
                    _logger.LogInformation("AI server raw response: {Response}", jsonContent);
                    
                    var similarCatsResponse = System.Text.Json.JsonSerializer.Deserialize<SimilarCatsResponse>(
                        jsonContent,
                        new System.Text.Json.JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true
                        });
                    
                    // Log the deserialized response to verify parsing
                    if (similarCatsResponse != null)
                    {
                        _logger.LogInformation("Deserialized response - Match count: {Count}", 
                            similarCatsResponse.Matches?.Count ?? 0);
                    }
                    else 
                    {
                        _logger.LogWarning("Failed to deserialize AI server response");
                    }
                    
                    if (similarCatsResponse?.Matches != null && similarCatsResponse.Matches.Any())
                    {
                        _logger.LogInformation("AI server returned {Count} matches", similarCatsResponse.Matches.Count);
                        
                        // Log each match with its score - Change from Debug to Information level
                        foreach (var match in similarCatsResponse.Matches)
                        {
                            _logger.LogInformation("Match: Cat ID {CatId} with score {Score}", match.CatId, match.BestScore);
                        }
                        
                        // Get matched IDs from AI response
                        var matchedIds = similarCatsResponse.Matches.Select(m => m.CatId).ToList();
                        _logger.LogInformation("AI server matched IDs: {MatchedIds}", string.Join(", ", matchedIds));
                        
                        // Also check if we need to parse the IDs (if the AI returns them in a different format)
                        var parsedMatchedIds = new List<string>();
                        var parsedGuidIds = new List<Guid>();
                        
                        foreach (var id in matchedIds)
                        {
                            // Try to parse as Guid if it looks like one
                            if (Guid.TryParse(id, out var guidId))
                            {
                                parsedGuidIds.Add(guidId);
                                parsedMatchedIds.Add(guidId.ToString());
                                _logger.LogInformation("Successfully parsed ID as Guid: {Id} -> {GuidId}", id, guidId);
                            }
                            else
                            {
                                parsedMatchedIds.Add(id);
                                _logger.LogInformation("Added ID as string: {Id}", id);
                            }
                        }
                        
                        // Log all pet IDs from the database for comparison - Change to Information level
                        _logger.LogInformation("Database pet IDs: {DatabaseIds}", 
                            string.Join(", ", lostPets.Select(p => p.Id.ToString())));
                        
                        // Filter by GUID if we were able to parse IDs as GUIDs
                        if (parsedGuidIds.Any())
                        {
                            var filteredPets = lostPets.Where(p => parsedGuidIds.Contains(p.Id)).ToList();
                            _logger.LogInformation("Filtered by GUID: found {Count} matching pets", filteredPets.Count);
                            lostPets = filteredPets;
                        }
                        // Otherwise filter by string representation
                        else
                        {
                            var filteredPets = lostPets.Where(p => parsedMatchedIds.Contains(p.Id.ToString())).ToList();
                            _logger.LogInformation("Filtered by string: found {Count} matching pets", filteredPets.Count);
                            lostPets = filteredPets;
                        }
                        
                        // If we still have matches, sort them by score and capture score values for the DTOs
                        if (lostPets.Any())
                        {
                            var petsWithScores = lostPets
                                .Join(
                                    similarCatsResponse.Matches,
                                    pet => pet.Id.ToString(),
                                    match => match.CatId,
                                    (pet, match) => new { Pet = pet, Score = match.BestScore })
                                .OrderBy(x => x.Score) // Lower score is better (smaller distance)
                                .ToList();
                            
                            // Save the sorted pets
                            lostPets = petsWithScores.Select(x => x.Pet).ToList();
                            
                            // Create a mapping of pet IDs to their similarity scores for use in the MapToDto method
                            var petScores = petsWithScores.ToDictionary(x => x.Pet.Id, x => x.Score);
                            
                            _logger.LogInformation("Final result set contains {Count} pets after image similarity filtering", lostPets.Count);
                            
                            // Return DTOs with similarity scores
                            return Ok(lostPets.Select(lp => 
                            {
                                var dto = MapToDto(lp);
                                if (petScores.TryGetValue(lp.Id, out var score))
                                {
                                    dto.SimilarityScore = score;
                                }
                                return dto;
                            }));
                        }
                        
                        _logger.LogInformation("Final result set contains {Count} pets after image similarity filtering", lostPets.Count);
                    }
                    else
                    {
                        _logger.LogInformation("AI server found no matching pets");
                    }
                }
                else
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Failed to get matches from AI server. Status: {StatusCode}. Response: {Response}", 
                        response.StatusCode, responseContent);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error performing image-based search");
                // Continue with regular search results if image search fails
            }
        }

        // Return DTOs without similarity scores for regular search
        return Ok(lostPets.Select(MapToDto));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<LostPetDto>> GetLostPet(Guid id)
    {
        var lostPet = await _dbContext.LostPets
            .Include(lp => lp.Images)
            .Include(lp => lp.Finder)
            .FirstOrDefaultAsync(lp => lp.Id == id);

        if (lostPet == null)
            return NotFound();

        return Ok(MapToDto(lostPet));
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<LostPetDto>> CreateLostPet([FromForm] CreateLostPetDto createLostPetDto)
    {
        var user = await _userService.GetGeneralUserAsync(User);
        var webMercatorPoint =
            _gisContext.WGS84ToWebMercator(createLostPetDto.LastSeenLongitude, createLostPetDto.LastSeenLatitude);

        // Use AutoMapper to map from DTO to Entity
        var lostPet = _mapper.Map<LostPet>(createLostPetDto);

        // Set properties not mapped by AutoMapper
        lostPet.Id = Guid.NewGuid();
        lostPet.LastSeenLocation = webMercatorPoint;
        lostPet.Status = LostPetStatus.Pending;
        lostPet.Finder = user;

        _dbContext.LostPets.Add(lostPet);
        await _dbContext.SaveChangesAsync(); // Save LostPet first to get ID

        var uploadedImageMetadata = new List<(ModelFileMetadata Metadata, IFormFile FormFile)>(); // Store metadata and original file

        foreach (var formFile in createLostPetDto.Images)
        {
            if (formFile.Length == 0) continue; // Skip empty files

            try
            {
                var fileMetadataAbstraction = await _storageService.UploadFileAsync($"lost-pet-images/{lostPet.Id}",
                    new FileToUpload
                    {
                        MimeType = formFile.ContentType,
                        Stream = formFile.OpenReadStream() // Use original stream
                    });

                var modelMetadata = _mapper.Map<ModelFileMetadata>(fileMetadataAbstraction);
                lostPet.Images.Add(new LostPetImage
                {
                    Metadata = modelMetadata
                });
                uploadedImageMetadata.Add((modelMetadata, formFile)); // Keep track of uploaded file and its metadata
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Error uploading image for lost pet {LostPetId}", lostPet.Id);
                // Decide if you want to continue or return an error
            }
        }

        await _dbContext.SaveChangesAsync(); // Save image references

        // --- Send data to AI server ---
        try
        {
            _logger.LogInformation("Attempting to send lost pet data to AI server for Pet ID: {PetId}", lostPet.Id);
            var client = _httpClientFactory.CreateClient();
            using var formData = new MultipartFormDataContent();

            // Add cat_id
            formData.Add(new StringContent(lostPet.Id.ToString()), "cat_id");

            // Add images
            foreach (var (metadata, formFile) in uploadedImageMetadata)
            {
                // Reset stream position if it was read before (important!)
                formFile.OpenReadStream().Position = 0;
                var streamContent = new StreamContent(formFile.OpenReadStream());
                streamContent.Headers.ContentType = new MediaTypeHeaderValue(formFile.ContentType);
                var fileName = metadata.FileName ?? formFile.FileName; // Fallback to form file name
                formData.Add(streamContent, "images", fileName);
                _logger.LogDebug("Adding image {FileName} ({ContentType}) to AI request for Pet ID: {PetId}", fileName, formFile.ContentType, lostPet.Id);
            }

            // Read AI server URL from configuration
            var aiServerUrl = _configuration["AiServer:UploadLostCatUrl"];
            if (string.IsNullOrEmpty(aiServerUrl))
            {
                _logger.LogError("AI Server URL ('AiServer:UploadLostCatUrl') is not configured.");
                // Decide how to handle missing configuration (e.g., return error, skip sending)
                // For now, we'll log and skip sending to AI
            }
            else
            {
                var response = await client.PostAsync(aiServerUrl, formData);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Successfully sent data to AI server for Pet ID: {PetId}. Status: {StatusCode}", lostPet.Id, response.StatusCode);
                }
                else
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Failed to send data to AI server for Pet ID: {PetId}. Status: {StatusCode}. Response: {Response}", lostPet.Id, response.StatusCode, responseContent);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending lost pet data to AI server for Pet ID: {PetId}", lostPet.Id);
        }
        // --- End send data to AI server ---

        return Ok(MapToDto(lostPet));
    }

    private LostPetDto MapToDto(LostPet lostPet)
    {
        var lostPetDto = _mapper.Map<LostPetDto>(lostPet);
        var lastSeenLocationWgs84 = _gisContext.WebMercatorToWGS84(lostPet.LastSeenLocation);
        lostPetDto.LastSeenLocation = _mapper.Map<PointDto>(lastSeenLocationWgs84);
        return lostPetDto;
    }
    
    [HttpPut("{id}/status")]
    public async Task<ActionResult<LostPetDto>> UpdateLostPetStatus(Guid id, [FromBody] UpdatePetStatusDto updateStatusDto)
    {
        // Skip authentication for now
        // var user = await _userService.GetGeneralUserAsync(User);
        // if (user == null)
        // {
        //     return Unauthorized("User not authenticated");
        // }
        
        var lostPet = await _dbContext.LostPets
            .Include(lp => lp.Images)
            .Include(lp => lp.Finder)
            .FirstOrDefaultAsync(lp => lp.Id == id);
            
        if (lostPet == null)
        {
            return NotFound($"Lost pet with ID {id} not found");
        }
        
        // Skip owner check for now
        // if (lostPet.Finder.Id != user.Id)
        // {
        //     return Forbid("You are not authorized to update this pet's status");
        // }
        
        // Update the status
        var validStatuses = new[] 
        { 
            LostPetStatus.Pending,
            LostPetStatus.Found 
        };
        
        if (validStatuses.Contains(updateStatusDto.Status))
        {
            lostPet.Status = updateStatusDto.Status;
        }
        else
        {
            return BadRequest($"Invalid status: {updateStatusDto.Status}. Valid values are: {string.Join(", ", validStatuses)}");
        }
        
        await _dbContext.SaveChangesAsync();
        
        return Ok(MapToDto(lostPet));
    }
}