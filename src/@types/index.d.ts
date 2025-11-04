type singleType = "string" | "integer" | "boolean" | "number" | "null" | "any";

type ApiFoxType = singleType | "array" | "object";

interface TypeMap {
	types: Set<string>;
	import: Set<string>;
	content: string;
}

type FileMap = Map<string, TypeMap>;
