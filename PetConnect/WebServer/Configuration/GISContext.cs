using GeoAPI.CoordinateSystems;
using NetTopologySuite.Geometries;
using ProjNet.CoordinateSystems;
using ProjNet.CoordinateSystems.Transformations;

namespace PetConnect.Configuration;

public class GISContext
{
    public enum SupportedProjection
    {
        WGS84,
        WebMercator
    }

    private readonly CoordinateTransformationFactory _transformFactory;

    private readonly GeometryFactory _webMercatorGeometryFactory;
    private readonly GeometryFactory _wgs84GeometryFactory;

    public GISContext()
    {
        _wgs84GeometryFactory = CreateWGS84GeometryFactory();
        _webMercatorGeometryFactory = CreateWebMercatorGeometryFactory();
        _transformFactory = new CoordinateTransformationFactory();
    }

    public Point WGS84ToWebMercator(double lng, double lat)
    {
        var point = _wgs84GeometryFactory.CreatePoint(new Coordinate(lng, lat));
        return DoProjection(point, SupportedProjection.WebMercator);
    }

    public Point WebMercatorToWGS84(Point point)
    {
        if (point.SRID != 3857)
            throw new ArgumentException("Point must be in Web Mercator projection.", nameof(point));

        var wgs84Point = _webMercatorGeometryFactory.CreatePoint(new Coordinate(point.X, point.Y));
        return DoProjection(wgs84Point, SupportedProjection.WGS84);
    }

    private Point DoProjection(Point p, SupportedProjection targetProjection)
    {
        ICoordinateSystem sourceCs = p.SRID switch
        {
            4326 => GeographicCoordinateSystem.WGS84,
            3857 => ProjectedCoordinateSystem.WebMercator,
            _ => throw new ArgumentOutOfRangeException(nameof(p.SRID), p.SRID, null)
        };

        ICoordinateSystem targetCs = targetProjection switch
        {
            SupportedProjection.WGS84 => GeographicCoordinateSystem.WGS84,
            SupportedProjection.WebMercator => ProjectedCoordinateSystem.WebMercator,
            _ => throw new ArgumentOutOfRangeException(nameof(targetProjection), targetProjection, null)
        };

        var transformation = _transformFactory.CreateFromCoordinateSystems(sourceCs, targetCs);

        // Convert latitude/longitude to Mercator
        var transformed = transformation.MathTransform.Transform(new[] { p.X, p.Y });

        return targetProjection switch
        {
            SupportedProjection.WGS84 => _wgs84GeometryFactory.CreatePoint(new Coordinate(transformed[0],
                transformed[1])),
            SupportedProjection.WebMercator => _webMercatorGeometryFactory.CreatePoint(new Coordinate(transformed[0],
                transformed[1])),
            _ => throw new ArgumentOutOfRangeException(nameof(targetProjection), targetProjection, null)
        };
    }

    private GeometryFactory CreateWGS84GeometryFactory()
    {
        var precisionModel = new PrecisionModel(PrecisionModels.Floating);
        var srid = 4326;
        return new GeometryFactory(precisionModel, srid);
    }

    private GeometryFactory CreateWebMercatorGeometryFactory()
    {
        var precisionModel = new PrecisionModel(PrecisionModels.Floating);
        var srid = 3857;
        return new GeometryFactory(precisionModel, srid);
    }
}