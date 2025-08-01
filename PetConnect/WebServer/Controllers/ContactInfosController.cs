using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetConnect.Data;
using PetConnect.Data.Models;
using PetConnect.Dtos.UserContactInfo;
using PetConnect.Services;
using Microsoft.Extensions.Logging;

namespace PetConnect.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ContactInfosController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly IMapper _mapper;
    private readonly UserService _userService;
    private readonly ILogger<ContactInfosController> _logger;

    public ContactInfosController(UserService userService, AppDbContext dbContext, IMapper mapper, ILogger<ContactInfosController> logger)
    {
        _userService = userService;
        _dbContext = dbContext;
        _mapper = mapper;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserContactInfoDto>>> GetContactInfos()
    {
        var user = await _userService.GetGeneralUserAsync(User);

        var contactInfos = user.ContactInfos.ToList();

        return Ok(_mapper.Map<List<UserContactInfoDto>>(contactInfos));
    }
    
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IEnumerable<UserContactInfoDto>>> GetContactInfosByUserId(Guid userId)
    {
        try
        {
            _logger.LogInformation($"Fetching contact information for user ID: {userId}");
            
            var user = await _dbContext.GeneralUsers
                .Include(u => u.ContactInfos)
                .FirstOrDefaultAsync(u => u.Id == userId);
                
            if (user == null)
            {
                _logger.LogWarning($"User not found for ID: {userId}");
                return NotFound("User not found");
            }

            var contactInfos = user.ContactInfos.ToList();
            _logger.LogInformation($"Found {contactInfos.Count} contact info items for user ID: {userId}");
            
            var dtos = _mapper.Map<List<UserContactInfoDto>>(contactInfos);
            return Ok(dtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error fetching contact information for user ID: {userId}");
            return StatusCode(500, "An error occurred while retrieving contact information");
        }
    }

    [HttpPost]
    public async Task<ActionResult> AddContactInfos(IEnumerable<CreateUserContactInfoDto> contactInfos)
    {
        var user = await _userService.GetGeneralUserAsync(User);

        var contactInfosToAdd = contactInfos.Select(ci => new UserContactInfo
        {
            User = user,
            Type = ci.Type,
            Value = ci.Value
        });

        _dbContext.ContactInfos.AddRange(contactInfosToAdd);
        await _dbContext.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete]
    public async Task<ActionResult> RemoveContactInfos(IEnumerable<Guid> contactInfoIds)
    {
        var user = await _userService.GetGeneralUserAsync(User);

        var contactInfosToRemove = user.ContactInfos.Where(ci => contactInfoIds.Contains(ci.Id));

        _dbContext.ContactInfos.RemoveRange(contactInfosToRemove);
        await _dbContext.SaveChangesAsync();

        return NoContent();
    }

    [HttpPut("{id}/primary")]
    public async Task<ActionResult> SetPrimaryContactInfo(Guid id)
    {
        var user = await _userService.GetGeneralUserAsync(User);

        // Eagerly load ContactInfos
        await _dbContext.Entry(user)
            .Collection(u => u.ContactInfos)
            .LoadAsync();

        var contactInfoToSetPrimary = user.ContactInfos.FirstOrDefault(ci => ci.Id == id);

        if (contactInfoToSetPrimary == null)
        {
            return NotFound("Contact info not found.");
        }

        // Set the new primary and unset the old one
        foreach (var ci in user.ContactInfos)
        {
            ci.IsPrimary = ci.Id == id;
        }

        await _dbContext.SaveChangesAsync();

        return NoContent();
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateContactInfo(Guid id, [FromBody] UpdateUserContactInfoDto updateDto)
    {
        var user = await _userService.GetGeneralUserAsync(User);

        await _dbContext.Entry(user)
            .Collection(u => u.ContactInfos)
            .LoadAsync();

        var contactInfoToUpdate = user.ContactInfos.FirstOrDefault(ci => ci.Id == id);

        if (contactInfoToUpdate == null)
        {
            return NotFound("Contact info not found.");
        }

        // Update properties
        contactInfoToUpdate.Value = updateDto.Value;
        contactInfoToUpdate.Type = updateDto.Type;

        // Mark the entity as modified if needed (often handled by tracking)
        // _dbContext.Entry(contactInfoToUpdate).State = EntityState.Modified;

        await _dbContext.SaveChangesAsync();

        return NoContent(); // Or return the updated DTO: Ok(_mapper.Map<UserContactInfoDto>(contactInfoToUpdate));
    }
}