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
		description: "Authenticate to i-Ma'luum site.",
		arguments: [],
		options: [
			{
				flags: "-i, --interactive",
			},
			{
				flags: "-u, --username <username>",
			},
			{
				flags: "-p, --password <password>",
			},
		],
	},
};

export default list;
