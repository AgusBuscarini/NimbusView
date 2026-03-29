using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WeatherController : ControllerBase
{
    private static readonly byte[] TransparentPngTile = Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg=="
    );

    private static readonly HashSet<string> AllowedLayerNames =
    [
        "clouds_new",
        "precipitation_new",
        "wind_new",
    ];

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

    [HttpGet("forecast")]
    public async Task<ActionResult<WeatherForecastDto>> GetForecast(
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
            var result = await _weatherService.GetForecastDto(lat, lon);
            return Ok(result);
        }
        catch (ApplicationException ex)
        {
            return StatusCode(502, new { message = ex.Message });
        }
    }

    [HttpGet("layers/{layer}/{z:int}/{x:int}/{y:int}.png")]
    public async Task<IActionResult> GetLayerTile(
        string layer,
        int z,
        int x,
        int y,
        CancellationToken cancellationToken
    )
    {
        if (!AllowedLayerNames.Contains(layer))
        {
            return BadRequest("La capa solicitada no es valida");
        }

        if (z is < 0 or > 18)
        {
            return BadRequest("El nivel de zoom no es valido");
        }

        if (x < 0 || y < 0)
        {
            return BadRequest("Las coordenadas del tile no son validas");
        }

        try
        {
            var tile = await _weatherService.GetLayerTileAsync(layer, z, x, y, cancellationToken);
            return File(tile.Content, tile.ContentType);
        }
        catch (ApplicationException)
        {
            HttpContext.Response.Headers.Append("X-Tile-Error", "1");
            return File(TransparentPngTile, "image/png");
        }
    }

    [HttpGet("radar/frames")]
    public async Task<ActionResult<RadarFramesDto>> GetRadarFrames(CancellationToken cancellationToken)
    {
        try
        {
            var frames = await _weatherService.GetRadarFramesAsync(cancellationToken);
            return Ok(frames);
        }
        catch (ApplicationException ex)
        {
            return StatusCode(502, new { message = ex.Message });
        }
    }

    [HttpGet("radar/{frameId:long}/{z:int}/{x:int}/{y:int}.png")]
    public async Task<IActionResult> GetRadarTile(
        long frameId,
        int z,
        int x,
        int y,
        CancellationToken cancellationToken
    )
    {
        if (z is < 0 or > 18)
        {
            return BadRequest("El nivel de zoom no es valido");
        }

        if (x < 0 || y < 0)
        {
            return BadRequest("Las coordenadas del tile no son validas");
        }

        try
        {
            var tile = await _weatherService.GetRadarTileAsync(frameId, z, x, y, cancellationToken);
            return File(tile.Content, tile.ContentType);
        }
        catch (ApplicationException)
        {
            HttpContext.Response.Headers.Append("X-Tile-Error", "1");
            return File(TransparentPngTile, "image/png");
        }
    }
}
