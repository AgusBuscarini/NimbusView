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
            WeatherId = weather?.Id ?? 0,
            Main = weather?.Main ?? string.Empty,
            Description = weather?.Description ?? string.Empty,
            Icon = weather?.Icon ?? string.Empty,
        };
    }

    public async Task<WeatherForecastDto> GetForecastDto(double lat, double lon)
    {
        var url =
            $"/data/2.5/forecast?lat={lat}&lon={lon}&appid={_options.ApiKey}&units={_options.Units}&lang={_options.Lang}";
        var response = await _httpClient.GetAsync(url);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            throw new ApplicationException(
                $"Error consultando OpenWeather: {(int)response.StatusCode} - {errorBody}"
            );
        }

        var data = await response.Content.ReadFromJsonAsync<ForecastWeather>();

        if (data is null)
        {
            throw new ApplicationException("No llego ningun pronostico de clima");
        }

        var orderedEntries = data.List.OrderBy(entry => entry.Dt).ToList();
        var cityOffset = TimeSpan.FromSeconds(data.City.Timezone);
        var next24Hours = orderedEntries
            .Take(8)
            .Select(entry =>
            {
                var weather = entry.Weather.FirstOrDefault();

                return new HourlyForecastDto
                {
                    ForecastTime = DateTimeOffset.FromUnixTimeSeconds(entry.Dt).ToOffset(cityOffset),
                    Temperature = entry.Main.Temp,
                    Description = weather?.Description ?? string.Empty,
                    Icon = weather?.Icon ?? string.Empty,
                    PrecipitationProbability = Math.Round(entry.Pop * 100, 1),
                };
            })
            .ToList();

        var next5Days = orderedEntries
            .GroupBy(
                entry =>
                    DateOnly.FromDateTime(
                        DateTimeOffset.FromUnixTimeSeconds(entry.Dt).ToOffset(cityOffset).DateTime
                    )
            )
            .OrderBy(group => group.Key)
            .Take(5)
            .Select(group =>
            {
                var representative = group
                    .OrderBy(
                        entry =>
                            Math.Abs(
                                DateTimeOffset.FromUnixTimeSeconds(entry.Dt).ToOffset(cityOffset).Hour
                                - 12
                            )
                    )
                    .ThenByDescending(entry => entry.Pop)
                    .First();
                var weather = representative.Weather.FirstOrDefault();

                return new DailyForecastDto
                {
                    Date = group.Key,
                    MinTemperature = group.Min(entry => entry.Main.TempMin),
                    MaxTemperature = group.Max(entry => entry.Main.TempMax),
                    Description = weather?.Description ?? string.Empty,
                    Icon = weather?.Icon ?? string.Empty,
                };
            })
            .ToList();

        return new WeatherForecastDto
        {
            LocationName = data.City.Name,
            Lat = data.City.Coord.Lat,
            Lon = data.City.Coord.Lon,
            Next24Hours = next24Hours,
            Next5Days = next5Days,
        };
    }
}
