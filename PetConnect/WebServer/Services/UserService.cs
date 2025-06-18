using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using PetConnect.Data;
using PetConnect.Data.Models;
using PetConnect.Exceptions;

namespace PetConnect.Services;

public class UserService
{
    private readonly AppDbContext _dbContext;
    private readonly UserManager<IdentityUser> _userManager;

    public UserService(AppDbContext dbContext, UserManager<IdentityUser> _userManager)
    {
        _dbContext = dbContext;
        this._userManager = _userManager;
    }

    public async Task<GeneralUser> GetGeneralUserAsync(ClaimsPrincipal principal)
    {
        var user = await _userManager.GetUserAsync(principal);

        if (user == null) throw new UserNotFoundException();

        var generalUser = await _dbContext.GeneralUsers.FindAsync(Guid.Parse(user.Id));

        if (generalUser == null) throw new UserNotFoundException();

        return generalUser;
    }
}