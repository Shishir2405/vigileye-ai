import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { join } from "path";

import { StructuresModule } from "./structures/structures.module";
import { DetectionsModule } from "./detections/detections.module";
import { AlertsModule } from "./alerts/alerts.module";
import { AuthModule } from "./auth/auth.module";
import { MlModule } from "./ml/ml.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), "src/schema.gql"),
      sortSchema: true,
      playground: true,
    }),
    // TypeOrmModule.forRoot({...}) — wired once DATABASE_URL points at a real
    // Postgres+PostGIS instance; each *.entity.ts is already TypeORM-annotated.
    AuthModule,
    StructuresModule,
    DetectionsModule,
    AlertsModule,
    MlModule,
  ],
})
export class AppModule {}
