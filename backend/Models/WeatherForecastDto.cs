namespace backend.Models;

public class WeatherForecastDto
{
    public string LocationName { get; set; } = string.Empty;
    public double Lat { get; set; }
    public double Lon { get; set; }
    public List<HourlyForecastDto> Next24Hours { get; set; } = [];
    public List<DailyForecastDto> Next5Days { get; set; } = [];
}

public class HourlyForecastDto
{
    public DateTimeOffset ForecastTime { get; set; }
    public double Temperature { get; set; }
    public int WeatherId { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public double PrecipitationProbability { get; set; }
}

public class DailyForecastDto
{
    public DateOnly Date { get; set; }
    public double MinTemperature { get; set; }
    public double MaxTemperature { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
}
