using AutoMapper;
using NetTopologySuite.Geometries;
using PetConnect.Data.Models;
using PetConnect.Data.Models.Shared;
using PetConnect.Dtos.FoundPet;
using PetConnect.Dtos.GeneralUser;
using PetConnect.Dtos.LostPet;
using PetConnect.Dtos.Shared;
using PetConnect.Dtos.UserContactInfo;
using PetConnect.External.Storage.Abstractions;
using ModelFileMetadata = PetConnect.Data.Models.Shared.FileMetadata; // Alias for DB model
using AbstractionFileMetadata = PetConnect.External.Storage.Abstractions.FileMetadata; // Alias for API/Service model

namespace PetConnect.Configuration;

public class MapperProfile : Profile
{
    public MapperProfile()
    {
        // Map DB Model Metadata <-> Abstraction Metadata
        CreateMap<ModelFileMetadata, AbstractionFileMetadata>()
            .ForMember(dest => dest.FileUrl, opt => opt.MapFrom(src => src.FileName)) // Map FileName to FileUrl
            .ForMember(dest => dest.FileId, opt => opt.MapFrom(src => src.FileId))
            .ReverseMap()
            .ForMember(dest => dest.FileName, opt => opt.MapFrom(src => src.FileUrl)) // Map FileUrl back to FileName
            .ForMember(dest => dest.FileId, opt => opt.MapFrom(src => src.FileId));

        // Mapping for LostPet and its images
        CreateMap<LostPet, LostPetDto>()
            .ForMember(dest => dest.FinderId, opt => opt.MapFrom(src => src.Finder.Id))
            .ForMember(dest => dest.Images, opt => opt.MapFrom(src => src.Images)) // Let AutoMapper handle inner mapping
            .ForMember(dest => dest.LastSeenLocation, opt => opt.Ignore()) // Location handled separately
            .ForMember(dest => dest.SimilarityScore, opt => opt.Ignore()); // Ignore SimilarityScore, it's set manually
            // LocationName is mapped by convention
        CreateMap<LostPetImage, AbstractionFileMetadata>() // Map LostPetImage -> AbstractionFileMetadata for DTO
            .ConvertUsing((src, dest, context) => context.Mapper.Map<AbstractionFileMetadata>(src.Metadata));

        // Add mapping for CreateLostPetDto -> LostPet
        CreateMap<CreateLostPetDto, LostPet>()
            .ForMember(dest => dest.Id, opt => opt.Ignore()) // Ignore Id (generated by DB)
            .ForMember(dest => dest.Finder, opt => opt.Ignore()) // Ignore navigation property
            .ForMember(dest => dest.Images, opt => opt.Ignore()) // Images handled separately
            .ForMember(dest => dest.LastSeenLocation, opt => opt.Ignore()) // Location handled separately
            .ForMember(dest => dest.Status, opt => opt.Ignore()) // Status set manually
            .ForMember(dest => dest.ModeratorFeedback, opt => opt.Ignore()); // ModeratorFeedback set manually
            // Name, Description, LastSeenDateTime, LocationName are mapped by convention

        // Mapping for FoundPet and its images
        CreateMap<FoundPet, FoundPetDto>()
            .ForMember(dest => dest.FinderId, opt => opt.MapFrom(src => src.Finder.Id))
            .ForMember(dest => dest.Images, opt => opt.MapFrom(src => src.Images)) // Let AutoMapper handle inner mapping
            .ForMember(dest => dest.FoundLocation, opt => opt.Ignore()) // Location handled separately
            .ForMember(dest => dest.SimilarityScore, opt => opt.Ignore()); // Ignore SimilarityScore, it's set manually
        CreateMap<FoundPetImage, AbstractionFileMetadata>() // Map FoundPetImage -> AbstractionFileMetadata for DTO
            .ConvertUsing((src, dest, context) => context.Mapper.Map<AbstractionFileMetadata>(src.Metadata));

        // Add mapping for CreateFoundPetDto -> FoundPet
        CreateMap<CreateFoundPetDto, FoundPet>()
            .ForMember(dest => dest.Id, opt => opt.Ignore()) // Ignore Id (generated by DB)
            .ForMember(dest => dest.Finder, opt => opt.Ignore()) // Ignore navigation property
            .ForMember(dest => dest.Images, opt => opt.Ignore()) // Images handled separately
            .ForMember(dest => dest.FoundLocation, opt => opt.Ignore()) // Location handled separately
            .ForMember(dest => dest.Status, opt => opt.Ignore()) // Status set manually
            .ForMember(dest => dest.ModeratorFeedback, opt => opt.Ignore()); // ModeratorFeedback set manually
            // Description, FoundDateTime are mapped by convention
            
        // Add mapping for UpdateFoundPetDto -> FoundPet
        CreateMap<UpdateFoundPetDto, FoundPet>()
            .ForMember(dest => dest.Id, opt => opt.Ignore()) // Ignore Id (it's provided via URL)
            .ForMember(dest => dest.Finder, opt => opt.Ignore()) // Ignore navigation property
            .ForMember(dest => dest.Images, opt => opt.Ignore()) // Images handled separately
            .ForMember(dest => dest.FoundLocation, opt => opt.Ignore()) // Location handled separately
            .ForMember(dest => dest.Status, opt => opt.Ignore()) // Status not updated here
            .ForMember(dest => dest.ModeratorFeedback, opt => opt.Ignore()); // ModeratorFeedback not updated here
            // Description, FoundDateTime, LocationName are mapped by convention

        // Mapping for Point and PointDto
        CreateMap<Point, PointDto>()
            .ForMember(dest => dest.Latitude, opt => opt.MapFrom(src => src.Y))
            .ForMember(dest => dest.Longitude, opt => opt.MapFrom(src => src.X));

        // Mapping for UserContactInfo
        CreateMap<UserContactInfo, UserContactInfoDto>(); // This already maps IsPrimary by convention
        CreateMap<CreateUserContactInfoDto, UserContactInfo>()
            .ForMember(dest => dest.Id, opt => opt.Ignore()) // Ignore Id (generated by DB)
            .ForMember(dest => dest.IsPrimary, opt => opt.Ignore()) // Ignore IsPrimary on creation, handle via dedicated endpoint
            .ForMember(dest => dest.User, opt => opt.Ignore()) // Ignore navigation property
            .ForMember(dest => dest.UserId, opt => opt.Ignore()); // Ignore UserId (set manually in controller)

        // Add mapping for GeneralUser -> GeneralUserDto
        CreateMap<Data.Models.GeneralUser, GeneralUserDto>()
            .ForMember(dest => dest.Email, opt => opt.Ignore()); // Ignore Email, it comes from IdentityUser
    }
}