import { ScheduledJobsService } from "./scheduled-jobs.service";

describe("ScheduledJobsService", () => {
  it("enqueues tenant-scoped promise breach detection jobs with stable hourly ids", async () => {
    const prisma = { company: { findMany: jest.fn().mockResolvedValue([{ id: "company_1" }]) } };
    const bullmq = { add: jest.fn() };
    const service = new ScheduledJobsService(prisma as never, bullmq as never);

    await service.enqueuePromiseBreachDetection();

    expect(bullmq.add).toHaveBeenCalledWith(
      "collections",
      "collections.promise.detect-breaches",
      expect.objectContaining({ companyId: "company_1", actorUserId: "system" }),
      expect.objectContaining({ jobId: expect.stringMatching(/^collections\.promise\.detect-breaches:company_1:/) })
    );
  });
});

