using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace PetConnect.Data;

public class AuthDbContext : IdentityDbContext<IdentityUser>
{
    public AuthDbContext() { }
    public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options) { }
}