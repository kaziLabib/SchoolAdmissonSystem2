
using Microsoft.AspNetCore.Mvc;

namespace SchoolAdmissonSystem.Controllers
{
    [ApiController]
    [Route("api/health")]
    public class HealthController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetHealth()
        {
            return Ok(new
            {
                status = "Healthy",
                application = "School Admission System"
            });
        }
    }
}
