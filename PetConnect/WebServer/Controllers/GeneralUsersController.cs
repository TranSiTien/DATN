using AutoMapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using PetConnect.Data;
using PetConnect.Data.Models;
using PetConnect.Dtos;
using PetConnect.Dtos.GeneralUser;
using PetConnect.Services;

namespace PetConnect.Controllers;

[Route("api/[controller]")]
[ApiController]
public class GeneralUsersController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly JwtService _jwtService;
    private readonly UserManager<IdentityUser> _userManager;
    private readonly IMapper _mapper;

    public GeneralUsersController(UserManager<IdentityUser> userManager, AppDbContext dbContext, JwtService jwtService, IMapper mapper)
    {
        _userManager = userManager;
        _dbContext = dbContext;
        _jwtService = jwtService;
        _mapper = mapper;
    }

    [HttpPost("register")]
    public async Task<ActionResult> Register(GeneralUserRegisterDto registerDto)
    {
        var user = new IdentityUser
        {
            UserName = registerDto.Username
        };

        var result = await _userManager.CreateAsync(user, registerDto.Password);

        if (result.Succeeded)
        {
            var generalUser = new GeneralUser
            {
                Id = Guid.Parse(user.Id),
                Name = registerDto.Name
            };

            _dbContext.GeneralUsers.Add(generalUser);
            await _dbContext.SaveChangesAsync();

            return Ok(new UserIdentityDto { AccessToken = _jwtService.GenerateJwtToken(user) });
        }

        return BadRequest(result.Errors);
    }

    [HttpPost("login")]
    public async Task<ActionResult> Login(GeneralUserLoginDto loginDto)
    {
        var user = await _userManager.FindByNameAsync(loginDto.Username);

        if (user == null) return NotFound();

        var result = await _userManager.CheckPasswordAsync(user, loginDto.Password);

        if (result) return Ok(new UserIdentityDto { AccessToken = _jwtService.GenerateJwtToken(user) });

        return Unauthorized();
    }

    [HttpGet("current")]
    public async Task<ActionResult<GeneralUserDto>> Current()
    {
        var user = await _userManager.GetUserAsync(User);

        if (user == null) return NotFound();

        var generalUser = await _dbContext.GeneralUsers.FindAsync(Guid.Parse(user.Id));

        if (generalUser == null) return NotFound();

        var generalUserDto = _mapper.Map<GeneralUserDto>(generalUser);

        return Ok(generalUserDto);
    }
}