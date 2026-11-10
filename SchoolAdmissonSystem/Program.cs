
using Microsoft.EntityFrameworkCore;
using SchoolAdmissionSystem.Data;

var builder = WebApplication.CreateBuilder(args);

// Register API controllers
builder.Services.AddControllers();

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

// Map API endpoints
app.MapControllers();

// Start the application
app.Run();
