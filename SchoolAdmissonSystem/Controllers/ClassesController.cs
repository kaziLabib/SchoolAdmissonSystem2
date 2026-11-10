
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolAdmissionSystem.Data;
using SchoolAdmissionSystem.Models;

namespace SchoolAdmissionSystem.Controllers;

[ApiController]
[Route("classes")]
public class ClassesController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public ClassesController(ApplicationDbContext db)
    {
        _db = db;
    }

    // POST /classes
    [HttpPost]
    public async Task<IActionResult> CreateClass(
        [FromBody] CreateClassRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) ||
            request.TotalSeats <= 0)
        {
            return BadRequest(new
            {
                message = "A class name and positive seat count are required."
            });
        }

        var schoolClass = new SchoolClass
        {
            Name = request.Name.Trim(),
            TotalSeats = request.TotalSeats
        };

        _db.SchoolClasses.Add(schoolClass);
        await _db.SaveChangesAsync();

        return StatusCode(201, new
        {
            id = schoolClass.Id,
            name = schoolClass.Name,
            totalSeats = schoolClass.TotalSeats
        });
    }

    // GET /classes
    [HttpGet]
    public async Task<IActionResult> GetClasses()
    {
        var now = DateTime.UtcNow;

        var classes = await _db.SchoolClasses
            .AsNoTracking()
            .Select(c => new
            {
                id = c.Id,
                name = c.Name,
                totalSeats = c.TotalSeats,
                heldSeats = c.Holds.Count(h =>
                    h.Status == "HELD" && h.ExpiresAt > now),
                confirmedSeats = c.Holds.Count(h =>
                    h.Status == "CONFIRMED")
            })
            .ToListAsync();

        var result = classes.Select(c => new
        {
            c.id,
            c.name,
            c.totalSeats,
            c.heldSeats,
            c.confirmedSeats,
            availableSeats = c.totalSeats -
                             c.heldSeats -
                             c.confirmedSeats
        });

        return Ok(result);
    }

    // GET /classes/{classId}
    [HttpGet("{classId}")]
    public async Task<IActionResult> GetClass(string classId)
    {
        var now = DateTime.UtcNow;

        var schoolClass = await _db.SchoolClasses
            .AsNoTracking()
            .Where(c => c.Id == classId)
            .Select(c => new
            {
                id = c.Id,
                name = c.Name,
                totalSeats = c.TotalSeats,
                heldSeats = c.Holds.Count(h =>
                    h.Status == "HELD" && h.ExpiresAt > now),
                confirmedSeats = c.Holds.Count(h =>
                    h.Status == "CONFIRMED")
            })
            .FirstOrDefaultAsync();

        if (schoolClass == null)
        {
            return NotFound(new { message = "Class not found." });
        }

        return Ok(new
        {
            schoolClass.id,
            schoolClass.name,
            schoolClass.totalSeats,
            schoolClass.heldSeats,
            schoolClass.confirmedSeats,
            availableSeats = schoolClass.totalSeats -
                             schoolClass.heldSeats -
                             schoolClass.confirmedSeats
        });
    }
}

public class CreateClassRequest
{
    public string Name { get; set; } = string.Empty;
    public int TotalSeats { get; set; }
}
