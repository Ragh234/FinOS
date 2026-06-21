import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { BullmqService, QUEUES } from "../../shared/queues/bullmq.service";
import { PrismaService } from "../../shared/prisma/prisma.service";

@Injectable()
export class ScheduledJobsService {
  constructor(private readonly prisma: PrismaService, private readonly bullmq: BullmqService) {}

  @Cron("0 */15 * * * *")
  async enqueuePromiseBreachDetection() {
    const companies = await this.prisma.company.findMany({ select: { id: true } });
    const asOf = new Date().toISOString();
    for (const company of companies) {
      await this.bullmq.add(QUEUES.collections, "collections.promise.detect-breaches", {
        companyId: company.id,
        actorUserId: "system",
        asOf
      }, { jobId: `collections.promise.detect-breaches:${company.id}:${asOf.slice(0, 13)}` });
    }
  }

  @Cron("0 */30 * * * *")
  async enqueueNotificationDispatch() {
    const companies = await this.prisma.company.findMany({ select: { id: true } });
    for (const company of companies) {
      await this.bullmq.add(QUEUES.notifications, "notifications.dispatch", {
        companyId: company.id
      }, { jobId: `notifications.dispatch:${company.id}:${new Date().toISOString().slice(0, 16)}` });
    }
  }

  @Cron("0 0 */4 * * *")
  async enqueueCreditRefresh() {
    const profiles = await this.prisma.creditProfile.findMany({ select: { companyId: true, partyId: true } });
    for (const profile of profiles) {
      await this.bullmq.add(QUEUES.credit, "credit.profile.refresh", {
        companyId: profile.companyId,
        partyId: profile.partyId,
        actorUserId: "system"
      }, { jobId: `credit.profile.refresh:${profile.companyId}:${profile.partyId}` });
      await this.bullmq.add(QUEUES.credit, "credit.risk.refresh", {
        companyId: profile.companyId,
        partyId: profile.partyId,
        actorUserId: "system"
      }, { jobId: `credit.risk.refresh:${profile.companyId}:${profile.partyId}` });
    }
  }

  @Cron("0 */20 * * * *")
  async enqueueCollectionDashboardRefresh() {
    const companies = await this.prisma.company.findMany({ select: { id: true } });
    for (const company of companies) {
      await this.bullmq.add(QUEUES.collections, "collections.dashboard.refresh", {
        companyId: company.id
      }, { jobId: `collections.dashboard.refresh:${company.id}:${new Date().toISOString().slice(0, 13)}` });
    }
  }
}

