using backend.Models;
using backend.Options;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace backend.Services;

public class WeatherService : IWeatherService
{
    private const string RainViewerMapsUrl = "https://api.rainviewer.com/public/weather-maps.json";
    private const string RainViewerTilesHost = "https://tilecache.rainviewer.com";
    private static readonly TimeSpan RadarFramesCacheDuration = TimeSpan.FromMinutes(3);

    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _memoryCache;
    private readonly OpenWeatherOptions _options;

    public WeatherService(
        HttpClient httpClient,
        IOptions<OpenWeatherOptions> options,
        IMemoryCache memoryCache
    )
    {
        _httpClient = httpClient;
        _options = options.Value;
        _memoryCache = memoryCache;
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
                    WeatherId = weather?.Id ?? 0,
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

    public async Task<(byte[] Content, string ContentType)> GetLayerTileAsync(
        string layer,
        int z,
        int x,
        int y,
        CancellationToken cancellationToken
    )
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            throw new ApplicationException("No hay API key configurada para OpenWeather");
        }

        if (string.IsNullOrWhiteSpace(_options.TileBaseUrl))
        {
            throw new ApplicationException("No hay TileBaseUrl configurada para OpenWeather");
        }

        var normalizedBaseUrl = _options.TileBaseUrl.TrimEnd('/');
        var url = $"{normalizedBaseUrl}/map/{layer}/{z}/{x}/{y}.png?appid={_options.ApiKey}";
        var response = await _httpClient.GetAsync(url, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new ApplicationException(
                $"Error consultando tiles de OpenWeather: {(int)response.StatusCode} - {errorBody}"
            );
        }

        var content = await response.Content.ReadAsByteArrayAsync(cancellationToken);
        var contentType = response.Content.Headers.ContentType?.MediaType ?? "image/png";

        return (content, contentType);
    }

    public async Task<RadarFramesDto> GetRadarFramesAsync(CancellationToken cancellationToken)
    {
        if (_memoryCache.TryGetValue<RadarFramesDto>("radar-frames", out var cachedFrames)
            && cachedFrames is not null)
        {
            return cachedFrames;
        }

        var maps = await _httpClient.GetFromJsonAsync<RainViewerMapsResponse>(
            RainViewerMapsUrl,
            cancellationToken
        );

        if (maps?.Radar is null)
        {
            throw new ApplicationException("No se pudo leer el indice de radar");
        }

        var frames = (maps.Radar.Past ?? [])
            .Concat(maps.Radar.Nowcast ?? [])
            .Where(frame => frame.Time > 0 && !string.IsNullOrWhiteSpace(frame.Path))
            .GroupBy(frame => frame.Time)
            .Select(group => group.First())
            .OrderBy(frame => frame.Time)
            .ToList();

        if (frames.Count == 0)
        {
            throw new ApplicationException("No hay frames de radar disponibles");
        }

        var dto = new RadarFramesDto
        {
            Frames = frames
                .Select(frame => new RadarFrameDto
                {
                    Id = frame.Time,
                    Timestamp = DateTimeOffset.FromUnixTimeSeconds(frame.Time),
                })
                .ToList(),
        };

        var lookup = frames.ToDictionary(frame => frame.Time, frame => frame.Path.Trim());
        _memoryCache.Set(
            "radar-frames",
            dto,
            new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = RadarFramesCacheDuration }
        );
        _memoryCache.Set(
            "radar-lookup",
            lookup,
            new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = RadarFramesCacheDuration }
        );

        return dto;
    }

    public async Task<(byte[] Content, string ContentType)> GetRadarTileAsync(
        long frameId,
        int z,
        int x,
        int y,
        CancellationToken cancellationToken
    )
    {
        if (!_memoryCache.TryGetValue<Dictionary<long, string>>("radar-lookup", out var frameLookup)
            || frameLookup is null)
        {
            await GetRadarFramesAsync(cancellationToken);
            frameLookup = _memoryCache.Get<Dictionary<long, string>>("radar-lookup");
        }

        if (frameLookup is null || !frameLookup.TryGetValue(frameId, out var framePath))
        {
            throw new ApplicationException("Frame de radar no encontrado");
        }

        var normalizedPath = framePath.StartsWith('/') ? framePath : $"/{framePath}";
        var tileUrl = $"{RainViewerTilesHost}{normalizedPath}/256/{z}/{x}/{y}/2/1_1.png";
        var response = await _httpClient.GetAsync(tileUrl, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new ApplicationException(
                $"Error consultando tile de radar: {(int)response.StatusCode} - {errorBody}"
            );
        }

        var content = await response.Content.ReadAsByteArrayAsync(cancellationToken);
        var contentType = response.Content.Headers.ContentType?.MediaType ?? "image/png";

        return (content, contentType);
    }

    private sealed class RainViewerMapsResponse
    {
        public RainViewerRadarSection Radar { get; set; } = new();
    }

    private sealed class RainViewerRadarSection
    {
        public List<RainViewerFrame>? Past { get; set; }
        public List<RainViewerFrame>? Nowcast { get; set; }
    }

    private sealed class RainViewerFrame
    {
        public long Time { get; set; }
        public string Path { get; set; } = string.Empty;
    }
}
