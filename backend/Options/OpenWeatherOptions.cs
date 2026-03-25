namespace backend.Options;

public class OpenWeatherOptions
{
    public const string SectionName = "OpenWeather";

    public string BaseUrl { get; set; } = "https://api.openweathermap.org";
    public string ApiKey { get; set; } = string.Empty;
    public string Units { get; set; } = "metric";
    public string Lang { get; set; } = "es";
}
