import "reflect-metadata";
import helmet from "helmet";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: config.get<string>("WEB_ORIGIN") ?? "http://localhost:3000",
    credentials: true
  });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1"
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  await app.listen(config.get<number>("API_PORT") ?? config.get<number>("PORT") ?? 4000);
}

void bootstrap();
