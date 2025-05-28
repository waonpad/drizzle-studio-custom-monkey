/**
 * @description
 * DBに格納するダミーデータを作成するためのジェネレータを定義する
 * テストおよびシーディングで利用する
 * https://github.com/thoughtbot/fishery
 */

import { faker } from "@faker-js/faker";
import { Factory } from "fishery";
import { nanoid } from "nanoid";
import type { PostModel } from "../../../db/schemas/posts";
import type { UserModel } from "../../../db/schemas/users";

export const userFixture = Factory.define<UserModel>(() => {
  return {
    id: nanoid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    emailVerified: false,
    image: faker.image.avatar(),
    createdAt: new Date("2024-01-01").toISOString(),
    updatedAt: new Date("2025-01-01").toISOString(),
  };
});

export const postFixture = Factory.define<PostModel>(() => {
  return {
    id: nanoid(),
    body: faker.lorem.paragraphs(3),
    authorId: userFixture.build().id,
    // 単体テストの平易化のため、createdAtとupdatedAtは固定値を設定している
    createdAt: new Date("2024-01-01").toISOString(),
    updatedAt: new Date("2025-01-01").toISOString(),
  };
});
