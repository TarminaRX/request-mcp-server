import { password } from "bun";
import { Impit, type HttpMethod } from "impit";
import { CookieJar } from "tough-cookie";
import { extractBetween } from "./utils";

export type XResponse = {
  authStored?: boolean
  status_code?: number
  // raw_body returns [Object ...]. When printing in console.log
  raw_body?: string | Record<string, any>
  raw_headers?: string | Record<string, any>
  network_error?: string
}

export type XParams = {
  endpoint: string
  method: string
  useStoredAuth: boolean
  headers?: object 
  body?: object
}

class XRest {
  #apiBase?: string;
  #authTok?: string;
  #session?: Impit;

  createNewSession() {
    this.#session = new Impit({
      browser: "chrome",
      ignoreTlsErrors: true,
      cookieJar: new CookieJar(),
      timeout: 60000
    })
  }

  getApiBase() {
    return this.#apiBase;
  }
  
  setApiBase(url: string) {
    this.#apiBase = url;
  }

  async sendRequest(params: XParams) {
    if (this.#session === undefined) {
      this.createNewSession();
    }

    try {
      const response = await this.#session!.fetch((this.#apiBase ?? "") + params.endpoint, {
        method: params.method as HttpMethod,
        headers: {
          ...(params.headers as Headers ?? {}),
          ...((params.useStoredAuth && this.#authTok) ? {"Authorization": "Bearer " + this.#authTok} : {})
        },
        body: JSON.stringify(params.body ?? {})
      })

      let response_model: XResponse = {
        status_code: 200
      }

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        response_model.raw_body = (await response.json()) as Record<string, any>
      } else {
        response_model.raw_body = await response.text()
      }

      if (!response.ok) {
        response_model.status_code = response.status
      } else if (response_model.raw_body !== undefined) {
        const raw_response = response_model.raw_body
        const string_response = (typeof raw_response === 'object') ? JSON.stringify(raw_response) : raw_response

        response_model.authStored = true
        const authToken = extractBetween(string_response, `"access_token":"`, `"`)
        if (authToken !== undefined) {
          console.log("Auth Token Set!")
          this.#authTok = authToken
        }
      }

      response_model.raw_headers = response.headers.toJSON()
      return response_model
    } catch (err) {
      console.error(err)
      return {
        network_error: "Unknown error occured, network error probably!" 
      } 
    }
  }
}


// Test Part
// const sera = new XRest()
//
// sera.setApiBase("http://localhost:3000")
//
// const resOne = await sera.sendRequest({
//   endpoint: "/api/auth/login", 
//   method: "POST",
//   useStoredAuth: false,
//   body: {
//     email: "yeetsheet0414@gmail.com",
//     password: "password123"
//   }
// })
//
// const resTwo = await sera.sendRequest({
//   endpoint: "/api/auth/me", 
//   method: "GET",
//   useStoredAuth: true,
// })
//
// console.log(resTwo)
