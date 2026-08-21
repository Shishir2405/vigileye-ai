import { Module, forwardRef } from "@nestjs/common";
import { DetectionsService } from "./detections.service";
import { DetectionsResolver } from "./detections.resolver";
import { StructuresModule } from "../structures/structures.module";

@Module({
  imports: [forwardRef(() => StructuresModule)],
  providers: [DetectionsService, DetectionsResolver],
  exports: [DetectionsService],
})
export class DetectionsModule {}
