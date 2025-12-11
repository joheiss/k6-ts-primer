import { faker } from "@faker-js/faker";

export interface UserCredentials {
  username: string;
  password: string;
}

export const setupUserCredentials = (): UserCredentials => {
    const rand = Math.floor(Math.random() * 100000);
    const username = `${faker.internet.username()}-${rand}`;
    const password = "topSecret";
    return { username, password };
}
