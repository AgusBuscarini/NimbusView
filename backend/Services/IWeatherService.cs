using backend.Models;

namespace backend.Services;

public interface IWeatherService
{
    Task<CurrentWeatherDto> GetCurrentWeatherDto(double lat, double lon);
}
