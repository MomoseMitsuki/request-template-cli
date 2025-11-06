import fs from "fs";
import path from "path";
import { ROOTPATH, PATH } from "..";
import { parseType } from "./type";

export const RequestorMap: Map<string, Set<string>> = new Map();
const Requestors = ["Retry", "Parallel", "Idempotent", "Cache", "Serial"];

export const parseAPI = async () => {
	const result: Array<FormatAPI> = [];
	const JsonString = await fs.promises.readFile(path.resolve(ROOTPATH, PATH), {
		encoding: "utf-8",
	});
	const { paths } = JSON.parse(JsonString);
	for (const path in paths) {
		const requests = paths[path];
		for (const method in requests) {
			// todo: 可能请求体多种多样 multipart/form-data application/x-www-form-urlencoded 后面会判断分情况讨论生成
			const requestBodySchema = requests[method]?.requestBody?.content?.["application/json"]?.schema;
			const responses = requests[method]?.responses;
			let folder = requests[method]["x-apifox-folder"] ? requests[method]["x-apifox-folder"] : "default";
			folder += ".ts";
			let responseBody = "";
			if (responses) {
				for (const status in responses) {
					const responseSchema = responses[status]?.content?.["application/json"]?.schema;
					if (!responseSchema) break;
					const responseType = parseType(responseSchema, 0, folder);
					responseBody += responseType + " | ";
				}
			}
			for (const parameter of requests[method].parameters) {
				parameter.schema = parseType(parameter.schema, 0, folder);
			}
			responseBody = responseBody.substring(0, responseBody.length - 3);
			const formatApi: FormatAPI = {
				method,
				name: requests[method].summary,
				path,
				folder,
				parameters: requests[method].parameters,
				Retry: requests[method]["x-retry"] || 0,
				Parallel: requests[method]["x-parallel"] || 0,
				Idempotent: requests[method]["x-idempotent"] || "false",
				Cache: requests[method]["x-cache"] || "false",
				Serial: requests[method]["x-serial"] || "false",
				requestBody: requestBodySchema ? parseType(requestBodySchema, 0, folder) : void 0,
				responseBody: responseBody ? responseBody : void 0,
			};
			if (!RequestorMap.has(folder)) {
				RequestorMap.set(folder, new Set());
			}
			type FormatAPIKey = keyof FormatAPI;
			for (const k in formatApi) {
				const key = k as FormatAPIKey;
				if (Requestors.includes(key) && formatApi[key] !== 0 && formatApi[key] !== "false") {
					RequestorMap.get(folder)!.add(`create${key}Requestor`);
				}
			}
			result.push(formatApi);
		}
	}
	return result;
};
