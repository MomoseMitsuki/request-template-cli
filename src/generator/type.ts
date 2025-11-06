import fs from "fs";
import path from "path";
import { parseType } from "../parse/type";
import { EventEmitter } from "../utils";

const ROOTPATH = process.cwd();
const FileMap: FileMap = new Map();
export const TsMap = new Map<string, Set<string>>();
export const emitter = new EventEmitter<"Ref" | "TsRef">();

emitter.on("Ref", (importType: string, toFile: string) => {
	FileMap.get(toFile)!.import.add(importType);
});

emitter.on("TsRef", (importType: string, TsFile: string) => {
	if (!TsMap.has(TsFile)) {
		TsMap.set(TsFile, new Set());
	}
	TsMap.get(TsFile)!.add(importType);
});

export const generateTypes = async () => {
	const str = await fs.promises.readFile(
		path.resolve(ROOTPATH, "openapi.json"),
		"utf-8"
	);
	const info = JSON.parse(str);
	if (!info.components && !info.components.schemas) {
		throw new Error("该接口文档不存在数据类型!");
	}
	const schemas = info.components.schemas;
	let result = "";
	for (const name in schemas) {
		const schema = schemas[name];
		let folder = schema["x-apifox-folder"] || "default"; // 没有目录文件默认放 default.d.ts
		folder += ".d.ts";
		if (!FileMap.has(folder)) {
			FileMap.set(folder, {
				import: new Set(),
				content: "",
				types: new Set(),
			});
		}
		FileMap.get(folder)!.types.add(name);
		let OneType = "";
		if (schema.type === "object") {
			// 是对象我们使用 interface 定义接口
			OneType =
				"export interface " +
				name +
				" " +
				parseType(schema, 0, folder) +
				"\n\n";
		} else {
			OneType =
				"export type " +
				name +
				" = " +
				parseType(schema, 0, folder) +
				"\n\n";
		}
		result += OneType;
		FileMap.get(folder)!.content += OneType;
	}
};

export const generateFile = async () => {
	let indexFile = "";
	FileMap.forEach(async (typeMap, fileName) => {
		console.log(`正在生成 ${fileName} 类型文件...`);
		let result = "";
		indexFile +=
			'export * from "./' +
			fileName.substring(0, fileName.length - 5) +
			'"\n';
		typeMap.import.forEach((importName) => {
			if (typeMap.types.has(importName)) {
				typeMap.import.delete(importName);
			}
		});
		if (typeMap.import.size) {
			let imports = "";

			const info = generateImportType(FileMap, typeMap.import);
			for (const fileName in info) {
				imports +=
					"import type { " +
					info[fileName].join(", ") +
					'} from "./' +
					fileName.substring(0, fileName.length - 5) +
					'"\n';
			}
			result += imports + "\n";
		}
		result += typeMap.content;
		await fs.promises.writeFile(
			path.resolve(ROOTPATH, "request-bus", "@types", `${fileName}`),
			result,
			{
				encoding: "utf-8",
			}
		);
	});
	console.log(`正在导入进 index.d.ts 文件...`);
	await fs.promises.writeFile(
		path.resolve(ROOTPATH, "request-bus", "@types", `index.d.ts`),
		indexFile,
		{
			encoding: "utf-8",
		}
	);
	console.log("生成 .d.ts 类型文件成功");
};

const generateImportType = (
	fileMap: FileMap,
	imports: Set<string>
): { [key: string]: string[] } => {
	const result = {} as any;
	imports.forEach((importName) => {
		fileMap.forEach((typeMap, fileName) => {
			if (typeMap.types.has(importName)) {
				result[fileName] === void 0
					? (result[fileName] = [importName])
					: result[fileName].push(importName);
			}
		});
	});
	return result;
};
