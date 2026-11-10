
namespace SchoolAdmissionSystem.Models
{
    public class AdmissionHold
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();

        public string ClassId { get; set; } = string.Empty;

        public SchoolClass SchoolClass { get; set; } = null!;

        public string StudentId { get; set; } = string.Empty;

        public string Status { get; set; } = "HELD";

        public DateTime ExpiresAt { get; set; }
    }
}
