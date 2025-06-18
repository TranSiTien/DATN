#define Managed

using System.Globalization;
using AutoMapper;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using PetConnect.Extensions;
using PetConnect.External.Storage;

var cultureInfo = new CultureInfo("en-US");
CultureInfo.DefaultThreadCurrentCulture = cultureInfo;
CultureInfo.DefaultThreadCurrentUICulture = cultureInfo;

var builder = WebApplication.CreateBuilder(args);

// Configure form options for file uploads
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 50 * 1024 * 1024; // 50MB max upload size
});

// Add Swagger services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { 
        Title = "Lost Pet Finder API", 
        Version = "v1",
        Description = "API for the Lost Pet Finder application"
    });
    
    // Configure JWT Authorization in Swagger UI
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token in the text input below.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
    
    // Configure file upload support directly in schema mapping
    c.MapType<IFormFile>(() => new OpenApiSchema
    {
        Type = "string",
        Format = "binary"
    });
    
    // Avoid potential reference cycles
    c.CustomSchemaIds(type => type.ToString());
});

builder.AddDatabase()
    .AddIdentity()
    .AddServices()
    .AddMapper();

// Add HttpClientFactory
builder.Services.AddHttpClient();

// Add CORS services
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder =>
        {
            builder.AllowAnyOrigin()
                   .AllowAnyMethod()
                   .AllowAnyHeader();
        });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var mapper = scope.ServiceProvider.GetRequiredService<IMapper>();
    mapper.ConfigurationProvider.AssertConfigurationIsValid();
}

// Configure and use Swagger middleware
app.UseSwagger();
app.UseSwaggerUI(c => 
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Lost Pet Finder API v1");
    c.RoutePrefix = "swagger";
    c.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.None);
    
    // Add this configuration to prepend "Bearer " to the token
    c.UseRequestInterceptor("(req) => { if (req.headers['Authorization'] && !req.headers['Authorization'].startsWith('Bearer ')) { req.headers['Authorization'] = 'Bearer ' + req.headers['Authorization']; } return req; }");
});

app.UseRouting();
app.Urls.Add("http://0.0.0.0:5049");
// Apply CORS middleware
app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

var localStorageOptions = app.Services.GetRequiredService<IOptions<LocalStorageOptions>>().Value;
var uploadsPath = Path.GetFullPath(localStorageOptions.BasePath);

// Ensure the directory exists (might be redundant if LocalStorageService already does this, but safe)
if (!Directory.Exists(uploadsPath))
{
    Directory.CreateDirectory(uploadsPath);
}

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath),
    RequestPath = localStorageOptions.BaseUrl
});

app.MapControllers();
app.Run();