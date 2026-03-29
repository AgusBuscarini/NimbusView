namespace backend.Models;

public class RadarFramesDto
{
    public List<RadarFrameDto> Frames { get; set; } = [];
}

public class RadarFrameDto
{
    public long Id { get; set; }
    public DateTimeOffset Timestamp { get; set; }
}
