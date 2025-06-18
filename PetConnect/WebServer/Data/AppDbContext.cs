using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using PetConnect.Data.Models;
using PetConnect.Data.Models.Shared;

namespace PetConnect.Data;

public class AppDbContext : DbContext
{
    public AppDbContext()
    {
    }

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<GeneralUser> GeneralUsers { get; set; }
    public DbSet<LostPet> LostPets { get; set; }
    public DbSet<LostPetImage> LostPetImages { get; set; }
    public DbSet<UserContactInfo> ContactInfos { get; set; }
    public DbSet<FoundPet> FoundPets { get; set; }
    public DbSet<FoundPetImage> FoundPetImages { get; set; }

    public override int SaveChanges()
    {
        ConvertDatesToUtc();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ConvertDatesToUtc();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void ConvertDatesToUtc()
    {
        foreach (var entry in ChangeTracker.Entries())
            if (entry.State == EntityState.Added || entry.State == EntityState.Modified)
                foreach (var property in entry.Properties)
                    if (property.CurrentValue is DateTime dt)
                        property.CurrentValue = DateTime.SpecifyKind(dt, DateTimeKind.Utc).ToUniversalTime();
                    else if (property.CurrentValue is DateTimeOffset dto) property.CurrentValue = dto.ToUniversalTime();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.HasPostgresExtension("postgis");

        modelBuilder.Entity<LostPet>()
            .HasIndex(lp => lp.Status)
            .HasDatabaseName("IX_LostPet_Status");

        modelBuilder.Entity<LostPet>()
            .HasIndex(lp => lp.LastSeenDateTime)
            .HasDatabaseName("IX_LostPet_LastSeenDateTime");

        modelBuilder.Entity<LostPet>()
            .HasIndex(lp => lp.LastSeenLocation)
            .HasMethod("GIST")
            .HasDatabaseName("IX_LostPet_LastSeenLocation");

        modelBuilder.Entity<LostPetImage>()
            .Property(i => i.Metadata)
            .HasConversion(
                new JsonValueConverter<FileMetadata>()
            );

        modelBuilder.Entity<FoundPetImage>()
            .Property(i => i.Metadata)
            .HasConversion(
                new JsonValueConverter<FileMetadata>()
            );

        modelBuilder.Entity<UserContactInfo>()
            .Property(i => i.Type)
            .HasConversion<string>();
    }

    private class JsonValueConverter<T> : ValueConverter<T, string>
    {
        private static readonly JsonSerializerOptions _options = new()
        {
            PropertyNameCaseInsensitive = true
        };

        public JsonValueConverter() : base(
            v => JsonSerializer.Serialize(v, _options),
            v => JsonSerializer.Deserialize<T>(v, _options)!
        )
        {
        }
    }
}