
using Microsoft.EntityFrameworkCore;
using SchoolAdmissionSystem.Models;

namespace SchoolAdmissionSystem.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(
            DbContextOptions<ApplicationDbContext> options
        ) : base(options)
        {
        }

        public DbSet<SchoolClass> SchoolClasses => Set<SchoolClass>();

        public DbSet<AdmissionHold> AdmissionHolds => Set<AdmissionHold>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<SchoolClass>()
                .HasMany(c => c.Holds)
                .WithOne(h => h.SchoolClass)
                .HasForeignKey(h => h.ClassId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<SchoolClass>()
                .Property(c => c.Name)
                .IsRequired();

            modelBuilder.Entity<AdmissionHold>()
                .Property(h => h.StudentId)
                .IsRequired();

            modelBuilder.Entity<AdmissionHold>()
                .HasIndex(h => h.ClassId);
        }
    }
}
