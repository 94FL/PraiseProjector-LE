import * as t from "io-ts";
import { isRight } from "fp-ts/lib/Either";
import { PathReporter } from "io-ts/lib/PathReporter";

export function decode<T, O, I>(codec: t.Type<T, O, I>, value: I): T {
  const validation = codec.decode(value);
  if (isRight(validation)) {
    return validation.right;
  } else {
    throw new Error(PathReporter.report(validation).join("\\n"));
  }
}

export function parseAndDecode<T, O, I>(codec: t.Type<T, O, I>, jsonString: string): T {
  try {
    const json = JSON.parse(jsonString);
    return decode(codec, json);
  } catch (e: any) {
    throw new Error(`Failed to parse JSON: ${e.message}`);
  }
}
