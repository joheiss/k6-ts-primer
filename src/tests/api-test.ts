import { faker } from "@faker-js/faker/locale/de";
import { check, group, sleep, type JSONArray } from "k6";
import { SharedArray } from "k6/data";
import http from "k6/http";
import type { Options } from "k6/options";
import Papa, { type ParseResult } from "papaparse";

let baseUrl = __ENV.BASE_URL ?? "http://localhost:8000";
let mailpitUrl = __ENV.MAILPIT_URL ?? "http://localhost:8025";

// type Crocodile = {
//   id: number;
//   name: string;
//   sex: string;
//   dateOfBirth: string;
// };

const sharedArrayForUsers: any[] = new SharedArray("data", () => {
  // Load data from a JSON file or define it directly
  return JSON.parse(open("./data/users.json"));
});
const sharedArrayForCrocodiles: any[] = new SharedArray("crocodiles", () => {
  const csv: string = open("./data/crocodiles.csv");

  const parsed = Papa.parse<ParseResult<any>>(csv, {
    delimiter: ",",
    dynamicTyping: true,
    header: true,
    skipEmptyLines: true,
  });

  const { data } = parsed;
  return data;
});

console.log("Shared users data:", sharedArrayForUsers);
console.log("Shared crocodiles data:", sharedArrayForCrocodiles);

export const options: Options = {
  vus: 1,
  iterations: 1,
  duration: "3s",
};

export default function () {
  // get all crocodiles
  const count = getAllCrocodiles();
  sleep(randomIntBetween(1, 1));

  // get crocodile by id
  const randId = Math.floor(Math.random() * 10 + 1);
  const crocodileId = Math.min(count, randId);
  console.log("Fetching crocodile with ID:", crocodileId);
  const crocodile = getCrocodileById(crocodileId);
  console.log("Fetched crocodile:", crocodile);
  sleep(randomIntBetween(1, 20));

  // register new user
  const user = registerNewUser(randomItem(sharedArrayForUsers));
  console.log("Registered user:", user);
  sleep(randomIntBetween(1, 1));

  // login with the new user
  const accessToken = loginUser(user.username, user.password);
  console.log("Logged in user, access token:", accessToken);
  sleep(randomIntBetween(1, 1));

  // send test email
  const subject = sendEmail(user.email, "k6 API Test Email");
  sleep(randomIntBetween(1, 1));

  const emailId = findEmailByToAndSubject(user.email, subject);
  console.log("Email ID:", emailId);
  sleep(randomIntBetween(1, 1));

  // get full email by Id
  const otp = getOtpFromEmail(emailId);
  console.log("Extracted OTP from email:", otp);
  sleep(randomIntBetween(1, 1));

  // add my crocodile with auth token
  const myCrocodile = addMyCrocodile(accessToken);
  console.log("Added my crocodile:", myCrocodile);
  sleep(randomIntBetween(1, 1));

  // get all my crocodiles with auth token
  getMyCrocodiles(accessToken);
  sleep(randomIntBetween(1, 1));

  // get my crocodile by id with auth token
  console.log("Fetching my crocodile with ID:", myCrocodile.id);
  const found = getMyCrocodileById(myCrocodile.id, accessToken);
  console.log("Fetched my crocodile by ID:", found);
  // update my crocodile
  myCrocodile.name = faker.person.fullName();
  const updated = updateMyCrocodile(myCrocodile, accessToken);
  console.log("Updated my crocodile:", updated);
  // update my crocodile's name only
  const newName = updated.name + " Jr.";
  const nameUpdated = updateMyCrocodilesName(
    myCrocodile.id,
    newName,
    accessToken
  );
  console.log("Updated my crocodile's name:", nameUpdated);
  // delete my crocodile by id
  deleteMyCrocodileById(myCrocodile.id, accessToken);
  sleep(randomIntBetween(1, 1));
}

// get all crocodiles and return the count
const getAllCrocodiles = (): number => {
  let count = 0;
  group("Get all crocodiles", () => {
    const requestParams = {
      headers: {
        Accept: "application/json",
      },
    };
    const res = http.get(`${baseUrl}/public/crocodiles`, requestParams);
    check(res, {
      "status is 200": (r) => r.status === 200,
      "response is not empty": (r: any) => r.body != null && r.body.length > 0,
    });
    // get response headers
    const responseHeaders = res.headers;
    console.log("Response Headers: ", JSON.stringify(responseHeaders));

    const crocodiles = res.json() as JSONArray;
    count = crocodiles.length;
    check(crocodiles, {
      "at least one crocodile": (crocodiles: any) =>
        Array.isArray(crocodiles) && crocodiles.length > 0,
    });
  });
  return count;
};

const getCrocodileById = (crocodileId: number): any => {
  let crocodile: any;
  group("Get crocodile by ID", () => {
    const res = http.get(`${baseUrl}/public/crocodiles/${crocodileId}`);
    check(res, {
      "status is 200": (r) => r.status === 200,
      "is only 1 crocodile": (r: any) => {
        const body = JSON.parse(r.body);
        return !Array.isArray(body);
      },
      "response contains crocodile": (r: any) => {
        const body = JSON.parse(r.body);
        return body && body.id === crocodileId;
      },
    });
    crocodile = res.json();
  });
  return crocodile;
};

const registerNewUser = (user: any): any => {
  const first_name = faker.person.firstName();
  const last_name = faker.person.lastName();
  const username = faker.internet.username({
    firstName: first_name,
    lastName: last_name,
  });
  const email = faker.internet.email({
    firstName: first_name,
    lastName: last_name,
  });
  const password = user.password ?? "password";

  // register new user
  group("Register a new user", () => {
    const payload = JSON.stringify({
      username,
      first_name,
      last_name,
      email,
      password,
    });
    console.log("Register payload:", payload);
    const requestParams = {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };
    const res = http.post(`${baseUrl}/user/register/`, payload, requestParams);
    check(res, {
      "status is 201": (r) => r.status === 201,
      "response contains username": (r: any) => {
        const body = JSON.parse(r.body);
        return body && body.username === username;
      },
    });
  });
  return { username, first_name, last_name, email, password };
};

const loginUser = (username: string, password: string): string => {
  let accessToken: string = "";
  group("Login with the new user", () => {
    const payload = JSON.stringify({
      username,
      password,
    });
    const requestParams = {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };
    const res = http.post(
      `${baseUrl}/auth/token/login/`,
      payload,
      requestParams
    );
    if (
      check(res, {
        "status is 200": (r) => r.status === 200,
        "response contains tokens": (r: any) => {
          const body = JSON.parse(r.body);
          return body && body.refresh && body.access;
        },
      })
    ) {
      const body = res.json() as any;
      accessToken = body?.access;
    }
    console.log("Access token:", accessToken);
  });
  return accessToken;
};

const sendEmail = (email: any, subject: string): string => {
  group("Send test email", () => {
    const payload = JSON.stringify({
      From: { Email: "no-reply@example.com" },
      To: [{ Email: email }],
      Subject: subject,
      Text: `This is a test email sent during the k6 API test. The lucky number is ${Math.floor(
        Math.random() * 100_000 + 99_999
      )}`,
    });
    const requestParams = {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };
    const res = http.post(`${mailpitUrl}/api/v1/send`, payload, requestParams);
    check(res, {
      "status is 200": (r) => r.status === 200 || r.status === 201,
    });
  });
  return subject;
};

const findEmailByToAndSubject = (toEmail: string, subject: string): any => {
  let emailId = "";
  group("Find email by To and Subject", () => {
    const query = `to:${toEmail} subject:${'"' + subject + '"'}`;
    const res = http.get(
      `${mailpitUrl}/api/v1/search?query=${encodeURIComponent(query)}&limit=1`
    );
    check(res, {
      "status is 200": (r) => r.status === 200,
      "email found": (r: any) => {
        const body = JSON.parse(r.body);
        return body && body.count === 1;
      },
      "ID found in email": (r: any) => {
        const body = JSON.parse(r.body);
        if (body && body.count === 1) {
          emailId = body.messages[0].ID;
          //   const otpMatch = email.Snippet.match(/lucky number is (\d{1,6})/)[1];
          //   console.log("OTP Match:", otpMatch);
          //   return otpMatch !== null;
          return emailId !== null;
        }
        return false;
      },
    });
    console.log(res);
  });
  return emailId;
};

function getOtpFromEmail(emailId: string): string {
  let otp: string;
  group("Get full email by ID", () => {
    const res = http.get(`${mailpitUrl}/api/v1/message/${emailId}`);
    check(res, {
      "status is 200": (r) => r.status === 200,
      "email body contains OTP": (r: any) => {
        const body = JSON.parse(r.body);
        otp = body.Text.match(/lucky number is (\d{1,6})/)[1];
        return otp !== null;
      },
    });
    console.log("Extracted OTP:", otp);
  });
  return otp!;
}

const addMyCrocodile = (accessToken: string): any => {
  let crocodile: any;
  const payload = {
    name: faker.person.fullName(),
    sex: faker.person.sex() === "weiblich" ? "F" : "M",
    date_of_birth: faker.date
      .past({ years: 30 })
      .toISOString()
      .substring(0, 10),
  };
  group("Add to my crocodiles with auth", () => {
    const requestParams = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    };
    const res = http.post(
      `${baseUrl}/my/crocodiles/`,
      JSON.stringify(payload),
      requestParams
    );
    check(res, {
      "status is 201": (r) => r.status === 201,
      "crocodile has been added": (r: any) => {
        console.log("Add crocodile response body:", r.body);
        crocodile = JSON.parse(r.body);
        return crocodile != null && !!crocodile.id;
      },
    });
  });
  return crocodile;
};

const getMyCrocodiles = (accessToken: string): any[] => {
  let crocodiles: any[] = [];
  group("Get all my crocodiles with auth", () => {
    const requestParams = {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    };
    const res = http.get(`${baseUrl}/my/crocodiles/`, requestParams);
    check(res, {
      "status is 200": (r) => r.status === 200,
      "response is not empty": (r: any) => r.body != null && r.body.length > 0,
    });
    crocodiles = res.json() as JSONArray;
    console.log("My crocodiles:", JSON.stringify(crocodiles));
    check(crocodiles, {
      "at least one crocodile": (crocodiles: any) =>
        Array.isArray(crocodiles) && crocodiles.length > 0,
    });
  });
  return crocodiles;
};

const getMyCrocodileById = (crocodileId: number, accessToken: string): any => {
  let crocodile: any;

  group("Get crocodile by ID", () => {
    const requestParams = {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    };
    const res = http.get(
      `${baseUrl}/my/crocodiles/${crocodileId}/`,
      requestParams
    );
    check(res, {
      "status is 200": (r) => r.status === 200,
      "crocodile found": (r: any) => {
        const body = JSON.parse(r.body);
        crocodile = body;
        return body && body.id === crocodileId;
      },
    });
  });
  return crocodile;
};

const updateMyCrocodile = (crocodile: any, accessToken: string): any => {
  const crocodileId = crocodile.id;
  let updatedCrocodile: any;

  group("Update crocodile", () => {
    const requestParams = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    };
    const res = http.put(
      `${baseUrl}/my/crocodiles/${crocodileId}/`,
      JSON.stringify(crocodile),
      requestParams
    );
    check(res, {
      "status is 200": (r) => r.status === 200,
      "crocodile updated": (r: any) => {
        const body = JSON.parse(r.body);
        updatedCrocodile = body;
        return updatedCrocodile && updatedCrocodile.id === crocodileId;
      },
    });
  });
  return updatedCrocodile;
};

const updateMyCrocodilesName = (
  id: number,
  name: string,
  accessToken: string
): any => {
  const updates = { name };

  let updatedCrocodile: any;

  group("Update crocodile's name", () => {
    const requestParams = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    };
    const res = http.patch(
      `${baseUrl}/my/crocodiles/${id}/`,
      JSON.stringify(updates),
      requestParams
    );
    check(res, {
      "status is 200": (r) => r.status === 200,
      "crocodile's name has been updated": (r: any) => {
        const body = JSON.parse(r.body);
        updatedCrocodile = body;
        return updatedCrocodile && updatedCrocodile.name === name;
      },
    });
  });
  return updatedCrocodile;
};

const deleteMyCrocodileById = (id: number, accessToken: string): any => {
  group("Delete crocodile's name", () => {
    const requestParams = {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    };
    const res = http.del(
      `${baseUrl}/my/crocodiles/${id}/`,
      null,
      requestParams
    );
    check(res, {
      "status is 204": (r) => r.status === 204,
    });
  });
};

const randomIntBetween = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const randomItem = (array: any[]): any => {
  const index = Math.floor(Math.random() * array.length);
  return array[index];
};
