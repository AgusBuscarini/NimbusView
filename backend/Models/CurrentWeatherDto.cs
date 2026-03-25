namespace backend.Models;

public class CurrentWeatherDto
{
    public string LocationName { get; set; } = string.Empty;
    public double Lat { get; set; }
    public double Lon { get; set; }
    public double Temperature { get; set; }
    public double FeelsLike { get; set; }
    public int Humidity { get; set; }
    public double WindSpeed { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
}
