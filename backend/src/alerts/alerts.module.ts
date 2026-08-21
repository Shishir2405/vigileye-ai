import { Module } from "@nestjs/common";
import { AlertsService } from "./alerts.service";
import { AlertsResolver } from "./alerts.resolver";

@Module({
  providers: [AlertsService, AlertsResolver],
  exports: [AlertsService],
})
export class AlertsModule {}
