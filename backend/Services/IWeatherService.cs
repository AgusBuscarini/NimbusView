using backend.Models;

namespace backend.Services;

public interface IWeatherService
{
    Task<CurrentWeatherDto> GetCurrentWeatherDto(double lat, double lon);
    Task<WeatherForecastDto> GetForecastDto(double lat, double lon);
    Task<(byte[] Content, string ContentType)> GetLayerTileAsync(
        string layer,
        int z,
        int x,
        int y,
        CancellationToken cancellationToken
    );
    Task<RadarFramesDto> GetRadarFramesAsync(CancellationToken cancellationToken);
    Task<(byte[] Content, string ContentType)> GetRadarTileAsync(
        long frameId,
        int z,
        int x,
        int y,
        CancellationToken cancellationToken
    );
}
