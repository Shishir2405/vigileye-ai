import { Field, ID, ObjectType } from "@nestjs/graphql";
import { Severity } from "../common/enums";

/**
 * Alerts are produced by severity-tracking logic (see MlModule) whenever a
 * detection crosses a severity threshold, and consumed here by the dashboard
 * inbox and, in production, the notification service (push/email/SMS/webhook
 * fan-out) — folded into this single NestJS app for now rather than split
 * into the PRD's separate microservices.
 */
@ObjectType()
export class Alert {
  @Field(() => ID)
  id: string;

  @Field()
  structureId: string;

  @Field()
  structureName: string;

  @Field()
  detectionId: string;

  @Field(() => Severity)
  severity: Severity;

  @Field()
  message: string;

  @Field()
  createdAt: string;

  @Field()
  acknowledged: boolean;
}
