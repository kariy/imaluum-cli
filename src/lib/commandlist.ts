import { TCommandCollections } from "./types";

const list: TCommandCollections = {
	result: {
		name: "result",
		description: "Get your examination result.",
		arguments: [
			{
				name: "<semester>",
				description: " Must be in the range of 1 >= semester <= 3.",
			},
			{
				name: "<year>",
				description:
					"Year of the semester. MUST BE IN THE FORMAT XXXX/XXXX (e.g. 2021/2022)",
			},
		],
		options: [
			{
				flags: "-w, --width <width>",
				description: "Set table output width.",
				defaultValue: "90",
			},
		],
	},
	timetable: {
		name: "timetable",
		description: "Show class timetable for the given semester.",
		arguments: [
			{
				name: "<semester>",
				description: " Must be in the range of 1 >= semester <= 3.",
			},
			{
				name: "<year>",
				description:
					"Year of the semester. MUST BE IN THE FORMAT XXXX/XXXX (e.g. 2021/2022)",
			},
		],
		options: [
			{
				flags: "-w, --width <width>",
				description: "Set table output width.",
				defaultValue: "90",
			},
		],
	},
	test: {
		name: "test",
		description: "",
		arguments: [],
		options: [],
	},
	authenticate: {
		name: "authenticate",
		description: "Authenticate by providing your username and password for i-ma'luum",
		arguments: [],
		options: [],
	},
};

export default list;
