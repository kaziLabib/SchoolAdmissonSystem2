
namespace SchoolAdmissionSystem.Models
{
    public class SchoolClass
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();

        public string Name { get; set; } = string.Empty;

        public int TotalSeats { get; set; }

        public List<AdmissionHold> Holds { get; set; } = new();
    }
}
