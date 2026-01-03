import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const swaggerUser = process.env.SWAGGER_USER || 'admin';
  const swaggerPassword = process.env.SWAGGER_PASSWORD || 'admin123';

  // Apply auth middleware to all /api routes FIRST
  app.use(/^\/api/, (req, res, next) => {
    const auth = req.headers.authorization;
    const credentials = Buffer.from(`${swaggerUser}:${swaggerPassword}`).toString('base64');

    if (!auth || auth !== `Basic ${credentials}`) {
      res.setHeader('WWW-Authenticate', 'Basic realm="API"');
      return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
  });

  const config = new DocumentBuilder()
    .setTitle('Game API')
    .setDescription('The Game API description')
    .setVersion('1.0')

    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Server running on http://localhost:${process.env.PORT ?? 3000}`);
}

bootstrap();