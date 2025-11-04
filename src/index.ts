import { generateTypes, generateFile } from "./generator/type";

const generateDTS = async () => {
	await generateTypes();
	await generateFile();
};

generateDTS();
