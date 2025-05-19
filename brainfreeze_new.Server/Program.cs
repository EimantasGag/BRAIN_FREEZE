using brainfreeze_new.Server.Models;
using Microsoft.EntityFrameworkCore;
using brainfreeze_new.Server.Services; // Add this if AchievementService is in the Services namespace

var builder = WebApplication.CreateBuilder(args);

// Accessing the connection string from appsettings.json
var frontendUrlPub = builder.Configuration["Frontend:UrlPub"];
var frontendUrlPriv = builder.Configuration["Frontend:UrlPriv"];
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(frontendUrlPub, frontendUrlPriv)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });

    options.AddPolicy("AllowLocalhost", policy =>
    {
        policy.WithOrigins(
            "https://localhost:7005", // Swagger UI
            "https://localhost:5173"  // Frontend
        )
        .AllowAnyHeader()
        .AllowAnyMethod();
    });
});

builder.Services.AddControllers();


builder.Services.AddControllers();

// Registering the DbContext with the connection string
builder.Services.AddDbContext<ScoreboardDBContext>(options =>
    options.UseNpgsql(connectionString));

// Registering the AchievementService
builder.Services.AddScoped<AchievementService>();

// Add Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();
app.Urls.Add("https://0.0.0.0:7005");



app.UseDefaultFiles();
app.UseStaticFiles();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseRouting();

app.UseCors("AllowFrontend");
app.UseCors("AllowLocalhost");

app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();
