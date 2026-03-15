export type JSONPrimitive = string | number | boolean | null;
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;
export type JSONObject = { [member: string]: JSONValue };

export type JSONArray = JSONValue[];

export type ResultCallback = (result: string, ppHeaders: { [key: string]: string }) => void;
export type ErrorCallback = (error: Error) => void;

declare let ActiveXObject: new (type: string) => XMLHttpRequest;
const runningRequests = new Map<XMLHttpRequest, ErrorCallback>();

const fixedHeaders = new Map<string, string>();
export function setFixedHeader(name: string, value: string) {
  fixedHeaders.set(name, value);
}

let authorization = "";
export function setAuthorizationHeader(s: string) {
  authorization = s;
}

export function getAuthorizationHeader() {
  return authorization;
}

export function isAuthed() {
  return !!authorization;
}

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

function isRetryableStatus(status: number) {
  return status === 429 || status === 503;
}

function getRetryDelay(xhr: XMLHttpRequest, attempt: number) {
  const retryAfter = xhr.getResponseHeader("Retry-After");
  if (retryAfter) {
    const seconds = parseInt(retryAfter);
    if (!isNaN(seconds)) return seconds * 1000;
  }
  return BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
}

export function sendHttpRequest(
  url: string,
  cb: ResultCallback,
  errcb: ErrorCallback,
  postData?: Map<string, string> | JSONValue,
  accept?: string,
  extraHeaders?: Map<string, string>
) {
  let attempt = 0;

  function doRequest() {
    const xhttp = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");

    xhttp.onreadystatechange = function () {
      if (this.readyState === 4) {
        const existed = runningRequests.delete(this);
        if (existed) {
          if (this.status === 200) {
            if (cb)
              cb(
                this.responseText,
                this.getAllResponseHeaders()
                  .split("\n")
                  .reduce(
                    (headers, line) => {
                      const parts = line.split(":");
                      if (parts.length === 2) {
                        const key = parts[0].toLowerCase().trim();
                        const value = parts[1].trim();
                        if (key.startsWith("x-pp-")) headers[key.substring(5)] = value;
                      }
                      return headers;
                    },
                    {} as { [key: string]: string }
                  )
              );
            else console.log("Http response arrived");
          } else if (isRetryableStatus(this.status) && attempt < MAX_RETRIES) {
            const delay = getRetryDelay(this, attempt++);
            console.log(`Server returned ${this.status}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
            setTimeout(doRequest, delay);
          } else {
            if (this.status == 401) authorization = "";
            if (errcb) errcb(new Error(String(this.status)));
          }
        }
      }
    };

    let params: string | undefined;
    if (postData) {
      xhttp.open("POST", url, true);
      if (postData instanceof Map) {
        xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        const sa: string[] = [];
        postData.forEach((value, key) => sa.push(encodeURIComponent(key) + "=" + encodeURIComponent(value)));
        params = sa.join("&");
      } else {
        xhttp.setRequestHeader("Content-type", "application/json");
        if (!accept) accept = "application/json";
        params = JSON.stringify(postData);
      }
    } else xhttp.open("GET", url, true);
    for (const [key, value] of fixedHeaders) xhttp.setRequestHeader(key, value);
    if (extraHeaders) {
      for (const [key, value] of extraHeaders) xhttp.setRequestHeader(key, value);
    }
    if (authorization) xhttp.setRequestHeader("Authorization", authorization);
    if (accept) xhttp.setRequestHeader("Accept", accept);
    xhttp.send(params);
    runningRequests.set(xhttp, errcb);
    return xhttp;
  }

  return doRequest();
}

export function abortAllRequests() {
  while (runningRequests.size > 0) {
    for (const [xhttp, errcb] of runningRequests.entries()) {
      if (xhttp instanceof XMLHttpRequest)
        try {
          xhttp.abort();
        } catch {
          // Ignored: abort can throw if request already completed.
        }
      try {
        errcb(Error("Aborted"));
      } catch {
        // Ignored: callback failures should not block cleanup.
      }
      runningRequests.delete(xhttp);
      break;
    }
  }
}
