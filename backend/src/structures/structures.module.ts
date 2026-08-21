import { Module, forwardRef } from "@nestjs/common";
import { StructuresService } from "./structures.service";
import { StructuresResolver } from "./structures.resolver";
import { DetectionsModule } from "../detections/detections.module";

@Module({
  imports: [forwardRef(() => DetectionsModule)],
  providers: [StructuresService, StructuresResolver],
  exports: [StructuresService],
})
export class StructuresModule {}
