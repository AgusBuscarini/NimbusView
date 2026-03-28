using System.Text.Json.Serialization;

namespace backend.Models;

public class ForecastWeather
{
    [JsonPropertyName("city")]
    public ForecastCity City { get; set; } = new();

    [JsonPropertyName("list")]
    public List<ForecastEntry> List { get; set; } = [];
}

public class ForecastCity
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("coord")]
    public Coord Coord { get; set; } = new();

    [JsonPropertyName("timezone")]
    public int Timezone { get; set; }
}

public class ForecastEntry
{
    [JsonPropertyName("dt")]
    public long Dt { get; set; }

    [JsonPropertyName("main")]
    public ForecastMainInfo Main { get; set; } = new();

    [JsonPropertyName("weather")]
    public List<WeatherInfo> Weather { get; set; } = [];

    [JsonPropertyName("pop")]
    public double Pop { get; set; }
}

public class ForecastMainInfo
{
    [JsonPropertyName("temp")]
    public double Temp { get; set; }

    [JsonPropertyName("temp_min")]
    public double TempMin { get; set; }

    [JsonPropertyName("temp_max")]
    public double TempMax { get; set; }
}
