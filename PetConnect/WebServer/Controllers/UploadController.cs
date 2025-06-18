using Microsoft.AspNetCore.Mvc;
using PetConnect.External.Storage.Abstractions;
using System.ComponentModel.DataAnnotations;

namespace PetConnect.Controllers;

[Route("api/[controller]")]
[ApiController]
public class UploadController : ControllerBase
{
    private readonly IStorageService _storageService;

    public UploadController(IStorageService storageService)
    {
        _storageService = storageService;
    }

    [HttpPost("")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(FileMetadata), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<FileMetadata>> Index(
        [Required] IFormFile file)
    {
        if (file == null) return BadRequest("No file was uploaded");

        var fileToUpload = new FileToUpload
        {
            MimeType = file.ContentType,
            Stream = file.OpenReadStream()
        };

        var metadata = await _storageService.UploadFileAsync("uploads", fileToUpload);

        return Ok(metadata);
    }
}