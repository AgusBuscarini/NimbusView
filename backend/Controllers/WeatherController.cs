using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WeatherController : ControllerBase
{
    private readonly IWeatherService _weatherService;

    public WeatherController(IWeatherService weatherService)
    {
        _weatherService = weatherService;
    }

    [HttpGet("current")]
    public async Task<ActionResult<CurrentWeatherDto>> GetCurrentWeather(
        [FromQuery] double lat,
        [FromQuery] double lon
    )
    {
        if (lat < -90 || lat > 90)
        {
            return BadRequest("Latitud debe de estar entre -90 y 90");
        }
        if (lon < -180 || lon > 180)
        {
            return BadRequest("Longitud debe de estar entre -180 y 180");
        }

        try
        {
            var result = await _weatherService.GetCurrentWeatherDto(lat, lon);
            return Ok(result);
        }
        catch (ApplicationException ex)
        {
            return StatusCode(502, new { message = ex.Message });
        }
    }
}
