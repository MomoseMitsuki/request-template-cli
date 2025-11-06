#!/usr/bin/env node
import { generateTypes, generateFile } from "./generator/type";
import { generateAPI } from "./generator/api";
import { parseAPI } from "./parse/api";
import fs from "fs";
import path from "path";

export const ROOTPATH = process.cwd();
export const PATH = "openapi.json";

const clearFile = async () => {
	if (fs.existsSync(path.resolve(ROOTPATH, "request-bus"))) {
		await fs.promises.rm(path.resolve(ROOTPATH, "request-bus"), {
			force: true,
			recursive: true,
		});
	}
	await fs.promises.mkdir(path.resolve(ROOTPATH, "request-bus"));
	await fs.promises.mkdir(path.resolve(ROOTPATH, "request-bus/template"));
	await fs.promises.mkdir(path.resolve(ROOTPATH, "request-bus/patch"));
	await fs.promises.mkdir(path.resolve(ROOTPATH, "request-bus/@types"));
};

const generateAPIFile = async () => {
	await clearFile();
	await generateTypes();
	await generateFile();
	const formatedAPIs = await parseAPI();
	await generateAPI(formatedAPIs);
};
generateAPIFile();
