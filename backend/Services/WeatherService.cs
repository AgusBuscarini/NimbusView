using backend.Models;
using backend.Options;
using Microsoft.Extensions.Options;

namespace backend.Services;

public class WeatherService : IWeatherService
{
    private readonly HttpClient _httpClient;
    private readonly OpenWeatherOptions _options;

    public WeatherService(HttpClient httpClient, IOptions<OpenWeatherOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<CurrentWeatherDto> GetCurrentWeatherDto(double lat, double lon)
    {
        var url =
            $"/data/2.5/weather?lat={lat}&lon={lon}&appid={_options.ApiKey}&units={_options.Units}&lang={_options.Lang}";
        var response = await _httpClient.GetAsync(url);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            throw new ApplicationException(
                $"Error consultando OpenWeather: {(int)response.StatusCode} - {errorBody}"
            );
        }

        var data = await response.Content.ReadFromJsonAsync<CurrentWeather>();

        if (data is null)
        {
            throw new ApplicationException("No llego ningun dato de clima");
        }

        var weather = data.Weather.FirstOrDefault();

        return new CurrentWeatherDto
        {
            LocationName = data.Name,
            Lat = data.Coord.Lat,
            Lon = data.Coord.Lon,
            Temperature = data.Main.Temp,
            FeelsLike = data.Main.FeelsLike,
            Humidity = data.Main.Humidity,
            WindSpeed = data.Wind.Speed,
            Description = weather?.Description ?? string.Empty,
            Icon = weather?.Icon ?? string.Empty,
        };
    }
}
