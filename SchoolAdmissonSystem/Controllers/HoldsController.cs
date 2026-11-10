
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolAdmissionSystem.Data;
using SchoolAdmissionSystem.Models;
using System.Data;

namespace SchoolAdmissionSystem.Controllers;

[ApiController]
[Route("classes/{classId}/holds")]
public class HoldsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _configuration;

    public HoldsController(
        ApplicationDbContext db,
        IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    // POST /classes/{classId}/holds
    // Reserve a seat temporarily.
    [HttpPost]
    public async Task<IActionResult> CreateHold(
        string classId,
        [FromHeader(Name = "X-Student-Id")] string? studentId)
    {
        if (!IsValidStudentId(studentId))
        {
            return BadRequest(new
            {
                message = "A valid 17-digit student ID is required."
            });
        }

        var duration = _configuration.GetValue<int?>(
            "HOLD_DURATION_SECONDS") ?? 600;

        if (duration <= 0)
            duration = 600;

        await using var transaction =
            await _db.Database.BeginTransactionAsync(
                IsolationLevel.ReadCommitted);

        // Lock the class row to prevent concurrent overbooking.
        var schoolClass = await _db.SchoolClasses
            .FromSqlInterpolated(
                $@"SELECT * FROM ""SchoolClasses""
                   WHERE ""Id"" = {classId}
                   FOR UPDATE")
            .SingleOrDefaultAsync();

        if (schoolClass == null)
        {
            return NotFound(new
            {
                message = "Class not found."
            });
        }

        var now = DateTime.UtcNow;

        // Confirmed seats and unexpired holds occupy capacity.
        var occupiedSeats = await _db.AdmissionHolds
            .CountAsync(h =>
                h.ClassId == classId &&
                (h.Status == "CONFIRMED" ||
                 (h.Status == "HELD" &&
                  h.ExpiresAt > now)));

        if (occupiedSeats >= schoolClass.TotalSeats)
        {
            return Conflict(new
            {
                message = "No seats are available."
            });
        }

        var hold = new AdmissionHold
        {
            ClassId = classId,
            StudentId = studentId!,
            Status = "HELD",
            ExpiresAt = now.AddSeconds(duration)
        };

        _db.AdmissionHolds.Add(hold);

        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return StatusCode(201, new
        {
            holdId = hold.Id,
            classId = hold.ClassId,
            studentId = hold.StudentId,
            status = hold.Status,
            expiresAt = hold.ExpiresAt
        });
    }

    // GET /holds/{holdId}
    // Check the current status of a hold.
    [HttpGet("/holds/{holdId}")]
    public async Task<IActionResult> GetHold(
        string holdId,
        [FromHeader(Name = "X-Student-Id")] string? studentId)
    {
        if (!IsValidStudentId(studentId))
        {
            return BadRequest(new
            {
                message = "A valid 17-digit student ID is required."
            });
        }

        var hold = await _db.AdmissionHolds
            .AsNoTracking()
            .SingleOrDefaultAsync(h => h.Id == holdId);

        if (hold == null)
        {
            return NotFound(new
            {
                message = "Hold not found."
            });
        }

        if (hold.StudentId != studentId)
        {
            return StatusCode(403, new
            {
                message = "This hold belongs to another student."
            });
        }

        var status = hold.Status;

        // Expired holds no longer reserve seats.
        if (status == "HELD" &&
            hold.ExpiresAt <= DateTime.UtcNow)
        {
            status = "EXPIRED";
        }

        return Ok(new
        {
            holdId = hold.Id,
            classId = hold.ClassId,
            status,
            expiresAt = hold.ExpiresAt
        });
    }

    // POST /holds/{holdId}/confirm
    // Confirm an active admission hold.
    [HttpPost("/holds/{holdId}/confirm")]
    public async Task<IActionResult> ConfirmHold(
        string holdId,
        [FromHeader(Name = "X-Student-Id")] string? studentId)
    {
        if (!IsValidStudentId(studentId))
        {
            return BadRequest(new
            {
                message = "A valid 17-digit student ID is required."
            });
        }

        await using var transaction =
            await _db.Database.BeginTransactionAsync(
                IsolationLevel.ReadCommitted);

        // Lock the hold to prevent simultaneous updates.
        var hold = await _db.AdmissionHolds
            .FromSqlInterpolated(
                $@"SELECT * FROM ""AdmissionHolds""
                   WHERE ""Id"" = {holdId}
                   FOR UPDATE")
            .SingleOrDefaultAsync();

        if (hold == null)
        {
            return NotFound(new
            {
                message = "Hold not found."
            });
        }

        if (hold.StudentId != studentId)
        {
            return StatusCode(403, new
            {
                message = "This hold belongs to another student."
            });
        }

        if (hold.Status == "CONFIRMED")
        {
            return Conflict(new
            {
                message = "This hold is already confirmed."
            });
        }

        if (hold.Status != "HELD" ||
            hold.ExpiresAt <= DateTime.UtcNow)
        {
            return Conflict(new
            {
                message = "This hold is no longer active."
            });
        }

        hold.Status = "CONFIRMED";

        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new
        {
            holdId = hold.Id,
            classId = hold.ClassId,
            status = hold.Status,
            message = "Admission confirmed successfully."
        });
    }

    // DELETE /holds/{holdId}
    // Cancel an active hold and release its seat.
    [HttpDelete("/holds/{holdId}")]
    public async Task<IActionResult> CancelHold(
        string holdId,
        [FromHeader(Name = "X-Student-Id")] string? studentId)
    {
        if (!IsValidStudentId(studentId))
        {
            return BadRequest(new
            {
                message = "A valid 17-digit student ID is required."
            });
        }

        await using var transaction =
            await _db.Database.BeginTransactionAsync(
                IsolationLevel.ReadCommitted);

        // Lock the hold to prevent simultaneous updates.
        var hold = await _db.AdmissionHolds
            .FromSqlInterpolated(
                $@"SELECT * FROM ""AdmissionHolds""
                   WHERE ""Id"" = {holdId}
                   FOR UPDATE")
            .SingleOrDefaultAsync();

        if (hold == null)
        {
            return NotFound(new
            {
                message = "Hold not found."
            });
        }

        if (hold.StudentId != studentId)
        {
            return StatusCode(403, new
            {
                message = "This hold belongs to another student."
            });
        }

        if (hold.Status == "CONFIRMED")
        {
            return Conflict(new
            {
                message = "A confirmed admission cannot be cancelled."
            });
        }

        if (hold.Status != "HELD" ||
            hold.ExpiresAt <= DateTime.UtcNow)
        {
            return Conflict(new
            {
                message = "This hold is no longer active."
            });
        }

        hold.Status = "CANCELLED";

        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new
        {
            holdId = hold.Id,
            status = hold.Status,
            message = "Hold cancelled successfully."
        });
    }

    // Validate a 17-digit student registration ID.
    private static bool IsValidStudentId(string? studentId)
    {
        return !string.IsNullOrWhiteSpace(studentId)
            && studentId.Length == 17
            && studentId.All(c => c >= '0' && c <= '9');
    }
}
