export type ErrorCode =
  | "invalid_input"
  | "unknown_city"
  | "ambiguous_city"
  | "forecast_unavailable"
  | "attraction_source_unavailable";

export interface CityCandidate {
  name: string;
  name_zh: string;
  adcode: string;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly candidates?: CityCandidate[];

  constructor(
    code: ErrorCode,
    message: string,
    status: number,
    candidates?: CityCandidate[],
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    if (candidates) this.candidates = candidates;
  }

  static invalidInput(
    message = "Please provide a valid city name (up to 64 characters).",
  ): AppError {
    return new AppError("invalid_input", message, 400);
  }

  static unknownCity(
    message = "We couldn't find that city. Please check the spelling and try again.",
  ): AppError {
    return new AppError("unknown_city", message, 400);
  }

  static ambiguousCity(candidates: CityCandidate[]): AppError {
    return new AppError(
      "ambiguous_city",
      "Multiple cities match. Please choose one of the candidates.",
      400,
      candidates,
    );
  }

  static forecastUnavailable(
    message = "We're having trouble retrieving the weather right now. Please try again in a moment.",
  ): AppError {
    return new AppError("forecast_unavailable", message, 503);
  }

  static attractionSourceUnavailable(
    message = "We're having trouble retrieving attractions right now. Please try again in a moment.",
  ): AppError {
    return new AppError("attraction_source_unavailable", message, 503);
  }
}
