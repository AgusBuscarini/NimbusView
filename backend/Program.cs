using backend.Options;
using backend.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.Configure<OpenWeatherOptions>(
    builder.Configuration.GetSection(OpenWeatherOptions.SectionName)
);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddMemoryCache();

builder.Services.AddHttpClient<IWeatherService, WeatherService>(
    (sp, client) =>
    {
        var options =
            sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<OpenWeatherOptions>>().Value;

        client.BaseAddress = new Uri(options.BaseUrl);
    }
);

builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "frontend",
        policy =>
        {
            var allowedOrigins =
                builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
                ?? new[] { "http://localhost:5173" };

            policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod();
        }
    );
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("frontend");
app.UseAuthorization();
app.MapControllers();

app.UseHttpsRedirection();

app.Run();
