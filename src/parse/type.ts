import { emitter } from "../generator/type";

// 为了生成对象类型的美观,我们会用此函数处理对象缩进问题(我艹我忘了其实可以用prettier QAQ)
const loopPrint = (str: string, loop: number = 1): string => {
	let result = "";
	if (loop <= 0) {
		return result;
	}
	for (let i = 0; i < loop; i++) {
		result += str;
	}
	return result;
};

/**
 *
 * @param obj 解析的对象
 * @param required 必须携带的参数
 * @param level 嵌套的层级
 * @param fileName 当前类型所处的文件目录
 * @returns 一个格式化好的对象类型
 * @description 传入一个 schema 的 properties, 将其转换为TS类型字符串并返回
 */
export const parseObject = (
	obj: { [key: string]: any },
	required: Array<string> = [],
	level = 1,
	fileName: string
): string => {
	let result = "{\n";
	for (const prop in obj) {
		// 获取这个对象的属性名
		let type = obj[prop].type;
		result += loopPrint("\t", level);
		result += prop + (required.includes(prop) ? "" : "?") + ": ";
		type = parseType(obj[prop], level, fileName);
		result += type + "\n";
	}
	result += loopPrint("\t", level - 1) + "}";
	return result;
};

// 分析数组类型
export const parseArray = (
	arr: { [key: string]: any },
	level = 0,
	fileName: string
): string => {
	let result = "Array<";
	let type = arr.items.type;
	type = parseType(arr.items, level, fileName);
	result += type + ">";
	return result;
};

// 分析联合类型和交叉类型
export const parseUnion = (
	obj: { [key: string]: any },
	level = 0,
	fileName: string
): string => {
	const connection = Object.hasOwn(obj, "allOf") ? "allOf" : "anyOf";
	const connectSymbol = Object.hasOwn(obj, "allOf") ? "&" : "|";
	let result = "";
	for (const item of obj[connection]) {
		const type = parseType(item, level, fileName);
		result += `${type} ${connectSymbol} `;
	}
	return result.substring(0, result.length - 3);
};

// 分析一个类型(具体情况具体分析)
export const parseType = (
	obj: { [key: string]: any },
	level = 0,
	fileName: string
): string => {
	let type = obj.type;
	let isNull = false;
	// 处理类型 允许 为 null
	if (Array.isArray(type) && type[1] === "null") {
		isNull = true;
		type = type[0];
	}
	if (type === "object") {
		// 处理类型是对象的情况 object
		type = parseObject(obj.properties, obj.required, level + 1, fileName);
	} else if (type === "array") {
		// 处理类型是数组的情况 array
		type = parseArray(obj, level, fileName);
	} else if (!type && Object.hasOwn(obj, "$ref")) {
		// 处理引用数据类型的情况 $ref
		const index = obj.$ref.lastIndexOf("/");
		type = obj.$ref.substring(index + 1, obj.$ref.length);
		// 记录引用,后续处理
		emitter.emit("Ref", type, fileName);
	} else if (
		!type &&
		(Object.hasOwn(obj, "allOf") || Object.hasOwn(obj, "anyOf"))
	) {
		// 联合类型 交叉类型 allOf -> & anyOf -> |
		type = parseUnion(obj, level, fileName);
	} else if (type === "integer") {
		// 普通类型 integer -> number
		type = "number";
	}
	type += isNull ? " | null" : "";
	return type;
};
