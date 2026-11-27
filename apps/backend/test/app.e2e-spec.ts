import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0, '127.0.0.1');
  });

  it('/ (GET)', async () => {
    const response = await fetch(await app.getUrl());
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('Hello World!');
  });

  afterEach(async () => {
    await app.close();
  });
});
