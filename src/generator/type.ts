import fs from "fs";
import path from "path";
import { parseType } from "../parse/type";
import { EventEmitter } from "../utils";

const ROOTPATH = process.cwd();
const FileMap: FileMap = new Map();

export const emitter = new EventEmitter<"Ref">();

emitter.on("Ref", (importType: string, toFile: string) => {
	FileMap.get(toFile)!.import.add(importType);
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
		const folder = schema["x-apifox-folder"] || "default"; // 没有目录文件默认放 default.d.ts
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
	await fs.promises.rm(path.resolve(ROOTPATH, "request-bus", "@types"), {
		force: true,
		recursive: true,
	});
	await fs.promises.mkdir(path.resolve(ROOTPATH, "request-bus", "@types"));

	let indexFile = "";
	FileMap.forEach(async (typeMap, fileName) => {
		console.log(`🚀: 正在生成${fileName}.d.ts 类型文件...`);
		let result = "";
		indexFile += 'export * from "./' + fileName + '"\n';
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
					fileName +
					'"\n';
			}
			result += imports + "\n";
		}
		result += typeMap.content;
		await fs.promises.writeFile(
			path.resolve(ROOTPATH, "request-bus", "@types", `${fileName}.d.ts`),
			result,
			{
				encoding: "utf-8",
			}
		);
	});
	console.log(`🚀: 正在生成index.d.ts 类型文件...`);
	await fs.promises.writeFile(
		path.resolve(ROOTPATH, "request-bus", "@types", `index.d.ts`),
		indexFile,
		{
			encoding: "utf-8",
		}
	);
	console.log("✅: 生成.d.ts类型文件成功");
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
