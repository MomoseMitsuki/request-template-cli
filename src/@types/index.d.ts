type singleType = "string" | "integer" | "boolean" | "number" | "null" | "any";
type ApiFoxType = singleType | "array" | "object";
type RequestMethod =
	| "GET"
	| "POST"
	| "PUT"
	| "DELETE"
	| "OPTIONS"
	| "HEAD"
	| "PATCH";

interface TypeMap {
	types: Set<string>;
	import: Set<string>;
	content: string;
}

type FileMap = Map<string, TypeMap>;

interface FormatAPI {
	method: string;
	name: string;
	path: string;
	parameters: Array<Parameter>;
	folder: string;
    Retry: number;
	Parallel: number;
	Idempotent: string;
	Cache: string;
	Serial: string;
	requestBody?: string;
	responseBody?: string;
}

interface Parameter {
	name: string;
	in: string;
	description: string;
	required: boolean;
	schema: string;
}
