using System.Text.Json.Serialization;

namespace backend.Models;

public class CurrentWeather
{
    [JsonPropertyName("coord")]
    public Coord Coord { get; set; } = new();

    [JsonPropertyName("weather")]
    public List<WeatherInfo> Weather { get; set; } = [];

    [JsonPropertyName("main")]
    public MainInfo Main { get; set; } = new();

    [JsonPropertyName("wind")]
    public WindInfo Wind { get; set; } = new();

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
}

public class Coord
{
    [JsonPropertyName("lat")]
    public double Lat { get; set; }

    [JsonPropertyName("lon")]
    public double Lon { get; set; }
}

public class MainInfo
{
    [JsonPropertyName("temp")]
    public double Temp { get; set; }

    [JsonPropertyName("feels_like")]
    public double FeelsLike { get; set; }

    [JsonPropertyName("humidity")]
    public int Humidity { get; set; }
}

public class WindInfo
{
    [JsonPropertyName("speed")]
    public double Speed { get; set; }
}

public class WeatherInfo
{
    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("icon")]
    public string Icon { get; set; } = string.Empty;
}
