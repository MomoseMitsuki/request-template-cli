import fs from "fs";
import path from "path";
import { TsMap } from "./type";
import { ROOTPATH } from "..";
import { RequestorMap } from "../parse/api";

const generateTemplateAPI = (api: FormatAPI) => {
	let params = "";
	let paramsNoType = "";
	for (const parameter of api.parameters) {
		if (parameter.in === "query") {
			params += parameter.name + ": " + parameter.schema + ", ";
			paramsNoType += parameter.name + ", ";
		}
	}
	params = params.substring(0, params.length - 2);
	paramsNoType = paramsNoType.substring(0, paramsNoType.length - 2);
	let template = "export const " + api.name + " = (() => {\n";
	if (api.Retry && typeof api.Retry === "number") {
		template += `\tconst req = createRetryRequestor(${api.Retry})\n`;
	} else if (api.Parallel && typeof api.Retry === "number") {
		template += `\tconst req = createParallelRequestor(${api.Parallel})\n`;
	} else if (typeof api.Cache === "string" && api.Cache !== "false") {
		template += `\tconst req = createCacheRequestor(${api.Parallel})\n`;
	} else if (typeof api.Idempotent === "string" && api.Idempotent !== "false") {
		template += `\tconst req = createIdempotentRequestor()\n`;
	} else if (typeof api.Serial === "string" && api.Serial !== "false") {
		template += `\tconst req = createSerialRequestor()\n`;
	}
	template += "\treturn async (";
	template += params ? params : "";
	template += api.requestBody ? "data: " + api.requestBody : "";
	template += ") => {\n";
	template += "\t\treturn req." + api.method + "('" + api.path + "'";
	template += paramsNoType ? ",{\n\t\t\tparams: { " + paramsNoType + " }\n\t\t}" : "";
	template += api.requestBody ? ",data" : "";
	template += ").then(resp => resp.json";
	template += api.responseBody && api.responseBody !== "{\n}" ? `<${api.responseBody}>` : "";
	template += "())\n";
	template += "\t}\n";
	template += "})()\n\n";
	return template;
};

export const generateAPI = async (apis: Array<FormatAPI>) => {
	let indexFile = "";
	TsMap.forEach(async (importSet, filename) => {
		let imports = "import type { " + [...importSet].join(", ") + ' } from "../@types"\n';
		imports += `import { requestor } from "../../request-imp/request-fetch-imp"\n`;
		const importReq = RequestorMap.get(filename) || [];
		imports += `import { inject, useRequestor, ${[...importReq].join(", ")} } from "../../request-core"\n\n`;
		imports += "inject(requestor)\n";
		imports += "const req = useRequestor()\n\n";
		indexFile += 'export * from "./' + filename.substring(0, filename.length - 3) + '"\n';
		console.log(`正在生成 ${filename} 接口文件...`);
		await fs.promises.writeFile(path.resolve(ROOTPATH, "request-bus/template", filename), imports, {
			encoding: "utf-8",
		});
	});
	for (const api of apis) {
		const filePath = path.resolve(ROOTPATH, "request-bus/template", api.folder);
		if (!fs.existsSync(filePath)) {
			indexFile += 'export * from "./' + api.folder.substring(0, api.folder.length - 3) + '"\n';
			console.log(`正在生成 ${api.folder} 接口文件...`);
			await fs.promises.writeFile(filePath, "", { encoding: "utf-8" });
		}
		const template = generateTemplateAPI(api);
		await fs.promises.appendFile(filePath, template, {
			encoding: "utf-8",
		});
	}
	console.log(`正在导入进 index.ts 文件...`);
	await fs.promises.writeFile(path.resolve(ROOTPATH, "request-bus/template/index.ts"), indexFile, {
		encoding: "utf-8",
	});
	console.log("生成 ts 接口文件成功");
};
