
using Microsoft.EntityFrameworkCore;
using SchoolAdmissionSystem.Data;

var builder = WebApplication.CreateBuilder(args);

// Register API controllers
builder.Services.AddControllers();

// Allow the React frontend to access the API
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Configure PostgreSQL database
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    var connectionString = builder.Configuration
        .GetConnectionString("DefaultConnection");

    options.UseNpgsql(connectionString);
});

var app = builder.Build();

// Redirect HTTP requests to HTTPS
app.UseHttpsRedirection();

// Enable CORS
app.UseCors("ReactFrontend");

// Map API endpoints
app.MapControllers();

// Start the application
app.Run();
